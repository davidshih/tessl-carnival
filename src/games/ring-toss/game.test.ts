import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_CATCH,
  RINGS_PER_ROUND,
  bottleAt,
  createState,
  ringPosition,
  step,
  swayAt,
  toss,
} from './game';

/** Throws a ring that lands exactly at (x, y), whatever the sway. */
function tossAt(state: ReturnType<typeof createState>, x: number, y: number) {
  const sway = swayAt(state.time);
  return toss(state, x - sway.x, y - sway.y);
}

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(20);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    tossAt(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottle.rings).toBe(1);
    expect(state.rings).toHaveLength(0);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    tossAt(state, 5, 480);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('does not score a ring still in the air', () => {
    const state = createState();
    const bottle = state.bottles[0];
    tossAt(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.rings).toHaveLength(1);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = Math.min(...state.bottles.map((b) => b.y));
    const front = Math.max(...state.bottles.map((b) => b.y));
    const pointsAt = (y: number) => state.bottles.find((b) => b.y === y)!.points;
    expect(pointsAt(back)).toBeGreaterThan(pointsAt(front));
  });

  it('catches a ring near the neck and misses one further off', () => {
    const state = createState();
    const bottle = state.bottles[state.bottles.length - 1];
    expect(bottleAt(state.bottles, bottle.x + NECK_CATCH - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(state.bottles, bottle.x + NECK_CATCH + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) toss(state, 400, 200);
    expect(toss(state, 400, 200)).toBe(false);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });

  it('flies a ring from the thrower to where it lands', () => {
    const ring = { fromX: 400, fromY: 470, toX: 300, toY: 100, age: 0 };
    expect(ringPosition(ring)).toEqual({ x: 400, y: 470 });
    ring.age = FLIGHT_TIME;
    const end = ringPosition(ring);
    expect(end.x).toBeCloseTo(300);
    expect(end.y).toBeCloseTo(100);
  });
});
