# RECAP — feat-bundle-ux

Branche regroupant 3 chantiers UX/contenu indépendants. Un commit par chantier.

═══════════════════════════════════════════════════════════════════
CHANTIER 3a — Onglet "Préparation orale" (placeholder Bientôt)
═══════════════════════════════════════════════════════════════════

## Audit

### Recherche du fichier `project_lecheminduspp_routing.md`
**Le fichier n'existe pas à la racine du repo** (`ls project_lecheminduspp_routing.md` → not found, seul `programme-6-semaines-complet.md` est présent comme `.md` à la racine). Fallback comme prévu : grep des arrays `pages` dans le repo pour identifier toutes les whitelists.

### Whitelists `pages` réellement présentes (grep `^var pages|let pages|const pages`)

| Localisation | Scope | But |
|---|---|---|
| **L 4727** | Local au handler `?success` (Stripe) | Toggle off toutes les pages, active `#page-merci` après retour Stripe |
| **L 11102** | Global, utilisée partout | `goTo()`, `pages.indexOf()`, hash routing initial |

**Seulement 2 array literals**, pas 5. Les autres mentions de `pages` sont des reads de cette variable (L 11105 forEach, L 11226/11248 indexOf) ou des variables locales sans rapport (`var pages = DOC_PAGES[docId]` en L 19593, qui désigne un nombre de pages PDF, pas une whitelist).

La phrase du briefing « les 5 emplacements de la whitelist » est probablement approximative ou comptait aussi les sites d'usage (forEach + indexOf + hash). Pour l'ajout d'une nouvelle page, **les 2 array literals doivent être mis à jour** ; les usages en aval (forEach/indexOf) consomment ces arrays sans modification supplémentaire.

### Touch points pour `prepa-orale`
| # | Ligne (avant fix) | Élément |
|---|---|---|
| 1 | L 4727 | Whitelist `pages` scope Stripe-success |
| 2 | L 11102 | Whitelist `pages` global |
| 3 | L 11128-11135 | `groupMap` dans `goTo()` (highlight nav-group quand page active) |
| 4 | L 3037 (après) | Desktop nav HTML — nouveau `<div class="nav-group">` |
| 5 | L 2952 (après) | Mobile drawer HTML — nouvelle section + lien |
| 6 | L 4002 (avant) | Page DOM — nouveau `<div class="page" id="page-prepa-orale">` |

### Position retenue dans la nav

Conformément à l'instinct du briefing : entre `navg-prepa-ecrite` et `navg-prepa-physique`. Logique pédagogique (écrit → oral → physique). Idem dans le drawer mobile (entre la section "Préparation écrite" et "Préparation physique").

## Implémentation

**+29 lignes ajoutées, -2 lignes modifiées (les 2 whitelists, ajout de la chaîne `'prepa-orale'`).**

### Diff résumé

1. **L 4727** — `'prepa','demo-espace'` → `'prepa','prepa-orale','demo-espace'`
2. **L 11102** — même insertion entre `'prepa'` et `'demo-espace'`
3. **L 11128-11135** — ajout `'prepa-orale': ['navg-prepa-orale']` avant `prepa: [...]`
4. **L 3037 (après)** — nouveau bloc nav-group desktop :
   ```html
   <div class="nav-group nav-member-only" data-audience="member" id="navg-prepa-orale">
     <button class="nav-group-btn" data-page="prepa-orale" onclick="goTo('prepa-orale')">Préparation orale</button>
     <div class="nav-group-bar"></div>
   </div>
   ```
5. **L 2952 (après)** — nouvelle section drawer mobile :
   ```html
   <div class="mobile-nav-section">Préparation orale</div>
   <div class="mobile-nav-link" data-page="prepa-orale" onclick="goTo('prepa-orale');closeMobileNav()"><span class="mn-ico">🎤</span>Préparation orale<span class="mn-arrow">›</span></div>
   ```
6. **L 4002 (avant)** — nouvelle page placeholder :
   ```html
   <div class="page" id="page-prepa-orale">
     <div class="page-header">
       <div class="page-header-inner">
         <div class="s-eyebrow">Préparation orale</div>
         <div class="s-title">Bientôt<br><em>disponible</em></div>
         <div class="s-lead">Cette section est en cours de préparation. Reviens bientôt pour découvrir les fiches méthodologiques dédiées à l'épreuve orale du concours.</div>
       </div>
     </div>
     <div class="section">
       <div style="text-align:center;padding:60px 20px 80px">
         <div style="font-size:5rem;line-height:1;margin-bottom:8px" aria-hidden="true">🎤</div>
       </div>
     </div>
   </div>
   ```

### Pourquoi cette structure de page placeholder

Réutilisation des composants existants `.page-header` + `.page-header-inner` + `.s-eyebrow` + `.s-title` (avec `<em>` rouge) + `.s-lead` qui sont la structure-type des autres prepa-* pages. Garantit une cohérence visuelle parfaite avec la charte (Playfair Display titre, DM Sans corps, fond crème, accent rouge `#CC2229`) sans ajouter une seule ligne de CSS. L'icône 🎤 dans un bloc centré minimaliste tient lieu de placeholder visuel sans reproduire la structure complexe d'une page de contenu.

## Tests locaux (Playwright headless, http://localhost:8000)

| Test | Résultat |
|---|---|
| Page DOM `#page-prepa-orale` existe | ✓ |
| Page activable via `goTo('prepa-orale')` (`active` class) | ✓ |
| Nav-group desktop `#navg-prepa-orale` existe | ✓ |
| Lien drawer mobile `[data-page="prepa-orale"]` existe et visible | ✓ |
| Whitelist L 11102 contient `'prepa-orale'` (`pages.indexOf` !== -1) | ✓ |
| Eyebrow contenu | "Préparation orale" |
| Titre contenu | "Bientôt disponible" |
| Lead début | "Cette section est en cours de préparation. Reviens bientôt..." |
| Icône | 🎤 |
| Label nav desktop | "Préparation orale" |

### Non-régression : 11 pages testées via `goTo()`
home, qcm, biblio, prepa, prepa-maths, prepa-orale, prepa-culture-admin, espace, concours, connexion, contact — toutes activables, aucune erreur. Console : 0 errors, 0 warnings.

### Visuel
- Desktop 1280×800 (membre) : "PRÉPARATION ORALE" surligné en rouge dans la nav, entre Préparation Écrite et Préparation Physique. Page : eyebrow rouge, titre Playfair "Bientôt" + "disponible" italique rouge, lead grisé, icône 🎤 centrée. Cohérent avec la charte.
- Mobile 375×812 (drawer ouvert) : section "PRÉPARATION ORALE" entre les sections Écrite et Physique, lien avec icône 🎤. Cohérent avec les autres sections.

## Commit
- Message : `Feat: ajoute onglet 'Préparation orale' (placeholder Bientôt) dans la nav membre`
- Hash : à venir

═══════════════════════════════════════════════════════════════════
CHANTIER 3b — Sync "vu" Bibliothèque ↔ Prépa écrite
═══════════════════════════════════════════════════════════════════

## Audit

### Architecture du marquage "Vu"

**État** : 2 Sets en mémoire alimentés par Supabase
- `_biblioSeenIds` (L 9050) : docs explicitement marqués vus → table `doc_completions`
- `_biblioOpenedIds` (L 9051) : docs ouverts au moins une fois → table `doc_reads`

**Fonctions clés**
- `loadBiblioReadStatus()` (L 9054-9092) : charge les 2 Sets depuis Supabase au démarrage, puis `renderBiblioReadStatus()`
- `renderBiblioReadStatus()` (L 9095-9159) : pour chaque `.biblio-card` du DOM (`document.querySelectorAll`), nettoie les anciennes décorations puis ajoute `.biblio-read-status` (pastille) + `.biblio-seen-check` (checkbox cliquable, **avec listener via `addEventListener`**)
- `toggleDocSeen(docId, cardEl)` (L 9170-9231) : toggle l'état + persist Supabase + appelle `renderBiblioReadStatus()` après → propage la nouvelle valeur sur tous les `.biblio-card` du DOM
- `toggleSeenFromViewer()` (L 9251) : appelé depuis le bouton du PDF viewer

### Architecture des sous-onglets de Préparation écrite

**`renderPrepaTheme_Textes(slug, conf)`** (L 17624-17645) clone des cartes biblio :

```js
section.querySelectorAll('.biblio-card').forEach(function(card) { cards.push(card); });
// ...
html += '<div class="biblio-grid">' + cards.map(function(c){ return c.outerHTML; }).join('') + '</div>';
container.innerHTML = html;
```

`outerHTML` sérialise la structure DOM **mais PAS les event listeners attachés via `addEventListener`** (c'est une caractéristique standard de `outerHTML` : seuls les attributs HTML inline survivent).

### Cause racine identifiée

Quand l'utilisateur navigue vers `prepa-maths` (ou n'importe quel sous-onglet de Prépa écrite) :
1. `goTo('prepa-maths')` → `initPrepaTheme('maths')` → `renderPrepaTheme_Textes()`
2. Les `.biblio-card` source (déjà décorées par `renderBiblioReadStatus()` lors du load biblio) sont clonées via `outerHTML`
3. Les clones ont visuellement la pastille `.biblio-read-status` et la case `.biblio-seen-check`, **mais le listener `click` de la case n'a pas été copié**
4. Conséquence : cliquer sur "Vu" depuis prepa-écrite ne fait rien

`renderBiblioReadStatus()` n'est PAS rappelé après `initPrepaTheme()` → pas de re-rendering qui ré-attache les listeners.

## Fix appliqué

**+7 lignes additives**, à la fin de `renderPrepaTheme_Textes()` (juste après `container.innerHTML = html`) :

```js
// Les cards ont été clonées via outerHTML : leurs listeners JS (notamment le
// clic sur la case "Vu" et le badge quiz) n'ont PAS été copiés. On relance
// renderBiblioReadStatus() qui itère sur tous les .biblio-card du DOM (pas
// seulement ceux de la bibliothèque) et ré-attache les listeners + pastilles
// de statut. Effet bonus : le statut "Vu" reste synchronisé entre les
// contextes biblio ↔ prépa écrite, dans les deux sens.
if (typeof renderBiblioReadStatus === 'function') renderBiblioReadStatus();
```

### Pourquoi cette ligne suffit

1. `renderBiblioReadStatus()` utilise `document.querySelectorAll('.biblio-card')` (L 9097) — itère sur **tous** les `.biblio-card` du DOM, sans distinguer biblio vs clone prepa.
2. Pour chaque card, elle supprime les vieilles `.biblio-read-status` et `.biblio-seen-check` (qui dans le cas des clones, sont les versions sans listener), puis en ajoute de nouvelles via `addEventListener('click', ...)` → listeners fraîchement attachés sur les nouvelles divs.
3. La synchronisation bidirectionnelle est **gratuite** : `toggleDocSeen()` appelle déjà `renderBiblioReadStatus()` à L 9180. Marquer depuis biblio met à jour les clones prepa (et vice-versa).

### Idempotence
Appel multiple sans effet de bord négatif : `renderBiblioReadStatus` supprime systématiquement les anciennes décorations avant d'en poser de nouvelles. Pas d'accumulation, pas de doublons.

### Garde sur `currentMember`
La fonction retourne early si `!currentMember` (L 9096). Donc pour les non-loggués, aucune décoration n'est ajoutée — comportement identique à celui de la bibliothèque.

## Tests locaux (Playwright headless, currentMember mocké)

| Test | Résultat |
|---|---|
| Navigation `prepa-maths` rend 3 `.biblio-card` clonées dans `#prepa-maths-textes` | ✓ |
| Après le fix : 3 `.biblio-seen-check` injectées dans le container prepa | ✓ |
| Après le fix : 3 `.biblio-read-status` injectées dans le container prepa | ✓ |
| Clic sur la case "Vu" prepa-maths → `_biblioSeenIds` ajoute le docId | ✓ (`fiche-maths-arith` : false → true) |
| Card prepa-maths reçoit `.is-seen` après clic | ✓ |
| **Bidirectionnalité** : clic sur "Vu" depuis biblio → la clone prepa devient `.is-seen` + `.is-active` | ✓ (`fiche-maths-geo`) |
| Console errors / warnings | 0 / 0 |

### Limites du test local
- Le mock de `currentMember`, `supabaseClient`, `espMemberId` simule le contexte loggué payant. Le fix CSS/DOM est validé. La persistance Supabase réelle (insert dans `doc_completions`) n'est pas testée mais non touchée par ce fix.
- Les autres prepa-* tabs (texte, equipier, culture-admin) suivent strictement le même flux `renderPrepaTheme_Textes` : le fix s'applique à tous.

## Commit
- Message : `Feat: synchronise le statut 'vu' des documents entre la bibliothèque et les sous-onglets de Préparation écrite`
- Hash : à venir

═══════════════════════════════════════════════════════════════════
CHANTIER 3c — Tarif Performance — mise en avant prépa physique
═══════════════════════════════════════════════════════════════════

## Périmètre strict
Page Tarifs uniquement (`#page-formation`, L 3261), 3 cartes de la `.offer-grid` (Préparation L 3301, Performance L 3325, Excellence L 3346). Toutes les modifications sont 100% textuelles ou structurelles — aucune CSS touchée.

## 8 modifications appliquées

### Carte Préparation (L 3300-3322)

1. **Sous-titre** (L 3305) :
   - Avant : "La préparation théorique uniquement (sans le physique)"
   - Après : "Préparation complète à l'épreuve écrite du concours"

2. **Suppression** (L 3314-3316, 3 lignes retirées) :
   - Avant : `<div style="background:var(--cream2);border-left:3px solid var(--gray-light)..."> ⚠️ <strong>Pas de programme physique</strong> dans cette formule. Pour préparer aussi les épreuves physiques (sportives), choisis <strong>Performance</strong>. </div>`
   - Après : (bloc entier supprimé, container et tout)

### Carte Performance (L 3324-3343)

3. **Icône** (L 3326) :
   - Avant : `<div class="offer-icon">🔥</div>`
   - Après : `<div class="offer-icon">🏋️</div>`
   - Vérification : aucun autre 🔥 dans le bloc Performance (grep ciblé). Les flammes décoratives ailleurs sur le site ne sont pas touchées.

4. **Sous-titre** (L 3329) :
   - Avant : "La théorie + le physique"
   - Après : "Préparation complète aux épreuves écrites et physiques du concours"

5. **Feature 1** (L 3331) :
   - Avant : `<li>Accès complet à la préparation théorique</li>`
   - Après : `<li>toute la préparation écrite</li>`

6. **Inversion d'ordre** (L 3332-3333 → 3332-3333 inversés) :
   - Avant : "Blocs de 6 semaines" puis "Programme de préparation physique progressif"
   - Après : "Programme de préparation physique progressif" puis "Blocs de 6 semaines"

7. **Mise en GRAS des features prépa physique** (`<strong>...</strong>`) :
   - L 3332 : `<li><strong>Programme de préparation physique progressif</strong></li>` (contient « physique »)
   - L 3335 : `<li><strong>Traceur de progressions physiques</strong></li>` (contient « physiques »)
   - **Critère appliqué** strictement : « contenant 'physique', 'physiques', '1RM', 'pompes', 'tractions', 'endurance', ou tout terme sportif clairement lié à la prépa physique ». "Blocs de 6 semaines" et "Personnalisé à ton niveau" ne contiennent aucun de ces termes → restent en poids normal.

### Carte Excellence (L 3346-3363)

8. **Sous-titre** (L 3349) :
   - Avant : "L'accompagnement sur mesure pour viser le haut du classement"
   - Après : "Accompagnement premium pour ceux désirant mettre toutes les chances de leur côté"

### Inventaire final du diff
- 7 lignes ajoutées, 10 lignes supprimées (net −3 lignes : la mention "⚠️ Pas de programme physique..." faisait 3 lignes alors que ses replacements n'en font qu'une).

## Tests locaux (Playwright headless, http://localhost:8000#formation)

### Vérifications sémantiques (page chargée, 3 cartes inspectées)

| Carte | Sous-titre | Icône | Mention "Pas de programme physique" |
|---|---|---|---|
| Préparation | "Préparation complète à l'épreuve écrite du concours" | 📘 | ✓ supprimée |
| Performance | "Préparation complète aux épreuves écrites et physiques du concours" | 🏋️ | n/a |
| Excellence | "Accompagnement premium pour ceux désirant mettre toutes les chances de leur côté" | 💎 | n/a |

### Carte Performance — features (ordre + bold)

| # | Texte | `<strong>` | Conformité |
|---|---|---|---|
| 1 | "toute la préparation écrite" | non | ✓ |
| 2 | "Programme de préparation physique progressif" | **oui** | ✓ |
| 3 | "Blocs de 6 semaines" | non | ✓ |
| 4 | "Personnalisé à ton niveau" | non | ✓ |
| 5 | "Traceur de progressions physiques" | **oui** | ✓ |
| 6 | "Badges exclusifs" | non | ✓ |

### Visuel
- Desktop 1280×900 : 3 cartes côte à côte, charte respectée, mention physique bien retirée de la carte Préparation, layout compacté en cohérence.
- Mobile 375×812 : carte Performance en pleine largeur, titre Playfair, sous-titre rouge, ordre des features correct, **bold parfaitement lisible** sur les 2 features physique. Icône 🏋️ s'affiche sans glyph manquant.

### Console
0 errors, 0 warnings.

## ⚠️ Point de vigilance — incohérence non touchée hors-périmètre

Le briefing limitait le périmètre à la page Tarifs. Toutefois, j'ai identifié en grep la chaîne `'La théorie + le physique'` à **L 10973** :
```js
'<div class="esp-upg-card-sub">La théorie + le physique</div>' +
```
Il s'agit du sous-titre d'une carte d'upsell affichée dans **l'espace candidat** (probablement quand un membre Préparation voit l'invitation à upgrader vers Performance). Ce texte n'a **PAS** été modifié par cette branche, conformément au périmètre du briefing.

Si l'objectif est une cohérence globale du copy, il faudrait dans un commit ultérieur :
- L 10973 : "La théorie + le physique" → "Préparation complète aux épreuves écrites et physiques du concours" (ou variant adapté à la longueur de la card upsell, qui est plus contraint qu'un sous-titre de carte tarifs).

## Commit
- Message : `Feat: renforce la mise en avant de la prépa physique dans le tier Performance et clarifie les sous-titres des 3 tiers`
- Hash : à venir
