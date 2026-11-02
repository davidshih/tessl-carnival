import { describe, expect, it } from 'vitest';
import {
  FIRST_INTERVAL,
  FIRST_UP_TIME,
  HOLES,
  LAST_INTERVAL,
  LAST_UP_TIME,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  createState,
  moleCentre,
  popInterval,
  popUp,
  step,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts a full round with no moles and no score', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.moles).toHaveLength(0);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops up the first mole after the first interval', () => {
    const state = createState();
    step(state, FIRST_INTERVAL - 0.01, () => 0);
    expect(state.moles).toHaveLength(0);
    step(state, 0.02, () => 0);
    expect(state.moles).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.moles = [{ hole: 4, timeLeft: 0.1 }];
    state.nextPop = 10;
    step(state, 0.2);
    expect(state.moles).toHaveLength(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    state.moles = [{ hole: 4, timeLeft: 1 }];
    const { x, y } = moleCentre(4);
    expect(whack(state, x + 10, y + 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.moles).toHaveLength(0);
  });

  it('scores nothing for a whack that misses', () => {
    const state = createState();
    state.moles = [{ hole: 4, timeLeft: 1 }];
    const { x, y } = moleCentre(0);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
    expect(state.moles).toHaveLength(1);
  });

  it('never pops two moles from the same hole', () => {
    const state = createState();
    for (let i = 0; i < HOLES.length; i++) expect(popUp(state, () => 0)).toBe(true);
    expect(new Set(state.moles.map((m) => m.hole)).size).toBe(HOLES.length);
    expect(popUp(state, () => 0)).toBe(false);
  });

  it('pops moles up faster, and for less time, as the round goes on', () => {
    const state = createState();
    expect(popInterval(state)).toBe(FIRST_INTERVAL);
    expect(upTime(state)).toBe(FIRST_UP_TIME);
    state.timeLeft = ROUND_SECONDS / 2;
    expect(popInterval(state)).toBeLessThan(FIRST_INTERVAL);
    expect(popInterval(state)).toBeGreaterThan(LAST_INTERVAL);
    state.timeLeft = 0;
    expect(popInterval(state)).toBeCloseTo(LAST_INTERVAL);
    expect(upTime(state)).toBeCloseTo(LAST_UP_TIME);
  });

  it('ends the round when the time runs out', () => {
    const state = createState();
    state.moles = [{ hole: 0, timeLeft: 5 }];
    state.timeLeft = 0.05;
    step(state, 0.1);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.moles).toHaveLength(0);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    state.moles = [{ hole: 4, timeLeft: 1 }];
    const { x, y } = moleCentre(4);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
