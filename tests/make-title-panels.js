// Run in the tests folder: node make-title-panels.js (redraws stills/panels/*.png from the game's own screens)
// Bland Quest Auto: capture six game screens (their own pixels) for the title screen's panels
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => {
  const outDir = path.resolve(process.cwd(), '..', 'stills', 'panels');
  const b = await chromium.launch({ headless: false });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.addInitScript(() => { window.NO_PUNCTURES = true; });
  await p.goto(pathToFileURL(path.resolve(process.cwd(), '..', 'index.html')).href);
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { document.querySelectorAll('.help, .titlescreen').forEach(e => e.remove()); });
  const shots = {
    garage: () => { S.screen = 'garage'; render(); },
    town: () => { S.screen = 'city'; render(); },
    dash: () => { S.screen = 'dash'; S.key = 2; S.flags.hatch = true; render(); },
    bench: () => { S.flags.boxOff = true; S.flags.sensorOut = true; S.inv['lot-long'] = true; S.bench = { part: 'lot-long', rotated: false, state: 'over' }; S.screen = 'bench'; render(); },
    pub: () => { S.place = 'The Hesketh Tavern'; S.inside = true; S.mins = 20 * 60; S.screen = 'place'; render(); },
    roadside: () => { S.place = null; S.inside = false; S.mins = 11 * 60; S.road = { spare: true, walked: false }; S.screen = 'roadside'; render(); },
    yard: () => { S.road = null; S.place = 'Scrap Yard'; S.screen = 'yard'; render(); }
  };
  for (const [name, fn] of Object.entries(shots)) {
    await p.evaluate(`(${fn.toString()})()`);
    await p.waitForTimeout(300);
    const url = await p.evaluate(() => { drawFrame(performance.now()); return document.getElementById('c').toDataURL('image/png'); });
    fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
  console.log(fs.readdirSync(outDir).join(' '));
})();
