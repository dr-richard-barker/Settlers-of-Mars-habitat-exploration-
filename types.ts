
export enum GameState {
  START = 'START',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR',
}

export interface ScenePayload {
  story: string;
  imagePrompt: string;
  choices: string[];
  newItem: string | null;
  gameOver: boolean;
  habitatStatus: string;
}

export interface Scene extends ScenePayload {
  imageUrl: string;
  habitatImageUrl: string;
}

export interface StoryLogEntry {
  id: number;
  story: string;
}
