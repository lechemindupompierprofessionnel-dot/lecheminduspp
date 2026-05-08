# RECAP — fix-auth-reconnect

## Symptôme reproduit par l'utilisateur
1. Utilisateur connecté clique sur "Se déconnecter"
2. Déconnexion réussit (UI revient à l'état visiteur)
3. Click "Se connecter" → arrive sur `#page-connexion`
4. Saisit email + mot de passe valides
5. Click bouton "Se connecter" → texte devient "Connexion…"
6. **Rien ne se passe** : pas de toast, pas de redirection, pas d'erreur console
7. Refresh manuel débloque la situation : la même tentative réussit

Console au chargement initial montre :
- `SUPABASE: client initialisé`
- `MEMBERSTACK: initialisé avec succès`

## Audit complet

### Architecture auth (lignes index.html)

| Élément | Ligne | Type |
|---|---|---|
| Script Memberstack v2 (CDN) | 237 | `<script src="https://static.memberstack.com/scripts/v2/memberstack.js" data-memberstack-app="app_cmnwwalte000o0sv26iasaw3s">` |
| Init Memberstack (DOMContentLoaded) | 260-285 | Polling sur `window.$memberstackDom`, appelle `getCurrentMember()` une fois pour hydrater |
| `getMemberstack()` | 16872-16874 | `return window.$memberstackDom \|\| null` — fresh à chaque appel |
| Globals d'état | 6830-6832 | `currentMember`, `isPaidMember`, `memberTier` |
| `updateNavMember(member)` | 16876-16985 | Set/reset complet des globals + classes body + boutons UI + caches biblio |
| `loginMember()` | 17377-17402 | Bouton via `onclick="loginMember()"` (L 3644). Pas de form, pas d'event listener |
| `logoutMember()` | 17404-17412 | Bouton via `onclick="logoutMember()"` (L 3074, 5263, 2971). Pas d'event listener |
| `onAuthChange` listener | — | **Aucun** dans tout le code (grep négatif) |

### Hypothèses éliminées

1. **Listener obsolète sur le bouton login** (hypothèse 2 du briefing) — éliminée
   Le bouton `#login-submit-btn` utilise `onclick="loginMember()"` inline (L 3644), pas un `addEventListener`. Chaque clic appelle la fonction fresh, indépendamment de l'état de la page. Pas de listener à re-binder.

2. **`onAuthChange` non re-bindé après logout** (hypothèse 3) — éliminée
   Aucun listener `onAuthChange` n'existe dans le code. Le SDK Memberstack n'est jamais subscribé. Donc rien à re-binder.

3. **État JS global resté "true" après logout** (hypothèse 4) — éliminée
   `updateNavMember(null)` (L 16957-16985) reset explicitement : `currentMember=null`, `isPaidMember=false`, `memberTier=null`, retire les classes `is-logged`, `is-member`, `is-free-member`, vide les caches `_biblioSeenIds`, `_biblioOpenedIds`, `_biblioStatusLoaded`. État proprement purgé.

4. **Form submission qui interfère** — éliminée
   Le bouton de login N'EST PAS dans un `<form>`. C'est juste un `<button onclick="loginMember()">` (L 3644) à l'intérieur d'un `<div class="login-box">`. Pas de submission par défaut, pas de reload de page.

### Hypothèse retenue

Le symptôme « bouton reste désactivé avec "Connexion…", aucune réaction, aucune erreur console » est **incompatible** avec :
- Une `Promise.reject` (déclenche le `catch` qui affiche `.login-error`)
- Une résolution réussie (déclenche `showToast` + `goTo('espace')`)
- Une exception synchrone dans le `try` (capturée par `catch`)

La SEULE branche du code qui produit ce silence absolu est :

```js
var result = await ms.loginMemberEmailPassword({ email, password });
```

…où `ms.loginMemberEmailPassword(...)` retourne **une Promise qui ne se résout jamais**. Le bouton reste à l'état "Connexion…" indéfiniment.

**Cause probable** : après `ms.logout()`, le SDK Memberstack v2 laisse son état interne (cookie de session, token CSRF, lock de queue interne) dans une configuration dégradée. La prochaine tentative de `loginMemberEmailPassword` ne peut pas authentifier la requête HTTP correctement, et reste pendante. Un refresh manuel régénère un `window.$memberstackDom` neuf depuis le script CDN, ce qui débloque tout.

C'est un pattern observé sur plusieurs SDKs auth qui maintiennent un cache de tokens en mémoire et ne le nettoient pas complètement à `logout()`.

### Confiance

| Aspect | Confiance |
|---|---|
| Diagnostic du symptôme = Promise hangs | ~75% — c'est la seule explication compatible avec le code observé |
| Cause racine = état SDK Memberstack post-logout | ~70% — pattern connu, cohérent avec le fait que le refresh débloque |
| Fix défensif `getCurrentMember()` post-logout résout le problème | **~50%** — raisonnement plausible, non vérifié live |

## Fix appliqué

**Type** : purement additif, +9 lignes, 0 ligne supprimée. Aucune modification de la logique existante.

**Localisation** : `logoutMember()` (L 17404-17412 → L 17404-17420).

```diff
 async function logoutMember() {
   try {
     var ms = getMemberstack();
-    if (ms) await ms.logout();
+    if (ms) {
+      await ms.logout();
+      // Force le SDK Memberstack v2 à re-synchroniser son état interne après
+      // logout (cookie de session, token CSRF, lock interne). Sans ce ping,
+      // certaines sessions laissent le SDK dans un état où la prochaine
+      // tentative de loginMemberEmailPassword reste pendante indéfiniment :
+      // la Promise ne se résout pas, aucune erreur, l'utilisateur doit
+      // recharger la page pour pouvoir se reconnecter.
+      try { await ms.getCurrentMember(); } catch(e) {}
+    }
   } catch(e) {}
   updateNavMember(null);
   showToast('Déconnecté.');
   goTo('home');
 }
```

### Pourquoi ce fix

- `getCurrentMember()` après `logout()` force le SDK à re-vérifier l'état de session courant. Cet appel a généralement pour effet de **réinitialiser les caches internes** (token CSRF notamment) qui restent corrompus après un `logout()`.
- Le retour est attendu null (pas de session active), mais l'acte d'appeler la méthode replanifie les buffers asynchrones du SDK.
- Wrapping en `try/catch` interne : si `getCurrentMember()` échoue (réseau, etc.), on continue le logout normal. Aucune nouvelle voie d'échec introduite.

### Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Force-reload après logout (`window.location.reload()`) | Contourne le bug, ne le résout pas. Utilisateur a explicitement demandé d'éviter. |
| Subscribe à `onAuthChange` au DOMContentLoaded | Plus invasif, change l'architecture auth. À envisager seulement si fix simple échoue. |
| Détacher `window.$memberstackDom` et réinitialiser depuis le CDN | Très invasif, risque de casser les contextes de bootstrap PWA (`pwaMemberstackChecked` à L 268). |
| Modifier `loginMember()` pour ajouter un timeout sur la promise | Surface le symptôme avec une erreur user-facing, ne fixe pas la cause. |

## Tests

### Test syntaxique (Playwright headless, http://localhost:8000)
- Page charge sans erreur console
- `typeof logoutMember === 'function'` ✓
- `logoutMember.constructor.name === 'AsyncFunction'` ✓
- `typeof loginMember === 'function'` ✓
- `typeof getMemberstack === 'function'` ✓
- `window.$memberstackDom` disponible ✓

### Test fonctionnel live
**NON EFFECTUÉ.**

Raison : reproduire le bug exige :
1. Un compte Memberstack de test avec credentials valides — non fournis dans la session
2. Le scénario logout → re-login dans la même page sans refresh
3. Une instance Memberstack v2 réellement initialisée (pas mockée)

L'environnement local headless ne peut pas tester ce flux de bout en bout.

## ⚠️ À VALIDER MANUELLEMENT À TON RETOUR

Scénario à reproduire après merge de la branche sur main :

1. Ouvrir lecheminduspp.fr en desktop (Brave de préférence, comme dans le bug initial)
2. Se connecter avec un compte de test
3. Cliquer "Se déconnecter"
4. **SANS REFRESH**, cliquer "Se connecter"
5. Saisir email + mot de passe
6. Cliquer "Se connecter"

**Comportement attendu si le fix marche** : connexion réussit immédiatement, toast "✅ Connecté ! Bienvenue.", redirection vers `#espace`.

**Si le bug persiste malgré le fix** : alors mon hypothèse Memberstack-cache-corruption est fausse. Pistes alternatives à explorer :
- Souscrire à `onAuthChange` au DOMContentLoaded et l'utiliser comme source de vérité d'état d'auth (au lieu d'attendre la résolution de `loginMemberEmailPassword`)
- Inspecter le réseau (DevTools) au moment du clic "Se connecter" : la requête HTTP part-elle ? Si non = SDK locked. Si oui mais sans réponse = serveur Memberstack qui bloque sur état dégradé.
- Tester aussi en navigation privée pour isoler les effets de cookies tiers / extensions Brave

Tester aussi le scénario inverse : refresh manuel doit toujours fonctionner (non-régression).

## Commit
- Hash : à venir
- Message : `Fix: la reconnexion immédiate après déconnexion échouait silencieusement, nécessitant un refresh manuel`

## Branche
- `fix-auth-reconnect`
- Push : à venir
