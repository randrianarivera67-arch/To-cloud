import { createClient } from "@supabase/supabase-js";
import { isNative, saveNative, shareSaved, openExternal, closeExternal, DEEP_LINK } from "./native.js";

const WORKER_URL = import.meta.env.VITE_API_URL;

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Vrai quand les trois variables sont en place.
 *
 * Sans ce garde-fou, createClient leve une exception au chargement du module,
 * donc avant que React ne rende quoi que ce soit : l'ecran reste blanc et rien
 * n'indique ce qui manque.
 */
export const CONFIGURED = Boolean(URL_ && KEY_ && WORKER_URL);

export const supabase = CONFIGURED
  ? createClient(URL_, KEY_, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Le retour de Google arrive dans l'adresse : sans cette lecture, la
        // session n'est jamais etablie et l'ecran de connexion reapparait.
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

/**
 * Termine une connexion externe restee en suspens.
 *
 * `detectSessionInUrl` s'en charge normalement, mais il ne s'execute qu'une
 * fois, au chargement du module. Si la page a ete servie depuis le cache ou
 * rechargee autrement, le code reste dans l'adresse sans etre echange. On
 * verifie donc explicitement.
 */
export async function resumeOAuth() {
  if (!CONFIGURED || typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");

  const clean = () => {
    url.search = "";
    url.hash = "";
    window.history.replaceState({}, "", url.toString());
  };

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      clean();
      if (error) throw new Error(error.message);
      return true;
    }
    if (access && refresh) {
      const { error } = await supabase.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      clean();
      if (error) throw new Error(error.message);
      return true;
    }
  } catch (e) {
    clean();
    console.warn("Connexion externe non aboutie :", e.message);
  }
  return false;
}

export const WORKER = WORKER_URL;

export const MISSING = [
  !URL_ && "VITE_SUPABASE_URL",
  !KEY_ && "VITE_SUPABASE_ANON_KEY",
  !WORKER_URL && "VITE_API_URL",
].filter(Boolean);



/** Jeton courant, transmis au Worker pour qu'il verifie qui appelle. */
export async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/* ─────────── comptes ─────────── */

export async function register(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  // Si la confirmation par e-mail est active, session est nul : c'est normal.
  return { user: data.user, needsConfirm: !data.session };
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function loginWithGoogle() {
  /* Dans l'APK, le parcours se deroule dans le navigateur du systeme, puis
     Android nous rend la main par lien profond. Sur le web, la redirection
     habituelle suffit. */
  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: DEEP_LINK, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    await openExternal(data.url);
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

/**
 * Termine la connexion apres le retour du navigateur.
 *
 * Le code recu ne vaut qu'une fois et n'est utilisable que par l'appareil qui a
 * lance la demande : c'est ce qui rend le detour par le navigateur sur.
 */
export async function finishOAuth(url) {
  const u = new URL(url);
  const code = u.searchParams.get("code");
  if (!code) return false;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  await closeExternal();
  if (error) throw new Error(error.message);
  return true;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw new Error(error.message);
}

export const logout = () => supabase.auth.signOut();

/**
 * Profil de l'utilisateur connecte.
 *
 * La ligne est normalement creee par un declencheur a l'inscription. Si elle
 * manque — declencheur pose apres coup, compte cree autrement — on la pose
 * ici : sans profil, l'application renverrait vers l'ecran de connexion alors
 * que la session est valide.
 */
export async function profile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles").select("name, quota, used").eq("id", user.id).maybeSingle();

  if (data) return { id: user.id, email: user.email, ...data };

  const name =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "";

  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, name })
    .select("name, quota, used")
    .maybeSingle();

  // meme si l'insertion echoue, la session reste valide : on rend un profil
  // minimal plutot que de faire croire a une deconnexion
  return {
    id: user.id,
    email: user.email,
    name,
    quota: created?.quota ?? 536870912000,
    used: created?.used ?? 0,
  };
}

/* ─────────── lecture ─────────── */

export async function listFiles({ cat, folder, search, cursor = 0, limit = 20 } = {}) {
  let q = supabase
    .from("files")
    .select("id, name, size, cat, folder_id, thumb, created_at", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(cursor, cursor + limit - 1);

  if (cat) q = q.eq("cat", cat);
  if (folder) q = q.eq("folder_id", folder);
  if (search) q = q.ilike("name", `%${search}%`);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  return {
    files: data.map(f => ({ ...f, parts: undefined, created: new Date(f.created_at).getTime() })),
    total: count ?? data.length,
    cursor: cursor + data.length,
    done: cursor + data.length >= (count ?? data.length),
  };
}

export async function counts() {
  const { data, error } = await supabase.from("file_counts").select("cat, n, bytes");
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map(r => [r.cat, { n: r.n, bytes: Number(r.bytes) }]));
}

/**
 * Nombre de fichiers par dossier.
 *
 * Compter a partir de la premiere page des fichiers donnait toujours zero :
 * la page ne contient qu'une poignee de lignes, et rarement celles du dossier
 * regarde. On demande donc le decompte a la base.
 */
export async function folderCounts() {
  const { data, error } = await supabase
    .from("files")
    .select("folder_id")
    .is("deleted_at", null)
    .not("folder_id", "is", null);
  if (error) throw new Error(error.message);

  const m = {};
  data.forEach(r => { m[r.folder_id] = (m[r.folder_id] || 0) + 1; });
  return m;
}

export async function listFolders() {
  const { data, error } = await supabase
    .from("folders").select("id, name, created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export const addFolder = async name => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("folders").insert({ name, user_id: user.id }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const dropFolder = async id => {
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const moveFile = async (id, folder) => {
  const { error } = await supabase.from("files").update({ folder_id: folder }).eq("id", id);
  if (error) throw new Error(error.message);
};

/* ─────────── corbeille ─────────── */

export const removeFile = async id => {
  const { error } = await supabase
    .from("files").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
};

/** Taille et nombre de fichiers en corbeille, pour l'afficher dans le menu. */
export async function trashStats() {
  const { data, error } = await supabase
    .from("files").select("size").not("deleted_at", "is", null);
  if (error) throw new Error(error.message);
  return { n: data.length, bytes: data.reduce((t, f) => t + Number(f.size), 0) };
}

export async function listTrash() {
  const { data, error } = await supabase
    .from("files").select("id, name, size, cat, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export const restoreFile = async id => {
  const { error } = await supabase.from("files").update({ deleted_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
};

/**
 * Purge definitive.
 *
 * Les morceaux partent d'abord du canal, la ligne ensuite : si l'ordre etait
 * inverse et que la suppression Telegram echouait, on perdrait la trace de
 * morceaux qui occupent toujours de la place.
 */
export async function purgeFile(id) {
  const t = await token();

  // Le menage sur le canal peut echouer (message trop ancien, bot bloque) sans
  // que cela doive empecher la suppression : l'utilisateur a demande a effacer.
  try {
    await fetch(`${WORKER}/api/chunks/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${t}` },
    });
  } catch {
    // sans consequence pour l'utilisateur, la ligne part quand meme
  }

  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function emptyTrash(onProgress) {
  const list = await listTrash();
  for (let i = 0; i < list.length; i++) {
    await purgeFile(list[i].id);
    onProgress?.({ done: i + 1, total: list.length });
  }
  return list.length;
}

/* ─────────── envoi ─────────── */

const CHUNK = 18 * 1024 * 1024;

const EXT = {
  sary:  ["jpg","jpeg","png","gif","webp","heic","bmp","svg"],
  video: ["mp4","mkv","mov","avi","webm","3gp","m4v"],
  feo:   ["mp3","wav","ogg","m4a","flac","aac","opus"],
  doc:   ["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","csv","odt"],
  apk:   ["apk","aab","xapk"],
};

export function categorize(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  for (const [k, list] of Object.entries(EXT)) if (list.includes(ext)) return k;
  return "hafa";
}

async function makeThumb(file, max = 240) {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const url = canvas.toDataURL("image/webp", 0.62);
    return url.length > 60_000 ? canvas.toDataURL("image/jpeg", 0.5) : url;
  } catch {
    return null;
  }
}

/**
 * Empreinte d'un fichier, stable d'une session a l'autre.
 *
 * Nom, taille et date de modification suffisent : deux fichiers differents ne
 * se confondront pas, et le meme fichier repris plus tard sera reconnu.
 */
const fingerprint = f => `tc_up_${f.name}|${f.size}|${f.lastModified}`;

const SESSION_TTL = 7 * 86400_000;

function loadSession(file) {
  const s = load(fingerprint(file), null);
  if (!s) return { parts: {} };
  // au-dela d'une semaine, les morceaux risquent d'avoir ete purges du canal
  if (Date.now() - (s.at || 0) > SESSION_TTL) {
    drop(fingerprint(file));
    return { parts: {} };
  }
  return s;
}

const saveSession = (file, session) =>
  save(fingerprint(file), { ...session, at: Date.now() });

/** Combien de morceaux sont deja en place pour ce fichier. */
export function uploadedParts(file) {
  return Object.keys(loadSession(file).parts || {}).length;
}

/**
 * Envoi decoupe, reprenable.
 *
 * Chaque morceau accepte par Telegram est note localement. Si la connexion
 * tombe au quatorzieme sur vingt-quatre, la reprise repart du quinzieme au lieu
 * de tout recommencer — ce qui, sur un forfait mobile, change beaucoup.
 *
 * Limite a connaitre : le navigateur ne peut pas conserver un fichier choisi
 * entre deux ouvertures de l'application. Apres une fermeture, il faut le
 * reselectionner ; les morceaux deja envoyes sont alors reconnus et sautes.
 */
export async function upload(file, cat, onProgress, folder) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expiree");

  const prof = await profile();
  if (prof.used + file.size > prof.quota) {
    throw new Error("Quota depasse — contactez l'administrateur");
  }

  const parts = Math.max(1, Math.ceil(file.size / CHUNK));
  const session = loadSession(file);
  session.parts = session.parts || {};

  const already = Object.keys(session.parts).length;
  if (already) onProgress?.({ done: already, total: parts, percent: Math.round(already / parts * 100), resumed: true });

  for (let i = 0; i < parts; i++) {
    if (session.parts[i]) continue;   // deja accepte lors d'une tentative precedente

    const jwt = await token();        // relu a chaque morceau : un envoi long depasse la duree d'un jeton
    const slice = file.slice(i * CHUNK, (i + 1) * CHUNK);

    const res = await fetch(`${WORKER}/api/upload/chunk?idx=${i}`, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
      body: slice,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Morceau ${i} refuse`);

    session.parts[i] = { idx: i, ...data };
    saveSession(file, session);

    const done = Object.keys(session.parts).length;
    onProgress?.({ done, total: parts, percent: Math.round(done / parts * 100) });
  }

  const uploaded = Object.values(session.parts).sort((a, b) => a.idx - b.idx);
  const thumb = await makeThumb(file);

  const { data: row, error } = await supabase.from("files").insert({
    user_id: user.id,
    name: file.name,
    size: file.size,
    cat: cat || categorize(file.name),
    folder_id: folder || null,
    thumb,
  }).select().single();
  if (error) throw new Error(error.message);

  const { error: cErr } = await supabase.from("chunks").insert(
    uploaded.map(c => ({
      file_id: row.id,
      idx: c.idx,
      tg_file_id: c.file_id,
      tg_message_id: c.message_id,
      bot: c.bot,
      size: c.size,
    }))
  );
  if (cErr) {
    // sans ses morceaux la ligne est inutilisable : on la retire plutot que de
    // laisser un fichier qui ne s'ouvrira jamais
    await supabase.from("files").delete().eq("id", row.id);
    throw new Error(cErr.message);
  }

  drop(fingerprint(file));   // la reprise n'a plus lieu d'etre
  return { id: row.id, cat: row.cat };
}

/* ─────────── reception ─────────── */

const MIME = {
  jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", gif:"image/gif", webp:"image/webp",
  bmp:"image/bmp", svg:"image/svg+xml", heic:"image/heic",
  mp4:"video/mp4", webm:"video/webm", mov:"video/quicktime", mkv:"video/x-matroska",
  "3gp":"video/3gpp", m4v:"video/mp4", avi:"video/x-msvideo",
  mp3:"audio/mpeg", wav:"audio/wav", ogg:"audio/ogg", m4a:"audio/mp4",
  flac:"audio/flac", aac:"audio/aac", opus:"audio/opus",
  pdf:"application/pdf", txt:"text/plain", csv:"text/csv",
  zip:"application/zip", apk:"application/vnd.android.package-archive",
};
const mimeOf = n => MIME[(n.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

/** Liste ordonnee des morceaux d'un fichier, avec ses metadonnees. */
async function fileParts(id) {
  const { data: meta, error } = await supabase
    .from("files").select("name, size, cat").eq("id", id).single();
  if (error) throw new Error(error.message);

  const { data: chunks, error: cErr } = await supabase
    .from("chunks").select("idx, size").eq("file_id", id).order("idx");
  if (cErr) throw new Error(cErr.message);
  if (!chunks.length) throw new Error("Aucun morceau pour ce fichier");

  return { meta, chunks };
}

async function fetchChunk(id, idx, jwt) {
  const res = await fetch(`${WORKER}/api/dl/${id}/${idx}`, {
    headers: { authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Morceau ${idx} indisponible`);
  }
  return res.blob();
}

export async function download(id, onProgress) {
  const { meta, chunks } = await fileParts(id);
  const jwt = await token();
  const blobs = [];

  for (const c of chunks) {
    blobs.push(await fetchChunk(id, c.idx, jwt));
    onProgress?.({
      done: blobs.length, total: chunks.length,
      percent: Math.round(blobs.length / chunks.length * 100),
    });
  }

  return { blob: new Blob(blobs, { type: mimeOf(meta.name) }), name: meta.name, cat: meta.cat };
}

/**
 * Enregistre le fichier sur l'appareil.
 *
 * Deux chemins : dans l'APK, on ecrit morceau par morceau via le systeme de
 * fichiers natif — un lien `download` n'y declenche rien. Sur le web, l'ancre
 * doit etre inseree dans la page : detachee, Chrome sur Android ignore le clic.
 */
export async function downloadToDisk(id, onProgress) {
  const { meta, chunks } = await fileParts(id);
  const jwt = await token();

  if (isNative()) {
    const { uri } = await saveNative(
      meta.name,
      i => fetchChunk(id, chunks[i].idx, jwt),
      chunks.length,
      onProgress
    );
    await shareSaved(uri, meta.name);
    return { saved: true, uri };
  }

  const blobs = [];
  for (const c of chunks) {
    blobs.push(await fetchChunk(id, c.idx, jwt));
    onProgress?.({
      done: blobs.length, total: chunks.length,
      percent: Math.round(blobs.length / chunks.length * 100),
    });
  }

  const url = URL.createObjectURL(new Blob(blobs, { type: mimeOf(meta.name) }));
  const a = document.createElement("a");
  a.href = url;
  a.download = meta.name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { saved: true };
}

/**
 * URL de lecture en continu.
 *
 * On confie au service worker la disposition des morceaux et le jeton, puis on
 * rend une adresse qu'il intercepte. Le lecteur video ou audio la traite comme
 * un fichier ordinaire : il demande des tranches, l'avance rapide fonctionne,
 * et rien n'est telecharge en trop.
 *
 * Renvoie null si le service worker n'est pas actif — l'appelant retombe alors
 * sur le telechargement complet.
 */
export async function streamUrl(id) {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return null;

  const { data: meta, error } = await supabase
    .from("files").select("name, size").eq("id", id).single();
  if (error) throw new Error(error.message);

  const { data: chunks, error: cErr } = await supabase
    .from("chunks").select("idx, size").eq("file_id", id).order("idx");
  if (cErr) throw new Error(cErr.message);
  if (!chunks.length) throw new Error("Aucun morceau pour ce fichier");

  // la somme des morceaux fait foi : une taille declaree fausse ferait
  // reclamer au lecteur des octets qui n'existent pas
  const size = chunks.reduce((t, c) => t + Number(c.size), 0);
  const jwt = await token();

  await new Promise((resolve, reject) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => reject(new Error("Service worker sans reponse")), 4000);
    ch.port1.onmessage = e => {
      clearTimeout(timer);
      e.data?.ok ? resolve() : reject(new Error("Service worker muet"));
    };
    sw.postMessage({
      type: "tc-file",
      id, size,
      api: WORKER,
      mime: mimeOf(meta.name),
      token: jwt,
      chunks: chunks.map(c => ({ idx: c.idx, size: Number(c.size) })),
    }, [ch.port2]);
  });

  return `/tc-stream/${id}`;
}

/** Libere la place occupee par un media qu'on ne regarde plus. */
export function forgetStream(id) {
  navigator.serviceWorker?.controller?.postMessage({ type: "tc-forget", id });
}

export async function objectUrl(id, onProgress) {
  const { blob } = await download(id, onProgress);
  return URL.createObjectURL(blob);
}

/* ─────────── partage ─────────── */

export async function shareFile(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const days = 7;
  const expires = new Date(Date.now() + days * 86400_000);

  const { data, error } = await supabase.from("shares")
    .insert({ file_id: id, user_id: user.id, expires_at: expires.toISOString() })
    .select().single();
  if (error) throw new Error(error.message);

  return { url: `${WORKER}/api/s/${data.id}`, expires: expires.getTime(), days };
}
