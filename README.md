# Bland Quest Auto

*Everybody's sure. Nobody's right.*

A point-and-click pixel-art game about one simple car repair that never ends.

## Play

Open `index.html` in a browser (no server needed). The game saves itself in the browser.

## Files

- `index.html`: the game page (How to play, New game)
- `js/art.js`: the drawing kit (pixels, isometric boxes, the car, the man, the font). Pixels go in through a 32-bit view of the image (`IMG32`), whole rows at a time for rectangles; the grass is worked out once per picture size
- `js/screens.js`: the screens round the house and town (home, town, a place, computer, phone, notebook, garage, under the car, workbench, toolbox, looking under things, hooking the nut out, the car door, the breath test, the handbook); also the shared open-book helper (`openBook`)
- `js/car.js`: the car itself, close up (the boot, under the bonnet and the fuse box, the driver's seat, the glove box, the diagnostic port, the ECU)
- `js/life.js`: things that move: life on every screen (traffic, birds, drips, flies, a flickering light) and the animated moments (the nut rolling away, the extractor snapping, the van, the kick…)
- `js/sound.js`: sound effects, all made up in the browser (no files); Sound on/off in the header
- `js/story.js`: branch 1 (the red light): who says what, what each action does, leads, hunches, timed texts
- `js/extras.js`: anger (calm-down menu, breaking things on the car), the manuals shelf, shop shelves close up (the hammer), the fuse diagram online
- `js/sensors.js`: every gearbox sensor you can try in the box on the workbench (`SENSORS`: name, long part number, shape, how it fits, colour), where the wrong ones come from (the eBuy job lot, the Scrap Yard, Car Spares Direct, the parts box), and the soldering game (join the three wires in the right order, then the iron)
- `js/road.js`: road snags: now and then on the way home, a puncture (the roadside, the flat spare, the dead phone, the walk home in the rain and the splash, a wheel from the Scrap Yard or the Tyre Place in the wife's car)
- `js/engine.js`: game state, time, money, anger, the notebook, dialogs, saving
- `task-tree.md`: the full design tree of tasks and snags (branches still to build)
- `mockups.html`: the still mockups the game was built from
- `cutscenes.html`: big 1980s anime-style still cutscenes (the kick, the wife); the Pixel button shows them at the game's pixel size
- `stills/`: the big stills, one file each (`kick`, `pubfloor`, `sick`, `asleep`, `tea`, `breath`, `breathpass`, `splash`, `snap`, `click`, `abs`), shown on the cutscenes page and flashed up in the game after each big moment like a comic-book cut (`flashStill` / `stillAfter` in `js/engine.js`)
- The title screen (in `index.html`): `stills/hero.svg` (him with his spanner held high) over seven panels of the game, `stills/panels/*.png`, which are the game's own screens: redraw them with `node make-title-panels.js` in the `tests` folder
- `forest.html`, `spanner-and-son.html`: early scenes

## Tests

In the `tests` folder (first time: `npm install`):

```
npm test
```
