# Hook a Duck

Rubber ducks float round a stream in a loop. Lower your hook and catch them as
they pass.

## How to play

- Move the mouse to move the rod along the stream, and click to lower the hook.
- The hook drops to the near side of the stream and comes back up. A duck right
  under the hook when it reaches the water is caught and reeled in.
- You have 8 casts, caught or not. The round ends when the last cast is reeled in.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. There
are ten ducks on the stream:

| Number | Ducks |
| ------ | ----- |
| 1      | 4     |
| 2      | 2     |
| 3      | 2     |
| 5      | 1     |
| 10     | 1     |

A caught duck goes back in the stream, so you can catch it again. Your final
score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckPosition`,
  `duckUnderHook`, `hookDepth`) and the `hookADuck` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
