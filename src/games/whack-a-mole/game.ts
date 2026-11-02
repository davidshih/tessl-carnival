import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
/** Seconds between pop-ups at the start of the round and at the end. */
export const FIRST_INTERVAL = 1.0;
export const LAST_INTERVAL = 0.35;
/** Seconds a mole stays up at the start of the round and at the end. */
export const FIRST_UP_TIME = 1.2;
export const LAST_UP_TIME = 0.6;
export const MOLE_RADIUS = 38;

const COLUMNS = [200, 400, 600];
const ROWS = [150, 270, 390];

export interface Hole {
  x: number;
  y: number;
}

/** The grid of holes, left to right and top to bottom. */
export const HOLES: readonly Hole[] = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y })));

export interface Mole {
  hole: number;
  /** Seconds left before it drops back down. */
  timeLeft: number;
}

export interface Bonk {
  hole: number;
  age: number;
}

export interface WhackAMoleState {
  moles: Mole[];
  bonks: Bonk[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  return {
    moles: [],
    bonks: [],
    timeLeft: ROUND_SECONDS,
    nextPop: FIRST_INTERVAL,
    score: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

/** Seconds between pop-ups: shrinks from FIRST_INTERVAL to LAST_INTERVAL over the round. */
export function popInterval(state: WhackAMoleState): number {
  return FIRST_INTERVAL + (LAST_INTERVAL - FIRST_INTERVAL) * progress(state);
}

/** Seconds a new mole stays up: shrinks from FIRST_UP_TIME to LAST_UP_TIME over the round. */
export function upTime(state: WhackAMoleState): number {
  return FIRST_UP_TIME + (LAST_UP_TIME - FIRST_UP_TIME) * progress(state);
}

/** Where the mole in `hole` can be hit: its head sits a little above the hole. */
export function moleCentre(hole: number): Hole {
  return { x: HOLES[hole].x, y: HOLES[hole].y - 20 };
}

/** Pops a mole up from a random empty hole. Returns false if every hole is taken. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = HOLES.map((_, i) => i).filter((i) => !state.moles.some((m) => m.hole === i));
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  state.moles.push({ hole, timeLeft: upTime(state) });
  return true;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const index = state.moles.findIndex((mole) => {
    const centre = moleCentre(mole.hole);
    return Math.hypot(x - centre.x, y - centre.y) <= MOLE_RADIUS;
  });
  if (index === -1) return false;
  const [mole] = state.moles.splice(index, 1);
  state.score += POINTS_PER_MOLE;
  state.bonks.push({ hole: mole.hole, age: 0 });
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < 0.3);

  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const mole of state.moles) mole.timeLeft -= dt;
  state.moles = state.moles.filter((m) => m.timeLeft > 0);

  if (state.timeLeft === 0) {
    state.moles = [];
    state.phase = 'over';
    return;
  }

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    popUp(state, random);
    state.nextPop = popInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The counter the holes are cut into.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(80, 80, WIDTH - 160, 360);

  HOLES.forEach((hole, i) => {
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, 56, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    const mole = state.moles.find((m) => m.hole === i);
    if (mole) {
      const centre = moleCentre(i);
      ctx.save();
      // Only the part of the mole above the hole's rim shows.
      ctx.beginPath();
      ctx.rect(hole.x - 60, hole.y - 120, 120, 120);
      ctx.clip();
      ctx.fillStyle = colors.muted;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, MOLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.background;
      ctx.beginPath();
      ctx.arc(centre.x - 13, centre.y - 10, 5, 0, Math.PI * 2);
      ctx.arc(centre.x + 13, centre.y - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  for (const bonk of state.bonks) {
    const centre = moleCentre(bonk.hole);
    ctx.globalAlpha = 1 - bonk.age / 0.3;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, 20 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They pop up faster as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the whole round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
