import React, { useEffect, useState } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { T, DISPLAY, MONO, halo } from "./theme.jsx";
import { load, save } from "./lib/storage.js";

/* Emplacement du fichier APK une fois qu'il est publie.
   Le mettre dans public/downloads/ ou pointer vers une release GitHub. */
export const APK_URL = "/downloads/to-cloud.apk";
export const APK_SIZE = "12,4 Mo";
export const APK_VERSION = "1.0.0";

const COPY = {
  fr: {
    title: "Télécharger l'application To-Cloud",
    sub: "Envois plus rapides, ouverture hors connexion",
    cta: "Installer", started: "Téléchargement lancé",
    already: "Déjà installée",
  },
  mg: {
    title: "Alaivo ny rindrambaiko To-Cloud",
    sub: "Haingana kokoa ny fandefasana, misokatra na tsy misy réseau",
    cta: "Apetraho", started: "Nanomboka ny fakàna",
    already: "Efa napetraka",
  },
  en: {
    title: "Get the To-Cloud app",
    sub: "Faster uploads, works offline",
    cta: "Install", started: "Download started",
    already: "Already installed",
  },
};

/* true quand l'app tourne deja en APK/PWA — inutile de proposer l'installation */
function isInstalledContext() {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const capacitor = !!window.Capacitor?.isNativePlatform?.();
  return standalone || capacitor;
}

export default function InstallBanner({ lang = "fr" }) {
  const c = COPY[lang] || COPY.fr;
  const [got, setGot] = useState(() => load("tc_apk_downloaded", false));
  const [just, setJust] = useState(false);
  const [up, setUp] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setUp(true), 700);
    return () => clearTimeout(id);
  }, []);

  if (got || isInstalledContext()) return null;

  function grab() {
    save("tc_apk_downloaded", true);
    setJust(true);
    // laisse le message de confirmation visible un instant avant de retirer la barre
    setTimeout(() => setGot(true), 2200);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto"
           style={{ transform: up ? "translateY(0)" : "translateY(140%)",
                    transition: "transform 480ms cubic-bezier(.2,.8,.2,1)" }}>
        <div className="flex items-center gap-3 p-3 rounded-3xl"
             style={{ background: T.card,
                      border: `2px solid ${just ? T.blue : T.violet}`,
                      boxShadow: halo(just ? T.blue : T.violet) }}>

          <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
               style={{ background: just ? T.blueBg : T.violetBg }}>
            {just
              ? <Check size={21} color={T.blue} strokeWidth={2.4} />
              : <Smartphone size={21} color={T.violet} strokeWidth={2} />}
          </div>

          <div className="min-w-0 flex-1">
            <div style={{ color: T.text }} className="text-sm font-bold leading-tight">
              {just ? c.started : c.title}
            </div>
            <div style={{ color: T.mute, fontFamily: MONO, fontSize: 11 }} className="mt-0.5 truncate">
              {just ? `${APK_SIZE} · v${APK_VERSION}` : c.sub}
            </div>
          </div>

          {!just && (
            <a href={APK_URL} download onClick={grab}
               className="flex items-center gap-1.5 px-4 py-2.5 rounded-full shrink-0 active:opacity-80"
               style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.violet})` }}>
              <Download size={17} color="#FFFFFF" strokeWidth={2.4} />
              <span style={{ fontFamily: DISPLAY, letterSpacing: "0.04em" }}
                    className="text-sm font-bold text-white uppercase">{c.cta}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
