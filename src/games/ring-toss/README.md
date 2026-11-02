# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to throw a ring. The aim marker sways a
  little, so time your throw.
- You have 8 rings. The round ends when they are all thrown and the last one
  has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck, scaled down for
the smaller bottles at the back. Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 40     |
| Third  | 30     |
| Second | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`,
  `swayAt`, `ringPosition`) and the `ringToss` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
