import React, { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Tirer vers le bas pour actualiser.
 *
 * Le navigateur le fait nativement sur une page ordinaire, mais pas dans la
 * WebView d'une application : le geste n'y declenche rien. On le reproduit
 * donc, avec les memes reperes visuels — la fleche tourne au fil du tirage,
 * puis se met a tourner seule pendant le rechargement.
 */
export default function PullToRefresh({ onRefresh, disabled, color = "#7332E0", card = "#FFFFFF" }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startRef = useRef(null);
  const pullRef = useRef(0);

  const THRESHOLD = 72;   // au-dela, le geste declenche l'actualisation
  const MAX = 120;

  useEffect(() => {
    if (disabled) return;

    const onStart = e => {
      // uniquement en haut de page : sinon on gene le defilement normal
      if (window.scrollY > 2 || busy) { startRef.current = null; return; }
      startRef.current = e.touches[0].clientY;
    };

    const onMove = e => {
      if (startRef.current === null) return;
      const dy = e.touches[0].clientY - startRef.current;

      if (dy <= 0) { startRef.current = null; setPull(0); pullRef.current = 0; return; }
      if (window.scrollY > 2) { startRef.current = null; setPull(0); pullRef.current = 0; return; }

      // resistance croissante : le geste doit demander un effort, sinon il
      // se declenche par accident au moindre effleurement
      const eased = Math.min(MAX, dy * 0.45);
      pullRef.current = eased;
      setPull(eased);

      if (dy > 6 && e.cancelable) e.preventDefault();
    };

    const onEnd = async () => {
      if (startRef.current === null) return;
      startRef.current = null;

      if (pullRef.current >= THRESHOLD) {
        setBusy(true);
        setPull(THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setBusy(false);
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, disabled, busy]);

  if (pull <= 0 && !busy) return null;

  const ready = pull >= THRESHOLD;

  return (
    <div className="fixed inset-x-0 top-0 z-30 flex justify-center pointer-events-none"
         style={{ transform: `translateY(${Math.max(8, pull - 20)}px)`,
                  transition: busy ? "transform 180ms ease" : "none" }}>
      <div style={{ background: card,
                    boxShadow: `0 4px 16px -6px ${color}99`,
                    border: `1.5px solid ${ready || busy ? color : "transparent"}` }}
           className="w-11 h-11 rounded-full flex items-center justify-center">
        <RefreshCw
          size={20}
          color={ready || busy ? color : "#928EA8"}
          className={busy ? "tc-spin" : undefined}
          style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
    </div>
  );
}
