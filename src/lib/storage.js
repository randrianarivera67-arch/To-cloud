// localStorage qui ne casse pas quand il est indisponible
// (mode prive, WebView restreint, preview en bac a sable)
const mem = new Map();

export function load(key, fallback = null) {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return mem.has(key) ? mem.get(key) : fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    mem.set(key, value);
  }
}

export function drop(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    mem.delete(key);
  }
}
