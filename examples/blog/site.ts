import { Store } from 'julienne';
import { Site } from '@julienne/svelte';
import { promises as fs } from 'fs';
import globby from 'globby';
import { safeLoad } from 'js-yaml';
import type { Root } from 'mdast';
import { dirname, resolve as resolvePath, sep as pathSeparator } from 'path';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter, { YamlNode } from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkToRehype from 'remark-rehype';
import sade from 'sade';
import unified from 'unified';
import { remarkImages } from './src/build/remark-images';

const templates = {
  post: require.resolve('./src/templates/post.svelte'),
  postIndex: require.resolve('./src/templates/post-index.svelte'),
};

type Templates = typeof templates;

function extractFrontmatter<T>(node: Root) {
  let frontmatterNode =
    node.children[0].type === 'yaml'
      ? (node.children.shift() as YamlNode)
      : null;

  return (frontmatterNode !== null
    ? safeLoad(frontmatterNode.value)
    : {}) as Partial<T>;
}

/*
 * Employs a simple caching mechanism to speed up file reads shared between post
 * creation and post index creation.
 */
let postCache = new Map();
async function getAndCreatePost(store: Store<Templates>, postPath: string) {
  if (postCache.has(postPath)) {
    return postCache.get(postPath);
  }

  let resolvedPath = resolvePath(postPath);

  let contentDirectory = dirname(resolvedPath);
  let markdown = await fs.readFile(resolvedPath, 'utf8');

  let markdownAst = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .parse(markdown);

  let transformedMarkdown = (await unified()
    .use(remarkImages, { store, contentDirectory })
    .run(markdownAst)) as Root;

  let frontmatter = extractFrontmatter<{ title: string }>(transformedMarkdown);

  let hast = await unified().use(remarkToRehype).run(markdownAst);

  let postHtml = unified().use(rehypeStringify).stringify(hast);

  let post = {
    content: postHtml,
    title: frontmatter.title,
  };

  postCache.set(postPath, post);

  return post;
}

function slugifyPostPath(postPath: string) {
  let slug = postPath
    .replace(/\/index\.md$/, '')
    .split(pathSeparator)
    .pop();
  return `/post/${slug}`;
}

/**
 * Creates a page for each post and processes its images.
 */
async function createPostPage(store: Store<Templates>, postPath: string) {
  let slug = slugifyPostPath(postPath);
  store.createPage(slug, async () => {
    let { content, title } = await getAndCreatePost(store, postPath);

    return {
      template: 'post',
      props: {
        content,
        title,
      },
    };
  });
}

async function getStore(): Promise<Store<Templates>> {
  let store = new Store();

  let postPaths = await globby(['posts/**/*.md']);

  postPaths.forEach((postPath) => {
    let resolvedPath = resolvePath(postPath);

    createPostPage(store, resolvedPath);
  });

  store.createPage('/', async () => {
    let posts = await Promise.all(
      postPaths.map(async (postPath) => {
        let slug = slugifyPostPath(postPath);
        let { title } = await getAndCreatePost(store, postPath);

        return { slug, title };
      }),
    );

    return {
      template: 'postIndex',
      props: {
        posts,
      },
    };
  });

  return store;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = new Site({ templates });

  let store = await getStore();

  await site.build({ store });
});

prog.command('dev').action(async () => {
  let site = new Site({ dev: true, templates });

  let store = await getStore();

  let port = 3000;
  await site.dev({ port, store });
  console.log(`Started on http://localhost:${port}`);
});

prog.parse(process.argv);
