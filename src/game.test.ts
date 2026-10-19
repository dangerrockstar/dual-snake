import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONUS_DURATION_MS,
  BONUS_POINTS,
  changeDirection,
  createGame,
  getTickInterval,
  reverseEnds,
  tickGame,
  type GameState,
} from './game.ts';

function playingGame(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createGame(),
    status: 'playing',
    food: { x: 0, y: 0 },
    ...overrides,
  };
}

test('starts with a five-segment snake and a food item outside it', () => {
  const game = createGame();
  assert.equal(game.status, 'ready');
  assert.equal(game.snake.length, 5);
  assert.equal(game.snake.some((segment) => segment.x === game.food.x && segment.y === game.food.y), false);
  assert.ok(game.applesUntilBonus === 5 || game.applesUntilBonus === 6);
  assert.equal(game.score, 0);
  assert.equal(game.bonusScore, 0);
});

test('rejects a direct reversal into the snake body', () => {
  const game = playingGame();
  assert.equal(changeDirection(game, 'left'), game);
});

test('reverse switches to the other head and moves outward', () => {
  const game = playingGame();
  const reversed = reverseEnds(game);
  assert.equal(reversed.activeEnd, 'start');
  assert.equal(reversed.direction, 'left');

  const next = tickGame(reversed);
  assert.deepEqual(next.snake[0], {
    x: reversed.snake[0].x - 1,
    y: reversed.snake[0].y,
  });
  assert.equal(next.snake.length, reversed.snake.length);
});

test('grows when eating and leaves the tail in place on that move', () => {
  const game = playingGame({
    activeEnd: 'start',
    direction: 'left',
    food: { x: 6, y: Math.floor(22 / 2) },
  });
  const next = tickGame(game);
  assert.equal(next.snake.length, game.snake.length + 1);
  assert.deepEqual(next.snake.at(-1), game.snake.at(-1));
  assert.equal(next.score, 10);
});

test('spawns bonus food after the scheduled five or six regular apples', () => {
  let game = playingGame();
  const applesToCollect = game.applesUntilBonus;

  for (let index = 0; index < applesToCollect; index += 1) {
    const head = game.snake.at(-1)!;
    game = tickGame(
      {
        ...game,
        food: { x: head.x + 1, y: head.y },
      },
      170,
    );
  }

  assert.ok(game.bonusFood);
  assert.equal(game.bonusFood.timeLeftMs, BONUS_DURATION_MS);
  assert.ok(game.applesUntilBonus === 5 || game.applesUntilBonus === 6);
  assert.equal(game.score, applesToCollect * 10);
});

test('bonus food gives bonus points without growing and resets the apple counter', () => {
  const game = playingGame({
    applesUntilBonus: 2,
    bonusFood: {
      position: { x: 12, y: 11 },
      timeLeftMs: 4000,
    },
  });
  const next = tickGame(game, 170);

  assert.equal(next.snake.length, game.snake.length);
  assert.equal(next.score, BONUS_POINTS);
  assert.equal(next.bonusScore, BONUS_POINTS);
  assert.equal(next.bonusFood, null);
  assert.ok(next.applesUntilBonus === 5 || next.applesUntilBonus === 6);
});

test('bonus food counts down with game time and expires', () => {
  const game = playingGame({
    bonusFood: {
      position: { x: 2, y: 2 },
      timeLeftMs: 300,
    },
  });
  const firstTick = tickGame(game, 170);
  assert.equal(firstTick.bonusFood?.timeLeftMs, 130);

  const expired = tickGame(firstTick, 130);
  assert.equal(expired.bonusFood, null);
});

test('queues a bonus when its apple threshold is reached while another bonus is active', () => {
  const game = playingGame({
    applesUntilBonus: 1,
    bonusFood: {
      position: { x: 0, y: 0 },
      timeLeftMs: 340,
    },
    food: { x: 12, y: 11 },
  });
  const next = tickGame(game, 170);

  assert.equal(next.bonusFood?.timeLeftMs, 170);
  assert.equal(next.applesUntilBonus, 0);

  const queuedBonus = tickGame(next, 170);
  assert.ok(queuedBonus.bonusFood);
  assert.equal(queuedBonus.bonusFood.timeLeftMs, BONUS_DURATION_MS);
});

test('selectable speeds have distinct intervals and speed up as score grows', () => {
  assert.equal(getTickInterval('slow', 0), 240);
  assert.equal(getTickInterval('normal', 0), 170);
  assert.equal(getTickInterval('fast', 0), 115);
  assert.ok(getTickInterval('normal', 100) < getTickInterval('normal', 0));
});

test('ends the game when the active head hits a wall', () => {
  const game = playingGame({
    snake: [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ],
    direction: 'left',
    food: { x: 10, y: 10 },
  });
  assert.equal(tickGame(game).status, 'over');
});

test('does not allow eating into the tail that would otherwise move away', () => {
  const game = playingGame({
    snake: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ],
    direction: 'left',
    food: { x: 1, y: 1 },
  });
  assert.equal(tickGame(game).status, 'over');
});
