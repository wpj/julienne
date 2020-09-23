import { promises as fs } from 'fs';
import { dirname, resolve as resolvePath, sep as pathSeparator } from 'path';

import { render, createWebpackConfig } from '@julienne/svelte';
import globby from 'globby';
import { Site } from 'julienne';
import type { Root } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter, { YamlNode } from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkToRehype from 'remark-rehype';
import sade from 'sade';
import unified from 'unified';
import { safeLoad } from 'js-yaml';

import { remarkImages } from './src/build/remark-images';

const templates = {
  post: require.resolve('./src/templates/post.svelte'),
  postIndex: require.resolve('./src/templates/post-index.svelte'),
};

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
async function getPost(site: Site<typeof templates>, postPath: string) {
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
    .use(remarkImages, { site, contentDirectory })
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
async function createPostPage(site: Site<typeof templates>, postPath: string) {
  let slug = slugifyPostPath(postPath);
  site.createPage(slug, async () => {
    let { content, title } = await getPost(site, postPath);

    return {
      template: 'post',
      props: {
        content,
        title,
      },
    };
  });
}

async function createSite({ dev }: { dev: boolean }) {
  let site = new Site<typeof templates>({
    render,
    runtime: '@julienne/svelte-runtime',
    templates,
    webpackConfig: createWebpackConfig({ dev }),
  });

  let postPaths = await globby(['posts/**/*.md']);

  postPaths.forEach((postPath) => {
    let resolvedPath = resolvePath(postPath);

    createPostPage(site, resolvedPath);
  });

  site.createPage('/', async () => {
    let posts = await Promise.all(
      postPaths.map(async (postPath) => {
        let slug = slugifyPostPath(postPath);
        let { title } = await getPost(site, postPath);

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

  return site;
}

let prog = sade('julienne-site');

prog.command('build').action(async () => {
  let site = await createSite({ dev: false });
  await site.build();
});

prog.command('dev').action(async () => {
  let site = await createSite({ dev: true });
  site.dev();
});

prog.parse(process.argv);
