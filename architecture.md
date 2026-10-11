# underward — Architecture & Environment Reference

**Verified green:** 2026-10-12 — full `test.html` pass (all 12 sections).
**Purpose:** everything a model or developer needs to work on this project without re-reading all 26 files first.

## How this document works

- **§1–§10** are the reference: what the game is, the rules, the file map, the runtime
  chains, recipes, risks, tools, plan. §3–§4 are a snapshot taken at change-log entry
  **C-012**.
- **§11 is append-only.** Every change since C-012 is recorded there as a numbered
  entry. **Where §1–§10 and §11 disagree, §11 wins.**
- **To record a change:** append one `**C-0NN** — …` block at the very end of the file.
  Change nothing else. Never edit or delete a committed entry — to close an open item,
  append a new entry that says `Closes C-0NN`.
- **Latest entry:** C-013.

Two sources of truth, different jobs:
- **This doc** = meaning, intent, runtime behaviour, risk, plans. Read this first, and
  read the tail of §11 before trusting any specific claim.
- **`test.html`** = machine-verified facts. Trust this over the doc, then log a new entry.

---

## 1. What the game is

A mobile-first, touch-driven dungeon crawler in a single HTML page. No build step, no dependencies, no bundler, no framework. Plain `<script>` tags and one global namespace (`Delve`).

Core loop:
1. **Hub** — spend shards on permanent attribute levels and a shard-tree of nodes.
2. **START RUN** — new run, floor 1, procedurally generated, one ward (10-floor band) at a time.
3. **Movement** — tap an adjacent tile to step; tap your own tile to rest; tap a distant tile to pathfind.
4. **Combat** — walking into a monster starts an auto-attack loop (fixed tick; weapon speed vs monster speed). Tap elsewhere to flee (you take one hit).
5. **Trait choices** — XP from kills → level up → pick 1 of 3 traits or an ability.
6. **Boss floors (10, 20)** — bespoke arena: entry chamber, corridor, boss chamber. No other monsters. Beat the boss → victory screen → gold converts to shards, banked.
7. **Death or retreat** — run ends, gold converts, shards persist in `localStorage`.

Two wards exist: **Upper Ruins** (1–10) and **The Blackvein** (11–20). Nothing past floor 20 yet.

---

## 2. The rules (and why)

Breaking these caused most historical bugs.

### 2.1 Content vs Engine
- **Content** = pure data in `js/content/con-*.js`, assigning into `Delve.CONFIG` or registries. No logic.
- **Engine** = logic, everything else. Reads content; never hardcodes game content.

Why: content is safe to edit blind, on a phone, with no risk of breaking behaviour.

Watch the name trap: **`js/content/con-items.js` is data** (the item catalogue); **`js/items.js` is logic** (equip, drops, pricing, shop stock, shop economy).

### 2.2 Single ownership
Every `Delve.*` symbol has exactly one home file. Verified by `test.html` §2; ownership listed live in §12.
Never define `Delve.foo` in two files — the second wins silently and the loser's version vanishes.

### 2.3 Hooks, not overrides
Cross-module extension goes through `Delve._hooks`:
- `Delve._hooks.runStart[]` — fired inside `newRun()`
- `Delve._hooks.hubLoaded[]` — fired at the end of `refreshHub()`

**No file overrides another file's function.** The last one (the `wrapShopTap` monkey-patch) was removed; shop-tap detection lives inline in `movement.js`.

### 2.4 No build step, ever
Everything must work by opening `index.html`. No transpiling, no npm, no ES modules.

### 2.5 Load order is load-bearing
No module system, so order in `index.html` matters. See §4.1. **`test.html` §1 compares `index.html` against `test.html`'s `FILES[]` array and fails loudly on drift.** If you add, remove or reorder a script, update **both** in the same order.

### 2.6 One namespace, flat
Everything hangs off `window.Delve`. Sub-namespaces exist only where noted (`Delve.CONFIG`, `Delve.SPR`, `Delve.save`, `Delve._hooks`, `Delve._spriteUtils`, `Delve._bossSpriteBuilders`).
**Decision C-013: the math/RNG helpers stay flat** (`Delve.rng`, `Delve.mdist`, …) — a `Delve.util` namespace was drafted and rejected as churn without benefit. Known weakness — see §6.

### 2.7 Engine seams
Cross-file calls resolve at **call time**, never at load time, except where §4.1 says otherwise. The intentional seams:
- `Delve.rowFor`, `Delve.onHitEffectFor` — defined in `combat.js`, consumed by `rewards.js`.
- `Delve.startCombat`, `Delve.enemiesTurn`, `Delve.openShop` — defined in `combat.js`/`ui.js`, consumed by `movement.js`.
- `Delve.makeShopStock`, `Delve.shopHealCost`, `Delve.isShopFloor`, `Delve.healCost` — defined in `items.js`, consumed by `ui.js` and `levels.js`.
- `Delve.drawPaperDoll`, `Delve.markVisited`, `Delve.renderMinimap` — defined in `render.js`, consumed by `ui.js` and `render.js`.

---

## 3. File map (snapshot at C-012)

Load order is exactly this order in `index.html` (26 scripts).

### 3.1 Content (data only — safe to edit blind)

**`js/content/con-monsters.js`**
Owns: `CONFIG.MONSTER_ROSTER`, `CONFIG.MONSTER_BANDS`, `CONFIG.BOSS_DEFS`, `CONFIG.elite`, `CONFIG.xpKill`, `CONFIG.spawnSafetyRadius`.
Notes: `xpKill` is a legacy duplicate of `MONSTER_ROSTER[k].xp` — prefer the roster. `test.html` §4 verifies every band weight names a real roster row.
**The floors 10 and 20 bands are inert** — boss floors are generated by `Delve.genBossFloor` and spawn nothing, so no code reads those `boss:true` bands. Safe to delete or leave.

**`js/content/con-items.js`**
Owns: `Delve.TIERS`, `Delve.SLOT_DEFS`, `Delve.itemDefs`, `Delve.potionDefs` (100 items).
Notes: built by the `L(id,name,slot,tier,stats,lore,extra)` helper. Adding an item = one `L(...)` line.

**`js/content/con-biomes.js`**
Owns: `CONFIG.WARDS` (floor bands + generation tuning), `CONFIG.BIOMES` (visual palettes).
Notes: adding a ward needs a `WARDS` entry, a matching `BIOMES` index, monster bands in `con-monsters.js`, a `BOSS_DEFS` entry, and a registered boss sprite. A ward may carry an optional **`bossArena`** block (§4.8).

**`js/content/con-traits.js`**
Owns: `CONFIG.TRAITS` (passives, uniques, abilities with their `data` numbers).

**`js/content/con-progression.js`**
Owns: `CONFIG.PROGRESSION.TREES` (6 trees), `CONFIG.PROGRESSION.NODES` (5 trees have nodes).
Notes: node `type` strings must match the vocabulary in `progression.js` (§5).

**`js/content/con-bosssprites.js`** ⚠️ **ordering exception**
Owns: one canvas-drawing builder per boss, registered via `Delve.registerBossSprite(key, fn)`.
**Must load AFTER `js/sprites.js`** — needs `Delve._spriteUtils` and `Delve.rebuildSprites`. Only content file with a load-order constraint.

### 3.2 Engine — foundation

**`js/config.js`**
Owns: the `CONFIG` shell plus mechanics data that isn't content: `ATTRS`, `ATTR_ORDER`, `secondaries`, `economy`, `loot`, `SLOTS`, `SLOT_ORDER`, `WEIGHT`, `STATUS_EFFECTS`, `statusChance`, `WEAPON_SPEEDS`, `XP_CURVE`, `shop` (including `offset`), rest/shop/barrel numbers, `bossEvery`, `healOnDescendPct`, `inventorySlots`, `inventoryMax`, `energyStart`, `energyPerKill`, `bossHpBase`, `bossAtkBase`, `bossSpeed`.

**`js/save.js`**
Owns: `Delve.save`, `loadSave`, `persist`, `resetSave`, `createDefaultSave`.
**Critical rule:** any new persisted field must be added in three places — `makeDefaultSave()`, `migrateSave()`, and the `writeSaveToStorage()` whitelist, all here. Miss one and the field silently disappears.
Notes: `adopt()` mutates the existing object rather than replacing it, so modules holding a reference stay valid. Deliberate — don't undo. `test.html` §6 verifies a persist() round-trip.

**`js/attrs.js`**
Owns: derived player stats — `baseMaxHp`, `maxHp`, `baseAtk`, `atk`, `baseLuck`, `luckPts`, `agiPts`, `touPts`, `strPts`, `dmgRed`, `flatRed`, `dodge`, `crit`, unlock predicates (`hasSecondWind`, `hasOverkill`, `hasBulwark`), `firstStrikeBonus`, `hitCap`, `goldMult`, `dropChance`, `bossBonus`, `traitHealPerFloor`, `luckDiscount`, `attrCost`, `attrLvl`, `attrLevel`, `attrValue`.
Notes: derived stats are still split across two files — `items.js` owns `playerSpeed` and `itemBuffs`. See §6.

**`js/items.js`** (logic)
Owns: `rollTier`, `makeItem`, `stampProvenance`, `rollKillDrop`, `dropPotion`, `itemPrice`, `inventoryCap`, `pickupItem`, `playerSpeed`, `itemBuffs`, `equipItem`, `unequipItem`, `equipWeapon`, `equipArmour`, `weaponStatus`, `useConsumable`, `itemStatLines`, `wardOf`, `itemsByTier`, `makeShopStock`, `shopHealCost`, `isShopFloor`, `healCost`.
Notes: catalogue lives in `con-items.js`. Only file that knows item stat field names. All shop-domain logic (stock, pricing, shop-floor predicate, heal cost) lives here.

**`js/sprites.js`**
Owns: `Delve.SPR`, `Delve._spriteUtils`, `Delve.registerBossSprite`, `Delve._bossSpriteBuilders`, `Delve.rebuildSprites`.
Notes: runs `buildAll()` at load. Boss sprites come from the registry, so `con-bosssprites.js` calls `rebuildSprites()` after registering. `test.html` §5 verifies every `BOSS_DEFS.sprite` is registered and built.

### 3.3 Engine — state & world

**`js/state.js`**
Owns: `Delve.T` (tile enum), `Delve.G` (run state), `rng`, `rngF`, `clamp`, `flash`, `mdist`, `getWard`, `getMonsterBand`, `pickWeighted`, `recordStat`, `newRun`.
Notes: tile enum + RNG + math utils + ward/band lookup + run construction. Shop economy moved out to `items.js` (C-011).
Gotcha: `Delve.T` is a **plain object**, but several files alias it as a **function** (`const T = () => Delve.T`). Both styles exist and are not interchangeable — the mismatch once caused a live bug (§7).

**`js/levels.js`**
Owns: `Delve.genFloor`, `Delve.genBossFloor`, `Delve.openChest`, plus internal helpers (`placeRoom`, `spawnMonster`, `spawnMonsterKind`, `applySwarmFloor`, `applyClusteredLootFloor`, `ensureBlackveinPlan`, `specialRooms`).
Notes: single source of level generation. Boss floors branch out early (§4.8). `test.html` §7 runs 50 generations across both wards, including boss floors.

### 3.4 Engine — progression, combat, movement, economy

**`js/traits.js`**
Owns: `XP_CURVE`, `addXP`, `addAbility`, `castAbility`, `injectHubAbilities`, `traitBuffs`, `traits`, `hasUnbroken`, `secondWindHealOverride`.
Notes: `addAbility` silently drops the oldest ability over `levelMaxAbilities` — intentional, UI surfacing deferred.

**`js/combat.js`**
Owns:
- Combat loop: `startCombat`, `endCombat`, internal `playerSwing`, `monsterSwing`
- Ambient attacks: `enemiesTurn`, internal `ambientMob`
- Kill resolution: `killMonster`
- Run lifecycle: `endRun`, `retreat`, `die`, `triggerVictory`
- Exports for other files: `Delve.rowFor`, `Delve.onHitEffectFor`
Notes: no longer owns movement/rest/barrels/gold/descent (→ `movement.js`) or economy math (→ `rewards.js`). `enemiesTurn`/`ambientMob` stay deliberately: they share `ON_HIT_STATUS_CHANCE` and `onHitEffectFor` with `monsterSwing`.
Boss-kill branch no longer drops a staircase — it restores the arena tile to `FLOOR` (§4.8).

**`js/movement.js`**
Owns: `tryAct`, `tryActOnStep`, `smashBarrel`, `tryRest`, `collectGold`, `descend`, `promptStairs`.
Notes: split out of `combat.js`. Contains the shared shop-tap intercept at the top of both `tryAct` and `tryActOnStep`. `test.html` §8 is the direct guard on this file.
Never: own the combat loop or the reward economy.

**`js/rewards.js`**
Owns: `convertGold`, `applyBossBonus` / `_applyBossBonus`, `monsterStats`, `killRewards`, `floorClearBonus`, `makeElite`.
Notes: consumes `Delve.rowFor` from `combat.js` at call time. `monsterStats` has no internal caller; kept as public API.

**`js/effects.js`**
Owns: `applyEffect`, `applyPlayerEffect`, `tickMonsterEffects`, `tickPlayerEffects`, `playerWeakened`, `statusColor`.

### 3.5 Engine — presentation & plumbing

**`js/sfx.js`**
Owns: `Delve.sfx(name)`, `sfxToggleMute`, `sfxSetVolume`, `sfxGetVolume`, `sfxMuted`.
Notes: synthesizes all sound via Web Audio — no audio files. `AudioContext` created on first `pointerdown` (browser gesture requirement). Mute deliberately **not** persisted. Default volume `0.55` is hardcoded in two places (`sfx.js` init, `ui.js` slider) — keep in sync.

**`js/log.js`**
Owns: `log`, `clearLog`, `flushLogWindow`, and all `logXxx` shorthands.
Notes: two destinations — rolling strip (`#combatLog`) and modal window (`#logWindowContent`).

**`js/render.js`**
Owns: `Delve.draw`, `addFloater`, `addShake`, tile/floor/wall/torch/stairs drawing, sprite drawing, offscreen tile cache, `Delve.drawPaperDoll`, `Delve.markVisited`, `Delve.renderMinimap`.
Notes: 400ms `setInterval` redraw loop lives here. Draws and **sets** `Delve.camX/camY` every frame, which `input.js` reads for tap→tile conversion. Uses `document.getElementById` directly (not `ui.js`'s guarded `$`) because `ui.js` doesn't exist yet at this file's load time.
Never: own screen orchestration or DOM wiring.

**`js/pathfind.js`**
Owns: `findPath` (A*), `stepPath`.

**`js/input.js`**
Owns: canvas tap handling, `Delve.uiBlocked`, camera→tile conversion, duplicate-tap suppression, fallback `touchstart`/`mousedown` listeners, the `?diag=1` overlay, `Delve._lastBlockers`.
Notes: all tap handling wrapped in try/catch with visible reasons. **`uiBlocked` lists 10 overlay ids** — tests for `style.display` of `"flex"` or `"block"`. If any listed overlay is visible, **every canvas tap is swallowed** — #1 suspect for "buttons work, movement doesn't".
Secret-wall resolution happens **before** the Manhattan-1 check, so a false wall opens on approach.

**`js/ui.js`**
Owns:
- HUD: `updateHUD`, `renderAbilityBar`
- Inventory screens: `openInventory`, `showItemCard`, `isSlotUnlocked`, `equipSlots`
- Shop screen: `openShop`, `buildShop`
- Screen orchestration: `showHub`, `hideHub`, `startRun`, `showEndScreen`, `showVictory`, `showFloorCard`, `showBossIntro`, `showStairsPrompt`, `refreshHub`, `buildHub`
- Debug panel: `initDebug`
- **All DOM event wiring (~25 listeners)**
Notes: screens + DOM + wiring only. No canvas drawing (→ `render.js`), no item-pool or shop-economy logic (→ `items.js`). Uses a guarded `$()` returning an inert stub instead of `null` for missing ids, recorded in `Delve.missingEls`.

**`js/progression.js`**
Owns: `hasProgression`, `markRunTrait`, `_hooks` registration, tree/tab rendering (`renderTabs`, `renderTree`, `renderPanels`), `injectRunStart`.
Notes: reads `CONFIG.PROGRESSION` **at IIFE time**, so it must load after `con-progression.js` or it throws and the whole file dies.

**`js/main.js`**
Owns: `canvas`, `ctx`, `ts`, `W`, `H`, `viewW`, `viewH`, `camX`, `camY`, `resize`, `computeView`, resize/orientation listeners.
Notes: runs `resize()` then `showHub()` at load. Last script on the page.

### 3.6 Page shell & dev tooling

**`index.html`** — the page. Holds two `<style>` blocks: the main stylesheet, then the **shop layout fix** (§4.9). Script tags are the load order in §4.1.
**`test.html`** — primary verification tool, 12 sections. Must be served over http (GitHub Pages), not opened from disk; it uses synchronous XHR. See §8.
**`manifest.webmanifest`** — PWA manifest.

---

## 4. Runtime chains

The parts you cannot reconstruct by reading a single file.

### 4.1 Script load order (must match `index.html` exactly)

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
11  js/content/con-bosssprites.js      ← ordering exception (needs sprites.js)
12  js/state.js
13  js/levels.js
14  js/traits.js
15  js/combat.js
16  js/movement.js                     ← follows combat.js
17  js/rewards.js                      ← follows combat.js (uses Delve.rowFor)
18  js/effects.js
19  js/sfx.js
20  js/log.js
21  js/render.js
22  js/pathfind.js
23  js/input.js
24  js/ui.js
25  js/progression.js
26  js/main.js
```

**Hard constraints** (violate = silent breakage):
1. `config.js` **before** all `con-*` (they assign into `CONFIG`).
2. `sprites.js` **before** `con-bosssprites.js` (needs `_spriteUtils`, `registerBossSprite`, `rebuildSprites`).
3. `state.js` **before** anything using `Delve.T` or `Delve.G`: `levels`, `traits`, `combat`, `movement`, `rewards`, `effects`, `render`, `pathfind`, `input`, `ui`.
4. `save.js` **before** `ui`, `progression`, `main` (they read `Delve.save` at load).
5. `progression.js` **after** `ui.js` — `ui.js` calls `showHub()` at load, then `progression.js` registers hooks and calls `refreshHub()` again to render tabs. Reversed, tabs never appear until something else refreshes.
6. `main.js` **last** (needs `Delve.showHub` from `ui.js`).

**Soft orderings** (call-time only — keep them for clarity, a swap wouldn't crash):
7. `movement.js` after `combat.js` — calls `startCombat`/`enemiesTurn`.
8. `rewards.js` after `combat.js` — reads `Delve.rowFor`.
9. `items.js` before `state.js` — now true (9 vs 12); `isShopFloor`/`healCost` moved there (C-011). Still call-time.

### 4.2 Load sequence (side effects, in order)
1. `config.js` seeds `CONFIG`; `con-*` fill in content.
2. `save.js` → `loadSave()` → reads `localStorage`, migrates, `adopt()`s into `Delve.save`, writes back.
3. `sprites.js` → `buildAll()` builds every base sprite.
4. `con-bosssprites.js` → registers builders → `rebuildSprites()` rebuilds including bosses.
5. `state.js` → defines `Delve.T`, sets `Delve.G = null`.
6. `sfx.js` → binds one document `pointerdown` listener to unlock audio.
7. `ui.js` → wires ~25 listeners → `Delve.showHub()`.
8. `progression.js` → reads `CONFIG.PROGRESSION` → registers hooks → `refreshHub()`.
9. `main.js` → `resize()` (sets `Delve.ts`, view size) → `showHub()`.
10. `render.js` also starts a 400ms redraw interval — harmless in the hub (`draw()` returns early with no `G`).

### 4.3 START RUN
`#startBtn` → `Delve.startRun()` (`ui.js`):
1. `hideIntro()` if present (legacy onboarding hook — see §6)
2. `hideAll()` — hides every overlay
3. `#hud` → flex
4. `Delve.newRun()` (`state.js`): builds `G`, sets `G.hp = maxHp()`, fires **`_hooks.runStart`** (→ `progression.injectRunStart`: veteran level, starting gold, items, hub abilities), then `genFloor()` and `updateHUD()`
5. `Delve.resize()`, `Delve.draw()`, `showFloorCard()`

### 4.4 A tap (the movement chain)
`canvas` `pointerdown` → `handleTap` (`input.js`):
1. Error-wrapped. Any throw is caught, flashed, and logged to the `?diag=1` panel.
2. Bail if `!G || G.dead`
3. Bail if `uiBlocked()` — any of **10** overlay ids visible (records `Delve._lastBlockers`)
4. Bail if `ts` invalid or out of grid bounds (flashes a reason)
5. Targeting an ability → `castAbility`
6. Tapping your own tile → `tryRest()` *(movement.js)*
7. In combat + tapping elsewhere → `endCombat(true)` (flee, take one hit); clear the vignette
8. A wall → false-wall / secret-room check (before distance, so approach works)
9. Manhattan distance 1 → `tryAct(tx,ty)` *(movement.js)*
10. Else → `findPath` → `stepPath`, then a 110ms interval to keep walking

`tryAct` dispatches on the target tile: shopkeeper → `openShop`; monster/boss → `startCombat`; chest → `openChest`; stair → `promptStairs`; barrel → `smashBarrel` + move; else move, `collectGold`, pick up item, `enemiesTurn()`.

### 4.5 Combat tick
`startCombat(m)` sets `G.combatTarget`, `G.inCombat`, and an 80ms interval. Intervals derive from `secondaries.baseInterval / playerSpeed()` and `/ monster.speed`, so a fast dagger genuinely gets more hits.
- `playerSwing`: weaken check → `tickPlayerEffects` → damage (base + boss bonus + first strike) → crit roll → floater + sfx → weapon status roll → vampiric on crit → `killMonster` + `endCombat` if dead.
- `monsterSwing`: `tickMonsterEffects` (DOT can kill) → boss chain-hit check → dodge roll → damage (armour, stone skin, bulwark cap) → on-hit status → Second Wind → Unbroken → death.
- `enemiesTurn()` (non-combat): ticks player effects and `stoneSkin`, then every adjacent monster gets one `ambientMob` attack.

### 4.6 Level up
`killMonster` → `addXP` → `checkLevelUp` loop → `showLevelUpChoices` (3 passives, chance-swapped for an unknown ability, chance for an unused unique) → `#levelupScreen` → pick → `applyTrait` → repeat while `pendingLevelUps > 0`.

### 4.7 Death / victory / retreat
- `die()` → `endRun("death")` → `showEndScreen` → `#deathScreen`.
- Boss dies → `killMonster` boss branch → guaranteed boss drop → `triggerVictory(wardIdx)` → `convertGold()` (gold→shards at 10:1) → `_applyBossBonus` (boss `shardBonusPct` of run shards) → `showVictory`. `canContinue` is hardcoded true only for ward 1.
- Victory screen offers **Descend deeper** (ward 1 only) or **Return to Hub**.
- `retreat()` → gold converts, counts as success.

### 4.8 Boss floors — bespoke arena
Boss floors are **not** room-generated. `genFloor` branches on `G.floor % 10 === 0`, calls `Delve.genBossFloor(G, ward)`, then returns — before rooms, corridors, monsters, barrels or chests are considered. So a boss floor contains **nothing but the arena**.

Geometry is three connected pieces, south to north:
1. **Entry chamber** — small, centred, near the bottom. Player spawns at its centre with `lastDir = "up"`.
2. **Corridor** — narrow (3 tiles default), centred, connecting entry to arena.
3. **Boss chamber** — large (62% × 40% of the grid by default), at the top. Boss at its centre.

Defaults derive from `ward.dungeonSize`, so they work unmodified. To customise, add an optional block to a `WARDS` entry:

```javascript
bossArena: { bossW, bossH, entryW, entryH, corridorW, pad }
```

Other facts:
- `G.stairs = null`, `G.shop = { x:-1, y:-1 }`, `G.floorType = "boss"`.
- `Delve.showBossIntro(G.floor)` fires at the end of generation.
- **`G.bossArena`** exposes the derived geometry (`bossX/Y/W/H`, `entryX/Y/W/H`, `corrX/corrTop/corrW/corrH`, `bossCx/Cy`) so ward-specific dressing — braziers, banners, props — can be positioned without re-deriving anything.
- On boss death, `combat.js` restores the arena-centre tile to `FLOOR` and leaves `G.stairs` null. Without that restore, the tile stays `T.BOSS` and `tryAct` refuses to walk onto it — an invisible one-tile hole mid-arena.
- The run continues or ends from the victory screen, not a staircase.

### 4.9 Shop layout fix
`index.html` carries a second `<style>` block after the main stylesheet. It makes `#shopScreen` a scrollable flex column with `height:100dvh` and `overflow-y:auto`, sizes `#shopHealBtn`/`#shopLeaveBtn` to 48px minimum, and adds `env(safe-area-inset-bottom)` padding to the leave button. Before this, the shop was taller than the viewport with no scroll, so the footer buttons sat off-screen and unreachable.

---

## 5. Extension recipes

**Add a monster**
1. `con-monsters.js`: add a `MONSTER_ROSTER` row (`kind` must match a sprite key).
2. Add weights to the relevant `MONSTER_BANDS` entries (a weight naming a missing row silently spawns goblins — `test.html` §4 catches this).
3. Sprite: add a builder in `sprites.js`, or accept the pink placeholder circle.

**Add an item**
`con-items.js`: one `L("id","Name","slot",tier,{stats},"lore")` line. Slots come from `SLOT_DEFS`. Status-on-hit needs `{status:"poison"|"bleed"|"burn"}` (chances from `CONFIG.statusChance` by tier).

**Add a ward (10-floor band)**
1. `con-biomes.js`: `WARDS` entry (floor band + generation tuning) and a `BIOMES` palette. Optionally a `bossArena: {...}` block.
2. `con-monsters.js`: bands covering the new floors for **normal floors only** — a boss floor needs no band, since `genBossFloor` spawns nothing.
3. `con-monsters.js`: `BOSS_DEFS[n]` with `sprite:"boss_xxx"` and `accent`.
4. `con-bosssprites.js`: `Delve.registerBossSprite("boss_xxx", builder)`.
5. `combat.js`: `canContinue` in `triggerVictory` — currently hardcoded to ward 1.

**Add a trait / unique / ability**
`con-traits.js` only: one entry in `passives` / `uniques` / `abilities`. Ability `data` fields must match what `castAbility` reads. A **new ability id needs a new `case` in `castAbility`** (`traits.js`).

**Add a shard-tree node**
`con-progression.js`: one `NODES.<tree>` entry. `type` must be one the engine already consumes (`slotUnlock`, `inventory`, `ability`, `abilityRank`, `flatAtk`, `flatHp`, `flatRed`, `flatStat`, `flatDodge`, `startGold`, `startLevel`, `startItem`, `startConsumable`, `startKit`, `startEnergy`, `healPct`, `restPlus`, `dropPlus`, `goldPlus`, `discount`, `chestGuarantee`, `chestTierUp`, `killEnergy`, `energyCostPct`, `consumableHeal`, `cureHeal`, `bossDamage`, `statusUp`, `overkillPct`, `secondWindPct`, `secondWindPctMax`, `ironWill`). An unknown `type` is silently inert.

**Add a persisted save field**
`save.js`, **three places**: `makeDefaultSave()`, `migrateSave()`, `writeSaveToStorage()` whitelist.

---

## 6. Known weak points (honest, by severity)

**MEDIUM — flat namespace with ~180 `Delve.*` symbols.** `Delve.mdist` (a one-line math util) sits at the same level as `Delve.triggerVictory`. Discoverability is only via `test.html` §12. **Rejected fix (C-013)** — the churn outweighed the benefit. Accepted cost.

**MEDIUM — derived stats are split.** `attrs.js` owns most derived stats; `items.js` owns `playerSpeed` and `itemBuffs`. Same category, two files.

**MEDIUM — load order unenforced by the runtime.** Documented (§4.1) and auto-checked (`test.html` §1), but nothing *prevents* it. Nine files have meaningful load-time side effects. Risk grows with file count — now 26.

**LOW — `combat.js` still does three jobs** (loop + swings, kill resolution, run lifecycle). Down from five, and now a coherent "everything that happens when a fight resolves" file. Lifecycle could move to `lifecycle.js` later.

**LOW — `Delve.rowFor` / `onHitEffectFor` live in `combat.js` but are consumed by `rewards.js`.** An intentional seam (§2.7), but a neutral home (`state.js`) would be tidier.

**LOW — leftover onboarding reference.** `ui.js` calls `Delve.hideIntro()` if defined; it never is. Harmless dead wiring from a deleted file.

**LOW — style drift.** Mixed `var`/`const`/arrow, `T.FLOOR` vs `T().FLOOR`, `FIX #n` changelog comments in the source. Cosmetic, but the `T`/`T()` confusion was an actual live bug (§7).

**Verified NOT weak points:** `save.js`'s `adopt()` pattern, the content/engine split, the hooks system, the guarded `$()` in `ui.js`, and the boss-arena branch in `genFloor`.

---

## 7. Known bugs & open questions

**Fixed** (detail in §11):
1. `smashBarrel` writing `undefined` to the grid — C-004.
2. `tryAct`/`tryActOnStep` dereferencing `G` before null-checking — C-004.
3. `uiBlocked` throwing `blocking is not defined` — C-010.
4. Boss intro swallowing taps for 3s — C-010 (decided: taps pass through).
5. A secret room leaving a phantom false-wall pulse on the next floor — C-008.

**Latent — the same `G`-before-null pattern as #2, no known reproduction.** Reached only with a live run, so impact is theoretical:
- `movement.js`: `tryRest`, `collectGold`, `descend`
- `combat.js`: `killMonster`

Scheduled as §9 step 8. This is the last real defect in the codebase.

**Open question:**
6. **Root cause of the historical "can't move" bug is still unconfirmed.** Candidates: a stale cached script on the phone, or `pointerdown` not reaching the canvas on that browser. Mitigations in place: all tap errors caught and flashed, `touchstart`/`mousedown` fallbacks, `?diag=1` overlay, `Delve._lastBlockers`, and `test.html` §8 as a standing regression test.

---

## 8. Debugging & verification reference

| Tool | What it does |
|---|---|
| **`test.html`** | Primary verification. 12 sections (below). **Must be served over http** (GitHub Pages) — it uses synchronous XHR and fails from `file://`. |
| `?debug=1` | In-game debug panel: floor jump, gold/shards, status effects, elite, XP, shop, victory, death, re-render, dump stats, reset save. |
| `?diag=1` | Tap-diagnostic overlay: finger coords, resolved tile, player tile, `ts`, camera, `G` state, blocking overlay, combat/targeting state, element under the finger. |
| `?v=N` | Cache-buster for `index.html`. **Always use a new N after an upload.** GitHub Pages + mobile caches `<script>` tags aggressively, especially for home-screen/PWA installs. |
| `Delve.missingEls` | Console / §9: ids `ui.js` looked for and did not find. |
| `Delve._lastBlockers` | Console / §8: which overlays blocked the most recent tap. |

**Flag syntax:** first flag uses `?`, subsequent ones use `&` — `index.html?v=14&debug=1`.
**`test.html` does not need `?v=N`** — it appends its own timestamp to every script request.

### `test.html` sections

| § | Checks |
|---|---|
| 0 | Every file loads, per-file new-symbol count |
| 1 | `FILES[]` matches `index.html` scripts **in order**; flags duplicates and comment false positives |
| 2 | No duplicate `Delve.*` definitions (single ownership) |
| 3 | All required functions present, and required **objects** checked as objects |
| 4 | All content registries; every band weight maps to a real roster row; every ability has `data` |
| 5 | Every `BOSS_DEFS.sprite` is registered and actually built |
| 6 | Save schema complete; persist() round-trip preserves node purchases |
| 7 | 50 floor generations across both wards; spawn safety; boss arena exclusion |
| 8 | **Movement regression test** — `tryAct`, `tryRest`, `findPath`, `stepPath`, `uiBlocked` gating |
| 9 | DOM integrity via `missingEls` |
| 10 | Tier rolls return 1–3 on ward 2, never 4 |
| 11 | Summary (green/red counts) |
| 12 | Live ownership registry (key → first defining file) |

### Two failure signatures worth memorising
- *World draws, HUD works, taps do nothing* → check `Delve._lastBlockers` and `Delve.missingEls`. It's an overlay or a dead file.
- *A whole file's features are missing* → an unguarded load-time throw killed the rest of that file. Check the console for the first red line.

### Workflow after any edit
1. Upload changed file(s). **If a function moved, upload both files together** — half a move is worse than none.
2. Open the game with a **new** `?v=N`.
3. Run `test.html`. All 12 sections should stay green.
4. Check **§12** to confirm a moved function's owner actually changed. §3 only checks that a function exists *somewhere*, so it cannot detect a misfiled function — §12 can.
5. If a section goes red, paste it — the failing section names the file.
6. **Append a `C-0NN` entry to §11.** Nothing else in this doc changes.

---

## 9. Target structure & migration plan

**Goal:** consistent partitioning. Not a rewrite — moving existing functions, one file per step, `test.html` after each.

**Done:** steps 3, 4, 6, 7 (detail in §11). The structure is now essentially where it should be.

**Step 8 (the remaining structural work) — hygiene sweep.** Low risk, four known sites:
- `movement.js`: `tryRest`, `collectGold`, `descend` — read from `G` before null-checking.
- `combat.js`: `killMonster` — same pattern.
Fix: guard `G` first, then read `G.grid` / `G.goldPiles` as needed.
Also in scope: remove the `Delve.hideIntro()` leftover from `ui.js`, and normalise `T.FLOOR` vs `T().FLOOR` plus `var`/`const` drift if you want the tidiness.

**Rejected:** §9 step 5 (`Delve.util` namespace) — C-013. Also rejected: namespacing `Delve.rewards` — it would churn three files for no functional gain, since `rewards.js` already groups those functions.

**Content work waiting (not structural):**
- Per-ward boss arenas — shape and dress floor 10 as Upper Ruins, floor 20 as Blackvein, via `ward.bossArena` plus `G.bossArena` props.
- Delete the now-inert floors 10/20 `boss:true` bands in `con-monsters.js`.

**Optional later:** move `rowFor`/`onHitEffectFor` from `combat.js` to `state.js`; extract lifecycle (`endRun`, `retreat`, `die`, `triggerVictory`) into `lifecycle.js`.

**Standing rules for restructuring:**
- Move functions, don't rewrite them.
- One file per step; if two files are a matched pair, ship both together.
- Update `index.html` and `test.html` `FILES[]` together, same order.
- Run `test.html` before moving on, and check §12 for ownership.
- Log the change in §11 (§3/§4 no longer need editing — the entry supersedes them).

---

## 10. Environment constraints (non-negotiable)

- Authoring and testing happen **on an Android phone**.
- Delivery is **upload to GitHub → GitHub Pages**. No local server, no terminal, no CLI build.
- Therefore: **no build step, no dependencies, no ES modules, no transpiling.** Plain scripts, plain globals, works by opening the URL.
- Files are often transferred to the assistant as `.txt` for pasting convenience; the repo copies are `.js`. Never assume the extension in a paste matches the repo.
- Audio must be gesture-unlocked (handled in `sfx.js`).
- Investigate with a fresh `?v=N` first whenever behaviour doesn't match the code.
- **Partial edits must be supplied as BEFORE/AFTER blocks** with anchors to locate them once. Full-file rewrites replace wholesale. When a function moves between files, both files ship in the same message.

---

## 11. Change log (append-only)

**How to use:** append one block per change, at the very bottom, numbered in sequence. Never
edit or delete a committed entry. To close an `OPEN` item, append a new entry containing
`Closes C-0NN`. §3 and §4 are never rewritten again — an entry here supersedes them where
they conflict.

---

**C-001 — Baseline.**
`ARCHITECTURE.md` created, superseding `STRUCTURE.md`. Written at the 24-file state.

**C-002 — Hardening pass + `test.html` rebuild.**
`input.js`: all tap handling wrapped in try/catch with visible reasons; `touchstart`/`mousedown` fallbacks; duplicate-tap suppression; `?diag=1` overlay; `Delve._lastBlockers`.
`ui.js`: guarded `$()` returning an inert stub instead of `null`, recording misses in `Delve.missingEls`.
Removed the last override — the `wrapShopTap` monkey-patch of `tryAct`/`tryActOnStep`; shop-tap detection moved inline.
`test.html`: fixed three false positives (phantom `Missing: save`; comment-scanning duplicate; tier-roll check), removed the deleted `onboarding.js` entry, added §1 index.html parity, §8 movement regression, §9 DOM integrity, band-weight validation in §4.

**C-003 — `test.html` §1 false positive root-caused.**
The check scanned HTML comments, so an inline comment mentioning `js/ui.js` counted as a script reference and shifted every entry by one. Fixed by stripping comments before scanning. `index.html` confirmed clean: 24 scripts, no duplicates.

**C-004 — Step 3: extracted `js/rewards.js` from `combat.js`.**
Moved `convertGold`, `applyBossBonus`/`_applyBossBonus`, `monsterStats`, `killRewards`, `floorClearBonus`, `makeElite`. Seam: `Delve.rowFor` / `Delve.onHitEffectFor` exported from `combat.js`. `index.html` + `test.html` updated.
Also fixed two live bugs: `smashBarrel` writing `undefined` to the grid (`T.FLOOR` → `T().FLOOR`, which left an invisible walkable hole), and `tryAct`/`tryActOnStep` dereferencing `G` one line before null-checking it.

**C-005 — Step 4: split `ui.js`.**
`drawPaperDoll`, `Delve.markVisited`, `Delve.renderMinimap` → `render.js`. `makeShopStock`, `shopHealCost` → `items.js`. `ui.js` reduced to screens + DOM + wiring. No `index.html`/`test.html` change needed (no new files).

**C-006 — Step 6: extracted `js/movement.js` from `combat.js`.**
Moved `tryAct`, `tryActOnStep`, `smashBarrel`, `tryRest`, `collectGold`, `descend`, `promptStairs`, plus the shop-tap intercept. `combat.js` retains the loop, swings, ambient attacks, kills, and lifecycle. `enemiesTurn`/`ambientMob` deliberately stayed (shared `ON_HIT_STATUS_CHANCE` / `onHitEffectFor`). `index.html` + `test.html` updated — now 26 scripts. `test.html` §8 is the direct guard.

**C-007 — Doc pass.** Verified green end to end.

**C-008 — Boss floors rebuilt as bespoke arenas.**
Added `Delve.genBossFloor` (`levels.js`): `genFloor` branches on `floor % 10 === 0` and returns before room generation, so a boss floor is nothing but the arena — no monsters, barrels, chests or stairs. Three-part geometry: entry chamber (bottom) → corridor → large boss chamber (top), with the player spawning at the entry centre facing up.
`G.bossArena` exposes the derived geometry for future dressing; an optional `ward.bossArena` block overrides any dimension.
Boss death no longer drops a staircase (`combat.js`): the arena-centre tile is restored to `FLOOR` so it stays walkable, and the run continues from the victory screen. Without the restore the tile would remain `T.BOSS` and `tryAct` would refuse to walk onto it.
`genFloor` now resets `G.floorData = {}` each floor, fixing a phantom false-wall pulse carried over from a previous floor's secret room.

**C-009 — Shop layout fixed.**
`index.html` gained a second `<style>` block. `#shopScreen` became a scrollable flex column (`height:100dvh`, `overflow-y:auto`); `#shopHealBtn`/`#shopLeaveBtn` got a 48px minimum height and safe-area padding. Before this the shop was taller than the viewport with no scroll, so the footer buttons were unreachable.

**C-010 — Boss intro no longer swallows taps; `uiBlocked` repaired.**
Decided: `bossIntroOverlay` removed from `Delve.uiBlocked()` — the intro draws over the map while the player is meant to be walking up the corridor, so blocking input was wrong. The card still shows and fades.
`introOverlay` removed from `ui.js`'s `hideAll()` (dead wiring from the deleted onboarding file).
`uiBlocked` was throwing `blocking is not defined` (a renamed array); repaired and now lists 10 ids, testing for `style.display` of `"flex"` or `"block"`, and setting `Delve._lastBlockers` every call.

**C-011 — Step 7: trimmed `state.js`.**
`isShopFloor` and `healCost` moved to `items.js`, alongside `makeShopStock` / `shopHealCost` — all shop-domain logic in one file. `state.js` is now tile enum + `G` + RNG + math utils + ward/band lookup + `recordStat` + `newRun`.

**C-012 — Doc pass.** Verified green end to end, including §1 parity, §7 boss floors, §8 tap chain, §12 ownership. §3–§4 of this doc are the snapshot as of this entry.

**C-013 — Rejected step 5; this document restructured.**
`Delve.util` namespacing (`rng`, `rngF`, `clamp`, `mdist`, `pickWeighted`) was drafted and **rejected** — it would have required either touching every call site or carrying permanent aliases, for no functional gain. Decision: the math helpers stay flat. **No code changed for this entry.**
Also rejected: namespacing `Delve.rewards` — `rewards.js` already groups those functions; a namespace would churn `combat.js`, `movement.js` and `ui.js` for nothing.
This document was restructured so that future changes are a single appended block in this section rather than a rewrite of the whole file. §9 step 5 removed from the plan; step 8 becomes the only structural work left.

**C-014 — OPEN — Step 8: hygiene sweep.**
The latent `G`-before-null pattern in `movement.js` (`tryRest`, `collectGold`, `descend`) and `combat.js` (`killMonster`). Four sites; impact theoretical, since each is reached only with a live run. Sweep also covers the `Delve.hideIntro()` leftover in `ui.js` and, optionally, `T.FLOOR` / `var` style drift. This is the last known defect in the codebase.

**C-015 — OPEN — Content: per-ward boss arenas.**
Shape and dress floor 10 as Upper Ruins and floor 20 as Blackvein, using `ward.bossArena` for geometry and `G.bossArena` for prop placement (braziers, banners, rubble). No `levels.js` change needed — the hooks exist.

**C-016 — OPEN — Content: delete the inert boss bands.**
The floors 10 and 20 `boss:true` entries in `CONFIG.MONSTER_BANDS` (`con-monsters.js`) are no longer read by anything, since `genBossFloor` spawns no monsters (#C-008). Harmless either way.
**C-016 — OPEN — Content: delete the inert boss bands.**
The floors 10 and 20 `boss:true` entries in `CONFIG.MONSTER_BANDS`
(`con-monsters.js`) are no longer read by anything...

**C-017 — Step 8: hygiene sweep. Closes C-014.**
Guarded `G` before use in `movement.js` (`smashBarrel`, `tryRest`,
`collectGold`, `descend`), `combat.js` (`killMonster`), `levels.js`
(`openChest`). Removed the dead `Delve.hideIntro()` call from `ui.js`.
`test.html` rebuilt: §3 now asserts ownership, §8e tests null-`G` safety.

