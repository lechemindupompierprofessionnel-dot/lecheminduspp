# Mise en place de la table `oral_sessions`

## Pré-requis

- Compte Supabase actif sur le projet `epqduhruotkquyrvacqp`
- Accès au **SQL Editor** (rôle `service_role` par défaut depuis Supabase Studio)

## Architecture d'auth retenue

**Option 1 — service_role via proxy Vercel.**

Le simulateur côté client n'écrit jamais directement dans Supabase. Toutes les écritures passent par le proxy Vercel (`api/oral-jury`, mis en place à l'étape 4) qui utilise `SUPABASE_SERVICE_ROLE_KEY` et bypass RLS nativement.

RLS reste activé sur la table sans aucune policy → tout accès `anon` ou `authenticated` est bloqué par défaut. Memberstack n'émet pas de JWT Supabase, on n'utilise donc pas de claim JWT côté policy.

## Étapes d'installation

1. Aller dans **Supabase Studio → SQL Editor → New query**
2. Copier-coller le contenu de `test/supabase-oral-setup.sql`
3. Cliquer **Run** (ou `Ctrl+Enter`)
4. Vérifier qu'aucune erreur n'apparaît dans la sortie

> ⚠️ Le script commence par `DROP TABLE IF EXISTS oral_sessions CASCADE;`. Si tu as déjà des données utiles dans la table, elles seront effacées. En dev c'est voulu (rejouabilité). En prod, retirer le DROP et adapter.

## Tests post-installation

### Test 1 — La table existe

```sql
SELECT * FROM oral_sessions LIMIT 1;
```

Doit retourner **0 ligne** (table vide) sans erreur.

### Test 2 — INSERT en service_role

```sql
INSERT INTO oral_sessions (member_email, member_tier, week_iso, status)
VALUES ('test@example.com', '2b', '2026-W19', 'in_progress')
RETURNING id;
```

Doit retourner un **UUID**. Note-le pour la suite.

### Test 3 — RPC quota (signature à 2 paramètres)

```sql
SELECT count_oral_sessions_this_week('test@example.com', '2026-W19');
```

Doit retourner **`1`** (la session insérée au test 2).

### Test 4 — La RPC ignore les sessions `abandoned`

```sql
UPDATE oral_sessions SET status = 'abandoned' WHERE member_email = 'test@example.com';
SELECT count_oral_sessions_this_week('test@example.com', '2026-W19');
```

Doit retourner **`0`** (la session est exclue du compteur car `abandoned`).

### Test 5 — Cleanup

```sql
DELETE FROM oral_sessions WHERE member_email = 'test@example.com';
SELECT COUNT(*) FROM oral_sessions WHERE member_email = 'test@example.com';
```

Doit retourner **`0`**.

## Vérification RLS (à l'étape 4 — proxy Vercel)

Une fois le proxy Vercel en place, tester depuis un client `anon` (curl avec `ANON_KEY`) :

```bash
curl -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  https://epqduhruotkquyrvacqp.supabase.co/rest/v1/oral_sessions?select=*
```

Doit retourner `[]` ou une erreur de permission. Aucune policy n'autorise `anon` à lire la table.

## En cas de souci

| Erreur | Cause probable | Solution |
|---|---|---|
| `relation oral_sessions already exists` | Le DROP en tête n'a pas pris effet | Exécuter manuellement `DROP TABLE oral_sessions CASCADE;` puis relancer |
| `function count_oral_sessions_this_week(text) does not exist` | Vieille signature à 1 param appelée quelque part | Le DROP en tête s'occupe des 2 anciennes signatures ; vérifier que tu as exécuté le script complet |
| Erreur de droit ou de policy | Tu n'es pas en `service_role` | Vérifier que tu exécutes bien depuis le **SQL Editor** de Studio, pas depuis un client externe avec une autre clé |
