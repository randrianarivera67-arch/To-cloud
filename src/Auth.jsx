import React, { useState } from "react";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { T, DISPLAY, MONO, halo, Logo, GlowFrame } from "./theme.jsx";
import { register as apiRegister, login as apiLogin,
         loginWithGoogle, resetPassword } from "./lib/api.js";
import { isNative } from "./lib/native.js";

const COPY = {
  fr: {
    tagline: "500 Go gratuits. Vos fichiers, partout.",
    login: "Se connecter", signup: "Créer un compte",
    google: "Continuer avec Google",
    or: "ou", name: "Nom complet", email: "Adresse e-mail", pass: "Mot de passe",
    passHint: "8 caractères minimum",
    forgot: "Mot de passe oublié ?",
    noAccount: "Pas encore de compte ?", hasAccount: "Vous avez déjà un compte ?",
    createOne: "En créer un", signIn: "Se connecter",
    terms: "En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité.",
    errEmail: "Adresse e-mail invalide.",
    errPass: "Le mot de passe doit contenir au moins 8 caractères.",
    errName: "Indiquez votre nom.",
    errNetwork: "Serveur injoignable. Verifiez votre connexion.",
    checkMail: "Compte cree. Ouvrez votre boite mail pour confirmer l'adresse.",
    resetSent: "Un lien de reinitialisation vient de partir par e-mail.",
    errEmailFirst: "Indiquez d'abord votre adresse e-mail.",
    googleWeb: "Google refuse la connexion depuis l'application. Utilisez votre e-mail ici, ou passez par to-cloud.pages.dev dans votre navigateur.",
  },
  mg: {
    tagline: "500 Go maimaim-poana. Ny rakitrao, na aiza na aiza.",
    login: "Hiditra", signup: "Hamorona kaonty",
    google: "Hanohy amin'ny Google",
    or: "na", name: "Anarana feno", email: "Adiresy mailaka", pass: "Teny miafina",
    passHint: "8 litera farafahakeliny",
    forgot: "Hadino ny teny miafina?",
    noAccount: "Mbola tsy manana kaonty?", hasAccount: "Efa manana kaonty?",
    createOne: "Hamorona", signIn: "Hiditra",
    terms: "Amin'ny fanohizana dia manaiky ny fepetra fampiasana sy ny politikam-piarovana ianao.",
    errEmail: "Tsy mety ny adiresy mailaka.",
    errPass: "Tokony ho 8 litera farafahakeliny ny teny miafina.",
    errName: "Ampidiro ny anaranao.",
    errNetwork: "Tsy tratra ny serveur. Jereo ny fifandraisanao.",
    checkMail: "Voaforona ny kaonty. Sokafy ny mailakao mba hanamafisana.",
    resetSent: "Nalefa amin'ny mailakao ny rohy famerenana.",
    errEmailFirst: "Ampidiro aloha ny adiresy mailakao.",
    googleWeb: "Tsy ekan'i Google ny fidirana avy ao anaty rindrambaiko. Ampiasao ny mailakao eto, na mandehana amin'ny to-cloud.pages.dev.",
  },
};

const GoogleMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.6 5-4.5 7l6.9 5.3C42.4 36.2 45 30.7 45 24z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.1 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
    <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.1-6.1C34.9 4.3 29.9 2 24 2 15.4 2 8 6.9 4.4 14l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z" />
  </svg>
);

const Field = ({ Icon, children, focus }) => (
  <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-3"
       style={{ background: T.card,
                border: `1.5px solid ${focus ? T.violet : T.line}`,
                boxShadow: focus ? `0 0 0 3px ${T.violet}22` : "none",
                transition: "border-color 160ms, box-shadow 160ms" }}>
    <Icon size={19} color={focus ? T.violet : T.faint} strokeWidth={2} className="shrink-0" />
    {children}
  </div>
);

export default function Auth({ onDone, lang = "fr" }) {
  const c = COPY[lang] || COPY.fr;
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const signup = mode === "signup";

  async function withGoogle() {
    setErr("");
    /* Google refuse ses pages de connexion dans une WebView : dans l'APK, le
       parcours s'interrompt sur « disallowed_useragent ». Mieux vaut le dire
       que de laisser l'utilisateur buter dessus. */
    if (isNative()) { setErr(c.googleWeb); return; }

    setBusy("google");
    try {
      await loginWithGoogle();   // redirige, puis revient sur l'application
    } catch (e) {
      setErr(e.message);
      setBusy(null);
    }
  }

  async function withEmail() {
    setErr("");
    if (signup && name.trim().length < 2) return setErr(c.errName);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(c.errEmail);
    if (pass.length < 8) return setErr(c.errPass);

    setBusy("email");
    try {
      if (signup) {
        const r = await apiRegister(name.trim(), email.trim(), pass);
        if (r.needsConfirm) { setNote(c.checkMail); return; }
      } else {
        await apiLogin(email.trim(), pass);
      }
      onDone();
    } catch (e) {
      setErr(e.message || c.errNetwork);
    } finally {
      setBusy(null);
    }
  }

  async function forgot() {
    setErr(""); setNote("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(c.errEmailFirst);
    try {
      await resetPassword(email.trim());
      setNote(c.resetSent);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="w-full min-h-screen flex justify-center"
         style={{ background: T.bg, fontFamily: "'Inter Tight', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>
      <div className="relative w-full max-w-md px-6 pt-14 pb-10 overflow-hidden"
           style={{ backgroundImage:
             `radial-gradient(520px 260px at 100% 0%, ${T.violet}1F, transparent 66%),
              radial-gradient(460px 240px at 0% 10%, ${T.blue}1A, transparent 62%)` }}>

        <div className="flex flex-col items-center mb-9">
          <Logo size={74} />
          <h1 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
              className="text-3xl font-bold uppercase mt-4">
            To<span style={{ color: T.blue }}>·</span>cloud
          </h1>
          <p style={{ color: T.mute }} className="text-sm mt-2 text-center">{c.tagline}</p>
        </div>

        <GlowFrame c={T.violet} className="mb-5" speed={7}>
          <div className="p-5">
            <h2 style={{ color: T.text, fontFamily: DISPLAY, letterSpacing: "0.03em" }}
                className="text-xl font-bold uppercase mb-5">
              {signup ? c.signup : c.login}
            </h2>

            <button onClick={withGoogle} disabled={!!busy}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl mb-5 active:opacity-70"
              style={{ background: T.card, border: `1.5px solid ${T.line}`,
                       opacity: isNative() ? 0.55 : (busy && busy !== "google" ? 0.5 : 1) }}>
              {busy === "google"
                ? <Loader2 size={20} color={T.violet} className="tc-spin" />
                : <GoogleMark />}
              <span style={{ color: T.text }} className="text-base font-semibold">{c.google}</span>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <span style={{ background: T.line }} className="flex-1 h-px" />
              <span style={{ color: T.faint }} className="text-xs uppercase">{c.or}</span>
              <span style={{ background: T.line }} className="flex-1 h-px" />
            </div>

            {signup && (
              <Field Icon={UserIcon} focus={focus === "name"}>
                <input value={name} onChange={e => setName(e.target.value)}
                  onFocus={() => setFocus("name")} onBlur={() => setFocus(null)}
                  placeholder={c.name} autoComplete="name"
                  className="flex-1 min-w-0 bg-transparent outline-none text-base"
                  style={{ color: T.text }} />
              </Field>
            )}

            <Field Icon={Mail} focus={focus === "email"}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocus("email")} onBlur={() => setFocus(null)}
                placeholder={c.email} type="email" inputMode="email" autoComplete="email"
                className="flex-1 min-w-0 bg-transparent outline-none text-base"
                style={{ color: T.text }} />
            </Field>

            <Field Icon={Lock} focus={focus === "pass"}>
              <input value={pass} onChange={e => setPass(e.target.value)}
                onFocus={() => setFocus("pass")} onBlur={() => setFocus(null)}
                placeholder={c.pass} type={show ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                className="flex-1 min-w-0 bg-transparent outline-none text-base"
                style={{ color: T.text }} />
              <button onClick={() => setShow(s => !s)} type="button"
                      aria-label={show ? "Masquer" : "Afficher"} className="shrink-0 p-1">
                {show ? <EyeOff size={18} color={T.faint} /> : <Eye size={18} color={T.faint} />}
              </button>
            </Field>

            {signup && (
              <p style={{ color: T.faint, fontFamily: MONO }} className="text-xs mb-3 px-1">
                {c.passHint}
              </p>
            )}

            {err && (
              <p style={{ color: T.rose }} className="text-sm mb-3 px-1">{err}</p>
            )}
            {note && (
              <p style={{ color: T.blue }} className="text-sm mb-3 px-1 leading-snug">{note}</p>
            )}

            <button onClick={withEmail} disabled={!!busy}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full mt-1 active:opacity-80"
              style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
                       boxShadow: halo(T.violet),
                       opacity: busy && busy !== "email" ? 0.5 : 1 }}>
              {busy === "email"
                ? <Loader2 size={20} color="#FFFFFF" className="tc-spin" />
                : <>
                    <span className="text-base font-bold text-white">
                      {signup ? c.signup : c.login}
                    </span>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>}
            </button>

            {!signup && (
              <button onClick={forgot} style={{ color: T.violet }}
                      className="w-full text-sm font-semibold mt-4">{c.forgot}</button>
            )}
          </div>
        </GlowFrame>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span style={{ color: T.mute }} className="text-sm">
            {signup ? c.hasAccount : c.noAccount}
          </span>
          <button onClick={() => { setMode(signup ? "login" : "signup"); setErr(""); }}
                  style={{ color: T.violet }} className="text-sm font-bold">
            {signup ? c.signIn : c.createOne}
          </button>
        </div>

        <p style={{ color: T.faint }} className="text-xs text-center leading-relaxed px-4">
          {c.terms}
        </p>
      </div>
    </div>
  );
}
