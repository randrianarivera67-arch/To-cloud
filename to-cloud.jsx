import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Image, Film, Music, FileText, Package, Box, Upload, Check, X,
  ArrowLeft, MoreVertical, Download, Share2, Trash2, SlidersHorizontal,
  FolderOpen, Menu, Sparkles, Settings, HelpCircle, Languages, Eye, Lock,
  Info, User, UserPlus, LogOut, ChevronRight, Wifi, Bell, ShieldCheck,
  Pencil, CircleAlert, CheckSquare, Cloud, Zap, Play, Pause, SkipBack,
  SkipForward, ZoomIn, ZoomOut, Volume2, ChevronLeft, Maximize2
} from "lucide-react";

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
    chooseCat: "Where to?", chooseCatSub: "The file will be filed under this category.",
    savedIn: "Open in", assembling: "Assembling parts…", noPreview: "No preview",
    noPreviewSub: "This file type can't be displayed in the app.",
    cats: { sary: "Images", video: "Videos", feo: "Audio", doc: "Documents", apk: "Apps", hafa: "Other" },
  },
};
const tr = c => STR[c] || STR.fr;

/* ─────────── data ─────────── */
const CATS = [
  { key: "sary",  size: "1,2 Go",  n: 842, c: T.rose,   bg: T.roseBg,   Icon: Image },
  { key: "video", size: "487 Mo",  n: 36,  c: T.violet, bg: T.violetBg, Icon: Film },
  { key: "feo",   size: "0,94 Go", n: 210, c: T.gold,   bg: T.goldBg,   Icon: Music },
  { key: "doc",   size: "60 Mo",   n: 74,  c: T.blue,   bg: T.blueBg,   Icon: FileText },
  { key: "apk",   size: "3,1 Go",  n: 19,  c: T.rose,   bg: T.roseBg,   Icon: Package },
  { key: "hafa",  size: "220 Mo",  n: 51,  c: T.grey,   bg: T.greyBg,   Icon: Box },
];

const FILES = [
  { id: 1, cat: "video", name: "Kids_Rum_Tony_ep12.mp4", size: "412 Mo", when: "18:04", g: "today", parts: 24, dur: "12:38", hue: 265 },
  { id: 2, cat: "doc",   name: "manual_IA_vente.pdf",    size: "8,4 Mo", when: "16:22", g: "today", parts: 1, pages: 42 },
  { id: 3, cat: "sary",  name: "cover_channel.png",      size: "2,1 Mo", when: "21:10", g: "yday",  parts: 1, dim: "1920 × 1080", hue: 330 },
  { id: 4, cat: "feo",   name: "voix_off_intro.wav",     size: "34 Mo",  when: "19:47", g: "yday",  parts: 2, dur: "03:12" },
  { id: 5, cat: "video", name: "Kids_Rum_Tony_ep11.mp4", size: "388 Mo", when: "18/08", g: "month", parts: 22, dur: "11:04", hue: 200 },
  { id: 6, cat: "apk",   name: "matul-mada-v3.apk",      size: "58 Mo",  when: "16/08", g: "month", parts: 4 },
  { id: 7, cat: "sary",  name: "perso_tony_final.png",   size: "4,8 Mo", when: "15/08", g: "month", parts: 1, dim: "2048 × 2048", hue: 45 },
  { id: 8, cat: "hafa",  name: "assets_perso.zip",       size: "127 Mo", when: "11/08", g: "month", parts: 8 },
  { id: 9, cat: "sary",  name: "thumbnail_ep10.jpg",     size: "1,4 Mo", when: "09/08", g: "month", parts: 1, dim: "1280 × 720", hue: 190 },
  { id: 10, cat: "feo",  name: "musique_generique.mp3",  size: "6,2 Mo", when: "07/08", g: "month", parts: 1, dur: "02:41" },
];

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
                  transform: on ? "translateY(0) scale(1)" : "translateY(28px) scale(0.985)",
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
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end"
         style={{ background: "rgba(23,20,42,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg }}
           className="w-full rounded-t-3xl pt-3 pb-8">
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
function Viewer({ file, cat, onClose, t }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(file?.parts <= 1);
  const [load, setLoad] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!file) return;
    setPlaying(false); setPos(0); setZoom(1); setPage(1);
    if (file.parts > 1) {
      setReady(false); setLoad(0);
      const iv = setInterval(() => {
        setLoad(l => {
          if (l >= file.parts) { clearInterval(iv); setReady(true); return l; }
          return l + 1;
        });
      }, 90);
      return () => clearInterval(iv);
    }
    setReady(true);
  }, [file?.id]);

  useEffect(() => {
    if (!playing) return;
    ref.current = setInterval(() => setPos(p => (p >= 100 ? (setPlaying(false), 100) : p + 1)), 180);
    return () => clearInterval(ref.current);
  }, [playing]);

  if (!file) return null;
  const k = file.cat;

  const Chrome = ({ children, dark }) => (
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
            {file.size}{file.dim ? ` · ${file.dim}` : ""}{file.dur ? ` · ${file.dur}` : ""}
          </div>
        </div>
        <button aria-label={t.download} className="p-2">
          <Download size={22} color={dark ? "#FFFFFF" : T.text} />
        </button>
        <button aria-label={t.share} className="p-2">
          <Share2 size={22} color={dark ? "#FFFFFF" : T.text} />
        </button>
      </div>
      {children}
    </div>
  );

  /* reassembly progress */
  if (!ready) {
    return (
      <Chrome dark={k === "sary" || k === "video"}>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={72} icon={34} />
          <p style={{ color: k === "sary" || k === "video" ? "#FFFFFF" : T.text }}
             className="text-base font-semibold mt-5 mb-2">{t.assembling}</p>
          <p style={{ color: k === "sary" || k === "video" ? "rgba(255,255,255,0.6)" : T.mute,
                      fontFamily: MONO }} className="text-xs mb-5">
            {load} / {file.parts} × 18 Mo
          </p>
          <div style={{ background: "rgba(128,128,160,0.28)" }}
               className="w-full max-w-xs h-2 rounded-full overflow-hidden">
            <div style={{ width: `${(load / file.parts) * 100}%`, background: cat.c,
                          transition: "width 90ms linear" }} className="h-full rounded-full" />
          </div>
        </div>
      </Chrome>
    );
  }

  /* image */
  if (k === "sary") {
    return (
      <Chrome dark>
        <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
          <div style={{
                 width: 300, height: 300, transform: `scale(${zoom})`,
                 transition: "transform 180ms ease", borderRadius: 20,
                 background: `radial-gradient(circle at 30% 25%, hsl(${file.hue} 92% 72%), hsl(${file.hue + 40} 78% 42%) 70%)`,
               }} className="shadow-2xl" />
        </div>
        <div className="flex items-center justify-center gap-6 py-6 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.6, +(z - 0.25).toFixed(2)))}
                  aria-label="Réduire" className="p-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
            <ZoomOut size={22} color="#FFFFFF" />
          </button>
          <span style={{ color: "#FFFFFF", fontFamily: MONO }} className="text-sm w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                  aria-label="Agrandir" className="p-3 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
            <ZoomIn size={22} color="#FFFFFF" />
          </button>
        </div>
      </Chrome>
    );
  }

  /* video */
  if (k === "video") {
    return (
      <Chrome dark>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden"
               style={{ background: `linear-gradient(140deg, hsl(${file.hue} 70% 30%), hsl(${file.hue + 60} 60% 14%))` }}>
            <button onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pause" : "Lecture"}
              style={{ background: "rgba(255,255,255,0.92)" }}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center active:scale-95">
              {playing ? <Pause size={26} color={T.stage} /> : <Play size={26} color={T.stage} className="ml-1" />}
            </button>
          </div>
        </div>
        <div className="px-5 pb-8 shrink-0">
          <div style={{ background: "rgba(255,255,255,0.22)" }} className="h-1.5 rounded-full mb-3">
            <div style={{ width: `${pos}%`, background: cat.c }} className="h-full rounded-full" />
          </div>
          <div className="flex items-center justify-between mb-5">
            <span style={{ color: "rgba(255,255,255,0.75)", fontFamily: MONO }} className="text-xs">
              {String(Math.floor(pos * 0.126)).padStart(2, "0")}:
              {String(Math.floor((pos * 7.58) % 60)).padStart(2, "0")}
            </span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontFamily: MONO }} className="text-xs">{file.dur}</span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <button aria-label="Reculer" onClick={() => setPos(p => Math.max(0, p - 10))}>
              <SkipBack size={26} color="#FFFFFF" />
            </button>
            <button onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pause" : "Lecture"}
              style={{ background: cat.c }}
              className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95">
              {playing ? <Pause size={24} color="#FFFFFF" /> : <Play size={24} color="#FFFFFF" className="ml-1" />}
            </button>
            <button aria-label="Avancer" onClick={() => setPos(p => Math.min(100, p + 10))}>
              <SkipForward size={26} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </Chrome>
    );
  }

  /* audio */
  if (k === "feo") {
    const bars = 44;
    return (
      <Chrome>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div style={{ background: `linear-gradient(150deg, ${T.gold}, ${T.rose})` }}
               className="w-44 h-44 rounded-full flex items-center justify-center mb-8 shadow-xl">
            <div style={{ background: T.bg }} className="w-14 h-14 rounded-full flex items-center justify-center">
              <Music size={26} color={T.gold} />
            </div>
          </div>
          <div className="flex items-end gap-1 h-16 w-full justify-center mb-2">
            {Array.from({ length: bars }).map((_, i) => {
              const on = (i / bars) * 100 <= pos;
              const h = 12 + Math.abs(Math.sin(i * 0.7)) * 42;
              return <span key={i} style={{ height: h, width: 3, borderRadius: 2,
                                            background: on ? T.gold : T.sunken }} />;
            })}
          </div>
          <div className="flex items-center justify-between w-full mb-7">
            <span style={{ color: T.mute, fontFamily: MONO }} className="text-xs">
              {String(Math.floor(pos * 0.032)).padStart(2, "0")}:
              {String(Math.floor((pos * 1.92) % 60)).padStart(2, "0")}
            </span>
            <span style={{ color: T.mute, fontFamily: MONO }} className="text-xs">{file.dur}</span>
          </div>
          <div className="flex items-center gap-8">
            <button aria-label="Reculer" onClick={() => setPos(p => Math.max(0, p - 10))}>
              <SkipBack size={26} color={T.text} />
            </button>
            <button onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pause" : "Lecture"}
              style={{ background: T.gold }}
              className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95">
              {playing ? <Pause size={26} color="#FFFFFF" /> : <Play size={26} color="#FFFFFF" className="ml-1" />}
            </button>
            <button aria-label="Avancer" onClick={() => setPos(p => Math.min(100, p + 10))}>
              <SkipForward size={26} color={T.text} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 px-8 pb-8 shrink-0">
          <Volume2 size={20} color={T.mute} />
          <div style={{ background: T.sunken }} className="flex-1 h-1.5 rounded-full">
            <div style={{ width: "72%", background: T.mute }} className="h-full rounded-full" />
          </div>
        </div>
      </Chrome>
    );
  }

  /* document */
  if (k === "doc") {
    return (
      <Chrome>
        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
          <div style={{ background: T.card, border: `1px solid ${T.line}` }}
               className="w-full max-w-xs aspect-[3/4] rounded-xl p-6 shadow-lg">
            <div style={{ background: T.blue }} className="h-2.5 w-1/2 rounded-full mb-5" />
            {[100, 92, 96, 70, 100, 88, 94, 60].map((w, i) => (
              <div key={i} style={{ background: T.sunken, width: `${w}%` }}
                   className="h-2 rounded-full mb-2.5" />
            ))}
            <div style={{ background: T.blueBg }} className="h-16 w-full rounded-lg mt-4" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 py-6 shrink-0">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Page précédente" className="p-2">
            <ChevronLeft size={24} color={page > 1 ? T.text : T.faint} />
          </button>
          <span style={{ color: T.text, fontFamily: MONO }} className="text-sm">
            {page} / {file.pages}
          </span>
          <button onClick={() => setPage(p => Math.min(file.pages, p + 1))} aria-label="Page suivante" className="p-2">
            <ChevronRight size={24} color={page < file.pages ? T.text : T.faint} />
          </button>
          <button aria-label="Plein écran" className="p-2"><Maximize2 size={22} color={T.mute} /></button>
        </div>
      </Chrome>
    );
  }

  /* apk / other */
  return (
    <Chrome>
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={80} icon={38} />
        <p style={{ color: T.text }} className="text-lg font-semibold mt-5 mb-1">{t.noPreview}</p>
        <p style={{ color: T.mute }} className="text-sm leading-snug mb-7">{t.noPreviewSub}</p>
        <button style={{ background: T.violet }}
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
          <NavRow c={T.gold}   Icon={Sparkles} title={t.clean} sub={t.cleanSub} onClick={() => go("clean")} />
          <NavRow c={T.rose}   Icon={Trash2} title={t.trash} sub="20 Mo" onClick={() => go("trash")} />
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
const FileMenu = ({ file, cat, onClose, onOpen, t }) => (
  <Sheet open={!!file} onClose={onClose}>
    {file && (
      <>
        <div className="flex items-center gap-4 px-6 pb-5">
          <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={46} icon={22} />
          <div className="min-w-0">
            <div style={{ color: T.text }} className="text-base font-semibold truncate">{file.name}</div>
            <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
              {file.size}{file.parts > 1 ? ` · ${file.parts} ${t.parts}` : ""}
            </div>
          </div>
        </div>
        <Panel className="mx-3 overflow-hidden mb-3">
          <Row Icon={Eye} title={t.open} onClick={onOpen} />
          <Divider />
          <Row Icon={Download} title={t.download} onClick={onClose} />
          <Divider />
          <Row Icon={Share2} title={t.share} onClick={onClose} />
          <Divider />
          <Row Icon={Pencil} title={t.rename} onClick={onClose} />
          <Divider />
          <Row Icon={Info} title={t.details} onClick={onClose} />
        </Panel>
        <Panel className="mx-3 overflow-hidden">
          <Row Icon={Trash2} title={t.del} danger onClick={onClose} />
        </Panel>
      </>
    )}
  </Sheet>
);

/* ─────────── account ─────────── */
const AccountSheet = ({ open, onClose, go, t }) => (
  <Sheet open={open} onClose={onClose}>
    <div className="flex items-center gap-4 px-6 pb-5">
      <div style={{ background: `linear-gradient(145deg, ${T.violet}, ${T.blue})` }}
           className="w-14 h-14 rounded-full flex items-center justify-center">
        <span style={{ color: "#FFFFFF", fontFamily: DISPLAY }} className="text-xl font-bold">G</span>
      </div>
      <div className="min-w-0">
        <div style={{ color: T.text }} className="text-lg font-semibold">Global Payment</div>
        <div style={{ color: T.mute }} className="text-sm truncate">global@to-cloud.mg</div>
        <div style={{ color: T.blue, fontFamily: MONO }} className="text-xs mt-1">51 / 100 GO {t.used}</div>
      </div>
    </div>
    <NavRow c={T.blue} Icon={UserPlus} title={t.addAccount} sub={t.addAccountSub}
            onClick={() => { onClose(); go("addAccount"); }} />
    <NavRow c={T.violet} Icon={Settings} title={t.settings}
            onClick={() => { onClose(); go("settings"); }} />
    <NavRow c={T.rose} Icon={LogOut} title={t.signOut} danger onClick={onClose} />
  </Sheet>
);

/* ─────────── upload ─────────── */
function UploadSheet({ open, onClose, onGoCat, t }) {
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(0);
  const ref = useRef(null);
  const cat = CATS.find(c => c.key === pick);
  const SAMPLE = {
    sary:  { name: "cover_ep13.png",           size: "4,2 Mo",  parts: 1 },
    video: { name: "Kids_Rum_Tony_ep13.mp4",   size: "412 Mo",  parts: 24 },
    feo:   { name: "musique_intro.mp3",        size: "9,6 Mo",  parts: 1 },
    doc:   { name: "plan_marketing.pdf",       size: "3,1 Mo",  parts: 1 },
    apk:   { name: "to-cloud-v1.apk",          size: "58 Mo",   parts: 4 },
    hafa:  { name: "archive_projet.zip",       size: "127 Mo",  parts: 8 },
  };
  const file = pick ? SAMPLE[pick] : null;
  const total = file?.parts || 1;

  useEffect(() => {
    if (!open) { setPick(null); setDone(0); return; }
  }, [open]);

  useEffect(() => {
    if (!pick) return;
    setDone(0);
    ref.current = setInterval(() => {
      setDone(d => { if (d >= total) { clearInterval(ref.current); return d; } return d + 1; });
    }, total > 6 ? 190 : 420);
    return () => clearInterval(ref.current);
  }, [pick]);

  if (!open) return null;
  const fin = pick && done >= total;

  return (
    <div className="absolute inset-0 z-50 flex items-end"
         style={{ background: "rgba(23,20,42,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{ background: T.card,
                    border: `2px solid ${fin ? T.blue : (cat?.c || T.violet)}`, borderBottom: "none" }}
           className="w-full rounded-t-3xl p-6 pb-9">

        {/* step 1 — choose where it goes */}
        {!pick && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
                  className="text-xl font-bold uppercase">{t.chooseCat}</h2>
              <button onClick={onClose} aria-label="Fermer"><X size={24} color={T.mute} /></button>
            </div>
            <p style={{ color: T.mute }} className="text-sm mb-5 leading-snug">{t.chooseCatSub}</p>
            <div className="grid grid-cols-3 gap-3">
              {CATS.map(c => (
                <button key={c.key} onClick={() => setPick(c.key)}
                  style={{ background: T.card, border: `2px solid ${c.c}`, boxShadow: halo(c.c) }}
                  className="flex flex-col items-center gap-2.5 py-4 rounded-2xl active:scale-95">
                  <Tile c={c.c} bg={c.bg} Icon={c.Icon} size={46} icon={22} />
                  <span style={{ color: T.text }} className="text-xs font-semibold text-center leading-tight px-1">
                    {t.cats[c.key]}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* step 2 — sending */}
        {pick && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
                  className="text-xl font-bold uppercase">{fin ? t.uploaded : t.uploading}</h2>
              <button onClick={onClose} aria-label="Fermer"><X size={24} color={T.mute} /></button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} />
              <div className="min-w-0 flex-1">
                <div style={{ color: T.text }} className="text-base truncate">{file.name}</div>
                <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
                  {file.size}{total > 1 ? ` · ${total} × 18 Mo` : ""}
                </div>
              </div>
              <div className="text-right">
                <div style={{ color: T.blue, fontFamily: MONO }} className="text-xs">
                  {fin ? "0" : "4.2"} MB/s
                </div>
                <div style={{ color: T.faint, fontFamily: DISPLAY, letterSpacing: "0.1em" }}
                     className="text-xs font-bold uppercase mt-0.5">{t.speed}</div>
              </div>
            </div>

            <div className="grid gap-1.5 mb-4"
                 style={{ gridTemplateColumns: `repeat(${Math.min(total, 12)}, minmax(0, 1fr))` }}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{ height: 20, borderRadius: 6,
                  background: i < done ? cat.c : T.sunken, transition: "background 180ms ease" }} />
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <span style={{ color: fin ? T.blue : T.mute, fontFamily: MONO }} className="text-xs">
                {fin ? t.saved.toUpperCase()
                     : `${String(Math.round(done / total * 100)).padStart(2, "0")}% · ${done}/${total}`}
              </span>
              {fin && <Check size={20} color={T.blue} />}
            </div>

            {fin && (
              <button onClick={() => { onClose(); onGoCat(cat); }}
                style={{ background: cat.c }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full active:opacity-80">
                <span className="text-base font-semibold text-white">
                  {t.savedIn} {t.cats[cat.key]}
                </span>
                <ChevronRight size={20} color="#FFFFFF" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
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
  const [s, setS] = useState({ smart: true, hidden: false, wifi: true, notif: true, turbo: true });
  const tg = k => setS(v => ({ ...v, [k]: !v[k] }));
  const cur = LANGS.find(l => l.code === lang);

  return (
    <div className="pb-10">
      <TopBar title={t.settings} onBack={onBack} />
      <Section>
        <Row Icon={Languages} title={t.language} sub={cur?.native}
             right={<ChevronRight size={20} color={T.faint} />} onClick={() => go("language")} />
      </Section>
      <Section label="Performance">
        <Row Icon={Zap} title="Mode turbo" sub="6 nœuds parallèles au lieu de 2 — envoi jusqu'à 3× plus rapide"
             right={<Switch on={s.turbo} onToggle={() => tg("turbo")} />} />
        <Divider />
        <Row Icon={Wifi} title="Wi-Fi uniquement" sub="Les gros envois n'utilisent pas les données mobiles"
             right={<Switch on={s.wifi} onToggle={() => tg("wifi")} />} />
        <Divider />
        <Row Icon={Bell} title="Notifications" sub="Prévenir à la fin de chaque envoi"
             right={<Switch on={s.notif} onToggle={() => tg("notif")} />} />
      </Section>
      <Section label="Recherche">
        <Row Icon={Trash2} title="Effacer l'historique" sub="Supprime les recherches de cet appareil" />
        <Divider />
        <Row Icon={Search} title="Recherche intelligente" sub="Analyse les noms de fichiers sur l'appareil"
             right={<Switch on={s.smart} onToggle={() => tg("smart")} />} />
      </Section>
      <Section label="Affichage">
        <Row Icon={Eye} title="Afficher les fichiers masqués"
             right={<Switch on={s.hidden} onToggle={() => tg("hidden")} />} />
        <Divider />
        <Row Icon={Lock} title="Dossier sécurisé" sub="Protégé par code"
             right={<ChevronRight size={20} color={T.faint} />} />
      </Section>
      <Section label="Système">
        <Row Icon={ShieldCheck} title="Sécurité et confidentialité"
             right={<ChevronRight size={20} color={T.faint} />} />
        <Divider />
        <Row Icon={Info} title="À propos de To-cloud" sub="Version 1.0.0" />
      </Section>
    </div>
  );
}

/* ─────────── pages ─────────── */
const CleanView = ({ onBack, t }) => (
  <div className="pb-10">
    <TopBar title={t.clean} onBack={onBack} />
    <Panel accent={T.gold} className="mx-3 p-6 mb-3">
      <Tile c={T.gold} bg={T.goldBg} Icon={Sparkles} size={62} icon={30} />
      <h2 style={{ color: T.text, fontFamily: DISPLAY }} className="text-3xl font-bold mt-4 mb-1">8,2 Go</h2>
      <p style={{ color: T.mute }} className="text-base leading-snug">
        Doublons, images volumineuses inutilisées et fragments d'envois interrompus.
      </p>
    </Panel>
    <Section>
      <Row Icon={Image} title="Doublons" sub="4,1 Go · 218 fichiers"
           right={<span style={{ color: T.violet, fontFamily: DISPLAY }} className="text-sm font-bold uppercase">Nettoyer</span>} />
      <Divider />
      <Row Icon={CircleAlert} title="Fragments interrompus" sub="3,0 Go · 62 parties"
           right={<span style={{ color: T.violet, fontFamily: DISPLAY }} className="text-sm font-bold uppercase">Nettoyer</span>} />
      <Divider />
      <Row Icon={Package} title="Applications installées" sub="1,1 Go · 6 fichiers"
           right={<span style={{ color: T.violet, fontFamily: DISPLAY }} className="text-sm font-bold uppercase">Nettoyer</span>} />
    </Section>
  </div>
);

const TrashView = ({ onBack, t }) => (
  <div className="pb-10">
    <TopBar title={t.trash} onBack={onBack} />
    <p style={{ color: T.faint }} className="text-sm px-6 pb-4">Suppression définitive au bout de 30 jours.</p>
    <Section>
      <Row Icon={Image} title="ancien_logo.png" sub="1,2 Mo · 4 jours restants" />
      <Divider />
      <Row Icon={FileText} title="brouillon_contrat.docx" sub="340 Ko · 18 jours restants" />
    </Section>
  </div>
);

const AddAccountView = ({ onBack, t }) => (
  <div className="pb-10">
    <TopBar title={t.addAccount} onBack={onBack} />
    <Section>
      <Row Icon={User} title="global@to-cloud.mg" sub="Compte actif" right={<Check size={20} color={T.violet} />} />
      <Divider />
      <Row Icon={UserPlus} title="Connecter un nouveau compte" right={<ChevronRight size={20} color={T.faint} />} />
    </Section>
    <p style={{ color: T.faint }} className="text-sm px-6 pt-4 leading-snug">
      Chaque compte dispose de 100 Go gratuits. Le basculement est immédiat.
    </p>
  </div>
);

const HelpView = ({ onBack, t }) => (
  <div className="pb-10">
    <TopBar title={t.help} onBack={onBack} />
    <Section>
      <Row Icon={HelpCircle} title="Comment envoyer un gros fichier ?"
           sub="Le fichier est découpé en parties de 18 Mo, puis reconstitué en un seul fichier à l'ouverture." />
      <Divider />
      <Row Icon={Cloud} title="Demander plus d'espace"
           sub="Contactez l'administrateur une fois les 100 Go atteints."
           right={<ChevronRight size={20} color={T.faint} />} />
    </Section>
  </div>
);

/* ─────────── category ─────────── */
function CategoryView({ cat, onBack, onOpen, t, lang }) {
  const [sel, setSel] = useState([]);
  const [menu, setMenu] = useState(null);
  const items = useMemo(() => FILES.filter(f => f.cat === cat.key), [cat.key]);
  const groups = useMemo(() => {
    const m = {}; items.forEach(f => { (m[f.g] ||= []).push(f); }); return m;
  }, [items]);

  const mode = sel.length > 0;
  const all = sel.length === items.length && items.length > 0;
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const label = GLABEL[lang] || GLABEL.fr;

  return (
    <div className="pb-10">
      {mode ? (
        <div style={{ background: cat.bg }}
             className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3.5 mb-4">
          <button onClick={() => setSel([])} aria-label="Annuler" className="p-1">
            <X size={24} color={T.text} />
          </button>
          <span style={{ color: T.text, fontFamily: MONO }} className="flex-1 text-sm">
            {String(sel.length).padStart(2, "0")} {t.selected}
          </span>
          <button aria-label={t.download} className="p-2"><Download size={22} color={T.text} /></button>
          <button aria-label={t.share} className="p-2"><Share2 size={22} color={T.text} /></button>
          <button aria-label={t.del} className="p-2" onClick={() => setSel([])}>
            <Trash2 size={22} color={T.rose} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-6">
          <button onClick={onBack} aria-label="Retour" className="p-1 -ml-1">
            <ArrowLeft size={26} color={T.text} />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setSel(items.map(f => f.id))} aria-label={t.selectAll} className="p-2">
              <CheckSquare size={22} color={T.mute} />
            </button>
            <button aria-label="Filtrer" className="p-2">
              <SlidersHorizontal size={22} color={T.mute} />
            </button>
          </div>
        </div>
      )}

      {!mode && (
        <div className="flex items-center gap-4 px-5 mb-7">
          <Tile c={cat.c} bg={cat.bg} Icon={cat.Icon} size={62} icon={30} />
          <div>
            <h1 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.02em" }}
                className="text-2xl font-bold uppercase">{t.cats[cat.key]}</h1>
            <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1">
              {cat.n} {t.files} · {cat.size}
            </p>
          </div>
        </div>
      )}

      {mode && (
        <button onClick={() => setSel(all ? [] : items.map(f => f.id))}
          style={{ color: cat.c, fontFamily: DISPLAY, letterSpacing: "0.08em" }}
          className="text-sm font-bold uppercase px-6 pb-4">
          {all ? t.deselectAll : t.selectAll}
        </button>
      )}

      {items.length === 0 && (
        <Panel className="mx-3 p-8 text-center">
          <FolderOpen size={40} color={T.faint} strokeWidth={1.6} className="mx-auto mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.empty}</p>
          <p style={{ color: T.mute }} className="text-sm">{t.emptySub}</p>
        </Panel>
      )}

      {Object.entries(groups).map(([g, list], gi) => (
        <Reveal key={g} delay={gi * 80} className="mb-5">
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
                  <button onClick={() => mode ? toggle(f.id) : onOpen(f)}
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
                        {f.size} · {f.when}{f.parts > 1 ? ` · ${f.parts}×` : ""}
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

      <FileMenu file={menu} cat={cat} t={t} onClose={() => setMenu(null)}
                onOpen={() => { const f = menu; setMenu(null); onOpen(f); }} />
    </div>
  );
}

/* ─────────── home ─────────── */
function HomeView({ onCat, onMenu, onAccount, t }) {
  const segs = [{ c: T.rose, v: 22 }, { c: T.violet, v: 14 }, { c: T.gold, v: 9 }, { c: T.blue, v: 6 }];
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
          <span style={{ color: "#FFFFFF", fontFamily: DISPLAY }} className="text-base font-bold">G</span>
        </button>
      </header>

      <Reveal className="px-3 mb-6">
        <GlowFrame c={T.violet} radius={999} speed={6}>
          <button className="w-full flex items-center gap-3 px-5 py-4 rounded-full active:opacity-60">
            <Search size={21} color={T.mute} />
            <span style={{ color: T.mute }} className="text-base">{t.search}</span>
          </button>
        </GlowFrame>
      </Reveal>

      <Reveal delay={60}>
      <GlowFrame c={T.blue} className="mx-3 mb-8" speed={7}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div style={{ color: T.faint, fontFamily: DISPLAY, letterSpacing: "0.18em", fontSize: 10 }}
                 className="font-bold uppercase mb-1.5">{t.storage}</div>
            <div className="flex items-baseline gap-2">
              <span style={{ color: T.text, fontFamily: DISPLAY }}
                    className="text-5xl font-bold leading-none">51</span>
              <span style={{ color: T.mute, fontFamily: DISPLAY }}
                    className="text-3xl font-bold leading-none">/ 100 Go</span>
            </div>
          </div>
          <span style={{ color: T.blue, background: T.blueBg, fontFamily: DISPLAY,
                         letterSpacing: "0.12em", fontSize: 10 }}
                className="font-bold px-2.5 py-1 rounded-full">{t.free}</span>
        </div>

        <div style={{ background: T.sunken }} className="h-4 w-full flex gap-1 rounded-full overflow-hidden mb-3">
          {segs.map((s, i) => <div key={i} style={{ width: `${s.v}%`, background: s.c }} className="rounded-full" />)}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {[["sary", T.rose], ["video", T.violet], ["feo", T.gold], ["doc", T.blue]].map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span style={{ background: c }} className="w-2.5 h-2.5 rounded-full" />
              <span style={{ color: T.mute, fontSize: 11 }}>{t.cats[k]}</span>
            </span>
          ))}
          <span style={{ color: T.faint, fontFamily: MONO, fontSize: 11 }} className="ml-auto">
            49 Go {t.freeSpace}
          </span>
        </div>
      </div>
      </GlowFrame>
      </Reveal>

      <div className="flex items-center gap-3 px-5 mb-4">
        <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.12em" }}
            className="text-sm font-bold uppercase">{t.categories}</h2>
        <span style={{ background: T.line }} className="flex-1 h-px" />
      </div>

      <div className="grid grid-cols-2 gap-3 px-3">
        {CATS.map((c, i) => (
          <Reveal key={c.key} delay={i * 70}>
            <GlowFrame c={c.c} speed={4.5 + i * 0.6}>
              <button onClick={() => onCat(c)}
                      className="w-full h-full p-4 rounded-3xl text-left active:opacity-60">
                <div className="mb-4"><Tile c={c.c} bg={c.bg} Icon={c.Icon} /></div>
                <div style={{ color: T.text }} className="text-base font-semibold leading-snug">{t.cats[c.key]}</div>
                <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-1.5">{c.size} · {c.n}</div>
              </button>
            </GlowFrame>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ─────────── shell ─────────── */
export default function ToCloud() {
  const [lang, setLang] = useState("fr");
  const [view, setView] = useState("home");
  const [cat, setCat] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState(false);
  const [up, setUp] = useState(false);
  const [viewing, setViewing] = useState(null);
  const t = tr(lang);

  const go = v => { setDrawer(false); setView(v); };
  const home = () => { setView("home"); setCat(null); };

  return (
    <div style={{ background: T.bg, fontFamily: "'Inter Tight', system-ui, sans-serif" }}
         className="w-full min-h-screen flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes tcspin { to { transform: rotate(360deg); } }
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

        <div className="absolute inset-0 overflow-hidden" style={{ height: "100%" }}>
          <Backdrop />
        </div>

        <div className="relative">

        {view === "home" &&
          <HomeView t={t} onCat={c => { setCat(c); setView("cat"); }}
                    onMenu={() => setDrawer(true)} onAccount={() => setAccount(true)} />}
        {view === "cat" && cat &&
          <CategoryView cat={cat} onBack={home} onOpen={setViewing} t={t} lang={lang} />}
        {view === "settings"   && <SettingsView onBack={home} go={go} lang={lang} t={t} />}
        {view === "language"   && <LanguageView onBack={() => setView("settings")} lang={lang} setLang={setLang} t={t} />}
        {view === "clean"      && <CleanView onBack={home} t={t} />}
        {view === "trash"      && <TrashView onBack={home} t={t} />}
        {view === "help"       && <HelpView onBack={home} t={t} />}
        {view === "addAccount" && <AddAccountView onBack={home} t={t} />}
        </div>

        <button onClick={() => setUp(true)}
          style={{ background: `linear-gradient(145deg, ${T.blue}, ${T.violet})`,
                   boxShadow: "0 8px 24px rgba(115,50,224,0.35)" }}
          className="fixed right-5 bottom-6 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-95"
          aria-label="Envoyer un fichier">
          <Upload size={26} color="#FFFFFF" strokeWidth={2.4} />
        </button>

        <Drawer open={drawer} onClose={() => setDrawer(false)} go={go} t={t} />
        <AccountSheet open={account} onClose={() => setAccount(false)} go={go} t={t} />
        <UploadSheet open={up} onClose={() => setUp(false)} t={t}
                     onGoCat={c => { setCat(c); setView("cat"); }} />
        {viewing && (
          <Viewer file={viewing} cat={CATS.find(c => c.key === viewing.cat)}
                  onClose={() => setViewing(null)} t={t} />
        )}
      </div>
    </div>
  );
}
