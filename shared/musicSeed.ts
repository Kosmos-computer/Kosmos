/** Seed catalog for the Music app — maps to local tirufm MP3s on disk. */
export type MusicSeedArtTone =
  | "rose"
  | "orange"
  | "amber"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "pink";

export interface MusicSeedTrack {
  id: string;
  title: string;
  fileName: string;
  artists: string;
  album: string;
  artTone: MusicSeedArtTone;
}

export const MUSIC_SEED_ALBUM = "Unknown Album";
export const MUSIC_SEED_ARTIST = "tirufm";

/** Curated subset of tirufm/Unknown Album for local playback testing. */
export const MUSIC_SEED_TRACKS: MusicSeedTrack[] = [
  { id: "aruna", title: "Aruna", fileName: "Aruna.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "rose" },
  { id: "chengam-road", title: "Chengam Road", fileName: "Chengam Road.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "orange" },
  { id: "glow", title: "Glow", fileName: "Glow.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "amber" },
  { id: "giri-valam", title: "Giri Valam", fileName: "Giri Valam.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "lime" },
  { id: "kaivalya", title: "Kaivalya", fileName: "Kaivalya.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "green" },
  { id: "sun-salutation", title: "Sun Salutation", fileName: "Sun Salutation.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "teal" },
  { id: "bhaja-govindam", title: "Bhaja Govindam — Song of Awakening", fileName: "Bhaja Govindam — Song of Awakening.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "cyan" },
  { id: "turiya", title: "III. TURIYA", fileName: "III. TURIYA.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "blue" },
  { id: "vismayo", title: "V. VISMAYO YOGABHŪMIKĀḤ", fileName: "V. VISMAYO YOGABHŪMIKĀḤ.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "violet" },
  { id: "om-namah-shivaya", title: "Om Namah Shivaya ॐ नमः शिवाय I", fileName: "Om Namah Shivaya ॐ नमः शिवाय I.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "indigo" },
  { id: "self-shining", title: "The Self Shining", fileName: "The Self Shining.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "purple" },
  { id: "jaago-abhi", title: "जागो अभी (Jaago Abhi) — Wake Up Now", fileName: "जागो अभी (Jaago Abhi)  Wake Up Now.mp3", artists: MUSIC_SEED_ARTIST, album: MUSIC_SEED_ALBUM, artTone: "pink" },
];

export function musicStreamPath(trackId: string): string {
  return `/api/music/stream/${encodeURIComponent(trackId)}`;
}

export function musicArtPath(trackId: string): string {
  return `/api/music/art/${encodeURIComponent(trackId)}`;
}
