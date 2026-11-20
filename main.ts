// GTA 6 trophy guide, round 3: the entrypoint. It hands the static guide app
// and its screenshots over to the grader, then writes the dossier the judge
// reads. The guide itself lives in app/ as plain files: no build step, and
// nothing is fetched over the network at run time. Serve it locally with
// `node serve.ts`, or run the entry program with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const shots = ["1-checklist.jpg", "2-guide.jpg", "3-roadmap.jpg", "4-filters.jpg"];

mkdirSync(dest, { recursive: true });
cpSync(join(root, "app"), join(dest, "app"), { recursive: true });
mkdirSync(join(dest, "screenshots"), { recursive: true });
if (existsSync(join(root, "screenshots"))) {
  cpSync(join(root, "screenshots"), join(dest, "screenshots"), { recursive: true });
}
for (const shot of shots) {
  const p = join(root, "screenshots", shot);
  if (!existsSync(p)) throw new Error("Missing screenshot: " + shot);
  if (statSync(p).size === 0) throw new Error("Empty screenshot: " + shot);
}

writeFileSync(
  join(dest, "dossier.json"),
  buildDossier(dest, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
