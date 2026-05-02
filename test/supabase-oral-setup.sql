-- ============================================================
-- Table : oral_sessions
-- Stockage des sessions du simulateur d'oral SPP
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS oral_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email TEXT NOT NULL,
  member_tier TEXT, -- '2b' ou '3' pour audit
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expose_text TEXT, -- transcription de l'exposé du candidat
  conversation JSONB DEFAULT '[]'::jsonb, -- tableau des messages [{role, content, type, timestamp}]
  debrief JSONB, -- {axes: [...], verdict: "..."}
  week_iso TEXT NOT NULL, -- format ISO 'YYYY-WNN' pour quota hebdo
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  duration_seconds INT,
  questions_count INT DEFAULT 0
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_oral_member_week ON oral_sessions(member_email, week_iso);
CREATE INDEX IF NOT EXISTS idx_oral_member_started ON oral_sessions(member_email, started_at DESC);

-- ============================================================
-- Activation Row Level Security (RLS)
-- ============================================================

ALTER TABLE oral_sessions ENABLE ROW LEVEL SECURITY;

-- Politique : un membre ne peut voir que ses propres sessions
CREATE POLICY "Members can view own sessions"
  ON oral_sessions
  FOR SELECT
  USING (member_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Politique : un membre peut insérer ses propres sessions
CREATE POLICY "Members can insert own sessions"
  ON oral_sessions
  FOR INSERT
  WITH CHECK (member_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Politique : un membre peut mettre à jour ses propres sessions
CREATE POLICY "Members can update own sessions"
  ON oral_sessions
  FOR UPDATE
  USING (member_email = current_setting('request.jwt.claims', true)::json->>'email');

-- ============================================================
-- Fonction utilitaire : compter les sessions de la semaine en cours
-- ============================================================

CREATE OR REPLACE FUNCTION count_oral_sessions_this_week(p_email TEXT)
RETURNS INT AS $$
DECLARE
  current_week TEXT;
  session_count INT;
BEGIN
  -- Format ISO de la semaine courante : 2026-W18
  current_week := to_char(NOW(), 'IYYY-"W"IW');

  SELECT COUNT(*) INTO session_count
  FROM oral_sessions
  WHERE member_email = p_email
    AND week_iso = current_week
    AND status IN ('completed', 'in_progress');

  RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Vérification : test rapide
-- ============================================================
-- SELECT count_oral_sessions_this_week('test@exemple.fr');
-- INSERT INTO oral_sessions (member_email, week_iso, member_tier)
-- VALUES ('test@exemple.fr', to_char(NOW(), 'IYYY-"W"IW'), '2b');
