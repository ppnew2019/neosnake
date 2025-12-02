export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Point {
  x: number;
  y: number;
}

export interface GameTheme {
  name: string;
  gridColor: string;
  snakeHeadColor: string;
  snakeBodyColor: string;
  foodColor: string;
  backgroundColor: string;
  glowColor: string;
  storyText: string;
}

export interface ScoreEntry {
  gameId: number;
  score: number;
  level: number;
}
