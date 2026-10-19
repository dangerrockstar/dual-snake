export const GAME_COLUMNS = 18;
export const GAME_ROWS = 22;
export const BONUS_DURATION_MS = 6000;
export const BONUS_POINTS = 30;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameSpeed = 'slow' | 'normal' | 'fast';
export type GameStatus = 'ready' | 'playing' | 'over' | 'won';
export type ActiveEnd = 'start' | 'end';

export type Point = {
  x: number;
  y: number;
};

export type BonusFood = {
  position: Point;
  timeLeftMs: number;
};

export type GameState = {
  snake: Point[];
  food: Point;
  bonusFood: BonusFood | null;
  applesUntilBonus: number;
  bonusScore: number;
  score: number;
  direction: Direction;
  activeEnd: ActiveEnd;
  status: GameStatus;
};

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const BASE_SPEED_MS: Record<GameSpeed, number> = {
  slow: 240,
  normal: 170,
  fast: 115,
};

function randomBonusInterval(): number {
  return 5 + Math.floor(Math.random() * 2);
}

function samePoint(first: Point, second: Point): boolean {
  return first.x === second.x && first.y === second.y;
}

function spawnFood(snake: Point[], occupied: Point[] = []): Point | null {
  const emptyCells: Point[] = [];
  for (let y = 0; y < GAME_ROWS; y += 1) {
    for (let x = 0; x < GAME_COLUMNS; x += 1) {
      const candidate = { x, y };
      if (![...snake, ...occupied].some((point) => samePoint(point, candidate))) {
        emptyCells.push(candidate);
      }
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function directionFromVector(vector: Point): Direction {
  if (vector.x === 1) return 'right';
  if (vector.x === -1) return 'left';
  if (vector.y === 1) return 'down';
  return 'up';
}

export function getTickInterval(speed: GameSpeed, score: number): number {
  return Math.max(70, BASE_SPEED_MS[speed] - Math.floor(score / 50) * 8);
}

export function createGame(): GameState {
  const middleX = Math.floor(GAME_COLUMNS / 2);
  const middleY = Math.floor(GAME_ROWS / 2);
  const snake = Array.from({ length: 5 }, (_, index) => ({
    x: middleX - 2 + index,
    y: middleY,
  }));
  return {
    snake,
    food: spawnFood(snake) ?? { x: 0, y: 0 },
    bonusFood: null,
    applesUntilBonus: randomBonusInterval(),
    bonusScore: 0,
    score: 0,
    direction: 'right',
    activeEnd: 'end',
    status: 'ready',
  };
}

export function changeDirection(game: GameState, direction: Direction): GameState {
  if (game.status !== 'playing') return game;
  const current = VECTORS[game.direction];
  const next = VECTORS[direction];
  if (current.x + next.x === 0 && current.y + next.y === 0) return game;
  return { ...game, direction };
}

export function reverseEnds(game: GameState): GameState {
  if (game.status !== 'playing' || game.snake.length < 2) return game;
  const activeEnd = game.activeEnd === 'start' ? 'end' : 'start';
  const head = activeEnd === 'start' ? game.snake[0] : game.snake[game.snake.length - 1];
  const nextSegment = activeEnd === 'start' ? game.snake[1] : game.snake[game.snake.length - 2];
  const direction = directionFromVector({
    x: head.x - nextSegment.x,
    y: head.y - nextSegment.y,
  });
  return { ...game, activeEnd, direction };
}

export function tickGame(game: GameState, elapsedMs = 170): GameState {
  if (game.status !== 'playing') return game;

  const vector = VECTORS[game.direction];
  const movingFromStart = game.activeEnd === 'start';
  const head = movingFromStart ? game.snake[0] : game.snake[game.snake.length - 1];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const ateFood = samePoint(nextHead, game.food);
  const ateBonus = game.bonusFood !== null && samePoint(nextHead, game.bonusFood.position);
  const bodyWithoutVacatingEnd =
    ateFood
      ? game.snake
      : movingFromStart
        ? game.snake.slice(0, -1)
        : game.snake.slice(1);
  const outsideBoard =
    nextHead.x < 0 ||
    nextHead.x >= GAME_COLUMNS ||
    nextHead.y < 0 ||
    nextHead.y >= GAME_ROWS;
  const hitSnake = bodyWithoutVacatingEnd.some((segment) => samePoint(segment, nextHead));

  if (outsideBoard || hitSnake) return { ...game, status: 'over' };

  const nextSnake = movingFromStart
    ? [nextHead, ...(ateFood ? game.snake : game.snake.slice(0, -1))]
    : [...(ateFood ? game.snake : game.snake.slice(1)), nextHead];

  if (ateFood) {
    const food = spawnFood(nextSnake, game.bonusFood ? [game.bonusFood.position] : []);
    if (!food) return { ...game, snake: nextSnake, score: game.score + 10, status: 'won' };

    const applesUntilBonus = Math.max(0, game.applesUntilBonus - 1);
    const bonusExpired =
      game.bonusFood !== null && game.bonusFood.timeLeftMs <= elapsedMs;
    let bonusFood = bonusExpired
      ? null
      : game.bonusFood
        ? { ...game.bonusFood, timeLeftMs: game.bonusFood.timeLeftMs - elapsedMs }
        : null;
    let nextApplesUntilBonus = applesUntilBonus;

    if (bonusFood === null && applesUntilBonus === 0) {
      const position = spawnFood(nextSnake, [food]);
      if (position) {
        bonusFood = { position, timeLeftMs: BONUS_DURATION_MS };
        nextApplesUntilBonus = randomBonusInterval();
      }
    }

    return {
      ...game,
      snake: nextSnake,
      food,
      bonusFood,
      applesUntilBonus: nextApplesUntilBonus,
      score: game.score + 10,
      status: 'playing',
    };
  }

  const bonusExpired =
    game.bonusFood !== null && game.bonusFood.timeLeftMs <= elapsedMs;
  const collectedBonus = ateBonus && game.bonusFood !== null;
  let bonusFood = game.bonusFood && !bonusExpired && !collectedBonus
    ? { ...game.bonusFood, timeLeftMs: game.bonusFood.timeLeftMs - elapsedMs }
    : null;
  let applesUntilBonus = game.applesUntilBonus;
  let bonusScore = game.bonusScore;
  let score = game.score;

  if (collectedBonus) {
    const points = BONUS_POINTS;
    bonusScore += points;
    score += points;
    applesUntilBonus = randomBonusInterval();
  }

  if (bonusFood === null && applesUntilBonus === 0) {
    const position = spawnFood(nextSnake, [game.food]);
    if (position) {
      bonusFood = { position, timeLeftMs: BONUS_DURATION_MS };
      applesUntilBonus = randomBonusInterval();
    }
  }

  return {
    ...game,
    snake: nextSnake,
    bonusFood,
    applesUntilBonus,
    bonusScore,
    score,
  };
}
