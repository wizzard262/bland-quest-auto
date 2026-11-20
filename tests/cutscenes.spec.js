// Bland Quest Auto: the cutscenes page (big 80s anime-style stills) opens, draws both scenes, and the Pixel look works
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'cutscenes.html')).href;

test('cutscenes: the kick and the wife are drawn, and the Pixel look redraws them with hard pixels', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(PAGE);
  await expect(page.locator('img#kick')).toBeVisible();                       // both pictures are there (the kick from its file, stills/kick.svg)
  expect(await page.locator('img#kick').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator('svg#wife')).toBeVisible();
  for (const name of ['pubfloor', 'sick', 'asleep', 'breath', 'breathpass', 'splash', 'tea', 'snap', 'click', 'abs']) {   // the other big moments' stills, from their files
    expect(await page.locator('img#' + name).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  expect(await page.locator('#w-blinds rect').count()).toBeGreaterThan(10);    // the blinds' slats
  await page.click('#pixel');                                                  // the Pixel look on…
  await expect(page.locator('#pixel')).toHaveText('Pixel look: on');
  await expect(page.locator('canvas[data-for="kick"]')).toHaveAttribute('data-drawn', 'yes');
  await expect(page.locator('canvas[data-for="wife"]')).toHaveAttribute('data-drawn', 'yes');
  await expect(page.locator('img#kick')).toBeHidden();                         // …shows the pixel versions instead
  await page.click('#pixel');                                                  // and off again
  await expect(page.locator('img#kick')).toBeVisible();
  expect(errors).toEqual([]);
});
