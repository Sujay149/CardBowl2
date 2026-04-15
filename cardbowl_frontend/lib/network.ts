/**
 * Lightweight network awareness without extra dependencies.
 * Uses the backend probe as the real connectivity test since
 * NetInfo may say "connected" even when the backend is unreachable.
 */

type Listener = (online: boolean) => void;

let _online = true;
let _lastCheck = 0;
const CHECK_INTERVAL = 10_000; // Don't re-probe within 10s
const _listeners = new Set<Listener>();

export function isNetworkOnline(): boolean {
  return _online;
}

export function onNetworkChange(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function setOnline(val: boolean) {
  if (val !== _online) {
    _online = val;
    console.log("[Network]", val ? "ONLINE" : "OFFLINE");
    _listeners.forEach((fn) => {
      try { fn(val); } catch {}
    });
  }
}

/**
 * Probe the backend to confirm actual reachability.
 * Caches result for CHECK_INTERVAL to avoid spamming.
 */
export async function checkBackendReachable(apiBase: string): Promise<boolean> {
  const now = Date.now();
  if (now - _lastCheck < CHECK_INTERVAL) return _online;
  _lastCheck = now;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${apiBase}/auth/login`, {
      method: "OPTIONS",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const reachable = res.status < 500;
    setOnline(reachable);
    return reachable;
  } catch {
    setOnline(false);
    return false;
  }
}

/** Reset the probe cache (call after network change). */
export function resetNetworkCache() {
  _lastCheck = 0;
}
