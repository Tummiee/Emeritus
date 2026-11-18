import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync(
    new URL("../supabase/migration-manifest.json", import.meta.url),
    "utf8",
  ),
);
const upgrade = process.argv.includes("--upgrade");
// Output SQL for review. This tool never connects to a database.
for (const name of manifest) {
  if (upgrade && !name.startsWith("202610")) continue;
  console.log(
    `\n-- ${name}\nSET check_function_bodies = ${name.startsWith("202610") ? "on" : "off"};`,
  );
  console.log(
    readFileSync(
      new URL(`../supabase/migrations/${name}`, import.meta.url),
      "utf8",
    ),
  );
}
