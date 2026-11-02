import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
/** The stream is an oval loop; ducks pass closest to the player along its bottom. */
export const STREAM = { x: WIDTH / 2, y: 260, rx: 320, ry: 150 } as const;
export const ROD_Y = 50;
export const HOOK_SPEED = 520;
export const CATCH_RADIUS = 24;
/** Loops of the stream per second. */
export const DUCK_SPEED = 0.05;
/** The number on each duck's base, in the order they float. */
export const DUCK_VALUES = [1, 2, 1, 5, 1, 3, 1, 2, 10, 3] as const;

export interface Duck {
  /** Where the duck is round the loop, from 0 up to 1. */
  progress: number;
  value: number;
  hooked: boolean;
}

export interface Hook {
  x: number;
  y: number;
  direction: 'down' | 'up';
  duck?: Duck;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({
    progress: i / DUCK_VALUES.length,
    value,
    hooked: false,
  }));
  return { ducks, hook: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

/** Where a duck sits on the stream. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  const angle = duck.progress * Math.PI * 2;
  return {
    x: STREAM.x + STREAM.rx * Math.cos(angle),
    y: STREAM.y + STREAM.ry * Math.sin(angle),
  };
}

/** Keeps a cast over the stream. */
export function clampToStream(x: number): number {
  return Math.min(Math.max(x, STREAM.x - STREAM.rx), STREAM.x + STREAM.rx);
}

/** How low the hook goes at `x`: down to the near side of the stream. */
export function hookDepth(x: number): number {
  const across = (clampToStream(x) - STREAM.x) / STREAM.rx;
  return STREAM.y + STREAM.ry * Math.sqrt(1 - across * across);
}

/** The free duck nearest the hook's tip, if one is close enough to catch. */
export function duckUnderHook(state: HookADuckState, x: number, y: number): Duck | undefined {
  let nearest: Duck | undefined;
  let nearestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    if (duck.hooked) continue;
    const position = duckPosition(duck);
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance <= nearestDistance) {
      nearest = duck;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Lowers the hook at `x`. Returns false if no cast was made. */
export function cast(state: HookADuckState, x: number): boolean {
  if (state.phase !== 'playing' || state.hook || state.casts === 0) return false;
  state.hook = { x: clampToStream(x), y: ROD_Y, direction: 'down' };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    if (!duck.hooked) duck.progress = (duck.progress + DUCK_SPEED * dt) % 1;
  }

  const hook = state.hook;
  if (hook && hook.direction === 'down') {
    const depth = hookDepth(hook.x);
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, depth);
    if (hook.y === depth) {
      const duck = duckUnderHook(state, hook.x, hook.y);
      if (duck) {
        duck.hooked = true;
        hook.duck = duck;
      }
      hook.direction = 'up';
    }
  } else if (hook) {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
    if (hook.y === ROD_Y) {
      if (hook.duck) {
        // Land the duck, read its number, and put it back in the stream.
        state.score += hook.duck.value;
        state.catches.push({ x: hook.x, y: ROD_Y + 40, value: hook.duck.value, age: 0 });
        hook.duck.hooked = false;
      }
      state.hook = null;
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 16);
  ctx.lineTo(x + 30, y - 12);
  ctx.lineTo(x + 20, y - 9);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 14, y - 17, 2, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aimX: number) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a ring of water round a wooden island.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 36, STREAM.ry + 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 28, STREAM.ry + 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 28, STREAM.ry - 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 36, STREAM.ry - 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Far ducks first, so the near ones float in front.
  const free = state.ducks
    .filter((d) => !d.hooked)
    .map(duckPosition)
    .sort((a, b) => a.y - b.y);
  for (const position of free) drawDuck(ctx, position.x, position.y);

  // Rod and line.
  const hookX = state.hook?.x ?? clampToStream(aimX);
  const hookY = state.hook?.y ?? ROD_Y;
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(hookX, ROD_Y - 10);
  ctx.lineTo(hookX + 60, ROD_Y - 30);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hookX, ROD_Y - 10);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  if (state.hook?.duck) drawDuck(ctx, hookX, hookY + 18);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hookX - 6, hookY, 6, 0, Math.PI);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = canvasFont('title', 'bold');
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - caught.age * 30);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower your hook as the ducks float by. Each duck scores the number on its base.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let aimX = WIDTH / 2;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => {
      aimX = toCanvasX(event);
    };
    const onDown = (event: PointerEvent) => {
      aimX = toCanvasX(event);
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, aimX);
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
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aimX);
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

export default hookADuck;
