/** Piano note definitions — two octaves starting at C4. */

export type PianoNote = {
  id: string;
  label: string;
  /** Frequency in Hz (A4 = 440). */
  frequency: number;
  kind: "white" | "black";
  /** White-key index used to place black keys. */
  whiteIndex: number;
  /** Computer-keyboard shortcut (lowercase). */
  key: string;
};

function freq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Layout (computer keys):
 *   Black:  2 3   5 6 7   9 0   =
 *   White: a s d f g h j k l ; '
 * Second octave continues on the top row / shifted whites.
 */
export const PIANO_NOTES: PianoNote[] = [
  { id: "C4", label: "C4", frequency: freq(60), kind: "white", whiteIndex: 0, key: "a" },
  { id: "C#4", label: "C#", frequency: freq(61), kind: "black", whiteIndex: 0, key: "w" },
  { id: "D4", label: "D", frequency: freq(62), kind: "white", whiteIndex: 1, key: "s" },
  { id: "D#4", label: "D#", frequency: freq(63), kind: "black", whiteIndex: 1, key: "e" },
  { id: "E4", label: "E", frequency: freq(64), kind: "white", whiteIndex: 2, key: "d" },
  { id: "F4", label: "F", frequency: freq(65), kind: "white", whiteIndex: 3, key: "f" },
  { id: "F#4", label: "F#", frequency: freq(66), kind: "black", whiteIndex: 3, key: "t" },
  { id: "G4", label: "G", frequency: freq(67), kind: "white", whiteIndex: 4, key: "g" },
  { id: "G#4", label: "G#", frequency: freq(68), kind: "black", whiteIndex: 4, key: "y" },
  { id: "A4", label: "A", frequency: freq(69), kind: "white", whiteIndex: 5, key: "h" },
  { id: "A#4", label: "A#", frequency: freq(70), kind: "black", whiteIndex: 5, key: "u" },
  { id: "B4", label: "B", frequency: freq(71), kind: "white", whiteIndex: 6, key: "j" },
  { id: "C5", label: "C5", frequency: freq(72), kind: "white", whiteIndex: 7, key: "k" },
  { id: "C#5", label: "C#", frequency: freq(73), kind: "black", whiteIndex: 7, key: "o" },
  { id: "D5", label: "D", frequency: freq(74), kind: "white", whiteIndex: 8, key: "l" },
  { id: "D#5", label: "D#", frequency: freq(75), kind: "black", whiteIndex: 8, key: "p" },
  { id: "E5", label: "E", frequency: freq(76), kind: "white", whiteIndex: 9, key: ";" },
  { id: "F5", label: "F", frequency: freq(77), kind: "white", whiteIndex: 10, key: "'" },
  { id: "F#5", label: "F#", frequency: freq(78), kind: "black", whiteIndex: 10, key: "]" },
  { id: "G5", label: "G", frequency: freq(79), kind: "white", whiteIndex: 11, key: "z" },
  { id: "G#5", label: "G#", frequency: freq(80), kind: "black", whiteIndex: 11, key: "x" },
  { id: "A5", label: "A", frequency: freq(81), kind: "white", whiteIndex: 12, key: "c" },
  { id: "A#5", label: "A#", frequency: freq(82), kind: "black", whiteIndex: 12, key: "v" },
  { id: "B5", label: "B", frequency: freq(83), kind: "white", whiteIndex: 13, key: "b" },
  { id: "C6", label: "C6", frequency: freq(84), kind: "white", whiteIndex: 14, key: "n" },
];

export const WHITE_NOTES = PIANO_NOTES.filter((n) => n.kind === "white");
export const BLACK_NOTES = PIANO_NOTES.filter((n) => n.kind === "black");

export const NOTE_BY_ID = new Map(PIANO_NOTES.map((n) => [n.id, n]));
export const NOTE_BY_KEY = new Map(PIANO_NOTES.map((n) => [n.key, n]));
