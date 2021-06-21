import { chromium } from 'playwright';

export async function setup(context) {
  context.browser = await chromium.launch();
  context.page = await context.browser.newPage();
}

export async function reset(context) {
  await context.page.close();
  await context.browser.close();
}
