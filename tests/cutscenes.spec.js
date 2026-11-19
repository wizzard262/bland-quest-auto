// The Thankless Task: the cutscenes page (big 80s anime-style stills) opens, draws both scenes, and the Pixel look works
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'cutscenes.html')).href;

test('cutscenes: the kick and the wife are drawn, and the Pixel look redraws them with hard pixels', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(PAGE);
  await expect(page.locator('svg#kick')).toBeVisible();                       // both pictures are there
  await expect(page.locator('svg#wife')).toBeVisible();
  expect(await page.locator('#k-lines polygon').count()).toBeGreaterThan(50);  // the speed lines were drawn
  expect(await page.locator('#k-shards polygon').count()).toBeGreaterThan(20); // the flying glass
  expect(await page.locator('#w-blinds rect').count()).toBeGreaterThan(10);    // the blinds' slats
  await page.click('#pixel');                                                  // the Pixel look on…
  await expect(page.locator('#pixel')).toHaveText('Pixel look: on');
  await expect(page.locator('canvas[data-for="kick"]')).toHaveAttribute('data-drawn', 'yes');
  await expect(page.locator('canvas[data-for="wife"]')).toHaveAttribute('data-drawn', 'yes');
  await expect(page.locator('svg#kick')).toBeHidden();                         // …shows the pixel versions instead
  await page.click('#pixel');                                                  // and off again
  await expect(page.locator('svg#kick')).toBeVisible();
  expect(errors).toEqual([]);
});
