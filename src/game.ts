export const GAME_COLUMNS = 18;
export const GAME_ROWS = 22;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameStatus = 'ready' | 'playing' | 'over' | 'won';
export type ActiveEnd = 'start' | 'end';

export type Point = {
  x: number;
  y: number;
};

export type GameState = {
  snake: Point[];
  food: Point;
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

function directionFromVector(vector: Point): Direction {
  if (vector.x === 1) return 'right';
  if (vector.x === -1) return 'left';
  if (vector.y === 1) return 'down';
  return 'up';
}

function spawnFood(snake: Point[]): Point | null {
  const emptyCells: Point[] = [];
  for (let y = 0; y < GAME_ROWS; y += 1) {
    for (let x = 0; x < GAME_COLUMNS; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
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
  if (game.status !== 'playing') return game;
  const activeEnd = game.activeEnd === 'start' ? 'end' : 'start';
  const head = activeEnd === 'start' ? game.snake[0] : game.snake[game.snake.length - 1];
  const nextSegment = activeEnd === 'start' ? game.snake[1] : game.snake[game.snake.length - 2];
  const direction = directionFromVector({
    x: head.x - nextSegment.x,
    y: head.y - nextSegment.y,
  });
  return { ...game, activeEnd, direction };
}

export function tickGame(game: GameState): GameState {
  if (game.status !== 'playing') return game;

  const vector = VECTORS[game.direction];
  const movingFromStart = game.activeEnd === 'start';
  const head = movingFromStart ? game.snake[0] : game.snake[game.snake.length - 1];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const ateFood = nextHead.x === game.food.x && nextHead.y === game.food.y;
  const bodyWithoutVacatingEnd = ateFood
    ? game.snake
    : movingFromStart
      ? game.snake.slice(0, -1)
      : game.snake.slice(1);
  const outsideBoard =
    nextHead.x < 0 ||
    nextHead.x >= GAME_COLUMNS ||
    nextHead.y < 0 ||
    nextHead.y >= GAME_ROWS;
  const hitSnake = bodyWithoutVacatingEnd.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
  );

  if (outsideBoard || hitSnake) return { ...game, status: 'over' };

  const nextSnake = movingFromStart
    ? [nextHead, ...(ateFood ? game.snake : game.snake.slice(0, -1))]
    : [...(ateFood ? game.snake : game.snake.slice(1)), nextHead];

  if (!ateFood) return { ...game, snake: nextSnake };

  const food = spawnFood(nextSnake);
  return food
    ? { ...game, snake: nextSnake, food }
    : { ...game, snake: nextSnake, status: 'won' };
}
