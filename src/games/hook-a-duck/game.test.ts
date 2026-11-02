import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_SPEED,
  DUCK_VALUES,
  ROD_Y,
  STREAM,
  cast,
  createState,
  duckPosition,
  duckUnderHook,
  hookDepth,
  step,
} from './game';

/** Steps until the hook is back at the rod, or a few seconds have passed. */
function reelIn(state: ReturnType<typeof createState>) {
  for (let i = 0; i < 200 && state.hook; i++) step(state, 0.02);
}

describe('hook a duck', () => {
  it('starts with every cast left and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
  });

  it('floats the ducks round the stream in a loop', () => {
    const state = createState();
    state.ducks = [{ progress: 0.99, value: 1, hooked: false }];
    step(state, 1);
    expect(state.ducks[0].progress).toBeCloseTo((0.99 + DUCK_SPEED) % 1);
    expect(state.ducks[0].progress).toBeLessThan(0.99);
  });

  it('uses one cast per lowering of the hook', () => {
    const state = createState();
    expect(cast(state, STREAM.x)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook?.y).toBe(ROD_Y);
  });

  it('cannot cast again while the hook is down', () => {
    const state = createState();
    cast(state, STREAM.x);
    expect(cast(state, STREAM.x)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, STREAM.x)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('lowers the hook to the near side of the stream', () => {
    expect(hookDepth(STREAM.x)).toBe(STREAM.y + STREAM.ry);
    expect(hookDepth(STREAM.x + STREAM.rx)).toBeCloseTo(STREAM.y);
  });

  it('catches a duck passing under the hook and scores the number on its base', () => {
    const state = createState();
    // A duck at the bottom of the loop, right under the middle of the rod.
    state.ducks = [{ progress: 0.25, value: 5, hooked: false }];
    cast(state, STREAM.x);
    // Hold the duck still so only the hook moves.
    const position = duckPosition(state.ducks[0]);
    expect(duckUnderHook(state, position.x, position.y)).toBe(state.ducks[0]);
    state.hook!.y = hookDepth(STREAM.x) - 1;
    step(state, 0.01);
    expect(state.hook?.duck).toBe(state.ducks[0]);
    reelIn(state);
    expect(state.score).toBe(5);
    expect(state.ducks[0].hooked).toBe(false);
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [{ progress: 0.75, value: 10, hooked: false }];
    cast(state, STREAM.x);
    reelIn(state);
    expect(state.score).toBe(0);
    expect(state.hook).toBeNull();
  });

  it('ends the round after the last cast is reeled in', () => {
    const state = createState();
    state.ducks = [];
    state.casts = 1;
    cast(state, STREAM.x);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
    reelIn(state);
    expect(state.phase).toBe('over');
  });
});
