# Bland Quest Auto

*Everybody's sure. Nobody's right.*

The version number after that line in the game is `VERSION` in `js/engine.js`: add one with every commit.

A point-and-click pixel-art game about one simple car repair that never ends.

## Play

Open `index.html` in a browser (no server needed). The game saves itself in the browser.

## Files

- `index.html`: the game page (How to play, New game)
- `js/art.js`: the drawing kit (pixels, isometric boxes, the car, the man, the font). Pixels go in through a 32-bit view of the image (`IMG32`), whole rows at a time for rectangles; the grass is worked out once per picture size
- `js/sun-image.js`, `js/moon-image.js`: the sun by day (Swooping Simulator's) and the moon by night in the back garden's sky, as pictures in the code; the sky is on the page behind the see-through part of the picture (`showSky` in `js/screens.js`)
- `js/screens.js`: the screens round the house and town (home, town, a place, computer, phone, notebook, garage, under the car, workbench, toolbox, looking under things, hooking the nut out, the car door, the breath test, the handbook); also the shared open-book helper (`openBook`)
- `js/car.js`: the car itself, close up (the boot, under the bonnet and the fuse box, the driver's seat, the glove box, the diagnostic port, the ECU)
- `js/life.js`: things that move: life on every screen (traffic, birds, drips, flies, a flickering light) and the animated moments (the nut rolling away, the extractor snapping, the van, the kick…)
- `js/sound.js`: sound effects, all made up in the browser (no files); Sound on/off in the header
- `js/story.js`: branch 1 (the red light): who says what, what each action does, leads, hunches, timed texts
- `js/extras.js`: anger (calm-down menu, breaking things on the car), the manuals shelf, shop shelves close up (the hammer), the fuse diagram online
- `js/sensors.js`: every gearbox sensor you can try in the box on the workbench (`SENSORS`: name, long part number, shape, how it fits, colour), where the wrong ones come from (the eBuy job lot, the Scrap Yard, Car Spares Direct, the parts box), and the soldering game (join the three wires in the right order, then the iron)
- `js/road.js`: road snags: now and then on the way home, a puncture (the roadside, the flat spare, the dead phone, the walk home in the rain and the splash, a wheel from the Scrap Yard or Worn Out and Tired in the wife's car); and being pulled over by the police after a drink, side-on in the street at night
- `js/lift.js`: the wife gives you a lift while your car's on a flat: she drives you about in hers, watches you change the wheel, and drives off
- `js/brother.js`: your brother comes round to "help"
- `js/police.js`: the police station, the post (letters in the mailbox), the drink-driving fine, the clamp and the taxi
- `js/rides.js`: the taxi and the bus seen outside your house: picking you up, and the taxi dropping you off
- `js/paperboy.js`: the paperboy: once a game, home from town by day, he rides past and his paper knocks you flat on the drive (stars, birds twittering)
- `js/charger.js`: charging the flat phone: the box of chargers on the computer desk, five plugs to try, the battery filling up
- `js/screws.js`: the screw jar: it spills all over the garage floor, you sweep it up with a dustpan, then try screws from a tray in the third hole
- `js/bank.js`: now and then the card is blocked as you pay; the bank (Mon to Wed, 10 till 2) and its security questions
- `js/engine.js`: game state, time, money, anger, the notebook, dialogs, saving
- `task-tree.md`: the full design tree of tasks and snags (branches still to build)
- `mockups.html`: the still mockups the game was built from
- `cutscenes.html`: big 1980s anime-style still cutscenes (the kick, the wife); the Pixel button shows them at the game's pixel size
- `stills/`: the big stills, one file each (`kick`, `pubfloor`, `sick`, `asleep`, `tea`, `breath`, `breathpass`, `splash`, `snap`, `click`, `abs`), shown on the cutscenes page and flashed up in the game after each big moment like a comic-book cut (`flashStill` / `stillAfter` in `js/engine.js`)
- The title screen (in `index.html`): `stills/hero.svg` (him with his spanner held high) over seven panels of the game, `stills/panels/*.png`, which are the game's own screens: redraw them with `node make-title-panels.js` in the `tests` folder
- `forest.html`, `spanner-and-son.html`: early scenes

## Pulse: drawing the eye to a button

- An action button or a dialog choice: add `pulse: true` to it
- Any other button on the page: give it the class `pulse` (in `index.html`)
- A thing drawn in the picture: call `pulseGlow` each frame, then draw the thing on top (`js/art.js`)
- An area of the ground (the pavement home): see `pavementGlow` in `js/road.js`; it uses the same swell (`pulseSwell`)

## Tests

In the `tests` folder (first time: `npm install`):

```
npm test
```
