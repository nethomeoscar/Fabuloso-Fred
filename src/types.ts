export type BoardId = 'classic' | 'radial' | 'hex';
export type GameMode = 'local' | 'online';

export interface LocalGameState {
  boardId: BoardId;
  sequence: number[];
  currentIndex: number;
  isPlayingSequence: boolean;
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  gameStatus: 'idle' | 'playing' | 'gameover';
  speedMs: number;
  clicksCount: number;
  totalClickDurationMs: number;
  clickStartTime: number | null;
  diagnostic: {
    rank: string;
    feedback: string;
    percentage: number;
    speed: string;
  } | null;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lives: number;
  failed: boolean;
}

export interface OnlineRoom {
  id: string;
  boardId: BoardId;
  mode: 'sudden_death' | 'lives';
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'gameover';
  sequence: number[];
  currentIndex: number;
  turnPlayerId: string | null;
  winnerId: string | null;
}
