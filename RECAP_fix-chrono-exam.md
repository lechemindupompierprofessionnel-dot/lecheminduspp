# RECAP — fix-chrono-exam

## Symptôme
Sur desktop (≥901px), en mode examen (`#page-examen`), le chronomètre `.exam-timer-bar` est masqué par le bandeau de navigation principal sticky en haut de page.

## Audit

### Architecture des éléments concernés (lignes index.html avant fix)

| Élément | Position | Hauteur | Z-index | Ligne |
|---|---|---|---|---|
| `nav` (bandeau principal) | `fixed; top:0` | `68px` | `900` | 309 |
| `.demo-nav-bar` (bandeau démo non-loggué) | `fixed; top:68px` | `~50px` | `850` | 1893 |
| `.exam-timer-bar` (chrono examen) | `sticky; top:0` | auto | `5` | 1193 |

### Comportement avant fix

| Mode | Top du chrono | Source | État |
|---|---|---|---|
| Loggué desktop ≥901 | `0` | base (L 1193) | **BUG** — masqué par nav (z-index 900 > 5) |
| Loggué mobile ≤900 | `0` | mobile media (L 1412) | OK — scroll interne aux panneaux (`.exam-layout{overflow:hidden;height:100dvh}` L 1378-1387) |
| Démo non-loggué desktop ≥901 | `118px` | override (L 1927) | OK — compense nav 68px + démo bar 50px |
| Démo non-loggué mobile ≤900 | `0` | base | OK — même raison que loggué mobile |

### Pourquoi mobile fonctionne sans override
À `≤900px`, `.exam-layout` passe en `overflow:hidden; height:100dvh` (L 1378-1387) : la page entière ne scrolle pas, seuls `.exam-answers-scroll` et le PDF scrollent indépendamment dans leurs panneaux. Le sticky `top:0` du timer reste collé en haut du panneau answers, lui-même placé sous le nav. Pas de masquage.

À `≥901px`, `.exam-layout` est en `min-height:100vh` : la page scrolle globalement, le sticky `top:0` colle le timer en haut du viewport, où le nav `position:fixed` le recouvre.

### Pourquoi le démo desktop fonctionne
La règle `body.demo-mode:not(.is-logged) .exam-timer-bar{top:118px}` (L 1927) a une spécificité (0,0,2,1) plus forte que la règle de base (0,0,1,0). Elle pousse le timer sous nav+démo bar. Le bug n'apparaît qu'aux utilisateurs loggués desktop.

## Fix appliqué

**1 ligne ajoutée, 0 ligne modifiée**, juste après la règle de base `.exam-timer-bar` (L 1193) :

```css
@media (min-width:901px){.exam-timer-bar{top:68px}}
```

### Diff

```diff
 .exam-timer-bar{background:var(--dark);color:white;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5}
+@media (min-width:901px){.exam-timer-bar{top:68px}}
 .exam-timer-label{font-size:.7rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cream4);margin-bottom:4px}
```

### Pourquoi cette approche

1. **Mobile préservé** : la règle `.exam-timer-bar{top:0}` à L 1412 (à l'intérieur de `@media(max-width:900px)`) reste seule active à ≤900px.
2. **Démo desktop préservé** : la règle override démo (L 1927, spécificité 0,0,2,1) prime sur ma nouvelle règle (0,0,1,0). Le top démo reste `118px`.
3. **Loggué desktop fixé** : la nouvelle règle s'applique, top devient `68px` (hauteur exacte du nav).
4. **Aucune modification JS, aucune modification HTML**.

### Ce qui n'est PAS modifié
- `nav` (L 309)
- `.demo-nav-bar` (L 1893)
- Override démo `body.demo-mode:not(.is-logged) .exam-timer-bar{top:118px}` (L 1927)
- `.exam-timer-bar` règle de base (L 1193)
- `.exam-timer-bar` règle mobile (L 1412)
- Toute autre règle CSS du fichier

## Tests locaux (Playwright headless via http://localhost:8000)

| Test | Viewport | body class | Top attendu | Top observé | Pass |
|---|---|---|---|---|---|
| Loggué desktop ≥901 (cible du fix) | 1280×800 | `is-logged` | `68px` | `68px` | ✓ |
| Démo non-loggué desktop ≥901 | 1280×800 | `demo-mode` | `118px` | `118px` | ✓ |
| Visiteur public desktop ≥901 (cas marginal) | 1280×800 | `` | `68px` | `68px` | ✓ |
| Loggué mobile ≤900 (non-régression) | 375×812 | `is-logged` | `0px` | `0px` | ✓ |
| Démo non-loggué mobile ≤900 (non-régression) | 375×812 | `demo-mode` | `0px` | `0px` | ✓ |
| Frontière breakpoint exact | 900px | `is-logged` | `0px` | `0px` | ✓ |
| Frontière breakpoint exact | 901px | `is-logged` | `68px` | `68px` | ✓ |

### Vérif visuelle
Screenshot desktop 1280×800 loggué : chrono pixel-perfect aligné sous le nav (`getBoundingClientRect().top` = 68, `nav.offsetHeight` = 68). Aucun chevauchement.

### Console
0 erreurs, 0 warnings.

## Limites du test
- Le test simule l'état `is-logged` en injectant la classe via JS (pas un vrai login Memberstack). Ça suffit pour valider la règle CSS, qui est purement déclarative et ne dépend pas du runtime auth.
- Le chrono est testé sur le DOM statique (page-examen sans annale active) : le HTML L 4443 inclut la `.exam-timer-bar` dès le rendu initial, donc la règle CSS s'applique. Le comportement live (annale en cours, timer qui décompte) ne change pas la position sticky.

## Commit
- Hash : à venir
- Message : `Fix: chronomètre du mode examen masqué par le header sticky en desktop`

## Étapes manuelles pour validation au retour
1. Ouvrir lecheminduspp.fr (post-merge sur main) avec un compte loggué desktop
2. Aller en mode examen sur une annale réelle
3. Vérifier que le chrono est visible sous le nav, qu'il décompte normalement
4. Tester la transition warning/danger des couleurs (≤5min, ≤1min) — purement JS, non touchée

═══════════════════════════════════════════════════════════════════
COMMIT 2 — Suppression bandeau d'instructions
═══════════════════════════════════════════════════════════════════

## Justification
Le bandeau `.exam-instructions` du mode examen affichait des instructions par annale (durée, barème, calculatrice) chargées depuis le champ `instructions` de chaque JSON d'annale. Cette information est **redondante avec le PDF de chaque annale**, qui contient déjà l'entête officielle avec ces mêmes informations. Suppression définitive demandée.

## Audit préalable

### Localisation
Le bandeau cherché via "Calculatrice non autorisée" / "Barème : 1 point" / "Durée : 1 heure" → **aucun match dans `index.html`**. Ces textes sont en réalité **dans les fichiers JSON d'annales**, pas dans le HTML statique. Le HTML L 4455 ne contenait qu'un texte fallback ("Lis le PDF à gauche...").

### 3 emplacements identifiés
| # | Fichier | Ligne | Élément |
|---|---|---|---|
| 1 | `index.html` | 4455 | `<div class="exam-instructions" id="exam-instructions">…</div>` (texte fallback statique) |
| 2 | `index.html` | 1204 | Règle CSS `.exam-instructions{...}` (classe utilisée nulle part ailleurs — grep négatif) |
| 3 | `index.html` | 18678-18681 | Bloc JS `document.getElementById('exam-instructions').textContent = annale.instructions \|\| (isMobile ? '...' : '...')` |

### Dépendance JS critique flaggée
Le JS L 18678 remplit dynamiquement le bandeau avec `annale.instructions` (texte custom du JSON courant) ou un fallback mobile/desktop. Sans suppression du JS, `getElementById` retournerait `null` après suppression du HTML → TypeError silencieux à chaque chargement d'annale.

### Vérification annales
`grep -l '"instructions"' annales/**/*.json` → 26 annales sur 26 contiennent un champ `instructions` (equipier × 8, étude de texte × 9, maths × 9). Échantillon contenu :
- Maths CDG13 2021 : `"20 questions réparties en 3 problèmes. Durée : 1 heure. Une seule réponse exacte par question. Calculatrice non autorisée. Barème : +1 point bonne réponse, 0 sinon."`
- Equipier CDG69 2025 : `"40 questions. Durée : 1 heure. Chaque question peut comporter une ou plusieurs bonnes réponses. Barème : 1 point si toutes exactes, 0,5 si la moitié au moins sans erreur, 0 point dès qu'une réponse inexacte est cochée. Calculatrice non autorisée."`
- Étude de texte CDG69 2025 : barème spécifique avec −0,5

**Effet collatéral acté par l'utilisateur** : le contenu de `annale.instructions` ne sera plus affiché à l'écran. Le PDF de chaque annale prend le relais comme source unique de vérité pour les instructions. Les 26 JSON conservent leur champ `instructions` (données dormantes — pas de cleanup JSON nécessaire dans ce commit).

### Aucune autre référence à `annale.instructions` dans le code
Grep final `annale\.instructions|currentAnnale\.instructions|\.instructions\b` → unique hit à L 18678 (la ligne supprimée). Aucune dépendance résiduelle.

## Diff appliqué

**6 lignes supprimées, 0 ligne ajoutée.**

```diff
 .exam-answers-scroll{flex:1;overflow-y:auto;padding:24px}
-.exam-instructions{background:var(--red-pale);border-left:3px solid var(--red);padding:14px 18px;margin-bottom:24px;font-size:.85rem;color:var(--charcoal);line-height:1.6}
 .exam-q-row{...}
```

```diff
       <div class="exam-answers-scroll">
-        <div class="exam-instructions" id="exam-instructions">Lis le PDF à gauche. Coche ta/tes réponse(s) à chaque question ci-dessous. Tu peux revenir sur une question à tout moment.</div>
         <div id="exam-questions-list">
```

```diff
       pdfFrame.srcdoc = '...';
     }
-    document.getElementById('exam-instructions').textContent = annale.instructions ||
-      (isMobile
-        ? 'Consulte le sujet en haut, réponds dans la grille ci-dessous. Tu peux revenir sur une question à tout moment.'
-        : 'Lis le PDF à gauche. Coche ta/tes réponse(s) à chaque question ci-dessous. Tu peux revenir sur une question à tout moment.');
     renderExamQuestions();
```

## Tests locaux (Playwright headless, http://localhost:8000?nocache=#examen)

| Vérification | Desktop 1280×800 | Mobile 375×812 |
|---|---|---|
| `#exam-instructions` existe | ❌ supprimé | ❌ supprimé |
| `.exam-instructions` (classe) utilisée | 0 fois | 0 fois |
| `.exam-timer-bar` présent | ✓ | ✓ |
| `.exam-timer-bar` top | `68px` (fix commit 1 préservé) | `0px` (mobile rule préservée) |
| `#exam-questions-list` présent | ✓ | ✓ |
| Page `#page-examen` active | ✓ | ✓ |
| **Console errors** | **0** | **0** |
| **Console warnings** | **0** | **0** |

### Vérif anti-TypeError
Plus aucun `getElementById('exam-instructions')` dans le code (grep final). Donc plus aucun risque de `TypeError: Cannot set properties of null (setting 'textContent')` au chargement d'annale.

### Limites
Le test sur une vraie annale chargée (avec PDF + grille de questions populée) n'a pas été effectué en local — tester en local exige un compte payant et une session live. Le diff est tellement minimal (3 retraits stricts) que le risque résiduel est sur le rendu visuel (espacement, marge) plus que fonctionnel. Vérification visuelle attendue au retour.

## ⚠️ Référence à `annale.instructions` non touchée hors-périmètre
Aucune trouvée dans `index.html` (grep complet). Les 26 JSON conservent leur champ `instructions` (données archivées non affichées). Aucun cleanup à faire ailleurs dans le repo pour ce commit.

## Commit
- Hash : à venir
- Message : `Suppression du bandeau d'instructions du mode examen (HTML + CSS + JS), redondant avec le PDF de chaque annale`
