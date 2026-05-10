// ============================================================
// PROXY ANTHROPIC — Simulateur d'oral SPP (questions + débrief)
// ============================================================
//
// Endpoint  : POST /api/oral-jury
// Modèle    : claude-sonnet-4-6  (snapshot pinné, format dateless 4.6+)
// Caching   : prompt caching ephemeral sur le bloc système stable
//             (JURY_KNOWLEDGE_BASE + doctrine), 90% de réduction
//             des tokens d'entrée à partir du 2e tour.
//
// VARIABLES D'ENVIRONNEMENT REQUISES
//   CLAUDE_API_KEY            : sk-ant-... (clé Anthropic, JAMAIS exposée client)
//   ALLOWED_ORIGIN            : "https://lecheminduspp.fr,http://localhost:8000,..."
//                               (CSV — le proxy renvoie l'Origin EXACT, pas '*')
//   ANTHROPIC_MODEL           : claude-sonnet-4-6  (override possible)
//
// FORMAT DU BODY ATTENDU
//   {
//     messages:    [...],                                // historique conversation
//     system:      { stable: "...", variable: "..." },   // découpage cache
//     // ou        "..."                                 // string legacy (pas de cache)
//     requestType: 'question' | 'debrief',               // optionnel, pour log
//     sessionId:   '...'                                 // optionnel, pour log
//   }
//
// RETOUR
//   200 → { text, usage, stop_reason }
//   4xx/5xx → { error, details? }
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { applyCors, handlePreflight, logError, safeStringify } from './_lib/cors.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  // ---- CORS ----
  const corsOk = applyCors(req, res);
  if (handlePreflight(req, res)) return;
  if (!corsOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---- Validation body ----
  const body = req.body || {};
  const { messages, system, requestType, sessionId } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid `messages` array' });
  }
  if (!process.env.CLAUDE_API_KEY) {
    logError('oral-jury', new Error('CLAUDE_API_KEY missing'), { sessionId });
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // ---- Construction du `system` Anthropic avec prompt caching ----
  // 3 cas :
  //   1) system = { stable, variable } → 2 blocs, cache_control sur le stable
  //   2) system = "string"             → 1 bloc, pas de cache
  //   3) system absent                 → tableau vide
  let systemBlocks;
  if (system && typeof system === 'object' && (system.stable || system.variable)) {
    systemBlocks = [];
    if (system.stable) {
      systemBlocks.push({
        type: 'text',
        text: String(system.stable),
        cache_control: { type: 'ephemeral' }
      });
    }
    if (system.variable) {
      systemBlocks.push({
        type: 'text',
        text: String(system.variable)
      });
    }
  } else if (typeof system === 'string' && system.length > 0) {
    systemBlocks = [{ type: 'text', text: system }];
  } else {
    systemBlocks = [];
  }

  // ---- max_tokens selon le type d'appel ----
  // Question jury : 600 suffit largement (1-3 phrases).
  // Débrief        : 2000 (JSON structuré + 5 axes).
  const maxTokens = requestType === 'debrief' ? 2000 : 600;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  // ---- Appel Anthropic ----
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemBlocks,
      messages
    });
  } catch (err) {
    // Mapping erreurs SDK → status HTTP
    const status = err && err.status;
    const meta = { sessionId, requestType, model, body: safeStringify(body) };

    if (status === 429) {
      logError('oral-jury:rate-limit', err, meta);
      return res.status(503).json({ error: 'Service temporairement saturé, réessaie dans 30s' });
    }
    if (status >= 500 && status < 600) {
      logError('oral-jury:upstream-5xx', err, meta);
      return res.status(502).json({ error: 'Erreur serveur Claude' });
    }
    if (status >= 400 && status < 500) {
      logError('oral-jury:upstream-4xx', err, meta);
      return res.status(status).json({ error: 'Requête refusée par Claude', details: err.message });
    }
    logError('oral-jury:unknown', err, meta);
    return res.status(500).json({ error: 'Erreur interne proxy' });
  }

  // ---- Extraction du texte (filtre les blocs non-text au cas où) ----
  const text = (response.content || [])
    .filter(b => b && b.type === 'text')
    .map(b => b.text)
    .join('\n');

  return res.status(200).json({
    text,
    usage: response.usage || null,
    stop_reason: response.stop_reason || null
  });
}
