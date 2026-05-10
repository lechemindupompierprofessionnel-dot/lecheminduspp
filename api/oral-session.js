// ============================================================
// PROXY SUPABASE — Persistance des sessions d'oral SPP
// ============================================================
//
// Endpoint  : POST /api/oral-session
// Auth      : SUPABASE_SERVICE_ROLE_KEY côté serveur (bypass RLS).
//             Les écritures client direct sont bloquées par RLS lockdown
//             (cf. test/supabase-oral-setup.sql — aucune policy).
//
// VARIABLES D'ENVIRONNEMENT REQUISES
//   ALLOWED_ORIGIN            : "https://lecheminduspp.fr,http://localhost:8000,..."
//                               (CSV — le proxy renvoie l'Origin EXACT, pas '*')
//   SUPABASE_URL              : https://epqduhruotkquyrvacqp.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY : eyJ...  (JAMAIS exposée client)
//
// ACTIONS SUPPORTÉES
//   check_quota     → RPC count_oral_sessions_this_week  (requiert member_email + week_iso)
//   start           → INSERT oral_sessions               (requiert member_email + member_tier + week_iso)
//   update_expose   → UPDATE expose_text                 (requiert member_email + sessionId + payload.expose_text)
//   complete        → UPDATE clôture                     (requiert member_email + sessionId + payload.{ended_at, conversation, debrief, duration_seconds, questions_count})
//   abandon         → UPDATE status='abandoned'          (requiert member_email + sessionId)
//
// SÉCURITÉ — LIMITE CONNUE
//   Tant que Memberstack n'émet pas un JWT vérifié serveur, le proxy
//   prend `member_email` du body sur parole. La validation
//   "member_email body == member_email DB de la session" pour
//   update_expose / complete / abandon empêche un client BUGGUÉ de
//   modifier la session d'un autre utilisateur, mais N'EMPÊCHE PAS un
//   attaquant de se faire passer pour un autre membre dès le `start`.
//   Durcissement prévu en étape 5 (vérif Memberstack JWT côté proxy).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { applyCors, handlePreflight, logError, safeStringify } from './_lib/cors.js';

const ALLOWED_ACTIONS = new Set(['check_quota', 'start', 'update_expose', 'complete', 'abandon']);

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  _supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabase;
}

// Format e-mail minimal (le check exact est côté Memberstack en étape 5)
function looksLikeEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// UUID v4 ou format mock-... toléré pendant la migration ; en prod ce sera un UUID
function looksLikeSessionId(s) {
  return typeof s === 'string' && s.length >= 8 && s.length <= 64;
}

/**
 * Vérifie qu'une session existe et appartient bien à `memberEmail`.
 * Retourne { ok, status, error } prêt à renvoyer.
 */
async function assertSessionOwnership(sb, sessionId, memberEmail) {
  const { data, error } = await sb
    .from('oral_sessions')
    .select('id, member_email')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: 'Erreur de persistance', _err: error };
  if (!data) return { ok: false, status: 404, error: 'Session introuvable' };
  if (data.member_email !== memberEmail) {
    return { ok: false, status: 403, error: 'Session ne vous appartient pas' };
  }
  return { ok: true };
}

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

  // ---- Validation enveloppe ----
  const body = req.body || {};
  const { action, member_email, payload } = body;
  const sessionId = body.sessionId;

  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Invalid action', allowed: [...ALLOWED_ACTIONS] });
  }
  if (!looksLikeEmail(member_email)) {
    return res.status(400).json({ error: 'Invalid member_email' });
  }

  let sb;
  try {
    sb = getSupabase();
  } catch (err) {
    logError('oral-session:env', err);
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    // ============================================================
    // check_quota
    // ============================================================
    if (action === 'check_quota') {
      const week_iso = payload && payload.week_iso;
      if (!week_iso || typeof week_iso !== 'string') {
        return res.status(400).json({ error: 'payload.week_iso required' });
      }
      const { data, error } = await sb.rpc('count_oral_sessions_this_week', {
        p_member_email: member_email,
        p_week_iso: week_iso
      });
      if (error) {
        logError('oral-session:check_quota', error, { member_email, week_iso });
        return res.status(500).json({ error: 'Erreur de persistance' });
      }
      return res.status(200).json({ count: typeof data === 'number' ? data : 0 });
    }

    // ============================================================
    // start
    // ============================================================
    if (action === 'start') {
      const member_tier = payload && payload.member_tier;
      const week_iso = payload && payload.week_iso;
      if (!week_iso || typeof week_iso !== 'string') {
        return res.status(400).json({ error: 'payload.week_iso required' });
      }
      if (member_tier && !['2b', '3'].includes(member_tier)) {
        return res.status(400).json({ error: 'Invalid member_tier' });
      }
      const { data, error } = await sb
        .from('oral_sessions')
        .insert({ member_email, member_tier: member_tier || null, week_iso, status: 'in_progress' })
        .select('id')
        .single();
      if (error) {
        logError('oral-session:start', error, { member_email, week_iso });
        return res.status(500).json({ error: 'Erreur de persistance' });
      }
      return res.status(200).json({ id: data.id });
    }

    // ============================================================
    // update_expose / complete / abandon — actions sur session existante
    // ============================================================
    if (!looksLikeSessionId(sessionId)) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const ownership = await assertSessionOwnership(sb, sessionId, member_email);
    if (!ownership.ok) {
      if (ownership._err) logError('oral-session:ownership', ownership._err, { sessionId, member_email });
      return res.status(ownership.status).json({ error: ownership.error });
    }

    if (action === 'update_expose') {
      const expose_text = payload && payload.expose_text;
      if (typeof expose_text !== 'string') {
        return res.status(400).json({ error: 'payload.expose_text required' });
      }
      const { error } = await sb
        .from('oral_sessions')
        .update({ expose_text })
        .eq('id', sessionId);
      if (error) {
        logError('oral-session:update_expose', error, { sessionId });
        return res.status(500).json({ error: 'Erreur de persistance' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'complete') {
      const p = payload || {};
      const update = {
        status: 'completed',
        ended_at: p.ended_at || new Date().toISOString()
      };
      if (p.conversation !== undefined)     update.conversation     = p.conversation;
      if (p.debrief !== undefined)          update.debrief          = p.debrief;
      if (p.duration_seconds !== undefined) update.duration_seconds = p.duration_seconds;
      if (p.questions_count !== undefined)  update.questions_count  = p.questions_count;

      const { error } = await sb
        .from('oral_sessions')
        .update(update)
        .eq('id', sessionId);
      if (error) {
        logError('oral-session:complete', error, { sessionId, payloadShape: Object.keys(p) });
        return res.status(500).json({ error: 'Erreur de persistance' });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'abandon') {
      const { error } = await sb
        .from('oral_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId);
      if (error) {
        logError('oral-session:abandon', error, { sessionId });
        return res.status(500).json({ error: 'Erreur de persistance' });
      }
      return res.status(200).json({ ok: true });
    }

    // Unreachable (action déjà validée plus haut)
    return res.status(400).json({ error: 'Unhandled action' });

  } catch (err) {
    logError('oral-session:unknown', err, { action, sessionId, body: safeStringify(body) });
    return res.status(500).json({ error: 'Erreur interne proxy' });
  }
}
