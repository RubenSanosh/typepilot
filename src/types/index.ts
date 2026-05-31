// src/types/index.ts

export interface TypingProfile {
  id: string;
  name: string;
  wpmMin: number;
  wpmMax: number;
  errorRate: number;       // 0.0 – 1.0
  pauseFrequency: number;  // 0.0 – 1.0
  correctionRate: number;  // 0.0 – 1.0 (how often mistakes get fixed)
}

export interface TypingSettings {
  profileId: string;
  wpmMin: number;
  wpmMax: number;
  errorRate: number;
  pauseFrequency: number;
  correctionRate: number;
}

export interface TypingStats {
  sessionDuration: number;   // ms
  charsTyped: number;
  wordsTyped: number;
  mistakesGenerated: number;
  correctionsPerformed: number;
  effectiveWpm: number;
}

export interface ExtensionMessage {
  type: 'START_TYPING' | 'STOP_TYPING' | 'STATS_UPDATE';
  payload?: {
    text?: string;
    settings?: TypingSettings;
    stats?: TypingStats;
  };
}

export type MistakeType =
  | 'adjacent_key'
  | 'missing_letter'
  | 'extra_letter'
  | 'transposed'
  | 'capitalization';

export interface Mistake {
  type: MistakeType;
  originalChar: string;
  typedChar: string;
  position: number;
}
