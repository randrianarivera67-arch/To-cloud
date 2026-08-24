import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  ListMusic, Volume2, Download, Music
} from "lucide-react";
import { T, DISPLAY, MONO, halo } from "./theme.jsx";
import { objectUrl, streamUrl, forgetStream, downloadToDisk } from "./lib/api.js";

const mmss = s => {
  if (!isFinite(s)) return "--:--";
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const BARS = 48;

export default function AudioPlayer({ queue, startId, onClose, t }) {
  const [idx, setIdx] = useState(() => Math.max(0, queue.findIndex(f => f.id === startId)));
  const [src, setSrc] = useState(null);
  const [load, setLoad] = useState(0);
  const [err, setErr] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");   // off | all | one
  const [showList, setShowList] = useState(false);
  const [levels, setLevels] = useState(() => new Array(BARS).fill(0.12));

  const audioRef = useRef(null);
  const urlRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const playedRef = useRef([]);

  const track = queue[idx];

  /* ── charger la piste courante ── */
  useEffect(() => {
    if (!track) return;
    let dead = false;
    setSrc(null); setErr(null); setLoad(0); setPos(0); setDur(0);

    (async () => {
      try {
        // un morceau suffit pour demarrer : le reste arrive pendant l'ecoute
        const streamed = await streamUrl(track.id);
        if (streamed) { if (!dead) setSrc(streamed); return; }

        const u = await objectUrl(track.id, p => { if (!dead) setLoad(p.done); });
        if (dead) { URL.revokeObjectURL(u); return; }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = u;
        setSrc(u);
      } catch (e) {
        if (!dead) setErr(e.message);
      }
    })();

    return () => { dead = true; forgetStream(track.id); };
  }, [track?.id]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    cancelAnimationFrame(rafRef.current);
    ctxRef.current?.close?.();
  }, []);

  /* ── analyse du signal pour les barres ── */
  const attach = useCallback(() => {
    const el = audioRef.current;
    if (!el || ctxRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next = new Array(BARS);
        for (let i = 0; i < BARS; i++) {
          const v = data[Math.floor(i / BARS * data.length)] / 255;
          next[i] = Math.max(0.1, v);
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Sur certains navigateurs mobiles l'analyse est refusee : on garde une
      // animation decorative plutot que de casser la lecture.
      const tick = () => {
        setLevels(l => l.map((_, i) =>
          0.2 + Math.abs(Math.sin(Date.now() / 320 + i * 0.5)) * 0.7));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }
  }, []);

  /* ── navigation ── */
  function nextIndex() {
    if (repeat === "one") return idx;
    if (shuffle) {
      const left = queue.map((_, i) => i).filter(i => !playedRef.current.includes(i));
      const pool = left.length ? left : queue.map((_, i) => i);
      if (!left.length) playedRef.current = [];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (idx + 1 < queue.length) return idx + 1;
    return repeat === "all" ? 0 : -1;
  }

  function go(n) {
    if (n < 0) { setPlaying(false); return; }
    playedRef.current.push(idx);
    setIdx(n);
    setPlaying(true);
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) { attach(); ctxRef.current?.resume?.(); el.play(); }
    else el.pause();
  }

  function seek(e) {
    const el = audioRef.current;
    if (!el || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - r.left) / r.width) * dur;
  }

  if (!track) return null;
  const pct = dur ? (pos / dur) * 100 : 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: T.bg }}>

      <div className="flex items-center gap-3 px-4 py-4 shrink-0">
        <button onClick={onClose} aria-label="Fermer" className="p-1 -ml-1">
          <X size={26} color={T.text} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div style={{ color: T.faint, fontFamily: DISPLAY, letterSpacing: "0.16em", fontSize: 10 }}
               className="font-bold uppercase">
            {t.nowPlaying} · {idx + 1}/{queue.length}
          </div>
        </div>
        <button onClick={() => downloadToDisk(track.id)} aria-label={t.download} className="p-2">
          <Download size={22} color={T.text} />
        </button>
      </div>

      {/* disque */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        <div className="relative mb-8" style={{ width: 216, height: 216 }}>
          <div style={{
                 background: `conic-gradient(from 0deg, ${T.violet}, ${T.rose}, ${T.gold}, ${T.blue}, ${T.violet})`,
                 animation: `tcspin ${playing ? "7s" : "0s"} linear infinite`,
                 animationPlayState: playing ? "running" : "paused",
                 boxShadow: halo(T.violet),
               }}
               className="tc-anim w-full h-full rounded-full flex items-center justify-center">
            <div style={{ background: T.bg }}
                 className="w-1/2 h-1/2 rounded-full flex items-center justify-center">
              <Music size={30} color={T.violet} />
            </div>
          </div>
          {/* sillons */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
               style={{ background:
                 "repeating-radial-gradient(circle, rgba(255,255,255,0.16) 0 1px, transparent 1px 7px)" }} />
        </div>

        <h1 style={{ color: T.text }} className="text-lg font-semibold text-center truncate w-full mb-1">
          {track.name}
        </h1>
        <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mb-7">
          {track.sizeLabel}{track.parts > 1 ? ` · ${track.parts} ${t.parts}` : ""}
        </p>

        {/* ondes */}
        <div className="flex items-end justify-center gap-[3px] h-16 w-full mb-4">
          {levels.map((v, i) => {
            const done = (i / BARS) * 100 <= pct;
            return (
              <span key={i} style={{
                height: `${Math.round(v * 100)}%`,
                width: 3, borderRadius: 2, minHeight: 4,
                background: done ? T.violet : T.sunken,
                transition: "height 90ms linear",
              }} />
            );
          })}
        </div>

        {!src && !err && (
          <p style={{ color: T.mute, fontFamily: MONO }} className="text-xs mb-3">
            {track.parts > 1 ? `${t.assembling} ${load}/${track.parts}` : t.loading}
          </p>
        )}
        {err && <p style={{ color: T.rose }} className="text-sm mb-3">{err}</p>}
      </div>

      {/* commandes */}
      <div className="px-6 pb-8 shrink-0">
        <div onClick={seek} style={{ background: T.sunken }}
             className="h-2 rounded-full mb-2 cursor-pointer">
          <div style={{ width: `${pct}%`, background: T.violet }} className="h-full rounded-full" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <span style={{ color: T.mute, fontFamily: MONO }} className="text-xs">{mmss(pos)}</span>
          <span style={{ color: T.mute, fontFamily: MONO }} className="text-xs">{mmss(dur)}</span>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setShuffle(v => !v)} aria-label={t.shuffle} className="p-2">
            <Shuffle size={21} color={shuffle ? T.violet : T.faint} strokeWidth={shuffle ? 2.6 : 2} />
          </button>

          <button onClick={() => go(idx > 0 ? idx - 1 : queue.length - 1)}
                  aria-label={t.prev} className="p-2">
            <SkipBack size={27} color={T.text} />
          </button>

          <button onClick={toggle} disabled={!src} aria-label={playing ? t.pause : t.play}
            style={{ background: src ? T.violet : T.sunken, boxShadow: src ? halo(T.violet) : "none" }}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95">
            {playing
              ? <Pause size={27} color="#FFFFFF" />
              : <Play size={27} color={src ? "#FFFFFF" : T.faint} className="ml-1" />}
          </button>

          <button onClick={() => go(nextIndex())} aria-label={t.next} className="p-2">
            <SkipForward size={27} color={T.text} />
          </button>

          <button onClick={() => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off")}
                  aria-label={t.repeat} className="p-2">
            {repeat === "one"
              ? <Repeat1 size={21} color={T.violet} strokeWidth={2.6} />
              : <Repeat size={21} color={repeat === "all" ? T.violet : T.faint}
                        strokeWidth={repeat === "all" ? 2.6 : 2} />}
          </button>
        </div>

        <button onClick={() => setShowList(true)}
                className="w-full flex items-center justify-center gap-2 mt-6 py-2.5">
          <ListMusic size={18} color={T.mute} />
          <span style={{ color: T.mute }} className="text-sm font-medium">{t.queue}</span>
        </button>
      </div>

      {/* file d'attente */}
      {showList && (
        <div className="absolute inset-0 z-10 flex items-end"
             style={{ background: "rgba(23,20,42,0.45)" }} onClick={() => setShowList(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bg }}
               className="w-full rounded-t-3xl pt-3 pb-8 max-h-[70%] overflow-y-auto">
            <div style={{ background: T.line }} className="w-10 h-1 rounded-full mx-auto mb-4" />
            <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
                className="text-lg font-bold uppercase px-6 pb-3">{t.queue}</h2>
            {queue.map((f, i) => (
              <button key={f.id} onClick={() => { go(i); setShowList(false); }}
                style={{ background: i === idx ? T.violetBg : "transparent" }}
                className="w-full flex items-center gap-3 px-6 py-3 text-left active:opacity-60">
                <span style={{ color: i === idx ? T.violet : T.faint, fontFamily: MONO }}
                      className="text-xs w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span style={{ color: i === idx ? T.violet : T.text }}
                        className="block text-sm truncate">{f.name}</span>
                  <span style={{ color: T.mute, fontFamily: MONO }}
                        className="block text-xs mt-0.5">{f.sizeLabel}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={src || undefined}
        autoPlay
        onPlay={() => { setPlaying(true); attach(); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={e => setPos(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDur(e.currentTarget.duration)}
        onEnded={() => go(nextIndex())}
        onError={() => setErr(t.loadFailed)}
        hidden
      />
    </div>
  );
}
