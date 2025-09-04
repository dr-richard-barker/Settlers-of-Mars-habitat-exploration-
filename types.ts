
export enum GameState {
  START = 'START',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR',
}

export interface HabitatModule {
  id: string;
  type: 'shuttle' | 'biodome' | 'tunnel';
  connectedToId?: string | null;
}

export interface ScenePayload {
  story: string;
  imagePrompt: string;
  choices: string[];
  newItem: string | null;
  gameOver: boolean;
  habitatStatus: string;
  habitatModules: HabitatModule[];
}

export interface Scene extends ScenePayload {
  imageUrl: string;
}

export interface StoryLogEntry {
  id: number;
  story: string;
}