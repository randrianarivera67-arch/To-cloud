/**
 * Ponts natifs Android.
 *
 * Dans une WebView, deux choses que le navigateur fait naturellement ne
 * marchent pas : enregistrer un fichier via un lien `download`, et reagir au
 * bouton retour materiel. Les plugins Capacitor comblent les deux.
 *
 * Sur le web, tout ici retourne false et le code habituel reprend la main.
 */

export const isNative = () =>
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

/* ─────────── enregistrement de fichier ─────────── */

/** Un morceau de 18 Mo devient ~24 Mo en base64 : on convertit un a la fois. */
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Lecture du morceau impossible"));
    r.readAsDataURL(blob);
  });
}

/** Evite d'ecraser un fichier deja present : photo.jpg, photo (2).jpg, ... */
async function freeName(Filesystem, Directory, name) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? name : `${base} (${i + 1})${ext}`;
    try {
      await Filesystem.stat({ path: candidate, directory: Directory.Documents });
    } catch {
      return candidate;   // stat echoue = le nom est libre
    }
  }
  return `${base}-${Date.now()}${ext}`;
}

/**
 * Ecrit le fichier morceau par morceau dans Documents.
 *
 * On n'assemble jamais le fichier entier en memoire : chaque morceau est
 * ajoute a la suite du precedent, ce qui permet d'enregistrer des videos de
 * plusieurs centaines de mega-octets sur un telephone modeste.
 */
export async function saveNative(name, chunkAt, total, onProgress) {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");

  const path = await freeName(Filesystem, Directory, name);

  for (let i = 0; i < total; i++) {
    const blob = await chunkAt(i);
    const data = await toBase64(blob);

    if (i === 0) {
      await Filesystem.writeFile({ path, data, directory: Directory.Documents, recursive: true });
    } else {
      await Filesystem.appendFile({ path, data, directory: Directory.Documents });
    }
    onProgress?.({ done: i + 1, total, percent: Math.round((i + 1) / total * 100) });
  }

  const { uri } = await Filesystem.getUri({ path, directory: Directory.Documents });
  return { path, uri };
}

/** Propose d'ouvrir ou de partager le fichier qui vient d'etre enregistre. */
export async function shareSaved(uri, title) {
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, url: uri });
    return true;
  } catch {
    return false;   // partage annule ou indisponible : sans consequence
  }
}

/* ─────────── bouton retour materiel ─────────── */

/**
 * Le bouton retour d'Android ne declenche pas toujours `popstate` dans une
 * WebView : Capacitor l'intercepte avant. On s'y branche directement.
 *
 * `handler()` renvoie true s'il a consomme le geste, false pour quitter.
 */
export async function onHardwareBack(handler) {
  if (!isNative()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const sub = await App.addListener("backButton", () => {
      if (!handler()) App.exitApp();
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/* ─────────── connexion Google ─────────── */

/** Adresse de retour propre a l'application, declaree dans le manifeste Android. */
export const DEEP_LINK = "mg.tocloud.app://auth";

/**
 * Ouvre une page dans le navigateur du systeme.
 *
 * Google refuse ses pages de connexion a l'interieur d'une WebView : le
 * parcours s'arrete sur « disallowed_useragent ». Un onglet du navigateur
 * systeme n'est pas une WebView, il est donc accepte.
 */
export async function openExternal(url) {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
  } catch (e) {
    /* Le greffon fait partie de l'APK, pas du site : une application installee
       avant son ajout ne l'a pas. Le message par defaut — « Browser plugin is
       not implemented » — n'aide personne. */
    if (/not implemented|Browser/i.test(e?.message || "")) {
      throw new Error("APP_TOO_OLD");
    }
    throw e;
  }
}

export async function closeExternal() {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // deja ferme par l'utilisateur : sans consequence
  }
}

/**
 * Ecoute le retour du navigateur.
 *
 * Une fois Google validee, Supabase renvoie vers `mg.tocloud.app://auth?code=…`.
 * Android reveille alors l'application avec cette adresse, que l'on transmet
 * telle quelle a l'appelant.
 */
export async function onDeepLink(handler) {
  if (!isNative()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const sub = await App.addListener("appUrlOpen", ({ url }) => handler(url));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
