import { ChattyFaceEngine } from "./engines/ChattyFaceEngine";
import { KamijiDemoEngine } from "./engines/KamijiDemoEngine";
import { KamijiRigEngine } from "./engines/KamijiRigEngine";
import { CssFaceEngine } from "./CssFaceEngine";
import type { FaceRigId } from "./faceRigPreferences";
import type { FaceRigEngine } from "./types";

export function createFaceRigEngine(id: FaceRigId): FaceRigEngine {
  switch (id) {
    case "chatty":
      return new ChattyFaceEngine();
    case "kamiji-rig":
      return new KamijiRigEngine();
    case "kamiji-demo":
      return new KamijiDemoEngine();
    case "arco":
    default:
      return new CssFaceEngine();
  }
}
