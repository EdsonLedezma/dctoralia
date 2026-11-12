import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = join(tmpdir(), "dopilot-ui-previews");
mkdirSync(directory, { recursive: true });
export const previewPath = (name: string) => join(directory, name);
