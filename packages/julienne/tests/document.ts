import devalue from 'devalue';
import { JSDOM } from 'jsdom';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { renderDocument } from '../src/document';

type Attributes = Record<string, string | boolean | undefined>;

function assertAttributes(node: HTMLElement, attributes: Attributes) {
  Object.entries(attributes).forEach(([key, val]) => {
    let actual = node.getAttribute(key);
    let expected = typeof val === 'boolean' ? '' : val;
    assert.is(actual, expected);
  });
}

function getDocument(props: Parameters<typeof renderDocument>[0]) {
  return new JSDOM(renderDocument(props)).window.document;
}

let test = suite('renderDocument');

test('includes body in the rendered document', () => {
  let body = '<div id="test"></div>';

  let document = getDocument({ body });

  assert.is(document.querySelector('#julienne-root')!.innerHTML, body);
});

test('includes head in the rendered document', () => {
  let head = '<meta name="test" />';

  let html = renderDocument({ head });

  assert.match(html, head);
});

test('includes page data in the rendered document', () => {
  let pageData = { template: 'main', props: { name: 'Test' } };

  let document = getDocument({ pageData });

  assert.equal(
    document.querySelector<HTMLScriptElement>('script#julienne-data')!
      .innerHTML,
    `__JULIENNE__ = { page: ${devalue(pageData)} };`,
  );
});

test('includes scripts in the rendered output', () => {
  const scripts = [
    { href: '/nomodule.js', nomodule: true },
    { type: 'module', href: '/module.js' },
  ];

  let document = getDocument({ scripts });

  scripts.forEach((script) => {
    let node = document.querySelector<HTMLScriptElement>(
      `script[href="${script.href}"]`,
    );
    assert.is.not(node, null);
    assertAttributes(node!, script);
  });
});

test('includes links in the rendered output', () => {
  let links = [
    {
      rel: 'modulepreload',
      href: '/module-preload.js',
    },
    {
      rel: 'preload',
      as: 'script',
      href: '/nomodule-preload.js',
    },
    {
      rel: 'stylesheet',
      href: '/style.css',
    },
  ];

  let document = getDocument({ links });

  links.forEach((link) => {
    let node = document.querySelector<HTMLLinkElement>(
      `link[href="${link.href}"]`,
    );
    assert.is.not(node, null);
    assertAttributes(node!, link);
  });
});

test.run();
