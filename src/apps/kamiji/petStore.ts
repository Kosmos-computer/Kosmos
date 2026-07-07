import { create } from "zustand";
import type { EvolutionStage, PetAction, PetMood, PetState, TamagotchiState } from "./types";

const STORAGE_KEY = "arco:kamiji-pet";
const TICK_MS = 1000;

const STAGE_AGES: Record<EvolutionStage, number> = {
  egg: 1,
  baby: 5,
  child: 15,
  teen: 30,
  adult: 60,
};

const createInitialPet = (): PetState => ({
  name: "Kamiji",
  stage: "egg",
  mood: "neutral",
  stats: {
    hunger: 80,
    happiness: 80,
    energy: 80,
    cleanliness: 100,
    health: 100,
  },
  ageMinutes: 0,
  poopCount: 0,
  isSleeping: false,
  isSick: false,
  isDead: false,
  discipline: 50,
  careScore: 50,
  lastFedAt: Date.now(),
  lastPlayedAt: Date.now(),
  lastUpdatedAt: Date.now(),
  birthTime: Date.now(),
});

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const getStage = (ageMinutes: number): EvolutionStage => {
  if (ageMinutes < STAGE_AGES.egg) return "egg";
  if (ageMinutes < STAGE_AGES.baby) return "baby";
  if (ageMinutes < STAGE_AGES.child) return "child";
  if (ageMinutes < STAGE_AGES.teen) return "teen";
  return "adult";
};

const getMood = (pet: PetState): PetMood => {
  if (pet.isDead) return "dead";
  if (pet.isSleeping) return "sleeping";
  if (pet.isSick || pet.stats.health < 35) return "sick";
  if (pet.stats.hunger < 25) return "hungry";
  if (pet.stats.energy < 25) return "tired";
  if (pet.stats.happiness > 70 && pet.stats.hunger > 50) return "happy";
  return "neutral";
};

const loadSavedState = (): Partial<TamagotchiState> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<TamagotchiState>;
  } catch {
    return null;
  }
};

const saveState = (state: TamagotchiState) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pet: state.pet,
        timeScale: state.timeScale,
        isLightsOn: state.isLightsOn,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
};

interface PetStore extends TamagotchiState {
  performAction: (action: PetAction) => void;
  setTimeScale: (scale: number) => void;
  toggleLights: () => void;
  tick: () => void;
  resetPet: () => void;
  dismissMessage: () => void;
}

const saved = loadSavedState();

export const usePetStore = create<PetStore>((set, get) => ({
  pet: saved?.pet ?? createInitialPet(),
  timeScale: saved?.timeScale ?? 1,
  message: null,
  isLightsOn: saved?.isLightsOn ?? true,

  performAction: (action: PetAction) => {
    const { pet, isLightsOn } = get();
    if (pet.isDead) return;

    let message = "";
    const nextPet = { ...pet, stats: { ...pet.stats } };

    switch (action) {
      case "feed":
        if (pet.isSleeping) {
          message = "Shh! Kamiji is sleeping.";
          break;
        }
        if (pet.stats.hunger >= 95) {
          message = "Kamiji is already full!";
          break;
        }
        nextPet.stats.hunger = clamp(pet.stats.hunger + 25);
        nextPet.stats.happiness = clamp(pet.stats.happiness + 5);
        nextPet.lastFedAt = Date.now();
        nextPet.careScore = clamp(pet.careScore + 2);
        message = "Yum! Kamiji enjoyed the meal.";
        break;

      case "play":
        if (pet.isSleeping) {
          message = "Kamiji is too sleepy to play.";
          break;
        }
        if (pet.stats.energy < 15) {
          message = "Kamiji is too tired. Let them rest first.";
          break;
        }
        nextPet.stats.happiness = clamp(pet.stats.happiness + 20);
        nextPet.stats.energy = clamp(pet.stats.energy - 15);
        nextPet.stats.hunger = clamp(pet.stats.hunger - 8);
        nextPet.lastPlayedAt = Date.now();
        nextPet.careScore = clamp(pet.careScore + 3);
        message = "Wheee! Kamiji had so much fun!";
        break;

      case "clean":
        if (pet.poopCount === 0 && pet.stats.cleanliness >= 90) {
          message = "Everything is already sparkling clean!";
          break;
        }
        nextPet.poopCount = 0;
        nextPet.stats.cleanliness = 100;
        nextPet.stats.happiness = clamp(pet.stats.happiness + 8);
        nextPet.careScore = clamp(pet.careScore + 2);
        message = "All clean! Kamiji feels fresh.";
        break;

      case "sleep":
        if (!isLightsOn) {
          nextPet.isSleeping = true;
          message = "Goodnight, Kamiji...";
        } else {
          message = "Turn off the lights first!";
        }
        break;

      case "wake":
        nextPet.isSleeping = false;
        nextPet.stats.energy = clamp(pet.stats.energy + 10);
        message = "Good morning, Kamiji!";
        break;

      case "medicine":
        if (!pet.isSick && pet.stats.health >= 80) {
          message = "Kamiji is healthy — no medicine needed.";
          break;
        }
        nextPet.isSick = false;
        nextPet.stats.health = clamp(pet.stats.health + 30);
        nextPet.careScore = clamp(pet.careScore + 1);
        message = "Kamiji took their medicine and feels better.";
        break;
    }

    nextPet.mood = getMood(nextPet);
    set({
      pet: nextPet,
      message: message ? { text: message, timestamp: Date.now() } : get().message,
    });
    saveState(get());
  },

  setTimeScale: (scale: number) => {
    set({ timeScale: scale });
    saveState(get());
  },

  toggleLights: () => {
    const isLightsOn = !get().isLightsOn;
    set({ isLightsOn });
    if (!isLightsOn && !get().pet.isDead) {
      set((state) => ({
        pet: { ...state.pet, isSleeping: true, mood: "sleeping" },
        message: { text: "Lights out. Kamiji drifts to sleep...", timestamp: Date.now() },
      }));
    }
    saveState(get());
  },

  tick: () => {
    const { pet, timeScale, isLightsOn } = get();
    if (pet.isDead) return;

    const minutesPassed = (1 / 60) * timeScale;
    const nextPet: PetState = {
      ...pet,
      stats: { ...pet.stats },
      ageMinutes: pet.ageMinutes + minutesPassed,
    };

    const decayMultiplier = nextPet.isSleeping ? 0.4 : 1;

    nextPet.stats.hunger = clamp(nextPet.stats.hunger - 1.2 * minutesPassed * decayMultiplier);
    nextPet.stats.happiness = clamp(nextPet.stats.happiness - 0.6 * minutesPassed * decayMultiplier);
    nextPet.stats.energy = clamp(
      nextPet.isSleeping
        ? nextPet.stats.energy + 2 * minutesPassed
        : nextPet.stats.energy - 0.8 * minutesPassed,
    );
    nextPet.stats.cleanliness = clamp(nextPet.stats.cleanliness - 0.4 * minutesPassed);

    if (nextPet.stats.hunger > 40 && Math.random() < 0.02 * timeScale && nextPet.poopCount < 4) {
      nextPet.poopCount += 1;
      nextPet.stats.cleanliness = clamp(nextPet.stats.cleanliness - 15);
    }

    if (nextPet.poopCount > 0) {
      nextPet.stats.happiness = clamp(nextPet.stats.happiness - 0.5 * minutesPassed * nextPet.poopCount);
      nextPet.stats.health = clamp(nextPet.stats.health - 0.3 * minutesPassed * nextPet.poopCount);
    }

    if (nextPet.stats.hunger < 15 || nextPet.stats.happiness < 15) {
      nextPet.stats.health = clamp(nextPet.stats.health - 1.5 * minutesPassed);
    }

    if (nextPet.stats.health < 50 && !nextPet.isSick) {
      nextPet.isSick = true;
      set({ message: { text: "Oh no! Kamiji is feeling sick...", timestamp: Date.now() } });
    }

    if (nextPet.stats.health <= 0) {
      nextPet.isDead = true;
      nextPet.mood = "dead";
      set({
        pet: nextPet,
        message: { text: "Kamiji has passed away... Press reset to start anew.", timestamp: Date.now() },
      });
      saveState(get());
      return;
    }

    const newStage = getStage(nextPet.ageMinutes);
    if (newStage !== nextPet.stage) {
      nextPet.stage = newStage;
      const stageNames: Record<EvolutionStage, string> = {
        egg: "an egg",
        baby: "a baby",
        child: "a child",
        teen: "a teen",
        adult: "an adult",
      };
      set({ message: { text: `Kamiji hatched into ${stageNames[newStage]}!`, timestamp: Date.now() } });
    }

    if (!isLightsOn && !nextPet.isSleeping && nextPet.stats.energy < 30) {
      nextPet.isSleeping = true;
    }

    nextPet.mood = getMood(nextPet);
    nextPet.lastUpdatedAt = Date.now();
    set({ pet: nextPet });
    saveState(get());
  },

  resetPet: () => {
    set({
      pet: createInitialPet(),
      message: { text: "A new Kamiji egg has arrived!", timestamp: Date.now() },
      isLightsOn: true,
    });
    saveState(get());
  },

  dismissMessage: () => set({ message: null }),
}));

let tickInterval: number | undefined;

export function startKamijiClock() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = window.setInterval(() => {
    usePetStore.getState().tick();
  }, TICK_MS);
}

export function stopKamijiClock() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = undefined;
  }
}
