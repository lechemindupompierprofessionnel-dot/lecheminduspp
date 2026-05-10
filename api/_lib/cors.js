// ============================================================
// Helper CORS multi-origines + sanitisation logs
// ============================================================
// Partagé entre api/oral-jury.js et api/oral-session.js.
// Le préfixe `_` du dossier (`_lib`) signale à Vercel que ce
// fichier n'est PAS une route exposée — il sert d'import interne.
// ============================================================

/**
 * Parse ALLOWED_ORIGIN (chaîne CSV) en tableau trimmé.
 * Exemple : "https://lecheminduspp.fr,http://localhost:8000" → ['https://lecheminduspp.fr', 'http://localhost:8000']
 */
export function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGIN || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Applique les en-têtes CORS sur la réponse.
 * Renvoie true si l'Origine est autorisée, false sinon.
 * Si false : caller DOIT répondre 403 et ne PAS exécuter la suite.
 *
 * Note : on n'utilise JAMAIS '*'. Si Origin manquant (curl, server-to-server)
 * ou non listé, on refuse — c'est un proxy front-only.
 */
export function applyCors(req, res) {
  const allowed = parseAllowedOrigins();
  const origin = req.headers && req.headers.origin;

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  return false;
}

/**
 * Gère la pré-flight OPTIONS. À appeler en début de handler après applyCors.
 * Retourne true si la requête a été terminée (caller doit return).
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Tronque un objet/string pour les logs (max 500 caractères).
 * Empêche d'écraser les logs Vercel avec des bodies massifs.
 */
export function safeStringify(value, max = 500) {
  let s;
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  if (s.length > max) return s.slice(0, max) + `…[+${s.length - max} chars]`;
  return s;
}

/**
 * console.error sans jamais leak de secret. Filtre les patterns sensibles.
 */
export function logError(label, err, ctx) {
  const ctxStr = ctx ? safeStringify(ctx) : '';
  const sanitized = ctxStr.replace(/sk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-***')
                          .replace(/eyJ[A-Za-z0-9._-]+/g, 'eyJ***');
  // err.stack peut contenir des paths absolus mais pas de secret en règle générale
  console.error(`[${label}]`, err && err.stack ? err.stack : err, sanitized);
}
