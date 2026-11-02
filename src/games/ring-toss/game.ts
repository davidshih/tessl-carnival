import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far a ring may land from a bottle's neck and still catch, for a front-row bottle. */
export const NECK_CATCH = 14;
/** How far the aim drifts from the pointer, at most, in pixels. */
export const SWAY = 18;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
/** Back row first. Bottles further back are smaller and score more. */
const ROWS = [
  { y: 100, scale: 0.7, points: 40 },
  { y: 160, scale: 0.8, points: 30 },
  { y: 225, scale: 0.9, points: 20 },
  { y: 295, scale: 1, points: 10 },
];
const BOTTLES_PER_ROW = 5;
const BOTTLE_SPACING = 120;

export interface Bottle {
  /** Where the neck's tip is. */
  x: number;
  y: number;
  scale: number;
  points: number;
  /** Rings that have landed on this bottle. */
  rings: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  misses: Miss[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round started; drives the aim's sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  // Back rows stand closer together, as if further away.
  const bottles = ROWS.flatMap((row) => {
    const spacing = BOTTLE_SPACING * row.scale;
    const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
    return Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      scale: row.scale,
      points: row.points,
      rings: 0,
    }));
  });
  return {
    bottles,
    rings: [],
    misses: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the aim has drifted from the pointer at `time` seconds into the round. */
export function swayAt(time: number): { x: number; y: number } {
  return { x: SWAY * Math.sin(time * 2.3), y: SWAY * 0.6 * Math.sin(time * 3.1 + 1) };
}

/** The bottle a ring landing at (x, y) rings, or undefined for a miss. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  let closest: Bottle | undefined;
  let closestDistance = Infinity;
  for (const bottle of bottles) {
    const distance = Math.hypot(x - bottle.x, y - bottle.y);
    if (distance <= NECK_CATCH * bottle.scale && distance < closestDistance) {
      closest = bottle;
      closestDistance = distance;
    }
  }
  return closest;
}

/** Throws one ring towards the aim point, drifted by the sway. Returns false if nothing was thrown. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  const sway = swayAt(state.time);
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + sway.x,
    toY: aimY + sway.y,
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Where a ring is in the air: a straight line across the booth, lifted by an arc. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(Math.PI * t) * 120,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  for (const miss of state.misses) miss.age += dt;
  state.misses = state.misses.filter((m) => m.age < 0.6);

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      flying.push(ring);
      continue;
    }
    const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
    if (bottle) {
      bottle.rings += 1;
      state.score += bottle.points;
    } else {
      state.misses.push({ x: ring.toX, y: ring.toY, age: 0 });
    }
  }
  state.rings = flying;

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The table the bottles stand on.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(40, 70, WIDTH - 80, 270);

  ctx.lineWidth = 4;
  for (const bottle of state.bottles) {
    const s = bottle.scale;
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12 * s, bottle.y + 18 * s, 24 * s, 34 * s);
    ctx.beginPath();
    ctx.moveTo(bottle.x - 12 * s, bottle.y + 18 * s);
    ctx.lineTo(bottle.x - 4 * s, bottle.y + 4 * s);
    ctx.lineTo(bottle.x + 4 * s, bottle.y + 4 * s);
    ctx.lineTo(bottle.x + 12 * s, bottle.y + 18 * s);
    ctx.fill();
    ctx.fillRect(bottle.x - 4 * s, bottle.y - 6 * s, 8 * s, 12 * s);
    ctx.strokeStyle = colors.accent;
    for (let i = 0; i < bottle.rings; i++) drawRing(ctx, bottle.x, bottle.y + 14 * s - i * 3, s);
  }

  ctx.strokeStyle = colors.danger;
  for (const miss of state.misses) {
    ctx.globalAlpha = 1 - miss.age / 0.6;
    drawRing(ctx, miss.x, miss.y, 1);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colors.accent;
  for (const ring of state.rings) {
    const { x, y } = ringPosition(ring);
    drawRing(ctx, x, y, 1.2);
  }

  // Aim marker, drifting with the sway.
  if (state.phase === 'playing' && state.ringsLeft > 0) {
    const sway = swayAt(state.time);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x + sway.x, aim.y + sway.y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: 200 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
