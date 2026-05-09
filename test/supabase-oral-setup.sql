-- ============================================================
-- Table oral_sessions — Simulateur d'oral SPP
-- ============================================================
-- ARCHITECTURE D'AUTH (Option 1 — service_role via proxy Vercel)
--
-- Le simulateur côté client n'écrit JAMAIS directement dans cette table.
-- Toutes les écritures passent par le proxy Vercel `api/oral-jury` qui
-- utilise SUPABASE_SERVICE_ROLE_KEY et bypass naturellement RLS.
--
-- RLS reste activé pour bloquer toute tentative d'écriture client direct
-- accidentelle. Aucune policy n'est définie : par défaut, anon et
-- authenticated n'ont aucun accès. Seul le service_role passe outre.
--
-- Memberstack n'émet pas de JWT Supabase ; on n'utilise donc PAS les
-- claims JWT côté policy. Le proxy Vercel reçoit l'identité via le SDK
-- Memberstack côté front et l'enregistre comme `member_email`.
-- ============================================================

-- Cleanup pour rejouabilité (dev). Le CASCADE supprime aussi les éventuels
-- objets dépendants (vues, contraintes externes).
DROP TABLE IF EXISTS oral_sessions CASCADE;
-- Compat anciennes signatures de la RPC (script joué plusieurs fois en dev)
DROP FUNCTION IF EXISTS count_oral_sessions_this_week(TEXT);
DROP FUNCTION IF EXISTS count_oral_sessions_this_week(TEXT, TEXT);

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE oral_sessions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email     TEXT         NOT NULL,
  member_tier      TEXT,                                      -- '2b' ou '3' (null si Memberstack indispo)
  started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  expose_text      TEXT,                                      -- transcription de l'exposé du candidat
  conversation     JSONB        NOT NULL DEFAULT '[]'::jsonb, -- tableau [{role, speaker, content, ...}]
  debrief          JSONB,                                     -- {verdict_titre, verdict_texte, axes:[...]}
  week_iso         TEXT         NOT NULL,                     -- format ISO 'YYYY-WNN' pour quota hebdo
  status           TEXT         NOT NULL DEFAULT 'in_progress'
                                CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  duration_seconds INT,
  questions_count  INT          NOT NULL DEFAULT 0
);

-- ============================================================
-- INDEX
-- ============================================================
-- Quota hebdomadaire : (member_email, week_iso)
CREATE INDEX idx_oral_sessions_email_week    ON oral_sessions (member_email, week_iso);
-- Listing chronologique d'un membre : (member_email, started_at DESC)
CREATE INDEX idx_oral_sessions_email_started ON oral_sessions (member_email, started_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — lockdown total
-- ============================================================
-- Aucune policy → anon et authenticated bloqués par défaut.
-- Le service_role (utilisé par le proxy Vercel) bypass RLS nativement,
-- c'est donc le SEUL à pouvoir lire/écrire.
ALTER TABLE oral_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RPC : compteur de sessions hebdomadaires
-- ============================================================
-- Appelée par le proxy Vercel pour vérifier qu'un candidat tier 2b
-- (plafond 2 sessions / semaine) peut bien démarrer une nouvelle session.
--
-- IMPORTANT : on EXCLUT les sessions 'abandoned' du compteur.
-- Justification : un candidat qui abandonne (clic "Quitter la session"
-- ou fermeture onglet) doit pouvoir relancer dans la semaine sans
-- pénalité. Risque d'abus marginal accepté : si un candidat abandonne
-- à répétition pour drainer le budget API, le coût reste limité
-- (un abandon avant le démarrage de l'exposé n'a déclenché aucun appel
-- Claude ; un abandon après en a déjà consommé, irrécupérables, donc
-- compter à 0 ne change rien à la perte). À durcir en prod si abus avéré.
CREATE OR REPLACE FUNCTION count_oral_sessions_this_week(
  p_member_email TEXT,
  p_week_iso     TEXT
) RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::int
  FROM oral_sessions
  WHERE member_email = p_member_email
    AND week_iso     = p_week_iso
    AND status      <> 'abandoned'
$$;
