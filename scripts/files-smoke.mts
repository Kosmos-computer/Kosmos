/** One-shot smoke test for filesService (run: ARCO_DATA_DIR=/tmp/x npx tsx scripts/files-smoke.mts). */
import { filesService } from "../server/services/filesService.js";

const folder = filesService.create({ name: "Reports", kind: "folder" });
const file = filesService.create({
  name: "q3.md",
  kind: "file",
  parentId: folder.id,
  mimeType: "text/markdown",
  content: "# Q3",
});
console.log("root:", filesService.list().map((e) => e.name));
console.log("folder:", filesService.list({ parentId: folder.id }).map((e) => e.name));
console.log("read:", filesService.readContent(file.id));
filesService.writeContent(file.id, "# Q3 updated");
console.log("size after write:", filesService.get(file.id).size);
filesService.rename(file.id, "q3-final.md");
filesService.star(file.id, true);
console.log("starred:", filesService.list({ starred: true }).map((e) => e.name));
console.log("search:", filesService.search("q3").map((e) => e.name));
filesService.trash(folder.id);
console.log("trash:", filesService.list({ trashed: true }).map((e) => e.name));
console.log("root after trash:", filesService.list().map((e) => e.name));
filesService.restore(file.id);
const restored = filesService.get(file.id);
console.log("file restored, parent:", restored.parentId, "trashed:", restored.trashed);
filesService.delete(folder.id);
try {
  filesService.move(folder.id, null);
} catch (e) {
  console.log("deleted ok:", (e as Error).message);
}
const a = filesService.create({ name: "a", kind: "folder" });
const b = filesService.create({ name: "b", kind: "folder", parentId: a.id });
try {
  filesService.move(a.id, b.id);
} catch (e) {
  console.log("cycle guard:", (e as Error).message);
}
console.log("ALL OK");
