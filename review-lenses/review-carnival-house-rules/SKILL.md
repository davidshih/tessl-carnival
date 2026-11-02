---
name: review-carnival-house-rules
description: Review a change to a carnival game for house rules 1 to 3 in AGENTS.md, that every game registers on the midway, reports its scores through recordScore from src/carnival, and draws with theme and canvasFont. Use as one lens in a code review run on src/games.
---

# Review lens: Carnival House Rules

Review changes to games under `src/games/` for whether each game still fits the shared base every game on the midway relies on: the registry, the scores module and the theme.

## Scope

- **Registration** Whether a game can be found. A game lives in `src/games/<game-id>/`, its `game.ts` has its `CarnivalGame` as the default export, and its `id` matches the folder name. A game whose code sits anywhere else is never picked up by `src/games/index.ts` and gets no booth.
- **Scores** Whether a round's score reaches the shared table. A game calls `recordScore(game.id, score)` from `src/carnival` once, when a round ends. A game that reads or writes local storage itself, or keeps its own high score table, has scores the midway's booth card and best score never see. A call made more than once per round, or with an id that is not the game's own, puts wrong entries in that table.
- **Theme** Whether a game looks like the rest of the carnival. Colours, fonts and sizes come from `theme` and `canvasFont` in `src/carnival/theme.ts`. A hex, `rgb()` or named colour, or a font string, inside a game drifts from the carnival when the theme changes.

## Method

Read `AGENTS.md` for the house rules as written, then `src/games/index.ts` for how a game is found, and `src/carnival/index.ts` for what the shared base exports.

Start at each changed file under `src/games/`. Follow every colour, font and size the game draws with back to where it is defined, and every score the game produces to where it is stored. For a new or moved game, check the folder it is in and the file it is defined in against how `src/games/index.ts` finds games.

## Threshold

Report a game that breaks one of these three rules, with the consequence it has for the player or for the next person changing the theme or the scores module.

Be accurate about the consequence. A game folder whose `game.ts` has no default export, or whose `id` differs from its folder name, makes `src/games/index.ts` throw when the midway loads, and `src/games/index.test.ts` fails, so `npm run check` already catches both: do not report them. A game that is not in a `game.ts` inside its own folder gets no booth, and nothing fails.

Do not report:

- Code outside `src/games/`. `src/carnival/` defines the theme and the scores, and `src/midway/palette.ts` has its own scenery colours.
- Values derived from the theme, such as a colour from `theme.colors`, a size computed from `theme.canvas`, or a font from `canvasFont`.
- Test data in `game.test.ts`, including literal scores, colours or storage keys a test uses.
- Anything lint, the type-checker or the tests already enforce.
- House rules 4 to 7 in `AGENTS.md`. They belong to the other lenses or to the people reviewing the change.

## Reporting

- Name the house rule, the file and line that breaks it, and what the player or the next maintainer sees because of it.
- State the fix in the carnival's own terms: the `theme` entry or `canvasFont` call to use, the `recordScore` call to make and where in the round it goes, or the folder and default export the game needs.
- Where `src/games/water-cannon/` already does the thing, point to it as the pattern to copy.
