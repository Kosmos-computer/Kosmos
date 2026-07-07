export type EvolutionStage = "egg" | "baby" | "child" | "teen" | "adult";
export type PetMood = "happy" | "neutral" | "hungry" | "tired" | "sick" | "sleeping" | "dead";
export type PetAction = "feed" | "play" | "clean" | "sleep" | "wake" | "medicine";

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  health: number;
}

export interface PetState {
  name: string;
  stage: EvolutionStage;
  mood: PetMood;
  stats: PetStats;
  ageMinutes: number;
  poopCount: number;
  isSleeping: boolean;
  isSick: boolean;
  isDead: boolean;
  discipline: number;
  careScore: number;
  lastFedAt: number;
  lastPlayedAt: number;
  lastUpdatedAt: number;
  birthTime: number;
}

export interface GameMessage {
  text: string;
  timestamp: number;
}

export interface TamagotchiState {
  pet: PetState;
  timeScale: number;
  message: GameMessage | null;
  isLightsOn: boolean;
}
