import type { ImageGenSize, ImageGenStyle } from "@shared/types";

export type { ImageGenSize, ImageGenStyle };

export interface ImageGenWorkspaceData {
  defaultPrompt: string;
  examplePrompts: string[];
  sizes: { id: ImageGenSize; label: string }[];
  styles: { id: ImageGenStyle; label: string }[];
}

export const IMAGE_GEN_DATA: ImageGenWorkspaceData = {
  defaultPrompt: "A serene space station orbiting a ringed planet at golden hour",
  examplePrompts: [
    "A serene space station orbiting a ringed planet at golden hour",
    "Minimalist product photo of a ceramic mug on a marble surface, soft studio lighting",
    "Watercolor illustration of a fox reading in a cozy library, warm tones",
    "Futuristic city skyline at night with neon reflections on wet streets",
    "Macro photograph of dew drops on a fern leaf, shallow depth of field",
  ],
  sizes: [
    { id: "1024x1024", label: "Square" },
    { id: "1024x1792", label: "Portrait" },
    { id: "1792x1024", label: "Landscape" },
  ],
  styles: [
    { id: "vivid", label: "Vivid" },
    { id: "natural", label: "Natural" },
  ],
};
