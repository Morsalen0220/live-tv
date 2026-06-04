export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error' | 'buffering';

export interface UserPreferences {
  favorites: string[]; // Channel names
  recentChannels: string[]; // Channel names
  volume: number;
  muted: boolean;
  theaterMode: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  avatar: string;
}
