#!/usr/bin/env node
/**
 * Restauration des metadonnees To-cloud.
 *
 * Une sauvegarde ne vaut que si on l'a deja essayee. Ce script relit une
 * archive prise par le Worker et reecrit les tables dans Supabase.
 *
 *   node scripts/restore.mjs to-cloud-backup-2026-08-24.json.gz
 *
 * Variables attendues :
 *   SUPABASE_URL          https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY  cle secrete (elle contourne les regles RLS)
 *
 * Les lignes deja presentes sont mises a jour, les autres inserees : relancer
 * le script deux fois ne cree pas de doublon.
 */

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [, , archive] = process.argv;
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

if (!archive || !URL_ || !KEY) {
  console.error("Usage : SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/restore.mjs <archive.json.gz>");
  process.exit(1);
}

const raw = readFileSync(archive);
const data = JSON.parse(
  archive.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8")
);

console.log(`Sauvegarde du ${data.at}`);
console.log(`  ${data.profiles.length} profils`);
console.log(`  ${data.folders.length} dossiers`);
console.log(`  ${data.files.length} fichiers`);
console.log(`  ${data.chunks.length} morceaux`);

async function push(table, rows, conflict) {
  if (!rows.length) return;

  // par lots : une seule requete de plusieurs milliers de lignes serait refusee
  const size = 500;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: "POST",
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`${table} : ${res.status} ${await res.text()}`);
    }
    process.stdout.write(`\r  ${table} : ${Math.min(i + size, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

try {
  // L'ordre compte : un fichier renvoie a son dossier, un morceau a son fichier.
  await push("profiles", data.profiles, "id");
  await push("folders", data.folders, "id");
  await push("files", data.files, "id");
  await push("chunks", data.chunks, "file_id,idx");
  console.log("\nRestauration terminee.");
  console.log("Les vignettes ne sont pas dans la sauvegarde : les grilles d'images");
  console.log("afficheront une icone jusqu'au prochain envoi de chaque fichier.");
} catch (e) {
  console.error(`\nEchec : ${e.message}`);
  process.exit(1);
}
