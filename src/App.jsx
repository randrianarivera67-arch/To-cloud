import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, Image, Film, Music, FileText, Package, Box, Upload, Check, X,
  ArrowLeft, MoreVertical, Download, Share2, Trash2, SlidersHorizontal,
  FolderOpen, Menu, Sparkles, Settings, HelpCircle, Languages, Eye, Lock,
  Info, User, UserPlus, LogOut, ChevronRight, Wifi, Bell, ShieldCheck,
  Pencil, CircleAlert, CheckSquare, Cloud, Zap, ZoomIn, ZoomOut, Mail, Loader2,
  RotateCcw, Folder, FolderPlus, FolderInput, ChevronLeft, Link2
} from "lucide-react";
import Auth from "./Auth.jsx";
import InstallBanner from "./InstallBanner.jsx";
import { load, save } from "./lib/storage.js";
import { supabase, profile, CONFIGURED, MISSING } from "./lib/api.js";
import { onHardwareBack } from "./lib/native.js";
import { useFiles, humanSize } from "./lib/useFiles.js";
import {
  upload, download, downloadToDisk, removeFile, objectUrl, logout, categorize,
  listTrash, restoreFile, purgeFile, emptyTrash,
  addFolder, dropFolder, moveFile, shareFile, folderCounts, trashStats,
} from "./lib/api.js";
import AudioPlayer from "./AudioPlayer.jsx";
import DocViewer from "./DocViewer.jsx";
import { UploadProvider, UploadStatus, useUploads } from "./UploadQueue.jsx";

/* ─────────── tokens ─────────── */
const T = {
  bg: "#F5F3FB", card: "#FFFFFF", sunken: "#EDEAF7", line: "#E8E4F3",
  text: "#17142A", mute: "#605C7A", faint: "#9793B0",
  rose: "#E01B7A", blue: "#0A84D6", gold: "#B07800", violet: "#7332E0", grey: "#7B7799",
  roseBg: "#FEE8F3", blueBg: "#E2F1FD", goldBg: "#FCF1D8", violetBg: "#EFE6FE", greyBg: "#EDEAF7",
  stage: "#141126",
};
const DISPLAY = "'Chakra Petch', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const EASE = "cubic-bezier(.2,.8,.2,1)";
const halo = c => `0 0 0 1px ${c}55, 0 0 16px -2px ${c}88, 0 0 34px -8px ${c}66, 0 10px 26px -14px ${c}`;

/* ─────────── i18n ─────────── */
const LANGS = [
  { code: "fr", label: "Français", native: "Français" },
  { code: "mg", label: "Malgache", native: "Malagasy" },
  { code: "en", label: "Anglais", native: "English" },
  { code: "es", label: "Espagnol", native: "Español" },
  { code: "pt", label: "Portugais", native: "Português" },
  { code: "de", label: "Allemand", native: "Deutsch" },
  { code: "it", label: "Italien", native: "Italiano" },
  { code: "ar", label: "Arabe", native: "العربية" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "zh", label: "Chinois", native: "中文" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ru", label: "Russe", native: "Русский" },
  { code: "ja", label: "Japonais", native: "日本語" },
  { code: "tr", label: "Turc", native: "Türkçe" },
  { code: "id", label: "Indonésien", native: "Bahasa Indonesia" },
];

const STR = {
  fr: {
    search: "Rechercher un fichier…", storage: "Stockage", free: "GRATUIT",
    categories: "Catégories", files: "fichiers", clean: "Nettoyer",
    cleanSub: "8,2 Go récupérables", trash: "Corbeille", settings: "Paramètres",
    help: "Aide", privacy: "Confidentialité", terms: "Conditions d'utilisation",
    account: "Compte", addAccount: "Ajouter un compte",
    addAccountSub: "Basculer entre plusieurs comptes", signOut: "Se déconnecter",
    used: "utilisés", language: "Langue", selectAll: "Tout sélectionner",
    deselectAll: "Tout désélectionner", selected: "sélectionné(s)",
    download: "Télécharger", share: "Partager", del: "Supprimer",
    rename: "Renommer", details: "Détails", parts: "parties", open: "Ouvrir",
    empty: "Cette catégorie est vide", emptySub: "Touchez le bouton d'envoi pour commencer.",
    uploading: "Envoi en cours", uploaded: "Envoi terminé", saved: "Enregistré",
    speed: "Débit", nodes: "Nœuds actifs", freeSpace: "libre",
    more: "Plus d'actions",
    bulkNote: "L'action s'applique à tous les fichiers sélectionnés.",
    queued: "En attente",
    folderMixed: "Un dossier accepte tous les types de fichiers. Ils seront triés automatiquement.",
    wrongType: "{n} fichier(s) ignoré(s) : cette catégorie n'accepte que des {c}.",
    defaultFolders: "Par catégorie", myFolders: "Mes dossiers",
    move: "Déplacer", rootFolder: "Racine de la catégorie",
    noFolderYet: "Aucun dossier dans cette catégorie. Créez-en un depuis l'écran Dossiers.",
    copyLink: "Copier le lien", copyLinkSub: "Lien de téléchargement, valable 7 jours",
    linkCopied: "Lien copié.", linkValid: "Valable {d} jours. Toute personne ayant ce lien peut télécharger le fichier.",
    uploadHere: "Envoyer ici",
    deleting: "Suppression en cours…",
    restoring: "Restauration…",
    trashEmpty: "Corbeille vide", trashEmptySub: "Les fichiers supprimés apparaîtront ici.",
    trashNote: "Ces fichiers occupent toujours votre espace. Videz la corbeille pour le libérer.",
    restore: "Restaurer", purge: "Supprimer définitivement", purgeAll: "Vider la corbeille",
    purgeAllConfirm: "Supprimer définitivement tous les fichiers de la corbeille ?",
    folders: "Dossiers", openFolders: "Parcourir les dossiers",
    foldersNote: "Un dossier accepte tous les types de fichiers ; ils restent visibles dans leur catégorie.",
    newFolder: "Nouveau dossier", folderName: "Nom du dossier",
    noFolder: "Aucun dossier", noFolderSub: "Créez-en un pour organiser vos fichiers.",
    dropFolderConfirm: "Supprimer ce dossier ? Les fichiers seront conservés.",
    create: "Créer", cancel: "Annuler",
    sortRecent: "Récents", sortName: "Nom", sortSize: "Taille",
    noMatch: "Aucun résultat", noMatchSub: "Essayez un autre mot.",
    searchHint: "Tapez pour chercher dans tous vos fichiers.",
    nowPlaying: "Lecture", queue: "File d'attente",
    shuffle: "Aléatoire", repeat: "Répéter", prev: "Précédent", next: "Suivant",
    play: "Lecture", pause: "Pause",
    needSpace: "Besoin de plus d'espace ?",
    needSpaceSub: "Écrivez-nous avec votre adresse de compte et l'espace souhaité. Réponse sous 48 h.",
    faq: "Questions fréquentes",
    q1: "Mon envoi s'est arrêté", a1: "Relancez-le depuis le début. La reprise n'est pas encore disponible.",
    q2: "Un fichier met du temps à s'ouvrir", a2: "Les gros fichiers sont reconstitués avant lecture. Comptez quelques secondes.",
    q3: "J'ai supprimé un fichier par erreur", a3: "La suppression est définitive pour l'instant. Vérifiez avant de confirmer.",
    soon: "Bientôt disponible",
    trashSoon: "La suppression est définitive pour l'instant. La corbeille arrivera avec la sauvegarde du registre.",
    cleanSoon: "Le nettoyage des doublons et des fragments interrompus demande un inventaire côté serveur, pas encore écrit.",
    multiSoon: "Un seul compte à la fois pour l'instant. Déconnectez-vous pour en utiliser un autre.",
    activeAccount: "Compte actif",
    prefs: "Préférences", about: "À propos",
    wifiOnly: "Wi-Fi uniquement", wifiOnlySub: "Avertir avant un envoi volumineux en données mobiles",
    notif: "Notifications", notifSub: "Prévenir à la fin de chaque envoi",
    storedOn: "Vos fichiers", storedOnSub: "Chiffrés en transit et stockés sur un espace privé",
    prefsNote: "Ces préférences sont gardées sur cet appareil uniquement.",
    holdToSelect: "Maintenez appuyé pour sélectionner",
    loading: "Chargement…", loadFailed: "Impossible d'ouvrir ce fichier",
    retry: "Réessayer", uploadFailed: "Échec de l'envoi", emptyShort: "Vide",
    chooseCat: "Où l'envoyer ?", chooseCatSub: "Le fichier sera rangé dans cette catégorie.",
    savedIn: "Voir dans", assembling: "Assemblage des parties…", noPreview: "Aperçu indisponible",
    noPreviewSub: "Ce type de fichier ne s'affiche pas dans l'application.",
    cats: { sary: "Images", video: "Vidéos", feo: "Audio", doc: "Documents", apk: "Applications", hafa: "Autres" },
  },
  mg: {
    search: "Hitady rakitra…", storage: "Toerana", free: "MAIMAIM-POANA",
    categories: "Sokajy", files: "rakitra", clean: "Hanadio",
    cleanSub: "8,2 Go azo averina", trash: "Daba fanariana", settings: "Kirakira",
    help: "Fanampiana", privacy: "Fiainana manokana", terms: "Fepetra fampiasana",
    account: "Kaonty", addAccount: "Hanampy kaonty",
    addAccountSub: "Mifandimby kaonty maromaro", signOut: "Hivoaka",
    used: "ampiasaina", language: "Fiteny", selectAll: "Fidio daholo",
    deselectAll: "Esory daholo", selected: "voafidy",
    download: "Alaina", share: "Zaraina", del: "Fafana",
    rename: "Ovao anarana", details: "Antsipiriany", parts: "ampahany", open: "Sokafy",
    empty: "Mbola foana ity sokajy ity", emptySub: "Tsindrio ny bokotra fandefasana.",
    uploading: "Alefa ankehitriny", uploaded: "Vita ny fandefasana", saved: "Voatahiry",
    speed: "Hafainganana", nodes: "Node mavitrika", freeSpace: "malalaka",
    more: "Hetsika hafa",
    bulkNote: "Mihatra amin'ny rakitra voafidy rehetra ny hetsika.",
    queued: "Miandry",
    folderMixed: "Mandray karazan-drakitra rehetra ny lahatahiry. Voalamina ho azy izy ireo.",
    wrongType: "Rakitra {n} tsy noraisina: {c} ihany no eken'ity sokajy ity.",
    defaultFolders: "Araka ny sokajy", myFolders: "Ny lahatahiriko",
    move: "Afindra", rootFolder: "Fototry ny sokajy",
    noFolderYet: "Tsy misy lahatahiry amin'ity sokajy ity. Mamorona iray ao amin'ny Lahatahiry.",
    copyLink: "Adikao ny rohy", copyLinkSub: "Rohy fakàna, mandritra ny 7 andro",
    linkCopied: "Voadika ny rohy.", linkValid: "Mandritra ny {d} andro. Izay rehetra manana io rohy io dia afaka maka ny rakitra.",
    uploadHere: "Alefaso eto",
    deleting: "Mamafa…",
    restoring: "Mamerina…",
    trashEmpty: "Foana ny daba", trashEmptySub: "Ho hita eto ny rakitra voafafa.",
    trashNote: "Mbola mandany ny toeranao ireto rakitra ireto. Foano ny daba mba hanafaka azy.",
    restore: "Avereno", purge: "Fafao tanteraka", purgeAll: "Foano ny daba",
    purgeAllConfirm: "Hofafana tanteraka ny rakitra rehetra ao amin'ny daba?",
    folders: "Lahatahiry", openFolders: "Hijery ny lahatahiry",
    foldersNote: "Mandray karazan-drakitra rehetra ny lahatahiry; mbola hita ao amin'ny sokajiny ihany izy ireo.",
    newFolder: "Lahatahiry vaovao", folderName: "Anaran'ny lahatahiry",
    noFolder: "Tsy misy lahatahiry", noFolderSub: "Mamorona iray mba handaminana ny rakitrao.",
    dropFolderConfirm: "Hofafana ity lahatahiry ity? Hotazonina ny rakitra.",
    create: "Foronina", cancel: "Aoka",
    sortRecent: "Vaovao", sortName: "Anarana", sortSize: "Habe",
    noMatch: "Tsy misy valiny", noMatchSub: "Andramo teny hafa.",
    searchHint: "Soraty mba hitady ao amin'ny rakitrao rehetra.",
    nowPlaying: "Mihaino", queue: "Lisitra",
    shuffle: "Kisendrasendra", repeat: "Averina", prev: "Teo aloha", next: "Manaraka",
    play: "Alefaso", pause: "Ajanony",
    needSpace: "Mila toerana bebe kokoa?",
    needSpaceSub: "Andefaso mailaka miaraka amin'ny adiresy kaontinao sy ny habe ilainao. Valiny ao anatin'ny 48 ora.",
    faq: "Fanontaniana matetika",
    q1: "Tapaka ny fandefasako", a1: "Avereno atomboka. Mbola tsy misy ny fanohizana.",
    q2: "Ela vao misokatra ny rakitra", a2: "Amboarina indray ny rakitra lehibe alohan'ny lecture. Miandrasa segondra vitsy.",
    q3: "Diso namafa rakitra aho", a3: "Tsy azo averina ny famafana amin'izao. Hamarino alohan'ny hanamafisana.",
    soon: "Ho avy tsy ho ela",
    trashSoon: "Tsy azo averina ny famafana amin'izao. Ho avy miaraka amin'ny backup ny daba fanariana.",
    cleanSoon: "Mila fanisana any amin'ny serveur ny fanadiovana, mbola tsy vita.",
    multiSoon: "Kaonty iray ihany aloha. Mivoaha raha hampiasa hafa.",
    activeAccount: "Kaonty mandeha",
    prefs: "Safidy", about: "Momba",
    wifiOnly: "Wi-Fi ihany", wifiOnlySub: "Mampitandrina alohan'ny fandefasana lehibe amin'ny data",
    notif: "Fampandrenesana", notifSub: "Mampahafantatra rehefa vita ny fandefasana",
    storedOn: "Ny rakitrao", storedOnSub: "Voaaro mandritra ny fandefasana, tehirizina amin'ny toerana manokana",
    prefsNote: "Ao amin'ity finday ity ihany no itehirizana ireo safidy ireo.",
    holdToSelect: "Tazomy mba hifidy",
    loading: "Miandry…", loadFailed: "Tsy afaka nanokatra ity rakitra ity",
    retry: "Andramo indray", uploadFailed: "Tsy tafita ny fandefasana", emptyShort: "Foana",
    chooseCat: "Alefa aiza?", chooseCatSub: "Ho tehirizina ao amin'ity sokajy ity ny rakitra.",
    savedIn: "Jereo ao amin'ny", assembling: "Mampitambatra ny ampahany…", noPreview: "Tsy azo jerena",
    noPreviewSub: "Tsy miseho ao anatin'ny app ity karazan-drakitra ity.",
    cats: { sary: "Sary", video: "Horonan-tsary", feo: "Feo", doc: "Antontan-taratasy", apk: "Rindrambaiko", hafa: "Hafa" },
  },
  en: {
    search: "Search files…", storage: "Storage", free: "FREE",
    categories: "Categories", files: "files", clean: "Clean up",
    cleanSub: "8.2 GB can be freed", trash: "Trash", settings: "Settings",
    help: "Help", privacy: "Privacy", terms: "Terms of service",
    account: "Account", addAccount: "Add account",
    addAccountSub: "Switch between accounts", signOut: "Sign out",
    used: "used", language: "Language", selectAll: "Select all",
    deselectAll: "Deselect all", selected: "selected",
    download: "Download", share: "Share", del: "Delete",
    rename: "Rename", details: "Details", parts: "parts", open: "Open",
    empty: "This category is empty", emptySub: "Tap the upload button to start.",
    uploading: "Uploading", uploaded: "Upload complete", saved: "Stored",
    speed: "Throughput", nodes: "Active nodes", freeSpace: "free",
    more: "More actions",
    bulkNote: "The action applies to every selected file.",
    queued: "Queued",
    folderMixed: "A folder accepts every file type. They are sorted automatically.",
    wrongType: "{n} file(s) skipped: this category only takes {c}.",
    defaultFolders: "By category", myFolders: "My folders",
    move: "Move", rootFolder: "Category root",
    noFolderYet: "No folder in this category yet. Create one from the Folders screen.",
    copyLink: "Copy link", copyLinkSub: "Download link, valid 7 days",
    linkCopied: "Link copied.", linkValid: "Valid {d} days. Anyone with this link can download the file.",
    uploadHere: "Upload here",
    deleting: "Deleting…",
    restoring: "Restoring…",
    trashEmpty: "Trash is empty", trashEmptySub: "Deleted files show up here.",
    trashNote: "These files still use your space. Empty the trash to free it.",
    restore: "Restore", purge: "Delete for good", purgeAll: "Empty trash",
    purgeAllConfirm: "Permanently delete everything in the trash?",
    folders: "Folders", openFolders: "Browse folders",
    foldersNote: "A folder takes any file type; files still appear in their category.",
    newFolder: "New folder", folderName: "Folder name",
    noFolder: "No folders yet", noFolderSub: "Create one to organise your files.",
    dropFolderConfirm: "Delete this folder? The files are kept.",
    create: "Create", cancel: "Cancel",
    sortRecent: "Recent", sortName: "Name", sortSize: "Size",
    noMatch: "No results", noMatchSub: "Try another word.",
    searchHint: "Type to search across all your files.",
    nowPlaying: "Now playing", queue: "Queue",
    shuffle: "Shuffle", repeat: "Repeat", prev: "Previous", next: "Next",
    play: "Play", pause: "Pause",
    needSpace: "Need more space?",
    needSpaceSub: "Email us with your account address and how much you need. Reply within 48 h.",
    faq: "Common questions",
    q1: "My upload stopped", a1: "Start it again from the beginning. Resume isn't available yet.",
    q2: "A file takes a while to open", a2: "Large files are reassembled before playback. Give it a few seconds.",
    q3: "I deleted a file by mistake", a3: "Deletion is permanent for now. Check before confirming.",
    soon: "Coming soon",
    trashSoon: "Deletion is permanent for now. Trash arrives with registry backups.",
    cleanSoon: "Cleanup needs a server-side inventory that isn't written yet.",
    multiSoon: "One account at a time for now. Sign out to use another.",
    activeAccount: "Active account",
    prefs: "Preferences", about: "About",
    wifiOnly: "Wi-Fi only", wifiOnlySub: "Warn before a large upload on mobile data",
    notif: "Notifications", notifSub: "Tell me when an upload finishes",
    storedOn: "Your files", storedOnSub: "Encrypted in transit, stored in a private space",
    prefsNote: "These preferences stay on this device only.",
    holdToSelect: "Press and hold to select",
    loading: "Loading…", loadFailed: "Could not open this file",
    retry: "Try again", uploadFailed: "Upload failed", emptyShort: "Empty",
    chooseCat: "Where to?", chooseCatSub: "The file will be filed under this category.",
    savedIn: "Open in", assembling: "Assembling parts…", noPreview: "No preview",
    noPreviewSub: "This file type can't be displayed in the app.",
    cats: { sary: "Images", video: "Videos", feo: "Audio", doc: "Documents", apk: "Apps", hafa: "Other" },
  },
};
const tr = c => STR[c] || STR.fr;

const SUPPORT_EMAIL = "tocloud37@gmail.com";

/* ─────────── data ─────────── */
const CATS = [
  { key: "sary",  c: T.rose,   bg: T.roseBg,   Icon: Image },
  { key: "video", c: T.violet, bg: T.violetBg, Icon: Film },
  { key: "feo",   c: T.gold,   bg: T.goldBg,   Icon: Music },
  { key: "doc",   c: T.blue,   bg: T.blueBg,   Icon: FileText },
  { key: "apk",   c: T.rose,   bg: T.roseBg,   Icon: Package },
  { key: "hafa",  c: T.grey,   bg: T.greyBg,   Icon: Box },
];

/** Un fichier appartient-il vraiment a la categorie visee ? */
function matchesCat(file, key) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const mime = file.type || "";
  if (key === "sary")  return mime.startsWith("image/") || EXT_IMG.includes(ext);
  if (key === "video") return mime.startsWith("video/") || EXT_VID.includes(ext);
  if (key === "feo")   return mime.startsWith("audio/") || EXT_AUD.includes(ext);
  if (key === "doc")   return EXT_DOC.includes(ext);
  if (key === "apk")   return EXT_APK.includes(ext);
  return true;   // "Autres" accueille ce qui reste
}

const EXT_IMG = ["jpg","jpeg","png","gif","webp","heic","bmp","svg"];
const EXT_VID = ["mp4","mkv","mov","avi","webm","3gp","m4v"];
const EXT_AUD = ["mp3","wav","ogg","m4a","flac","aac","opus"];
const EXT_DOC = ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","csv","odt"];
const EXT_APK = ["apk","aab","xapk"];

/* filtre du selecteur de fichier, par categorie choisie */
const ACCEPT = {
  sary:  "image/*",
  video: "video/*",
  feo:   "audio/*",
  doc:   ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt",
  apk:   ".apk,.aab,.xapk",
  hafa:  "*/*",
};

const GLABEL = {
  fr: { today: "Aujourd'hui", yday: "Hier", month: "Ce mois-ci" },
  mg: { today: "Androany", yday: "Omaly", month: "Ity volana ity" },
  en: { today: "Today", yday: "Yesterday", month: "This month" },
};

/* ─────────── cloud logo ─────────── */
const Logo = ({ size = 42 }) => (
  <svg width={size} height={size * 0.72} viewBox="0 0 64 46" aria-label="To-cloud">
    <defs>
      <linearGradient id="cl" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#0A84D6" />
        <stop offset="34%" stopColor="#7332E0" />
        <stop offset="68%" stopColor="#E01B7A" />
        <stop offset="100%" stopColor="#F2B705" />
      </linearGradient>
      <linearGradient id="cl2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path fill="url(#cl)" d="M50.5 44H16C7.7 44 1 37.3 1 29S7.7 14 16 14c1.2 0 2.4.1 3.5.4C22.6 6.6 30.2 1.5 38.6 2.1c9.6.6 17.4 8.2 18.3 17.8C61.4 21.6 64 25.6 64 30.2 64 37.8 58 44 50.5 44z" />
    <path fill="url(#cl2)" d="M50.5 44H16C7.7 44 1 37.3 1 29c0-4.9 2.3-9.2 5.9-11.9C5.3 24.9 10.8 32 18.6 32h32.9c4 0 7.5-2.2 9.4-5.4C63.4 34.3 57.8 44 50.5 44z" opacity="0.5" />
  </svg>
);

const Wordmark = ({ size = 42, text = 21 }) => (
  <span className="flex items-center gap-2.5">
    <Logo size={size} />
    <span style={{ color: T.text, fontSize: text, fontWeight: 700, fontFamily: DISPLAY,
                   letterSpacing: "0.02em", textTransform: "uppercase" }}>
      To<span style={{ color: T.blue }}>·</span>cloud
    </span>
  </span>
);

/* ─────────── atoms ─────────── */
const Tile = ({ c, bg, Icon, size = 54, icon = 26 }) => (
  <div style={{ width: size, height: size, background: bg, flexShrink: 0 }}
       className="rounded-full flex items-center justify-center">
    <Icon size={icon} color={c} strokeWidth={2} />
  </div>
);

const Panel = ({ children, className = "", accent, style }) => (
  <div style={{ background: T.card,
                border: accent ? `2px solid ${accent}` : `1px solid ${T.line}`,
                boxShadow: accent ? halo(accent) : "0 2px 10px -6px rgba(23,20,42,0.18)",
                ...style }}
       className={`rounded-3xl ${className}`}>{children}</div>
);

/* a light that travels around the border */
const GlowFrame = ({ c, children, className = "", radius = 24, pad = 2, speed = 5, style }) => (
  <div className={`relative ${className}`}
       style={{ borderRadius: radius, boxShadow: halo(c), ...style }}>
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius }} aria-hidden="true">
      <div className="tc-anim absolute"
           style={{ inset: "-75%",
                    background: `conic-gradient(from 0deg, ${c}00 0deg, ${c}00 200deg, ${c} 268deg, #FFFFFF 300deg, ${c} 332deg, ${c}00 360deg)`,
                    animation: `tcspin ${speed}s linear infinite` }} />
    </div>
    <div className="absolute" style={{ inset: pad, borderRadius: radius - pad, background: T.card }} />
    <div className="relative">{children}</div>
  </div>
);

/**
 * Chiffre qui monte jusqu'a sa valeur quand il apparait.
 *
 * Purement decoratif : la valeur finale est posee immediatement si l'animation
 * est desactivee, pour ne jamais afficher un chiffre faux durablement.
 */
function Counter({ value, decimals = 0, duration = 900, className, style }) {
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const settle = () => setShown(value);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    const run = () => {
      const from = 0;
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        // ralentit en fin de course : le chiffre se pose au lieu de s'arreter net
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(from + (value - from) * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !doneRef.current) { doneRef.current = true; run(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {shown.toFixed(decimals).replace(".", ",")}
    </span>
  );
}

/* rises into place the first time it enters the viewport */function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); io.disconnect(); }
    }, { threshold: 0.06, rootMargin: "0px 0px -48px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
         style={{ opacity: on ? 1 : 0,
                  transform: on ? "translateY(0)" : "translateY(18px)",
                  transition: `opacity 560ms ${EASE} ${delay}ms, transform 560ms ${EASE} ${delay}ms`,
                  willChange: on ? "auto" : "opacity, transform" }}>
      {children}
    </div>
  );
}

const Switch = ({ on, onToggle }) => (
  <button onClick={onToggle} role="switch" aria-checked={on}
    style={{ background: on ? T.violet : "#CFCADF" }}
    className="w-12 h-7 rounded-full p-1 flex items-center shrink-0 transition-colors">
    <span style={{ transform: on ? "translateX(20px)" : "translateX(0)" }}
          className="w-5 h-5 rounded-full bg-white transition-transform" />
  </button>
);

const Row = ({ Icon, title, sub, right, onClick, danger }) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 px-5 py-4 text-left active:opacity-60">
    {Icon && <Icon size={22} color={danger ? T.rose : T.mute} strokeWidth={2} className="shrink-0" />}
    <span className="min-w-0 flex-1">
      <span style={{ color: danger ? T.rose : T.text }} className="block text-base">{title}</span>
      {sub && <span style={{ color: T.mute }} className="block text-sm mt-0.5 leading-snug">{sub}</span>}
    </span>
    {right}
  </button>
);

const Section = ({ label, children }) => (
  <Reveal className="mb-3">
    {label && (
      <div style={{ color: T.violet, fontFamily: DISPLAY, letterSpacing: "0.14em" }}
           className="text-xs font-bold uppercase px-6 pt-5 pb-2">{label}</div>
    )}
    <Panel className="mx-3 overflow-hidden">{children}</Panel>
  </Reveal>
);

const NavRow = ({ c, ...p }) => (
  <div className="mx-4 mb-2.5" style={{ border: `1px solid ${c}66`, borderRadius: 18,
                                        background: T.card, boxShadow: `0 0 12px -4px ${c}99` }}>
    <div className="tc-anim" style={{ animation: "tcbreathe 3.4s ease-in-out infinite" }}>
      <Row {...p} />
    </div>
  </div>
);

const Divider = () => <div style={{ borderTop: `1px solid ${T.line}` }} />;

const TopBar = ({ title, onBack }) => (
  <div style={{ background: T.bg }} className="sticky top-0 z-10 flex items-center gap-4 px-4 py-4">
    <button onClick={onBack} aria-label="Retour" className="p-1 -ml-1 rounded-full">
      <ArrowLeft size={26} color={T.text} />
    </button>
    <h1 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.02em" }}
        className="text-2xl font-bold uppercase">{title}</h1>
  </div>
);

const Sheet = ({ open, onClose, children }) => {
  /* le fond ne doit pas defiler derriere la feuille, sinon elle parait
     se decrocher pendant qu'on la lit */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ background: "rgba(23,20,42,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, maxHeight: "88vh" }}
           className="w-full max-w-md rounded-t-3xl pt-3 pb-8 overflow-y-auto">
        <div style={{ background: T.line }} className="w-10 h-1 rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
};

/* ─────────── ambient backdrop ─────────── */
const Backdrop = () => (
  <svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
       className="absolute inset-0 w-full h-full pointer-events-none"
       style={{ filter: "blur(0.6px)" }}>
    <defs>
      <filter id="soft"><feGaussianBlur stdDeviation="4" /></filter>
      <filter id="softer"><feGaussianBlur stdDeviation="8" /></filter>
      <linearGradient id="bcl" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#0A84D6" /><stop offset="50%" stopColor="#7332E0" />
        <stop offset="100%" stopColor="#E01B7A" />
      </linearGradient>
      <linearGradient id="bhw" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7332E0" /><stop offset="100%" stopColor="#0A84D6" />
      </linearGradient>
    </defs>

    {/* clouds */}
    <g filter="url(#softer)" opacity="0.30" fill="url(#bcl)">
      <path d="M300 96h-52c-24 0-44-19-44-43s20-43 44-43c4 0 7 0 10 1 9-22 31-37 55-35 27 2 49 23 52 50 13 5 22 17 22 31 0 21-17 39-38 39z" />
      <path d="M118 690H46c-25 0-45-20-45-45s20-45 45-45c4 0 8 1 12 2 9-23 32-38 57-36 28 2 51 24 54 52 14 5 24 18 24 33 0 22-18 39-40 39z" transform="scale(0.9) translate(8,20)" />
    </g>

    {/* circuit board */}
    <g filter="url(#soft)" opacity="0.30" stroke="url(#bhw)" strokeWidth="2.5" fill="none">
      <path d="M-10 330h70v-42h58v66h74" />
      <path d="M410 300h-92v52h-46v58h-70" />
      <path d="M20 470h96v40h72v-64h84" />
      <path d="M410 806h-64v-44h-72v54h-58" />
      <path d="M-10 560h48v56h96" />
    </g>
    <g filter="url(#soft)" opacity="0.36" fill="url(#bhw)">
      {[[60,288],[118,354],[264,352],[188,446],[116,510],[346,762],[38,616],[272,410]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="5" />
      ))}
    </g>

    {/* memory sticks */}
    <g filter="url(#soft)" opacity="0.26" fill="url(#bhw)">
      <g transform="rotate(-14 90 250)">
        <rect x="18" y="228" width="168" height="44" rx="5" />
        {Array.from({ length: 11 }).map((_, i) => (
          <rect key={i} x={26 + i * 15} y="272" width="9" height="11" rx="2" />
        ))}
      </g>
      <g transform="rotate(11 300 620)">
        <rect x="216" y="600" width="176" height="46" rx="5" />
        {Array.from({ length: 11 }).map((_, i) => (
          <rect key={i} x={224 + i * 16} y="646" width="9" height="11" rx="2" />
        ))}
      </g>
    </g>

    {/* workstation */}
    <g filter="url(#soft)" opacity="0.26" fill="none" stroke="url(#bhw)" strokeWidth="4">
      <rect x="128" y="128" width="188" height="122" rx="9" />
      <path d="M200 250v26h44v-26M172 276h100" strokeLinecap="round" />
      <rect x="150" y="148" width="88" height="8" rx="4" />
      <rect x="150" y="168" width="140" height="6" rx="3" opacity="0.7" />
      <rect x="150" y="184" width="112" height="6" rx="3" opacity="0.55" />
    </g>
    <g filter="url(#softer)" opacity="0.2" fill="none" stroke="url(#bhw)" strokeWidth="4">
      <rect x="96" y="700" width="120" height="164" rx="12" />
      <circle cx="156" cy="762" r="30" />
      <path d="M120 826h72" strokeLinecap="round" />
    </g>
  </svg>
);

/* ─────────── media viewer ─────────── */
function Viewer({ file, cat, siblings = [], onNavigate, onClose, t }) {
  const [src, setSrc] = useState(null);
  const [blob, setBlob] = useState(null);
  const [load, setLoad] = useState(0);
  const [err, setErr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const urlRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    let dead = false;
    setSrc(null); setBlob(null); setLoad(0); setErr(null); setZoom(1);

    download(file.id, p => { if (!dead) setLoad(p.done); })
      .then(({ blob: b }) => {
        if (dead) return;
        const u = URL.createObjectURL(b);
        urlRef.current = u;
        setBlob(b);
        setSrc(u);
      })
      .catch(e => { if (!dead) setErr(e.message); });

    return () => {
      dead = true;
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [file?.id]);

  if (!file) return null;
  const k = file.cat;
  const dark = k === "sary" || k === "video";

  const Chrome = ({ children }) => (
    <div className="absolute inset-0 z-50 flex flex-col"
         style={{ background: dark ? T.stage : T.bg }}>
      <div className="flex items-center gap-3 px-4 py-4 shrink-0">
        <button onClick={onClose} aria-label="Fermer" className="p-1 -ml-1">
          <X size={26} color={dark ? "#FFFFFF" : T.text} />
        </button>
        <div className="min-w-0 flex-1">
          <div style={{ color: dark ? "#FFFFFF" : T.text }} className="text-base font-semibold truncate">
            {file.name}
          </div>
          <div style={{ color: dark ? "rgba(255,255,255,0.6)" : T.mute, fontFamily: MONO }}
               className="text-xs mt-0.5">
            {file.sizeLabel || humanSize(file.size)}
            {file.parts > 1 ? ` · ${file.parts} ${t.parts}` : ""}
          </div>
        </div>
        <button onClick={() => downloadToDisk(file.id)} aria-label={t.download} className="p-2">
          <Download size={22} color={dark ? "#FFFFFF" : T.text} />
        </button>
      </div>
      {children}
    </div>
  );

  if (err) {
    return (
      <Chrome>
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <CircleAlert size={40} color={T.rose} strokeWidth={1.8} className="mb-4" />
          <p style={{ color: dark ? "#FFFFFF" : T.text }} className="text-base font-semibold mb-1">
            {t.loadFailed}
          </p>
          <p style={{ color: dark ? "rgba(255,255,255,0.6)" : T.mute }} className="text-sm">{err}</p>
        </div>
      </Chrome>
    );
  }

  /* les morceaux sont recuperes puis recolles avant tout affichage */
  if (!src) {
    const pct = file.parts > 1 ? Math.round(load / file.parts * 100) : null;
    return (
      <Chrome>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={72} icon={34} />
          <p style={{ color: dark ? "#FFFFFF" : T.text }} className="text-base font-semibold mt-5 mb-2">
            {file.parts > 1 ? t.assembling : t.loading}
          </p>
          {file.parts > 1 && (
            <>
              <p style={{ color: dark ? "rgba(255,255,255,0.6)" : T.mute, fontFamily: MONO }}
                 className="text-xs mb-5">
                {load} / {file.parts}
              </p>
              <div style={{ background: "rgba(128,128,160,0.28)" }}
                   className="w-full max-w-xs h-2 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%`, background: cat.c, transition: "width 140ms linear" }}
                     className="h-full rounded-full" />
              </div>
            </>
          )}
        </div>
      </Chrome>
    );
  }

  if (k === "sary") {
    const at = siblings.findIndex(f => f.id === file.id);
    const goTo = d => {
      const n = at + d;
      if (n >= 0 && n < siblings.length) onNavigate?.(siblings[n]);
    };
    /* glissement horizontal : on ne navigue que si le geste est franchement
       lateral, sinon un simple defilement changerait d'image */
    const swipe = { x: 0, y: 0 };
    const onDown = e => { swipe.x = e.clientX; swipe.y = e.clientY; };
    const onUp = e => {
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if (zoom === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        goTo(dx < 0 ? 1 : -1);
      }
    };

    return (
      <Chrome>
        <div className="flex-1 flex items-center justify-center overflow-hidden px-4 relative"
             onPointerDown={onDown} onPointerUp={onUp}
             style={{ touchAction: zoom === 1 ? "pan-y" : "auto" }}>
          <img src={src} alt={file.name} draggable={false}
               style={{ transform: `scale(${zoom})`, transition: "transform 180ms ease" }}
               className="max-w-full max-h-full object-contain rounded-xl select-none" />

          {at > 0 && (
            <button onClick={() => goTo(-1)} aria-label={t.prev}
                    style={{ background: "rgba(0,0,0,0.35)" }}
                    className="absolute left-2 w-11 h-11 rounded-full flex items-center justify-center">
              <ChevronLeft size={24} color="#FFFFFF" />
            </button>
          )}
          {at >= 0 && at < siblings.length - 1 && (
            <button onClick={() => goTo(1)} aria-label={t.next}
                    style={{ background: "rgba(0,0,0,0.35)" }}
                    className="absolute right-2 w-11 h-11 rounded-full flex items-center justify-center">
              <ChevronRight size={24} color="#FFFFFF" />
            </button>
          )}

          {siblings.length > 1 && (
            <span style={{ color: "rgba(255,255,255,0.75)", fontFamily: MONO,
                           background: "rgba(0,0,0,0.35)" }}
                  className="absolute bottom-3 text-xs px-3 py-1 rounded-full">
              {at + 1} / {siblings.length}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-6 py-6 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  aria-label="Réduire" className="p-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
            <ZoomOut size={22} color="#FFFFFF" />
          </button>
          <span style={{ color: "#FFFFFF", fontFamily: MONO }} className="text-sm w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                  aria-label="Agrandir" className="p-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
            <ZoomIn size={22} color="#FFFFFF" />
          </button>
        </div>
      </Chrome>
    );
  }

  if (k === "video") {
    return (
      <Chrome>
        <div className="flex-1 flex items-center justify-center px-4">
          <video src={src} controls autoPlay playsInline
                 className="w-full max-h-full rounded-2xl" style={{ background: "#000" }} />
        </div>
      </Chrome>
    );
  }

  if (k === "feo") {
    return (
      <Chrome>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div style={{ background: `linear-gradient(150deg, ${T.gold}, ${T.rose})` }}
               className="w-44 h-44 rounded-full flex items-center justify-center mb-9 shadow-xl">
            <div style={{ background: T.bg }} className="w-14 h-14 rounded-full flex items-center justify-center">
              <Music size={26} color={T.gold} />
            </div>
          </div>
          <audio src={src} controls autoPlay className="w-full" />
        </div>
      </Chrome>
    );
  }

  if (k === "doc") {
    return <DocViewer file={file} blob={blob} t={t} onClose={onClose} />;
  }

  return (
    <Chrome>
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={80} icon={38} />
        <p style={{ color: T.text }} className="text-lg font-semibold mt-5 mb-1">{t.noPreview}</p>
        <p style={{ color: T.mute }} className="text-sm leading-snug mb-7">{t.noPreviewSub}</p>
        <button onClick={() => downloadToDisk(file.id)} style={{ background: T.violet }}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full active:opacity-80">
          <Download size={20} color="#FFFFFF" />
          <span className="text-base font-semibold text-white">{t.download}</span>
        </button>
      </div>
    </Chrome>
  );
}

/* ─────────── drawer ─────────── */
function Drawer({ open, onClose, go, t }) {
  const [trash, setTrash] = useState(null);

  // recharge a chaque ouverture : le contenu a pu changer entre-temps
  useEffect(() => {
    if (!open) return;
    let dead = false;
    trashStats()
      .then(v => { if (!dead) setTrash(v); })
      .catch(() => {});
    return () => { dead = true; };
  }, [open]);

  return (
    <div aria-hidden={!open}
      style={{ background: "rgba(23,20,42,0.45)", opacity: open ? 1 : 0,
               pointerEvents: open ? "auto" : "none", transition: "opacity 200ms ease" }}
      className="absolute inset-0 z-50" onClick={onClose}>
      <aside onClick={e => e.stopPropagation()}
        style={{ background: T.bg, transform: open ? "translateX(0)" : "translateX(-100%)",
                 transition: "transform 240ms cubic-bezier(.2,.8,.2,1)" }}
        className="h-full w-72 flex flex-col rounded-r-3xl overflow-hidden">
        <div className="px-6 pt-8 pb-7"><Wordmark size={44} text={22} /></div>

        <Panel className="mx-4 mb-6 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap size={14} color={T.blue} />
            <span style={{ color: T.mute, fontFamily: DISPLAY, letterSpacing: "0.12em" }}
                  className="text-xs font-bold uppercase">{t.nodes}</span>
          </div>
          <div className="flex gap-1.5">
            {[T.blue, T.violet, T.rose, T.gold, T.blue].map((c, i) => (
              <span key={i} style={{ background: c }} className="h-2 flex-1 rounded-full" />
            ))}
          </div>
        </Panel>

        <nav className="flex-1">
          <NavRow c={T.rose} Icon={Trash2} title={t.trash}
                  sub={trash ? (trash.n ? `${trash.n} · ${humanSize(trash.bytes)}` : t.trashEmpty) : "…"}
                  onClick={() => go("trash")} />
          <NavRow c={T.violet} Icon={Settings} title={t.settings} onClick={() => go("settings")} />
          <NavRow c={T.blue}   Icon={HelpCircle} title={t.help} onClick={() => go("help")} />
        </nav>

        <div className="px-6 pb-8 space-y-3">
          <button style={{ color: T.faint }} className="block text-sm text-left">{t.privacy}</button>
          <button style={{ color: T.faint }} className="block text-sm text-left">{t.terms}</button>
        </div>
      </aside>
    </div>
  );
}


/* ─────────── file menu ─────────── */
const FileMenu = ({ file, cat, folders = [], onClose, onOpen, onDownload,
                    onDelete, onMove, onShare, t }) => (
  <Sheet open={!!file} onClose={onClose}>
    {file && (
      <>
        <div className="flex items-center gap-4 px-6 pb-5">
          <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={46} icon={22} />
          <div className="min-w-0">
            <div style={{ color: T.text }} className="text-base font-semibold truncate">{file.name}</div>
            <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
              {file.sizeLabel}
            </div>
          </div>
        </div>
        <Panel className="mx-3 overflow-hidden mb-3">
          <Row Icon={Eye} title={t.open} onClick={onOpen} />
          <Divider />
          <Row Icon={Download} title={t.download} onClick={onDownload} />
          <Divider />
          <Row Icon={Link2} title={t.copyLink} sub={t.copyLinkSub} onClick={onShare} />
          <Divider />
          <Row Icon={FolderInput} title={t.move} onClick={onMove}
               right={<ChevronRight size={18} color={T.faint} />} />
        </Panel>
        <Panel className="mx-3 overflow-hidden">
          <Row Icon={Trash2} title={t.del} danger onClick={onDelete} />
        </Panel>
      </>
    )}
  </Sheet>
);

/* choix du dossier de destination */
const MovePicker = ({ open, folders, cat, current, onPick, onClose, t }) => (
  <Sheet open={open} onClose={onClose}>
    <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
        className="text-lg font-bold uppercase px-6 pb-4">{t.move}</h2>
    <Panel className="mx-3 overflow-hidden">
      <Row Icon={Folder} title={t.rootFolder} sub={t.cats[cat.key]}
           onClick={() => onPick(null)}
           right={!current ? <Check size={19} color={T.violet} /> : null} />
      {folders.filter(f => f.cat === cat.key).map(f => (
        <React.Fragment key={f.id}>
          <Divider />
          <Row Icon={Folder} title={f.name} onClick={() => onPick(f.id)}
               right={current === f.id ? <Check size={19} color={T.violet} /> : null} />
        </React.Fragment>
      ))}
    </Panel>
    {folders.filter(f => f.cat === cat.key).length === 0 && (
      <p style={{ color: T.faint }} className="text-sm px-6 pt-4 leading-snug">{t.noFolderYet}</p>
    )}
  </Sheet>
);

/* ─────────── account ─────────── */
const AccountSheet = ({ open, onClose, go, user, onSignOut, t }) => (
  <Sheet open={open} onClose={onClose}>
    <div className="flex items-center gap-4 px-6 pb-5">
      <div style={{ background: `linear-gradient(145deg, ${T.violet}, ${T.blue})` }}
           className="w-14 h-14 rounded-full flex items-center justify-center">
        <span style={{ color: "#FFFFFF", fontFamily: DISPLAY }} className="text-xl font-bold">
          {(user?.name || "?").trim().charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        <div style={{ color: T.text }} className="text-lg font-semibold truncate">{user?.name}</div>
        <div style={{ color: T.mute }} className="text-sm truncate">{user?.email}</div>
      </div>
    </div>
    <NavRow c={T.blue} Icon={UserPlus} title={t.addAccount} sub={t.addAccountSub}
            onClick={() => { onClose(); go("addAccount"); }} />
    <NavRow c={T.violet} Icon={Settings} title={t.settings}
            onClick={() => { onClose(); go("settings"); }} />
    <NavRow c={T.rose} Icon={LogOut} title={t.signOut} danger
            onClick={() => { onClose(); onSignOut(); }} />
  </Sheet>
);

/* ─────────── upload ─────────── */

/**
 * Ne fait que choisir le fichier : l'envoi est confie a la file d'attente,
 * qui survit aux changements d'ecran. Rien ne bloque la navigation.
 */
function UploadPicker({ open, cat, folder, strict = true, t, onClose }) {
  const { enqueue } = useUploads();
  const inputRef = useRef(null);
  const askedRef = useRef(false);

  useEffect(() => {
    if (!open) { askedRef.current = false; return; }
    if (askedRef.current || !cat) return;
    askedRef.current = true;
    const el = inputRef.current;
    if (!el) return;
    el.accept = strict ? (ACCEPT[cat.key] || "*/*") : "*/*";
    el.multiple = true;
    el.value = "";
    el.click();
  }, [open, cat]);

  function onFile(e) {
    const list = Array.from(e.target.files || []);

    /* `accept` n'est qu'une suggestion : selon le selecteur du telephone,
       n'importe quel fichier peut arriver. On verifie donc nous-memes. */
    const ok = strict ? list.filter(f => matchesCat(f, cat.key)) : list;
    const refused = list.length - ok.length;

    /* Hors categorie imposee, le classement vient de l'extension : sans cela
       tout ce qui entre dans un dossier finirait dans « Autres ». */
    ok.forEach(f => {
      const key = strict ? cat.key : categorize(f.name);
      enqueue(f, CATS.find(c => c.key === key) || cat, folder);
    });
    onClose();

    if (refused > 0) {
      alert(t.wrongType.replace("{n}", refused).replace("{c}", t.cats[cat.key]));
    }
  }

  return <input ref={inputRef} type="file" hidden onChange={onFile} />;
}

/* ─────────── language ─────────── */
const LanguageView = ({ onBack, lang, setLang, t }) => (
  <div className="pb-10">
    <TopBar title={t.language} onBack={onBack} />
    <Panel className="mx-3 overflow-hidden">
      {LANGS.map((l, i) => (
        <React.Fragment key={l.code}>
          {i > 0 && <Divider />}
          <button onClick={() => setLang(l.code)}
            style={{ background: lang === l.code ? T.violetBg : "transparent" }}
            className="w-full flex items-center gap-4 px-5 py-4 text-left active:opacity-60">
            <span className="min-w-0 flex-1">
              <span style={{ color: T.text }} className="block text-base">{l.native}</span>
              <span style={{ color: T.mute }} className="block text-sm mt-0.5">{l.label}</span>
            </span>
            {lang === l.code && <Check size={22} color={T.violet} />}
          </button>
        </React.Fragment>
      ))}
    </Panel>
    <p style={{ color: T.faint }} className="text-sm px-6 pt-4 leading-snug">
      Les langues sans traduction complète utilisent le français.
    </p>
  </div>
);

/* ─────────── settings ─────────── */
function SettingsView({ onBack, go, lang, t }) {
  const [prefs, setPrefs] = useState(() => load("tc_prefs", { wifi: false, notif: true }));
  const flip = k => setPrefs(v => {
    const next = { ...v, [k]: !v[k] };
    save("tc_prefs", next);
    return next;
  });
  const cur = LANGS.find(l => l.code === lang);

  return (
    <div className="pb-10">
      <TopBar title={t.settings} onBack={onBack} />

      <Section>
        <Row Icon={Languages} title={t.language} sub={cur?.native}
             right={<ChevronRight size={20} color={T.faint} />} onClick={() => go("language")} />
      </Section>

      <Section label={t.prefs}>
        <Row Icon={Wifi} title={t.wifiOnly} sub={t.wifiOnlySub}
             right={<Switch on={prefs.wifi} onToggle={() => flip("wifi")} />} />
        <Divider />
        <Row Icon={Bell} title={t.notif} sub={t.notifSub}
             right={<Switch on={prefs.notif} onToggle={() => flip("notif")} />} />
      </Section>

      <Section label={t.about}>
        <Row Icon={Info} title="To-cloud" sub="Version 1.0.0" />
        <Divider />
        <Row Icon={ShieldCheck} title={t.storedOn} sub={t.storedOnSub} />
      </Section>

      <p style={{ color: T.faint }} className="text-xs px-6 pt-2 leading-relaxed">
        {t.prefsNote}
      </p>
    </div>
  );
}

/* ─────────── pages ─────────── */
/* ─────────── trash ─────────── */
function TrashView({ onBack, t }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [work, setWork] = useState(null);   // { label, done, total }

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listTrash();
      const list = Array.isArray(r) ? r : (r?.files || []);
      setFiles(list.map(f => ({ ...f, sizeLabel: humanSize(f.size) })));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function run(label, fn) {
    setWork({ label, done: 0, total: 1 });
    navigator.vibrate?.(12);
    try {
      await fn(p => setWork({ label, done: p.done, total: p.total }));
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setWork(null);
    }
  }

  const totalSize = files.reduce((n, f) => n + f.size, 0);

  return (
    <div className="pb-10">
      <TopBar title={t.trash} onBack={onBack} />

      {loading && (
        <p style={{ color: T.mute }} className="text-sm px-6 py-10 text-center">{t.loading}</p>
      )}

      {error && !loading && (
        <Panel className="mx-3 p-6 text-center">
          <CircleAlert size={32} color={T.rose} strokeWidth={1.8} className="mx-auto mb-3" />
          <p style={{ color: T.mute }} className="text-sm mb-4">{error}</p>
          <button onClick={refresh} style={{ color: T.violet }} className="text-sm font-bold">
            {t.retry}
          </button>
        </Panel>
      )}

      {!loading && !error && files.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <Trash2 size={38} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.trashEmpty}</p>
          <p style={{ color: T.mute }} className="text-sm">{t.trashEmptySub}</p>
        </Panel>
      )}

      {files.length > 0 && (
        <>
          <p style={{ color: T.mute }} className="text-sm px-6 pb-4 leading-snug">{t.trashNote}</p>

          <Panel className="mx-3 overflow-hidden mb-3">
            {files.map((f, i) => {
              const c = CATS.find(x => x.key === f.cat) || CATS[5];
              return (
                <div key={f.id} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}
                     className="flex items-center gap-3 px-4 py-3.5">
                  <Tile c={c.c} bg={c.bg} Icon={c.Icon} size={44} icon={21} />
                  <div className="min-w-0 flex-1">
                    <div style={{ color: T.text }} className="text-base truncate">{f.name}</div>
                    <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
                      {f.sizeLabel}
                    </div>
                  </div>
                  <button onClick={() => run(t.restoring, () => restoreFile(f.id))}
                          disabled={!!work} aria-label={t.restore} className="p-2 active:scale-90">
                    <RotateCcw size={20} color={T.blue} />
                  </button>
                  <button onClick={() => run(t.deleting, () => purgeFile(f.id))}
                          disabled={!!work} aria-label={t.purge} className="p-2 active:scale-90">
                    <Trash2 size={20} color={T.rose} />
                  </button>
                </div>
              );
            })}
          </Panel>

          <div className="px-3">
            <button onClick={() => {
                      if (confirm(t.purgeAllConfirm)) run(t.deleting, cb => emptyTrash(cb));
                    }}
                    disabled={!!work}
                    style={{ border: `2px solid ${T.rose}`, color: T.rose, opacity: work ? 0.5 : 1 }}
                    className="w-full py-3.5 rounded-full text-base font-semibold active:scale-95">
              {t.purgeAll} · {humanSize(totalSize)}
            </button>
          </div>
        </>
      )}

      {/* Le menage sur le canal prend du temps : sans retour visible,
          l'utilisateur croit que rien ne se passe et appuie a nouveau. */}
      {work && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8"
             style={{ background: "rgba(23,20,42,0.45)" }}>
          <Panel accent={T.rose} className="w-full max-w-xs p-6 text-center">
            <Loader2 size={30} color={T.rose} className="mx-auto mb-4 tc-spin" />
            <p style={{ color: T.text }} className="text-base font-semibold mb-3">{work.label}</p>
            <div style={{ background: T.sunken }} className="h-2 rounded-full overflow-hidden">
              <div style={{ width: `${Math.round(work.done / Math.max(1, work.total) * 100)}%`,
                            background: T.rose, transition: "width 200ms linear" }}
                   className="h-full rounded-full" />
            </div>
            <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-3">
              {work.done} / {work.total}
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ─────────── folders ─────────── */
function FoldersView({ onBack, onOpenFolder, onOpenCat, t }) {
  const { files, meta, loading, refresh } = useFiles(null, { limit: 60 });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const [counts, setCounts] = useState({});
  useEffect(() => {
    let dead = false;
    folderCounts()
      .then(m => { if (!dead) setCounts(m); })
      .catch(() => {});
    return () => { dead = true; };
  }, [meta.folders.length]);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addFolder(name.trim(), null);
      setName(""); setNaming(false);
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm(t.dropFolderConfirm)) return;
    setBusy(true);
    try { await dropFolder(id); await refresh(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="pb-10">
      <TopBar title={t.folders} onBack={onBack} />

      <p style={{ color: T.mute }} className="text-sm px-6 pb-5 leading-snug">{t.foldersNote}</p>

      <div className="flex items-center gap-3 px-6 pb-2">
        <span style={{ color: T.mute, fontFamily: DISPLAY, letterSpacing: "0.14em" }}
              className="text-xs font-bold uppercase">{t.defaultFolders}</span>
        <span style={{ background: T.line }} className="flex-1 h-px" />
      </div>
      <Panel className="mx-3 overflow-hidden mb-6">
        {CATS.map((c, i) => {
          const n = meta.counts?.[c.key]?.n || 0;
          return (
            <button key={c.key} onClick={() => onOpenCat(c)}
                    style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left active:opacity-60">
              <Tile c={c.c} bg={c.bg} Icon={c.Icon} size={44} icon={21} />
              <span className="min-w-0 flex-1">
                <span style={{ color: T.text }} className="block text-base">{t.cats[c.key]}</span>
                <span style={{ color: T.mute, fontFamily: MONO }} className="block text-xs mt-1">
                  {n} {t.files}
                </span>
              </span>
              <ChevronRight size={18} color={T.faint} />
            </button>
          );
        })}
      </Panel>

      <div className="flex items-center gap-3 px-6 pb-2">
        <span style={{ color: T.mute, fontFamily: DISPLAY, letterSpacing: "0.14em" }}
              className="text-xs font-bold uppercase">{t.myFolders}</span>
        <span style={{ background: T.line }} className="flex-1 h-px" />
      </div>

      {!naming ? (
        <div className="px-3 mb-5">
          <button onClick={() => setNaming(true)}
                  style={{ border: `2px dashed ${T.violet}`, color: T.violet }}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-3xl active:opacity-70">
            <FolderPlus size={21} color={T.violet} />
            <span className="text-base font-semibold">{t.newFolder}</span>
          </button>
        </div>
      ) : (
        <Panel accent={T.violet} className="mx-3 p-5 mb-5">
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
                 placeholder={t.folderName} maxLength={60}
                 className="w-full bg-transparent outline-none text-base mb-4 pb-2"
                 style={{ color: T.text, borderBottom: `1.5px solid ${T.line}` }} />

          <p style={{ color: T.faint }} className="text-xs mb-5 leading-snug">{t.folderMixed}</p>

          <div className="flex gap-3">
            <button onClick={() => { setNaming(false); setName(""); }}
                    style={{ border: `1.5px solid ${T.line}`, color: T.mute }}
                    className="flex-1 py-3 rounded-full text-base font-semibold">
              {t.cancel}
            </button>
            <button onClick={create} disabled={busy || !name.trim()}
                    style={{ background: T.violet, opacity: name.trim() ? 1 : 0.5 }}
                    className="flex-1 py-3 rounded-full text-base font-semibold text-white">
              {t.create}
            </button>
          </div>
        </Panel>
      )}

      {loading && (
        <p style={{ color: T.mute }} className="text-sm px-6 py-8 text-center">{t.loading}</p>
      )}

      {!loading && meta.folders.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <FolderOpen size={38} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.noFolder}</p>
          <p style={{ color: T.mute }} className="text-sm">{t.noFolderSub}</p>
        </Panel>
      )}

      {meta.folders.length > 0 && (
        <Panel className="mx-3 overflow-hidden">
          {meta.folders.map((f, i) => (
            <div key={f.id} style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}
                 className="flex items-center">
              <button onClick={() => onOpenFolder(f)}
                      className="flex items-center gap-4 pl-4 py-3.5 flex-1 min-w-0 text-left active:opacity-60">
                <Tile c={T.violet} bg={T.violetBg} Icon={Folder} size={44} icon={21} />
                <span className="min-w-0 flex-1">
                  <span style={{ color: T.text }} className="block text-base truncate">{f.name}</span>
                  <span style={{ color: T.mute, fontFamily: MONO }} className="block text-xs mt-1">
                    {counts[f.id] || 0} {t.files}
                  </span>
                </span>
              </button>
              <button onClick={() => remove(f.id)} aria-label={t.del} className="px-4 py-5">
                <Trash2 size={19} color={T.faint} />
              </button>
            </div>
          ))}
        </Panel>
      )}

    </div>
  );
}

/* ─────────── search bar ─────────── */
const SearchBar = ({ value, onChange, accent = T.violet, autoFocus, t }) => (
  <div className="flex items-center gap-3 px-5 py-3.5 rounded-full"
       style={{ background: T.card, border: `1.5px solid ${value ? accent : T.line}`,
                boxShadow: value ? `0 0 0 3px ${accent}1F` : "none",
                transition: "border-color 160ms, box-shadow 160ms" }}>
    <Search size={20} color={value ? accent : T.mute} className="shrink-0" />
    <input value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus}
           placeholder={t.search} inputMode="search"
           className="flex-1 min-w-0 bg-transparent outline-none text-base"
           style={{ color: T.text }} />
    {value && (
      <button onClick={() => onChange("")} aria-label="Effacer" className="shrink-0 p-1">
        <X size={17} color={T.mute} />
      </button>
    )}
  </div>
);

/* ─────────── help ─────────── */
const HelpView = ({ onBack, t }) => (
  <div className="pb-10">
    <TopBar title={t.help} onBack={onBack} />

    <Panel accent={T.blue} className="mx-3 p-6 mb-3">
      <Tile c={T.blue} bg={T.blueBg} Icon={Cloud} size={58} icon={28} />
      <h2 style={{ color: T.text }} className="text-lg font-semibold mt-4 mb-1.5">{t.needSpace}</h2>
      <p style={{ color: T.mute }} className="text-sm leading-snug mb-5">{t.needSpaceSub}</p>
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("To-cloud — demande d'espace")}`}
         style={{ background: T.blue }}
         className="flex items-center justify-center gap-2.5 py-3.5 rounded-full active:opacity-80">
        <Mail size={19} color="#FFFFFF" />
        <span className="text-base font-semibold text-white">{SUPPORT_EMAIL}</span>
      </a>
    </Panel>

    <Section label={t.faq}>
      <Row Icon={Upload} title={t.q1} sub={t.a1} />
      <Divider />
      <Row Icon={Eye} title={t.q2} sub={t.a2} />
      <Divider />
      <Row Icon={Trash2} title={t.q3} sub={t.a3} />
    </Section>
  </div>
);

/* ─────────── account ─────────── */
const AddAccountView = ({ onBack, user, t }) => (
  <div className="pb-10">
    <TopBar title={t.addAccount} onBack={onBack} />
    <Section>
      <Row Icon={User} title={user?.email} sub={t.activeAccount}
           right={<Check size={20} color={T.violet} />} />
    </Section>
    <Panel className="mx-3 p-6 text-center mt-3">
      <UserPlus size={34} color={T.faint} strokeWidth={1.6} className="mx-auto mb-3" />
      <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.soon}</p>
      <p style={{ color: T.mute }} className="text-sm leading-snug">{t.multiSoon}</p>
    </Panel>
  </div>
);

/* ─────────── category ─────────── */
function CategoryView({ cat, onBack, onOpen, onPlay, t, lang }) {
  const [sel, setSel] = useState([]);
  const [menu, setMenu] = useState(null);
  const [moving, setMoving] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");

  const isGallery = cat.key === "sary";
  const { files: raw, meta, loading, more, done, error, refresh, loadMore } =
    useFiles(cat.key, { thumbs: isGallery, limit: isGallery ? 18 : 12 });

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = raw.filter(f => !needle || f.name.toLowerCase().includes(needle));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") out.sort((a, b) => b.size - a.size);
    return out;
  }, [raw, q, sort]);

  /* la page suivante n'est demandee qu'au moment ou la sentinelle approche */
  const tail = useRef(null);
  useEffect(() => {
    if (done || !tail.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); },
                                        { rootMargin: "400px" });
    io.observe(tail.current);
    return () => io.disconnect();
  }, [done, loadMore, items.length]);

  /* un envoi termine en arriere-plan doit se voir sans geste de l'utilisateur */
  const { doneCount } = useUploads();
  const seenRef = useRef(doneCount);
  useEffect(() => {
    if (doneCount !== seenRef.current) { seenRef.current = doneCount; refresh(); }
  }, [doneCount, refresh]);

  const groups = useMemo(() => {
    const m = {}; items.forEach(f => { (m[f.g] ||= []).push(f); }); return m;
  }, [items]);

  const mode = sel.length > 0;
  const all = sel.length === items.length && items.length > 0;
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const label = GLABEL[lang] || GLABEL.fr;

  /* Appui long. Le moindre glissement annule : sans cela, un simple defilement
     declenche la selection et la page semble sauter sous le doigt. */
  const holdRef = useRef(null);
  const firedRef = useRef(false);
  const originRef = useRef(null);
  const holdStart = (id, e) => {
    firedRef.current = false;
    originRef.current = { x: e.clientX, y: e.clientY };
    holdRef.current = setTimeout(() => {
      firedRef.current = true;
      navigator.vibrate?.(18);
      setSel(s => (s.includes(id) ? s : [...s, id]));
    }, 450);
  };
  const holdMove = e => {
    const o = originRef.current;
    if (!o) return;
    if (Math.abs(e.clientX - o.x) > 8 || Math.abs(e.clientY - o.y) > 8) holdEnd();
  };
  const holdEnd = () => { clearTimeout(holdRef.current); originRef.current = null; };

  const holdProps = f => ({
    onPointerDown: e => holdStart(f.id, e),
    onPointerMove: holdMove,
    onPointerUp: holdEnd,
    onPointerLeave: holdEnd,
    onPointerCancel: holdEnd,
    onContextMenu: e => e.preventDefault(),
    style: { touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" },
  });

  const open = f => {
    if (firedRef.current) { firedRef.current = false; return; }
    if (mode) return toggle(f.id);
    if (cat.key === "feo") return onPlay(items, f.id);
    onOpen(f, isGallery ? items : []);
  };

  async function wipe(ids) {
    navigator.vibrate?.(12);
    setBusy(true);
    try {
      for (const id of ids) await removeFile(id);
      setSel([]);
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function doMove(id, dest) {
    setMoving(null);
    setBusy(true);
    try { await moveFile(id, dest); await refresh(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function doShare(f) {
    try {
      const r = await shareFile(f.id);
      await navigator.clipboard?.writeText(r.url);
      alert(`${t.linkCopied}\n\n${t.linkValid.replace("{d}", r.days)}`);
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="pb-10">
      {mode ? (
        <div style={{ background: cat.bg }}
             className="sticky top-0 z-20 flex items-center gap-1 px-4 py-3.5 mb-4">
          <button onClick={() => setSel([])} aria-label="Annuler" className="p-1">
            <X size={24} color={T.text} />
          </button>
          <span style={{ color: T.text, fontFamily: MONO }} className="flex-1 text-sm px-2">
            {String(sel.length).padStart(2, "0")} {t.selected}
          </span>
          <button aria-label={t.download} className="p-2"
                  onClick={() => sel.forEach(id => downloadToDisk(id))}>
            <Download size={22} color={T.text} />
          </button>
          <button aria-label={t.del} className="p-2" disabled={busy} onClick={() => wipe(sel)}>
            <Trash2 size={22} color={T.rose} />
          </button>
          <button aria-label={t.more} className="p-2"
                  onClick={() => {
                    const one = items.find(f => f.id === sel[0]);
                    if (sel.length === 1 && one) setMenu(one); else setBulk(true);
                  }}>
            <MoreVertical size={22} color={T.text} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-5">
          <button onClick={onBack} aria-label="Retour" className="p-1 -ml-1">
            <ArrowLeft size={26} color={T.text} />
          </button>
          <button onClick={() => setSel(items.map(f => f.id))} aria-label={t.selectAll}
                  className="p-2" disabled={!items.length}>
            <CheckSquare size={22} color={items.length ? T.mute : T.faint} />
          </button>
        </div>
      )}

      {!mode && (
        <>
          <div className="flex items-center gap-4 px-5 mb-5">
            <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={62} icon={30} />
            <div className="min-w-0">
              <h1 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.02em" }}
                  className="text-2xl font-bold uppercase">{t.cats[cat.key]}</h1>
              <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
                {meta.total} {t.files}
              </p>
              {items.length > 0 && (
                <p style={{ color: T.faint }} className="text-xs mt-1">{t.holdToSelect}</p>
              )}
            </div>
          </div>

          <div className="px-3 mb-4">
            <SearchBar value={q} onChange={setQ} accent={cat.c} t={t} />
          </div>

          {items.length > 1 && (
            <div className="flex items-center gap-2 px-4 mb-4 overflow-x-auto">
              {[["recent", t.sortRecent], ["name", t.sortName], ["size", t.sortSize]].map(([k, l]) => (
                <button key={k} onClick={() => setSort(k)}
                  style={{
                    background: sort === k ? cat.bg : "transparent",
                    border: `1.5px solid ${sort === k ? cat.c : T.line}`,
                    color: sort === k ? cat.c : T.mute,
                  }}
                  className="text-xs font-semibold px-3.5 py-2 rounded-full shrink-0">
                  {l}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {mode && (
        <button onClick={() => setSel(all ? [] : items.map(f => f.id))}
          style={{ color: cat.c, fontFamily: DISPLAY, letterSpacing: "0.08em" }}
          className="text-sm font-bold uppercase px-6 pb-4">
          {all ? t.deselectAll : t.selectAll}
        </button>
      )}

      {loading && (
        <p style={{ color: T.mute }} className="text-sm px-6 py-10 text-center">{t.loading}</p>
      )}

      {error && !loading && (
        <Panel className="mx-3 p-6 text-center">
          <CircleAlert size={34} color={T.rose} strokeWidth={1.8} className="mx-auto mb-3" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.loadFailed}</p>
          <p style={{ color: T.mute }} className="text-sm mb-4">{error}</p>
          <button onClick={refresh} style={{ color: T.violet }} className="text-sm font-bold">
            {t.retry}
          </button>
        </Panel>
      )}

      {!loading && !error && items.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <FolderOpen size={40} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">
            {q ? t.noMatch : t.empty}
          </p>
          <p style={{ color: T.mute }} className="text-sm">{q ? t.noMatchSub : t.emptySub}</p>
        </Panel>
      )}

      {isGallery && items.length > 0 && (
        <div className="grid grid-cols-3 gap-1 px-1">
          {items.map(f => {
            const on = sel.includes(f.id);
            return (
              <button key={f.id} onClick={() => open(f)} {...holdProps(f)}
                className="relative aspect-square overflow-hidden rounded-md active:opacity-70"
                style={{ background: T.sunken }}>
                {f.thumb
                  ? <img src={f.thumb} alt={f.name} loading="lazy"
                         className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center">
                      <Image size={22} color={T.faint} />
                    </span>}
                {on && (
                  <span style={{ background: `${cat.c}CC` }}
                        className="absolute inset-0 flex items-center justify-center">
                    <Check size={30} color="#FFFFFF" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isGallery && Object.entries(groups).map(([g, list], gi) => (
        <Reveal key={g} delay={gi * 60} className="mb-5">
          <div className="flex items-center gap-3 px-6 pb-2">
            <span style={{ color: T.mute, fontFamily: DISPLAY, letterSpacing: "0.14em" }}
                  className="text-xs font-bold uppercase">{label[g]}</span>
            <span style={{ background: T.line }} className="flex-1 h-px" />
          </div>
          <Panel className="mx-3 overflow-hidden">
            {list.map((f, i) => {
              const on = sel.includes(f.id);
              return (
                <div key={f.id}
                     style={{ borderTop: i ? `1px solid ${T.line}` : "none",
                              background: on ? cat.bg : "transparent" }}
                     className="flex items-center">
                  <button onClick={() => open(f)} {...holdProps(f)}
                    className="flex items-center gap-4 pl-4 py-3.5 flex-1 min-w-0 text-left active:opacity-60">
                    <span className="relative shrink-0">
                      <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={46} icon={22} />
                      {on && (
                        <span style={{ background: cat.c }}
                              className="absolute inset-0 rounded-full flex items-center justify-center">
                          <Check size={22} color="#FFFFFF" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span style={{ color: T.text }} className="block text-base truncate">{f.name}</span>
                      <span style={{ color: T.mute, fontFamily: MONO }} className="block text-xs mt-1">
                        {f.sizeLabel} · {f.when}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => mode ? toggle(f.id) : setMenu(f)}
                          aria-label="Options" className="px-4 py-5 shrink-0">
                    <MoreVertical size={20} color={T.faint} />
                  </button>
                </div>
              );
            })}
          </Panel>
        </Reveal>
      ))}

      {!done && !loading && (
        <div ref={tail} className="py-8 text-center">
          <span style={{ color: T.faint, fontFamily: MONO }} className="text-xs">
            {more ? t.loading : `${items.length} / ${meta.total}`}
          </span>
        </div>
      )}

      <FileMenu file={menu} cat={cat} t={t} folders={meta.folders}
                onClose={() => setMenu(null)}
                onOpen={() => { const f = menu; setMenu(null); open(f); }}
                onDownload={() => { const f = menu; setMenu(null); downloadToDisk(f.id); }}
                onShare={() => { const f = menu; setMenu(null); doShare(f); }}
                onMove={() => { const f = menu; setMenu(null); setMoving(f); }}
                onDelete={() => { const f = menu; setMenu(null); wipe([f.id]); }} />

      <Sheet open={bulk} onClose={() => setBulk(false)}>
        <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
            className="text-lg font-bold uppercase px-6 pb-1">
          {sel.length} {t.selected}
        </h2>
        <p style={{ color: T.mute }} className="text-sm px-6 pb-4">{t.bulkNote}</p>
        <Panel className="mx-3 overflow-hidden mb-3">
          <Row Icon={Download} title={t.download}
               onClick={() => { setBulk(false); sel.forEach(id => downloadToDisk(id)); }} />
        </Panel>
        <Panel className="mx-3 overflow-hidden">
          <Row Icon={Trash2} title={t.del} danger
               onClick={() => { setBulk(false); wipe(sel); }} />
        </Panel>
      </Sheet>

      <MovePicker open={!!moving} folders={meta.folders} cat={cat} t={t}
                  current={moving?.folder_id || null}
                  onPick={dest => doMove(moving.id, dest)}
                  onClose={() => setMoving(null)} />

      <button onClick={() => setUp(true)}
        style={{ background: `linear-gradient(145deg, ${cat.c}, ${T.violet})`,
                 boxShadow: halo(cat.c) }}
        className="fixed right-5 bottom-28 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-95"
        aria-label={t.uploadHere}>
        <Upload size={26} color="#FFFFFF" strokeWidth={2.4} />
      </button>

      <UploadPicker open={up} cat={cat} t={t} onClose={() => setUp(false)} />
    </div>
  );
}

/* ─────────── home ─────────── */
function HomeView({ onCat, onMenu, onAccount, onSearch, onFolders, user, t }) {
  const { meta, quota, loading } = useFiles(null, { limit: 1 });

  /* les compteurs viennent du serveur : inutile de tirer tous les fichiers
     pour savoir combien il y en a */
  const stats = meta.counts || {};

  const totalGo = Math.max(1, Math.round(quota.quota / 1024 ** 3));
  const usedGo = (quota.used / 1024 ** 3).toFixed(quota.used < 1024 ** 3 ? 2 : 1).replace(".", ",");
  const freeGo = Math.max(0, totalGo - quota.used / 1024 ** 3).toFixed(0);

  const segs = [
    { c: T.rose,   k: "sary" },
    { c: T.violet, k: "video" },
    { c: T.gold,   k: "feo" },
    { c: T.blue,   k: "doc" },
  ].map(s => ({ ...s, v: quota.quota ? (stats[s.k]?.bytes || 0) / quota.quota * 100 : 0 }));

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="pb-10">
      <header className="flex items-center justify-between px-4 pt-5 pb-6">
        <button onClick={onMenu} aria-label="Menu" className="p-1">
          <Menu size={26} color={T.text} />
        </button>
        <Wordmark size={40} text={20} />
        <button onClick={onAccount} aria-label={t.account}
          style={{ background: `linear-gradient(145deg, ${T.violet}, ${T.blue})` }}
          className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70">
          <span style={{ color: "#FFFFFF", fontFamily: DISPLAY }} className="text-base font-bold">
            {initial}
          </span>
        </button>
      </header>

      <Reveal className="px-3 mb-6">
        <GlowFrame c={T.violet} radius={999} speed={6}>
          <button onClick={onSearch}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-full active:opacity-60">
            <Search size={21} color={T.mute} />
            <span style={{ color: T.mute }} className="text-base">{t.search}</span>
          </button>
        </GlowFrame>
      </Reveal>

      <Reveal delay={60}>
      <GlowFrame c={T.blue} className="mx-3 mb-8" speed={7}>
      <button onClick={onFolders} className="w-full p-5 text-left active:opacity-70">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div style={{ color: T.faint, fontFamily: DISPLAY, letterSpacing: "0.18em", fontSize: 10 }}
                 className="font-bold uppercase mb-1.5">{t.storage}</div>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <span style={{ color: T.text, fontFamily: DISPLAY }}
                      className="text-5xl font-bold leading-none">—</span>
              ) : (
                <Counter value={quota.used / 1024 ** 3}
                         decimals={quota.used < 1024 ** 3 ? 2 : 1}
                         style={{ color: T.text, fontFamily: DISPLAY }}
                         className="text-5xl font-bold leading-none" />
              )}
              <span style={{ color: T.mute, fontFamily: DISPLAY }}
                    className="text-3xl font-bold leading-none">/ {totalGo} Go</span>
            </div>
          </div>
          <span style={{ color: T.blue, background: T.blueBg, fontFamily: DISPLAY,
                         letterSpacing: "0.12em", fontSize: 10 }}
                className="font-bold px-2.5 py-1 rounded-full">{t.free}</span>
        </div>

        <div style={{ background: T.sunken }} className="h-4 w-full flex gap-1 rounded-full overflow-hidden mb-3">
          {segs.map((s, i) => (
            <div key={i} style={{ width: `${Math.max(s.v, s.v > 0 ? 2 : 0)}%`, background: s.c }}
                 className="rounded-full" />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {segs.map(s => (
            <span key={s.k} className="flex items-center gap-1.5">
              <span style={{ background: s.c }} className="w-2.5 h-2.5 rounded-full" />
              <span style={{ color: T.mute, fontSize: 11 }}>{t.cats[s.k]}</span>
            </span>
          ))}
          <span style={{ color: T.faint, fontFamily: MONO, fontSize: 11 }} className="ml-auto">
            {freeGo} Go {t.freeSpace}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-4"
             style={{ borderTop: `1px solid ${T.line}` }}>
          <Folder size={17} color={T.violet} />
          <span style={{ color: T.violet }} className="text-sm font-semibold">{t.openFolders}</span>
          <ChevronRight size={17} color={T.violet} className="ml-auto" />
        </div>
      </button>
      </GlowFrame>
      </Reveal>

      <div className="flex items-center gap-3 px-5 mb-4">
        <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.12em" }}
            className="text-sm font-bold uppercase">{t.categories}</h2>
        <span style={{ background: T.line }} className="flex-1 h-px" />
      </div>

      <div className="grid grid-cols-2 gap-3 px-3">
        {CATS.map((c, i) => {
          const s = stats[c.key] || { n: 0, bytes: 0 };
          return (
            <Reveal key={c.key} delay={i * 70}>
              <GlowFrame c={c.c} speed={4.5 + i * 0.6}>
                <button onClick={() => onCat(c)}
                        className="w-full h-full p-4 rounded-3xl text-left active:opacity-60">
                  <div className="mb-4"><Tile c={c.c} bg={c.bg} Icon={c.Icon} /></div>
                  <div style={{ color: T.text }} className="text-base font-semibold leading-snug">
                    {t.cats[c.key]}
                  </div>
                  <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1.5">
                    {s.n ? `${humanSize(s.bytes)} · ${s.n}` : t.emptyShort}
                  </div>
                </button>
              </GlowFrame>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── folder (mixed contents) ─────────── */

/**
 * Un dossier accueille tous les types. Le tri par categorie est fait ici, a
 * l'affichage : l'utilisateur range comme il veut, l'application s'occupe de
 * presenter proprement.
 */
function FolderView({ folder, onBack, onOpen, onPlay, t }) {
  const [sel, setSel] = useState([]);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [q, setQ] = useState("");

  const { files: raw, meta, loading, error, refresh, loadMore, done, more } =
    useFiles(null, { folder: folder.id, thumbs: true, limit: 24 });

  const { doneCount } = useUploads();
  const seenRef = useRef(doneCount);
  useEffect(() => {
    if (doneCount !== seenRef.current) { seenRef.current = doneCount; refresh(); }
  }, [doneCount, refresh]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return raw.filter(f => !needle || f.name.toLowerCase().includes(needle));
  }, [raw, q]);

  const byCat = useMemo(() => {
    const m = {};
    items.forEach(f => { (m[f.cat] ||= []).push(f); });
    return m;
  }, [items]);

  const tail = useRef(null);
  useEffect(() => {
    if (done || !tail.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); },
                                        { rootMargin: "400px" });
    io.observe(tail.current);
    return () => io.disconnect();
  }, [done, loadMore, items.length]);

  const mode = sel.length > 0;
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const holdRef = useRef(null);
  const firedRef = useRef(false);
  const originRef = useRef(null);
  const holdStart = (id, e) => {
    firedRef.current = false;
    originRef.current = { x: e.clientX, y: e.clientY };
    holdRef.current = setTimeout(() => {
      firedRef.current = true;
      navigator.vibrate?.(18);
      setSel(s => (s.includes(id) ? s : [...s, id]));
    }, 450);
  };
  const holdMove = e => {
    const o = originRef.current;
    if (!o) return;
    if (Math.abs(e.clientX - o.x) > 8 || Math.abs(e.clientY - o.y) > 8) holdEnd();
  };
  const holdEnd = () => { clearTimeout(holdRef.current); originRef.current = null; };

  const open = f => {
    if (firedRef.current) { firedRef.current = false; return; }
    if (mode) return toggle(f.id);
    if (f.cat === "feo") return onPlay(items.filter(x => x.cat === "feo"), f.id);
    onOpen(f, f.cat === "sary" ? items.filter(x => x.cat === "sary") : []);
  };

  async function wipe(ids) {
    navigator.vibrate?.(12);
    setBusy(true);
    try {
      for (const id of ids) await removeFile(id);
      setSel([]);
      await refresh();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  const holdProps = f => ({
    onPointerDown: e => holdStart(f.id, e),
    onPointerMove: holdMove,
    onPointerUp: holdEnd,
    onPointerLeave: holdEnd,
    onPointerCancel: holdEnd,
    onContextMenu: e => e.preventDefault(),
    style: { touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none" },
  });

  return (
    <div className="pb-10">
      {mode ? (
        <div style={{ background: T.violetBg }}
             className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3.5 mb-4">
          <button onClick={() => setSel([])} aria-label="Annuler" className="p-1">
            <X size={24} color={T.text} />
          </button>
          <span style={{ color: T.text, fontFamily: MONO }} className="flex-1 text-sm">
            {String(sel.length).padStart(2, "0")} {t.selected}
          </span>
          <button aria-label={t.download} className="p-2"
                  onClick={() => sel.forEach(id => downloadToDisk(id))}>
            <Download size={22} color={T.text} />
          </button>
          <button aria-label={t.del} className="p-2" disabled={busy} onClick={() => wipe(sel)}>
            <Trash2 size={22} color={T.rose} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-5">
          <button onClick={onBack} aria-label="Retour" className="p-1 -ml-1">
            <ArrowLeft size={26} color={T.text} />
          </button>
          <button onClick={() => setSel(items.map(f => f.id))} aria-label={t.selectAll}
                  className="p-2" disabled={!items.length}>
            <CheckSquare size={22} color={items.length ? T.mute : T.faint} />
          </button>
        </div>
      )}

      {!mode && (
        <>
          <div className="flex items-center gap-4 px-5 mb-5">
            <Tile c={T.violet} bg={T.violetBg} Icon={Folder} size={62} icon={30} />
            <div className="min-w-0">
              <h1 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.02em" }}
                  className="text-2xl font-bold uppercase truncate">{folder.name}</h1>
              <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
                {meta.total} {t.files}
              </p>
            </div>
          </div>
          <div className="px-3 mb-4">
            <SearchBar value={q} onChange={setQ} t={t} />
          </div>
        </>
      )}

      {loading && (
        <p style={{ color: T.mute }} className="text-sm px-6 py-10 text-center">{t.loading}</p>
      )}

      {error && !loading && (
        <Panel className="mx-3 p-6 text-center">
          <CircleAlert size={32} color={T.rose} strokeWidth={1.8} className="mx-auto mb-3" />
          <p style={{ color: T.mute }} className="text-sm">{error}</p>
        </Panel>
      )}

      {!loading && !error && items.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <FolderOpen size={40} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.empty}</p>
          <p style={{ color: T.mute }} className="text-sm">{t.emptySub}</p>
        </Panel>
      )}

      {/* une section par categorie presente dans le dossier */}
      {CATS.filter(c => byCat[c.key]?.length).map((c, ci) => (
        <Reveal key={c.key} delay={ci * 60} className="mb-5">
          <div className="flex items-center gap-3 px-6 pb-2">
            <span style={{ color: c.c, fontFamily: DISPLAY, letterSpacing: "0.14em" }}
                  className="text-xs font-bold uppercase">{t.cats[c.key]}</span>
            <span style={{ color: T.faint, fontFamily: MONO }} className="text-xs">
              {byCat[c.key].length}
            </span>
            <span style={{ background: T.line }} className="flex-1 h-px" />
          </div>

          {c.key === "sary" ? (
            <div className="grid grid-cols-3 gap-1 px-1">
              {byCat[c.key].map(f => {
                const on = sel.includes(f.id);
                return (
                  <button key={f.id} onClick={() => open(f)} {...holdProps(f)}
                    className="relative aspect-square overflow-hidden rounded-md active:opacity-70"
                    style={{ background: T.sunken }}>
                    {f.thumb
                      ? <img src={f.thumb} alt={f.name} loading="lazy"
                             className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center">
                          <Image size={22} color={T.faint} />
                        </span>}
                    {on && (
                      <span style={{ background: `${c.c}CC` }}
                            className="absolute inset-0 flex items-center justify-center">
                        <Check size={30} color="#FFFFFF" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <Panel className="mx-3 overflow-hidden">
              {byCat[c.key].map((f, i) => {
                const on = sel.includes(f.id);
                return (
                  <div key={f.id}
                       style={{ borderTop: i ? `1px solid ${T.line}` : "none",
                                background: on ? c.bg : "transparent" }}
                       className="flex items-center">
                    <button onClick={() => open(f)} {...holdProps(f)}
                      className="flex items-center gap-4 pl-4 py-3.5 flex-1 min-w-0 text-left active:opacity-60">
                      <span className="relative shrink-0">
                        <Tile c={c.c} bg={c.bg} Icon={c.Icon} size={46} icon={22} />
                        {on && (
                          <span style={{ background: c.c }}
                                className="absolute inset-0 rounded-full flex items-center justify-center">
                            <Check size={22} color="#FFFFFF" strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span style={{ color: T.text }} className="block text-base truncate">{f.name}</span>
                        <span style={{ color: T.mute, fontFamily: MONO }} className="block text-xs mt-1">
                          {f.sizeLabel} · {f.when}
                        </span>
                      </span>
                    </button>
                    <button onClick={() => mode ? toggle(f.id) : setMenu(f)}
                            aria-label="Options" className="px-4 py-5 shrink-0">
                      <MoreVertical size={20} color={T.faint} />
                    </button>
                  </div>
                );
              })}
            </Panel>
          )}
        </Reveal>
      ))}

      {!done && !loading && (
        <div ref={tail} className="py-8 text-center">
          <span style={{ color: T.faint, fontFamily: MONO }} className="text-xs">
            {more ? t.loading : `${items.length} / ${meta.total}`}
          </span>
        </div>
      )}

      {menu && (
        <FileMenu file={menu} cat={CATS.find(c => c.key === menu.cat) || CATS[5]} t={t}
                  folders={meta.folders}
                  onClose={() => setMenu(null)}
                  onOpen={() => { const f = menu; setMenu(null); open(f); }}
                  onDownload={() => { const f = menu; setMenu(null); downloadToDisk(f.id); }}
                  onShare={async () => {
                    const f = menu; setMenu(null);
                    try {
                      const r = await shareFile(f.id);
                      await navigator.clipboard?.writeText(r.url);
                      alert(`${t.linkCopied}\n\n${t.linkValid.replace("{d}", r.days)}`);
                    } catch (e) { alert(e.message); }
                  }}
                  onMove={() => { const f = menu; setMenu(null); moveFile(f.id, null).then(refresh); }}
                  onDelete={() => { const f = menu; setMenu(null); wipe([f.id]); }} />
      )}

      <button onClick={() => setUp(true)}
        style={{ background: `linear-gradient(145deg, ${T.blue}, ${T.violet})`,
                 boxShadow: halo(T.violet) }}
        className="fixed right-5 bottom-6 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-95"
        aria-label={t.uploadHere}>
        <Upload size={26} color="#FFFFFF" strokeWidth={2.4} />
      </button>

      {/* dans un dossier, tous les types sont admis : le classement se fait seul */}
      <UploadPicker open={up} cat={CATS[5]} folder={folder.id} strict={false} t={t}
                    onClose={() => setUp(false)} />
    </div>
  );
}

/* ─────────── global search ─────────── */
function SearchView({ onBack, onOpen, onPlay, t }) {
  const [q, setQ] = useState("");
  const { files, loading } = useFiles();

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return files.filter(f => f.name.toLowerCase().includes(needle)).slice(0, 40);
  }, [files, q]);

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={onBack} aria-label="Retour" className="p-1 -ml-1">
          <ArrowLeft size={26} color={T.text} />
        </button>
        <div className="flex-1">
          <SearchBar value={q} onChange={setQ} autoFocus t={t} />
        </div>
      </div>

      {loading && (
        <p style={{ color: T.mute }} className="text-sm px-6 py-10 text-center">{t.loading}</p>
      )}

      {!loading && !q && (
        <p style={{ color: T.faint }} className="text-sm px-6 py-10 text-center">{t.searchHint}</p>
      )}

      {!loading && q && hits.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <Search size={36} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.noMatch}</p>
          <p style={{ color: T.mute }} className="text-sm">{t.noMatchSub}</p>
        </Panel>
      )}

      {hits.length > 0 && (
        <Panel className="mx-3 overflow-hidden">
          {hits.map((f, i) => {
            const c = CATS.find(x => x.key === f.cat) || CATS[5];
            return (
              <button key={f.id}
                onClick={() => f.cat === "feo" ? onPlay(hits.filter(x => x.cat === "feo"), f.id) : onOpen(f)}
                style={{ borderTop: i ? `1px solid ${T.line}` : "none" }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left active:opacity-60">
                <Tile c={c.c} bg={c.bg} Icon={c.Icon} size={44} icon={21} />
                <span className="min-w-0 flex-1">
                  <span style={{ color: T.text }} className="block text-base truncate">{f.name}</span>
                  <span style={{ color: T.mute, fontFamily: MONO }} className="block text-xs mt-1">
                    {t.cats[f.cat]} · {f.sizeLabel} · {f.when}
                  </span>
                </span>
                <ChevronRight size={18} color={T.faint} />
              </button>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

/* ─────────── shell ─────────── */
export default function ToCloud() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  /* Supabase detient la session : on l'ecoute au lieu de la deviner. Cela
     couvre aussi le retour du parcours Google, qui arrive par redirection. */
  useEffect(() => {
    if (!CONFIGURED) { setReady(true); return; }
    let alive = true;
    const sync = async () => {
      const p = await profile().catch(() => null);
      if (alive) { setUser(p); setReady(true); }
    };
    sync();
    const { data } = supabase.auth.onAuthStateChange(() => sync());
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  const [lang, setLang] = useState(() => load("tc_lang", "fr"));
  const [view, setView] = useState("home");
  const [cat, setCat] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [folder, setFolder] = useState(null);
  const [audio, setAudio] = useState(null);
  const [bump, setBump] = useState(0);
  const t = tr(lang);

  const go = v => { setDrawer(false); setView(v); };
  const home = () => { setView("home"); setCat(null); setFolder(null); };

  /**
   * Bouton retour du telephone.
   *
   * On garde en permanence une entree d'historique « de reserve ». Le retour la
   * consomme, on referme alors l'ecran du dessus et on en repose une aussitot.
   * Sans cette reserve, le premier appui fermerait l'application.
   */
  const layers = { viewing, audio, account, drawer, view, folder };
  const layersRef = useRef(layers);
  layersRef.current = layers;

  /** Ferme l'ecran du dessus. Renvoie false s'il n'y a plus rien a fermer. */
  const goBack = () => {
    const L = layersRef.current;
    if (L.viewing) { setViewing(null); return true; }
    if (L.audio) { setAudio(null); return true; }
    if (L.account) { setAccount(false); return true; }
    if (L.drawer) { setDrawer(false); return true; }
    if (L.view === "folder") { setFolder(null); setView("folders"); return true; }
    if (L.view === "language") { setView("settings"); return true; }
    if (L.view !== "home") { setView("home"); setCat(null); setFolder(null); return true; }
    return false;
  };

  useEffect(() => {
    window.history.pushState({ tc: true }, "");
    const onPop = () => {
      if (goBack()) window.history.pushState({ tc: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Dans l'APK, Capacitor intercepte le bouton retour avant que `popstate` ne
     puisse se declencher : il faut s'y brancher directement. */
  useEffect(() => {
    let off = () => {};
    onHardwareBack(() => goBack()).then(fn => { off = fn; });
    return () => off();
  }, []);


  function pickLang(code) {
    setLang(code);
    save("tc_lang", code);
  }

  async function signOut() {
    await logout();
    setUser(null);
    setView("home");
    setCat(null);
  }

  /* Mieux vaut dire ce qui manque que laisser une page blanche. */
  if (!CONFIGURED) {
    return (
      <div style={{ background: T.bg, fontFamily: "'Inter Tight', system-ui, sans-serif" }}
           className="w-full min-h-screen flex items-center justify-center px-6">
        <div style={{ background: T.card, border: `2px solid ${T.gold}` }}
             className="w-full max-w-md rounded-3xl p-7 text-center">
          <Logo size={64} />
          <h1 style={{ color: T.text, fontFamily: DISPLAY }}
              className="text-xl font-bold uppercase mt-4 mb-2">Configuration incomplete</h1>
          <p style={{ color: T.mute }} className="text-sm leading-snug mb-5">
            Ces variables d'environnement doivent etre definies sur Cloudflare Pages,
            puis le site redeploye.
          </p>
          <div style={{ background: T.sunken }} className="rounded-2xl p-4 text-left">
            {MISSING.map(v => (
              <div key={v} style={{ color: T.rose, fontFamily: MONO }} className="text-sm py-1">
                {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ background: T.bg }} className="w-full min-h-screen flex items-center justify-center">
        <Logo size={64} />
      </div>
    );
  }

  if (!user) return <Auth lang={lang} onDone={() => {}} />;

  return (
    <UploadProvider>
    <div style={{ background: T.bg, fontFamily: "'Inter Tight', system-ui, sans-serif" }}
         className="w-full min-h-screen flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes tcspin { to { transform: rotate(360deg); } }
        @keyframes tcrot { to { transform: rotate(360deg); } }
        .tc-spin { animation: tcrot 900ms linear infinite; }

        /* Retour tactile : sans lui, un appui sur mobile ne se voit pas et
           l'utilisateur appuie deux fois. */
        button, a[role="button"], [role="button"] {
          transition: transform 90ms ease, opacity 90ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        button:active, a[role="button"]:active, [role="button"]:active {
          transform: scale(0.96);
          opacity: 0.82;
        }
        button:disabled:active { transform: none; opacity: 1; }
        @keyframes tcbreathe { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .tc-anim { animation: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-md overflow-hidden"
           style={{ background: T.bg, minHeight: "100vh",
                    backgroundImage:
                      `radial-gradient(560px 280px at 100% 0%, ${T.violet}14, transparent 66%),
                       radial-gradient(480px 240px at 0% 6%, ${T.blue}12, transparent 62%)` }}>

        <div className="fixed inset-0 overflow-hidden pointer-events-none"
             style={{ maxWidth: 448, margin: "0 auto" }}>
          <Backdrop />
        </div>

        <div className="relative">
        {view === "home" &&
          <HomeView key={bump} t={t} user={user}
                    onCat={c => { setCat(c); setView("cat"); }}
                    onSearch={() => setView("search")}
                    onFolders={() => setView("folders")}
                    onMenu={() => setDrawer(true)} onAccount={() => setAccount(true)} />}
        {view === "cat" && cat &&
          <CategoryView key={cat.key + bump} cat={cat}
                        onBack={home}
                        onOpen={(f, sibs) => { setGallery(sibs || []); setViewing(f); }}
                        onPlay={(queue, id) => setAudio({ queue, id })}
                        t={t} lang={lang} />}
        {view === "folders"    && <FoldersView onBack={home}
                                               onOpenFolder={f => { setFolder(f); setView("folder"); }}
                                               onOpenCat={c => { setCat(c); setFolder(null); setView("cat"); }}
                                               t={t} />}
        {view === "folder" && folder &&
          <FolderView key={folder.id + bump} folder={folder}
                      onBack={() => { setFolder(null); setView("folders"); }}
                      onOpen={(f, sibs) => { setGallery(sibs || []); setViewing(f); }}
                      onPlay={(queue, id) => setAudio({ queue, id })} t={t} />}
        {view === "search"     && <SearchView onBack={home} onOpen={f => { setGallery([]); setViewing(f); }}
                                              onPlay={(queue, id) => setAudio({ queue, id })} t={t} />}
        {view === "settings"   && <SettingsView onBack={home} go={go} lang={lang} t={t} />}
        {view === "language"   && <LanguageView onBack={() => setView("settings")}
                                                lang={lang} setLang={pickLang} t={t} />}
        {view === "trash"      && <TrashView onBack={home} t={t} />}
        {view === "help"       && <HelpView onBack={home} t={t} />}
        {view === "addAccount" && <AddAccountView onBack={home} user={user} t={t} />}
        </div>

        <Drawer open={drawer} onClose={() => setDrawer(false)} go={go} t={t} />
        <AccountSheet open={account} onClose={() => setAccount(false)} go={go}
                      user={user} onSignOut={signOut} t={t} />
        <UploadStatus t={t} bottom={96} />
        <InstallBanner lang={lang} />
        {viewing && (
          <Viewer file={viewing} cat={CATS.find(c => c.key === viewing.cat)}
                  siblings={gallery} onNavigate={setViewing}
                  onClose={() => setViewing(null)} t={t} />
        )}
        {audio && (
          <AudioPlayer queue={audio.queue} startId={audio.id}
                       onClose={() => setAudio(null)} t={t} />
        )}
      </div>
    </div>
    </UploadProvider>
  );
}
