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

À venir.
