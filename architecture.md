# underward — Architecture & Environment Reference

**Status:** current as of this writing. Verify facts against `test.html` (live registry), not just this doc.
**Purpose:** anything a model or developer needs to work on this project without re-reading all 25 files first.

Two sources of truth, different jobs:
- **This doc** = meaning, intent, runtime behaviour, risk, plans. Read this first.
- **`test.html`** = machine-verified facts (does this function exist, did this file load). Trust this when they disagree.

---

## 1. What the game is

A mobile-first, touch-driven dungeon crawler in a single HTML page. No build step, no dependencies, no bundler, no framework. Plain `<script>` tags and one global namespace (`Delve`).

Core loop:
1. **Hub** — spend shards on permanent attribute levels and a shard-tree of nodes.
2. **START RUN** — new run, floor 1, procedurally generated, one ward (10-floor band) at a time.
3. **Movement** — tap an adjacent tile to step; tap your own tile to rest; tap a distant tile to pathfind there.
4. **Combat** — walking into a monster starts an auto-attack loop (fixed tick, weapon speed vs monster speed). Tap elsewhere to flee (you take one hit).
5. **Trait choices** — XP from kills → level up → pick 1 of 3 traits or an ability.
6. **Floor 10/20** — Ward boss. Beat it → victory screen → gold converts to shards, banked.
7. **Death or retreat** — run ends, gold converts, shards persist in `localStorage`.

Two wards exist: **Upper Ruins** (1–10) and **The Blackvein** (11–20). Nothing past floor 20 yet.

---

## 2. The rules (and why)

These are the conventions that hold today. Breaking them is what caused most historical bugs.

### 2.1 Content vs Engine
- **Content** = pure data, in `js/content/con-*.js`. Files assign into `Delve.CONFIG` or registries. **No logic, no functions that matter.**
- **Engine** = logic, everything else. Reads content. Never hardcodes game content.

Why: content is safe to edit blind, on a phone, with no risk of breaking behaviour. Adding a monster is one line in one file.

### 2.2 Single ownership
Every `Delve.*` symbol has exactly one home file. Verified against `test.html`'s registry.
Never define `Delve.foo` in two files. The second one wins silently and the loser's version vanishes.

### 2.3 Hooks, not overrides
Cross-module extension goes through `Delve._hooks`:
- `Delve._hooks.runStart[]` — fired inside `newRun()`
- `Delve._hooks.hubLoaded[]` — fired at the end of `refreshHub()`

`progression.js` registers into both instead of replacing `newRun`/`refreshHub`.
**There is one historical exception, now removed** (the `wrapShopTap` monkey-patch of `tryAct`/`tryActOnStep`, which used to live in `ui.js`). Its behaviour moved into `combat.js` as an inline shop check. With that gone, **no file overrides another file's function.**

### 2.4 No build step, ever
Everything must work by opening `index.html`. No transpiling, no npm, no ES modules. Reason: the only delivery mechanism is upload-to-GitHub → GitHub Pages, edited from a phone.

### 2.5 Load order is load-bearing
There is no module system, so order in `index.html` matters. See §4.1. If you reorder scripts, you must re-check the constraint list there.

### 2.6 One namespace, flat
Everything hangs off `window.Delve`. There are no sub-namespaces except a few ad-hoc ones (`Delve.CONFIG`, `Delve.SPR`, `Delve.save`, `Delve._hooks`, `Delve._spriteUtils`, `Delve._bossSpriteBuilders`). This is a known weakness — see §6.

---

## 3. Current file map

Load order is exactly this order in `index.html`.

### 3.1 Content (data only — safe to edit blind)

**`js/content/con-monsters.js`**
Owns: `CONFIG.MONSTER_ROSTER`, `CONFIG.MONSTER_BANDS`, `CONFIG.BOSS_DEFS`, `CONFIG.elite`, `CONFIG.xpKill`, `CONFIG.spawnSafetyRadius`, monster/boss scaling fallbacks.
Notes: `xpKill` is a legacy duplicate of `MONSTER_ROSTER[k].xp`. Prefer the roster.
Never: compute anything, reference `Delve.G`.

**`js/content/con-items.js`**
Owns: `Delve.TIERS`, `Delve.SLOT_DEFS`, `Delve.itemDefs`, `Delve.potionDefs`.
Notes: items built by the `L(id,name,slot,tier,stats,lore,extra)` helper. Adding an item = one `L(...)` line.
Never: contain gameplay logic (equip rules, pricing, drops).

**`js/content/con-biomes.js`**
Owns: `CONFIG.WARDS` (floor bands + per-ward generation tuning), `CONFIG.BIOMES` (visual palettes).
Notes: adding a ward means a `WARDS` entry **and** a matching `BIOMES` index **and** monster bands in `con-monsters.js`.

**`js/content/con-traits.js`**
Owns: `CONFIG.TRAITS` (passives, uniques, abilities with their `data` numbers).

**`js/content/con-progression.js`**
Owns: `CONFIG.PROGRESSION.TREES`, `CONFIG.PROGRESSION.NODES` (shard-tree layout).
Notes: node `type` strings must match the vocabulary `progression.js` consumes.

**`js/content/con-bosssprites.js`** ⚠️ **ordering exception**
Owns: one canvas-drawing builder per boss, registered via `Delve.registerBossSprite(key, fn)`.
**Must load AFTER `js/sprites.js`** — it needs `Delve._spriteUtils` and `Delve.rebuildSprites`. It is the only content file with a load-order constraint.
Never: be placed with the other content files at the top.

> ⚠️ **Verify:** two near-identical boss-sprite source files appeared during review. Confirm the repo contains only `con-bosssprites.js` and no orphan `bosssprites.js`.

### 3.2 Engine — foundation

**`js/config.js`**
Owns: the `CONFIG` object shell plus all mechanics data that isn't content: `ATTRS`, `ATTR_ORDER`, `secondaries`, `economy`, `loot`, `SLOTS`, `SLOT_ORDER`, `WEIGHT`, `STATUS_EFFECTS`, `statusChance`, `WEAPON_SPEEDS`, `XP_CURVE`, rest/shop/barrel numbers, `bossEvery`, `healOnDescendPct`, `inventorySlots`, `inventoryMax`.
Never: content (monsters/items/biomes/traits/trees live in `con-*`).

**`js/save.js`**
Owns: `Delve.save` (the live data object), `loadSave`, `persist`, `resetSave`, `createDefaultSave`.
Critical rule: **any new persisted field must be added in three places** — `makeDefaultSave()`, `migrateSave()`, and the `writeSaveToStorage()` whitelist. Same file, three spots. Miss one and the field silently disappears.
Notes: `adopt()` mutates the existing object rather than replacing it, so modules holding a reference stay valid. Good, deliberate, don't undo it.
Never: replace `Delve.save` with a new object.

**`js/attrs.js`**
Owns: derived player stats — `baseMaxHp`, `maxHp`, `baseAtk`, `atk`, `baseLuck`, `luckPts`, `agiPts`, `touPts`, `strPts`, `dmgRed`, `flatRed`, `dodge`, `crit`, unlock predicates (`hasSecondWind`, `hasOverkill`, `hasBulwark`), `firstStrikeBonus`, `hitCap`, `goldMult`, `dropChance`, `bossBonus`, `traitHealPerFloor`, `luckDiscount`, `attrCost`, `attrLvl`, `attrLevel`, `attrValue`.
Notes: split across two files for no good reason — `items.js` also owns derived stats (`playerSpeed`, `itemBuffs`). See §6.

**`js/items.js`** (logic)
Owns: `rollTier`, `makeItem`, `stampProvenance`, `rollKillDrop`, `dropPotion`, `itemPrice`, `inventoryCap`, `pickupItem`, `playerSpeed`, `itemBuffs`, `equipItem`, `unequipItem`, `equipWeapon`, `equipArmour`, `weaponStatus`, `useConsumable`, `itemStatLines`, `wardOf`, `itemsByTier`.
Notes: catalogue lives in `con-items.js`. This is the only file that knows item stat field names.

**`js/sprites.js`**
Owns: `Delve.SPR` (all pixel-art canvases), `Delve._spriteUtils`, `Delve.registerBossSprite`, `Delve._bossSpriteBuilders`, `Delve.rebuildSprites`.
Notes: runs `buildAll()` at load time. Boss sprites are built from the registry, so `con-bosssprites.js` calls `rebuildSprites()` after registering.

### 3.3 Engine — state & world

**`js/state.js`**
Owns: `Delve.T` (tile enum), `Delve.G` (the run-state object), `rng`, `rngF`, `clamp`, `flash`, `mdist`, `getWard`, `getMonsterBand`, `pickWeighted`, `isShopFloor`, `healCost`, `recordStat`, `newRun`.
Notes: this is the junk drawer — tile enum, RNG, math utils, ward lookup, shop economy, and run construction in one file. See §6. Also note `Delve.T` is a **plain object**, but several files alias it as a **function** `const T = () => Delve.T`. Both styles exist. See the bug in §7.

**`js/levels.js`**
Owns: `Delve.genFloor`, `Delve.openChest`, plus internal helpers (`placeRoom`, `spawnMonster`, `spawnMonsterKind`, `applySwarmFloor`, `applyClusteredLootFloor`, `ensureBlackveinPlan`, `specialRooms`).
Notes: the single source of level generation. Uses `ward.*` tuning from `con-biomes.js`, bands from `con-monsters.js`.

### 3.4 Engine — progression & combat

**`js/traits.js`**
Owns: `XP_CURVE`, `addXP`, `addAbility`, `castAbility`, `injectHubAbilities`, `traitBuffs`, `traits`, `hasUnbroken`, `secondWindHealOverride`.
Notes: `addAbility` silently drops the oldest ability when over `levelMaxAbilities` — intentional, UI surfacing is deferred.
Never: own XP*content* (`CONFIG.XP_CURVE` values live in `config.js`; this file consumes them).

**`js/combat.js`** ⚠️ **the mega-file — five jobs**
Owns:
- Combat loop: `startCombat`, `endCombat`, internal `playerSwing`, `monsterSwing`, `ambientMob`
- Movement: `tryAct`, `tryActOnStep`, `tryRest`, `smashBarrel`, `collectGold`, `descend`
- Rewards math: `monsterStats`, `killRewards`, `makeElite`, `floorClearBonus`, internal `rowFor`, `onHitEffectFor`
- Run lifecycle: `endRun`, `retreat`, `die`, `triggerVictory`, `promptStairs`, `killMonster`, `applyBossBonus`, `convertGold`
- Shop intercept (temporary home): inline check at the top of `tryAct`/`tryActOnStep`
Notes: `rowFor` is shared by rewards math and combat swings — that's the seam that will need exporting (`Delve.rowFor`) if rewards are extracted.

**`js/effects.js`**
Owns: `applyEffect`, `applyPlayerEffect`, `tickMonsterEffects`, `tickPlayerEffects`, `playerWeakened`, `statusColor`.

### 3.5 Engine — presentation & plumbing

**`js/sfx.js`**
Owns: `Delve.sfx(name)`, `sfxToggleMute`, `sfxSetVolume`, `sfxGetVolume`, `sfxMuted`.
Notes: synthesizes all sounds via Web Audio — no audio files. `AudioContext` created on first `pointerdown` (browser gesture requirement). Mute is deliberately **not** persisted. Volume default is hardcoded `0.55` in two places (`sfx.js` init and `ui.js` slider default) — keep in sync.

**`js/log.js`**
Owns: `log`, `clearLog`, `flushLogWindow`, and all `logXxx` shorthands.
Notes: two destinations — a rolling strip (`#combatLog`) and a modal window (`#logWindowContent`). `flushLogWindow` replays the `entries` array.

**`js/render.js`**
Owns: `Delve.draw`, `addFloater`, `addShake`, tile/floor/wall/torch/stairs drawing, sprite drawing, offscreen tile cache.
Notes: 400ms `setInterval` redraw loop lives here. Draws and **sets** `Delve.camX/camY` each frame. Calls `Delve.markVisited` (owned by `ui.js` — cross-file, tolerated).

**`js/pathfind.js`**
Owns: `findPath` (A*), `stepPath`.

**`js/input.js`**
Owns: canvas tap handling, `Delve.uiBlocked`, camera→tile conversion, duplicate-tap suppression, fallback `touchstart`/`mousedown` listeners, the `?diag=1` overlay, `Delve._lastBlockers`.
Notes: `uiBlocked` keeps a list of 12 overlay ids. If any is `display:flex`, every canvas tap is swallowed. That list is the #1 suspect for "buttons work, movement doesn't".

**`js/ui.js`** ⚠️ **second-largest file, mixed concerns**
Owns:
- HUD: `updateHUD`, `renderAbilityBar`, `renderMinimap`, `markVisited`
- Inventory: `openInventory`, `showItemCard`, `isSlotUnlocked`, `equipSlots`, paper-doll drawing
- Shop UI: `openShop`, `buildShop`, `makeShopStock` (gameplay logic in a UI file)
- Screen orchestration: `showHub`, `hideHub`, `startRun`, `showEndScreen`, `showVictory`, `showFloorCard`, `showBossIntro`, `showStairsPrompt`, `refreshHub`, `buildHub`
- Debug panel: `initDebug`
- **All DOM event wiring (~25 listeners)**
Notes: now uses a guarded `$()` that returns an inert stub instead of `null` for missing ids, and records them in `Delve.missingEls`. This is what stops one missing element from killing the rest of the file.
Never: keep canvas drawing (`drawPaperDoll`, `renderMinimap`) long-term — belongs in `render.js`.

**`js/progression.js`**
Owns: `hasProgression`, `markRunTrait`, `_hooks` registration, tree/tab rendering (`renderTabs`, `renderTree`, `renderPanels`), `injectRunStart`.
Notes: reads `CONFIG.PROGRESSION` **at IIFE time**, so it must load after `con-progression.js` or it throws and the whole file dies.

**`js/main.js`**
Owns: `canvas`, `ctx`, `ts`, `W`, `H`, `viewW`, `viewH`, `camX`, `camY`, `resize`, `computeView`, resize/orientation listeners.
Notes: runs `resize()` and `showHub()` at load. Last script on the page.

### 3.6 Dev tooling
**`test.html`** — loads every file, then reports per-file load success and the live ownership registry.
**`manifest.webmanifest`** — PWA manifest.

---

## 4. Runtime chains

The parts you cannot reconstruct by reading a single file.

### 4.1 Script load order and the constraints that matter

```
 1  js/config.js
 2  js/content/con-monsters.js
 3  js/content/con-items.js
 4  js/content/con-biomes.js
 5  js/content/con-traits.js
 6  js/content/con-progression.js
 7  js/save.js
 8  js/attrs.js
 9  js/items.js
10  js/sprites.js
11  js/content/con-bosssprites.js      ← ordering exception
12  js/state.js
13  js/levels.js
14  js/traits.js
15  js/combat.js
16  js/effects.js
17  js/sfx.js
18  js/log.js
19  js/render.js
20  js/pathfind.js
21  js/input.js
22  js/ui.js
23  js/progression.js
24  js/main.js
```

Hard constraints (violate = silent breakage):
1. `config.js` **before** all `con-*` (they assign into `CONFIG`).
2. `sprites.js` **before** `con-bosssprites.js` (needs `_spriteUtils`, `registerBossSprite`, `rebuildSprites`).
3. `state.js` **before** anything using `Delve.T` or `Delve.G`: `levels`, `traits`, `combat`, `effects`, `render`, `pathfind`, `input`, `ui`.
4. `save.js` **before** `ui`, `progression`, `main` (they read `Delve.save` at load).
5. `progression.js` **after** `ui.js` — `ui.js` calls `showHub()` at load, then `progression.js` registers hooks and calls `refreshHub()` again to render tabs. Reversed, the tabs never appear until something else refreshes.
6. `main.js` **last** (needs `Delve.showHub` from `ui.js`).
7. `input.js` before `ui.js` is conventional, not critical — no load-time cross-reference.

### 4.2 Load sequence (side effects, in order)
1. `config.js` seeds `CONFIG`; `con-*` fill in content.
2. `save.js` → `loadSave()` → reads `localStorage`, migrates, `adopt()`s into `Delve.save`, writes back.
3. `sprites.js` → `buildAll()` builds every sprite (base sprites only).
4. `con-bosssprites.js` → registers builders → `rebuildSprites()` rebuilds including bosses.
5. `state.js` → defines `Delve.T`, sets `Delve.G = null`.
6. `sfx.js` → binds one document `pointerdown` listener to unlock audio.
7. `ui.js` → wires ~25 listeners → `Delve.showHub()`.
8. `progression.js` → reads `CONFIG.PROGRESSION` → registers hooks → `refreshHub()`.
9. `main.js` → `resize()` (sets `Delve.ts`, view size) → `showHub()`.
10. `render.js` also starts a 400ms redraw interval — harmless while in the hub (`draw()` returns early if no `G`).

### 4.3 START RUN
`#startBtn` → `Delve.startRun()` (`ui.js`):
1. `hideIntro()` if present (legacy onboarding hook — see §7)
2. `hideAll()` — hides every overlay
3. `#hud` → flex
4. `Delve.newRun()` (`state.js`): builds the `G` object, sets `G.hp = maxHp()`, fires **`_hooks.runStart`** (→ `progression.injectRunStart`: veteran level, starting gold, starting items, hub abilities), then `genFloor()` and `updateHUD()`
5. `Delve.resize()`, `Delve.draw()`, `showFloorCard()`

### 4.4 A tap (the movement chain)
`canvas` `pointerdown` → `handleTap` (`input.js`):
1. Error-wrapped. Any throw is caught, flashed, and logged to the `?diag=1` panel.
2. Bail if `!G || G.dead`
3. Bail if `uiBlocked()` — any of 12 overlay ids at `display:flex` (records `Delve._lastBlockers`)
4. Bail if `ts` invalid or out of grid bounds (now flashes a reason)
5. If targeting an ability → `castAbility`
6. If tapping your own tile → `tryRest()`
7. If in combat and tapping elsewhere → `endCombat(true)` (flee, take one hit)
8. If a wall → false-wall / secret-room check
9. If Manhattan distance 1 → `tryAct(tx,ty)`
10. Else → `findPath` → `stepPath`, then a 110ms interval to keep walking

`tryAct` (`combat.js`) then dispatches on the target tile: monster/boss → `startCombat`; chest → `openChest`; stair → `promptStairs`; barrel → `smashBarrel` + move; else move, `collectGold`, pick up item, `enemiesTurn()`.

### 4.5 Combat tick
`startCombat(m)` sets `G.combatTarget`, `G.inCombat`, and an 80ms interval. Intervals derive from `secondaries.baseInterval / playerSpeed()` and `/ monster.speed`. Player swing and monster swing each have their own countdown, so a fast dagger genuinely gets more hits.
- `playerSwing`: weaken check → `tickPlayerEffects` → damage (base + boss bonus + first strike) → crit roll → floater + sfx → weapon status roll → vampiric on crit → `killMonster` + `endCombat` if dead.
- `monsterSwing`: `tickMonsterEffects` (DOT can kill) → boss chain-hit check → dodge roll → damage (armour, stone skin, bulwark cap) → on-hit status → Second Wind → Unbroken → death.
- `enemiesTurn()` (non-combat): ticks player effects and `stoneSkin`, then every adjacent monster gets one `ambientMob` attack.

### 4.6 Level up
`killMonster` → `addXP` → `checkLevelUp` loop → `showLevelUpChoices` (3 passives, chance-swapped for an unknown ability, chance for an unused unique) → overlay `#levelupScreen` → pick → `applyTrait` → repeat if `pendingLevelUps > 0`.

### 4.7 Death / victory / retreat
- `die()` → `endRun("death")` → `showEndScreen` → `#deathScreen`.
- Boss dies → `killMonster` boss branch → guaranteed boss drop → `triggerVictory(wardIdx)` → `convertGold()` (gold→shards at 10:1) → `_applyBossBonus` (boss `shardBonusPct` of run shards) → `showVictory`. `canContinue` is hardcoded true only for ward 1.
- `retreat()` → gold converts, counts as success.

---

## 5. Extension recipes

**Add a monster**
1. `con-monsters.js`: add a `MONSTER_ROSTER` row (`kind` must match a sprite key).
2. Add weights to the relevant `MONSTER_BANDS` entries.
3. Sprite: add a builder in `sprites.js` (base sprites) or accept the pink placeholder circle.

**Add an item**
`con-items.js`: one `L("id","Name","slot",tier,{stats},"lore")` line. Slots come from `SLOT_DEFS`. Status-on-hit needs `{status:"poison"|"bleed"|"burn"}` (chances come from `CONFIG.statusChance` by tier).

**Add a ward (10-floor band)**
1. `con-biomes.js`: `WARDS` entry (floor band + generation tuning) and a `BIOMES` palette.
2. `con-monsters.js`: bands covering the new floors, including a `boss:true` band for the x0 floor.
3. `con-monsters.js`: `BOSS_DEFS[n]` with `sprite:"boss_xxx"`.
4. `con-bosssprites.js`: `Delve.registerBossSprite("boss_xxx", builder)`.
5. `combat.js`: `canContinue` logic in `triggerVictory` — currently hardcoded to ward 1.

**Add a trait / unique / ability**
`con-traits.js` only, one entry in `passives` / `uniques` / `abilities`. Ability `data` fields must match what `castAbility` reads for that id — a new ability id needs a new `case` in `castAbility` (`traits.js`).

**Add a shard-tree node**
`con-progression.js`: one `NODES.<tree>` entry. `type` must be a type `progression.afterBuy` or the engine already consumes (`slotUnlock`, `inventory`, `ability`, `abilityRank`, `flatAtk`, `flatHp`, `flatRed`, `flatStat`, `flatDodge`, `startGold`, `startLevel`, `startItem`, `startConsumable`, `startKit`, `startEnergy`, `healPct`, `restPlus`, `dropPlus`, `goldPlus`, `discount`, `chestGuarantee`, `chestTierUp`, `killEnergy`, `energyCostPct`, `consumableHeal`, `cureHeal`, `bossDamage`, `statusUp`, `overkillPct`, `secondWindPct`, `secondWindPctMax`, `ironWill`). An unknown `type` is silently inert.

**Add a persisted save field**
`save.js`, **three places**: `makeDefaultSave()`, `migrateSave()`, `writeSaveToStorage()` whitelist.

---

## 6. Known weak points (honest, by severity)

**HIGH — `combat.js` does five unrelated jobs** (loop, movement, rewards, lifecycle, shop). ~24 functions. The real cost: to change movement you must open the file that also owns the reward economy, and `rowFor` is shared between two of the jobs. Nobody can answer "what is combat.js for" except "runtime".

**HIGH — load order is unenforced and unwritten everywhere except this doc.** Eight files have meaningful load-time side effects. One reorder in `index.html` produces silent failures with confusing symptoms. `con-bosssprites.js` being separated from its sibling content files is the visible symptom of this.

**MEDIUM — `ui.js` is a second mega-file.** Canvas drawing (paper doll, minimap), gameplay logic (`makeShopStock`), screen orchestration, the debug panel, and all DOM wiring in one place. Rendering is therefore split across `render.js` and `ui.js` with no principled rule.

**MEDIUM — `state.js` is a junk drawer.** Tile enum + RNG + math utils + ward lookup + shop economy + run construction. Six concerns.

**MEDIUM — derived stats are split.** `attrs.js` owns most derived stats but `items.js` owns `playerSpeed` and `itemBuffs`. Same category, two files.

**MEDIUM — flat namespace with ~150 `Delve.*` symbols.** `Delve.mdist` (a 1-line math util) sits at the same level as `Delve.triggerVictory`. Discoverability is only via `test.html`.

**LOW — `test.html` is stale.** Its `FILES` array still references old paths (pre-`con-` names, and deleted `js/onboarding.js`), and its function check reports `Missing: save` as a permanent false positive because `Delve.save` is an object, not a function. Fix both so the tool stays trustworthy.

**LOW — leftover onboarding references.** `ui.js` still lists `introOverlay` in `hideAll()` and calls `Delve.hideIntro()` if defined; `input.js` still lists `introOverlay` in `uiBlocked()`. Harmless (guarded, and the element is gone) but it is dead wiring from a deleted file.

**LOW — style drift.** Mixed `var`/`const`/arrow, `T.FLOOR` vs `T().FLOOR`, and `FIX #n` changelog comments throughout the source. Cosmetic, but it signals uncertainty about ownership.

**Verified NOT a weak point** (worth stating because it looks like one): `save.js`'s `adopt()` pattern, the content/engine split, and the hooks system are all correct and should not be "cleaned up".

---

## 7. Known bugs / live issues

1. **`smashBarrel` sets a tile to `undefined`.** In `combat.js`, the file aliases `const T = () => Delve.T;` (a function), but `smashBarrel` writes `G.grid[ty][tx] = T.FLOOR;` — `T.FLOOR` is `undefined`, not the tile enum. The cell becomes `undefined`, which is not `T.FLOOR`. Compare with `openChest` in `levels.js`, which correctly uses `T().FLOOR`. **Fix: `T().FLOOR` in `smashBarrel`.** (One-character-class fix, currently outstanding.)
2. **`tryAct` dereferences `G` before null-checking it.** `const G = Delve.G, g = G.grid;` runs before `if(!G ...)`, so a null `G` throws instead of bailing. Same pattern in `tryActOnStep`. Low impact (both are only reached with a live run) but it is a real ordering fault.
3. **Root cause of the historical "can't move" bug is unconfirmed.** Two candidates remain: (a) a stale cached script on the phone, (b) `pointerdown` not reaching the canvas on that browser. Mitigations now in place: `input.js` catches all tap errors, flashes a reason, adds `touchstart`/`mousedown` fallbacks, and provides the `?diag=1` overlay. If it recurs, `?diag=1` names the culprit directly.
4. **Unverified duplicate boss-sprite file.** See §3.1.

---

## 8. Debugging reference

| Tool | What it does |
|---|---|
| `?debug=1` | Shows the in-game debug panel (floor jump, gold/shards, status effects, elite, XP, shop, victory, death, re-render, dump, reset) |
| `?diag=1` | Shows the tap-diagnostic overlay: finger coords, resolved tile, player tile, `ts`, camera, `G` state, which overlay is blocking, combat/targeting state, and what element is under the finger |
| `?v=N` | Cache-buster. **Always use a new N after an upload.** GitHub Pages + mobile caches JS aggressively, especially for home-screen/PWA installs. |
| `test.html` | Per-file load report + live ownership registry |
| `Delve.missingEls` | Console: ids `ui.js` looked for and didn't find |
| `Delve._lastBlockers` | Console: which overlays blocked the most recent tap |
| `Delve._spriteUtils` | Console: sprite-building helpers for quick experiments |

**The two failure signatures worth memorising:**
- *World draws, HUD works, taps do nothing* → check `Delve._lastBlockers` and `Delve.missingEls`. It is an overlay or a dead file.
- *A whole file's features are missing* → an unguarded load-time throw killed the rest of that file. Check the console for the first red line.

---

## 9. Target structure & migration plan

**Goal:** move the grade from "good rules, wrong rooms" to consistent partitioning. Not a rewrite — mostly moving existing functions, one file at a time, testing between each step.

Ordered by (value ÷ risk):

**Step 3 — extract `js/rewards.js`** (low risk, highest clutter win)
Move from `combat.js`: `convertGold`, `applyBossBonus`/`_applyBossBonus`, `monsterStats`, `killRewards`, `floorClearBonus`, `makeElite`.
Seam: export `rowFor` and `onHitEffectFor` from `combat.js` as `Delve.rowFor` / `Delve.onHitEffectFor` so `rewards.js` can use them.
Load: `rewards.js` after `combat.js`. Test: `?v=N`, kill a monster, open a chest, finish a floor, beat a boss.

**Step 4 — split `ui.js`** (medium risk)
- `drawPaperDoll` + `renderMinimap` → `render.js`
- `makeShopStock` → `items.js` (or a new `shop.js`)
- Keep all DOM wiring and screen orchestration in `ui.js`
Test: inventory paper doll, minimap toggle, shop stock, all overlays.

**Step 5 — namespaces + move math utils** (mechanical, low risk, broad benefit)
- `Delve.util = { mdist, clamp, rng, rngF, pickWeighted }`
- `Delve.rewards = { ... }` from step 3
Leave deprecated aliases (`Delve.mdist = Delve.util.mdist`) so nothing breaks mid-migration.
Test: full run.

**Step 6 — split `combat.js` further** (highest risk, do last)
- `movement.js`: `tryAct`, `tryActOnStep`, `tryRest`, `smashBarrel`, `collectGold`, `descend`, `promptStairs`
- leaves `combat.js` as the combat loop + swings + `killMonster`
Test carefully; this is the tap chain.

**Step 7 — trim `state.js`.** Move shop economy (`isShopFloor`, `healCost`) to `items.js` or a new `shop.js`. Leaves `state.js` as tile enum + `G` + RNG + `newRun`.

**Step 8 — fix the low-severity items** in §6/§7: `test.html` staleness, onboarding leftovers, `smashBarrel` tile bug, `tryAct` null order, style drift.

**After each step:** update §3 and §4 of this doc, and move the finished step to the changelog. If §3 and §4 stay current, this doc never rots in a way that matters.

---

## 10. Changelog of structural work

- **Patched `ui.js`:** replaced `$` with a guarded lookup returning an inert stub, recording misses in `Delve.missingEls`. One missing element can no longer kill the rest of the file.
- **Removed the last override:** deleted the `wrapShopTap` monkey-patch of `tryAct`/`tryActOnStep` from `ui.js`; shop-tap detection moved inline into `combat.js`. No file overrides another file's function.
- **Hardened `input.js`:** all tap handling wrapped in try/catch with visible reasons; added `touchstart`/`mousedown` fallbacks; duplicate-tap suppression; `?diag=1` overlay; `Delve._lastBlockers`.
- **Added:** `ARCHITECTURE.md` (this file), superseding `STRUCTURE.md`.

---

## 11. Environment constraints (non-negotiable)

- Authoring and testing happen **on an Android phone**.
- Delivery is **upload to GitHub → GitHub Pages**. No local server, no terminal, no CLI build.
- Therefore: **no build step, no dependencies, no ES modules, no transpiling.** Plain scripts, plain globals, works by opening the URL.
- Audio must be gesture-unlocked (already handled in `sfx.js`).
- Investigate with cache-busting `?v=N` first whenever behaviour doesn't match the code.
