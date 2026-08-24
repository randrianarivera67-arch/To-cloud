#!/usr/bin/env node
/**
 * Declare le schema `mg.tocloud.app://` dans le manifeste Android.
 *
 * Capacitor regenere le projet Android a chaque build : toute modification
 * faite a la main y disparait. Ce script la repose, juste apres `cap add`.
 *
 * Sans cette declaration, Android ignore l'adresse de retour et la connexion
 * Google reste bloquee dans le navigateur, sans jamais revenir a l'application.
 */

import { readFileSync, writeFileSync } from "node:fs";

const PATH = "android/app/src/main/AndroidManifest.xml";
const SCHEME = "mg.tocloud.app";

const FILTER = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" />
            </intent-filter>
`;

let xml = readFileSync(PATH, "utf8");

if (xml.includes(`android:scheme="${SCHEME}"`)) {
  console.log("Schema deja declare, rien a faire.");
  process.exit(0);
}

// on l'ajoute a la suite du filtre principal, dans la meme activite
const anchor = "</intent-filter>";
const at = xml.indexOf(anchor);
if (at === -1) {
  console.error("Filtre d'intention introuvable : manifeste inattendu.");
  process.exit(1);
}

xml = xml.slice(0, at + anchor.length) + FILTER + xml.slice(at + anchor.length);
writeFileSync(PATH, xml);

console.log(`Schema ${SCHEME}:// declare dans le manifeste.`);
