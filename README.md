# The Thankless Task

*Everyone's sure. Nobody's right.*

A point-and-click pixel-art game about one simple car repair that never ends.

## Play

Open `index.html` in a browser (no server needed). The game saves itself in the browser.

## Files

- `index.html`: the game page (How to play, New game)
- `js/art.js`: the drawing kit (pixels, isometric boxes, the car, the man, the font)
- `js/screens.js`: every screen (home, town, a place, computer, phone, notebook, garage, toolbox, under the car, bonnet, fuse box, dashboard, the diagnostic port close up, the ECU behind its panel, the glove box, workbench, hooking the nut out from under the tool chest)
- `js/life.js`: things that move: life on every screen (traffic, birds, drips, flies, a flickering light) and the animated moments (the nut rolling away, the extractor snapping, the van, the kick…)
- `js/sound.js`: sound effects, all made up in the browser (no files); Sound on/off in the header
- `js/story.js`: branch 1 (the red light): who says what, what each action does, leads, hunches, timed texts
- `js/extras.js`: anger (calm-down menu, breaking things on the car), the manuals shelf, shop shelves close up (the hammer), the fuse diagram online
- `js/road.js`: road snags: now and then on the way home, a puncture (the roadside, the flat spare, the dead phone, the walk home in the rain and the splash, a wheel from the Scrap Yard or the Tyre Place in the wife's car)
- `js/engine.js`: game state, time, money, anger, the notebook, dialogs, saving
- `task-tree.md`: the full design tree of tasks and snags (branches still to build)
- `mockups.html`: the still mockups the game was built from
- `cutscenes.html`: big 1980s anime-style still cutscenes (the kick, the wife); the Pixel button shows them at the game's pixel size
- `forest.html`, `spanner-and-son.html`: early scenes

## Tests

In the `tests` folder (first time: `npm install`):

```
npm test
```
