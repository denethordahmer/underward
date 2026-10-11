# underward — Structure Reference

Generated from test.html's ownership registry. Regenerate after any file change.

## Load order (index.html)

1. js/config.js            — pure config/mechanics data
2. js/content/con-monsters.js  — monster data
3. js/content/con-items.js     — item catalogue data
4. js/content/con-biomes.js    — wards + biome visual data
5. js/content/con-traits.js    — trait/ability data
6. js/save.js
7. js/attrs.js
8. js/items.js             — item logic (no catalogue)
9. js/sprites.js
10. js/state.js
11. js/levels.js
12. js/traits.js           — trait/ability logic
13. js/combat.js
14. js/effects.js
15. js/log.js
16. js/render.js
17. js/pathfind.js
18. js/input.js
19. js/ui.js
20. js/progression.js
21. js/main.js

Content files (2–5) load immediately after config, BEFORE any logic that reads them.
Deleting a content file's data from config.js and re-adding via content file is the established pattern.

---

## Content vs Engine

CONTENT (append-only data, never contains logic):
- js/content/con-monsters.js  → MONSTER_ROSTER, MONSTER_BANDS, BOSS_DEFS, elite, xpKill, spawnSafetyRadius, monster/boss scaling constants
- js/content/con-items.js      → TIERS, SLOT_DEFS, itemDefs, potionDefs (the full item catalogue)
- js/content/con-biomes.js     → WARDS, BIOMES
- js/content/con-traits.js     → TRAITS (passives, uniques, abilities)

ENGINE (logic, locked once working — change only by small patch):
everything else.

Rule: content files WRITE into Delve.CONFIG / registries. Engine files READ from them. Engine files never redefine another file's function.

---

## Function ownership (from registry)

### js/config.js
CONFIG (the whole config object).

### js/content/con-monsters.js
(no functions — sets CONFIG.MONSTER_ROSTER, MONSTER_BANDS, BOSS_DEFS, elite, xpKill, spawnSafetyRadius, monster/boss scaling)

### js/content/con-items.js
(no functions — sets CONFIG-independent registries: TIERS, SLOT_DEFS, itemDefs, potionDefs)

### js/content/con-biomes.js
(no functions — sets CONFIG.WARDS, CONFIG.BIOMES)

### js/content/con-traits.js
(no functions — sets CONFIG.TRAITS)

### js/save.js
loadSave, persist, save, VERSION(implied)

### js/attrs.js
agiPts, atk, attrCost, attrLevel, attrLvl, attrValue, baseAtk, baseLuck, baseMaxHp, bossBonus, crit, dmgRed, dodge, dropChance, firstStrikeBonus, flatRed, goldMult, hasBulwark, hasOverkill, hasSecondWind, hitCap, luckDiscount, luckPts, maxHp, touPts, traitHealPerFloor

### js/items.js (logic)
dropPotion, equipArmour, equipItem, equipWeapon, inventoryCap, itemBuffs, itemPrice, itemStatLines, itemsByTier, makeItem, pickupItem, playerSpeed, rollKillDrop, rollTier, stampProvenance, unequipItem, useConsumable, wardOf, weaponStatus

### js/sprites.js
SPR, rebuildSprites

### js/state.js
T, G, clamp, flash, genFloor(no — see levels), getMonsterBand, getWard, healCost, isShopFloor, mdist, newRun, pickWeighted, recordStat, rng, rngF

### js/levels.js
genFloor, openChest, plus internal-only special-floor helpers: ensureBlackveinPlan, spawnMonsterKind, specialRooms, applySwarmFloor, applyClusteredLootFloor (not exposed on Delve.*)

### js/traits.js (logic)
XP_CURVE, addAbility, addXP, castAbility, hasUnbroken, secondWindHealOverride, traitBuffs, traits

### js/combat.js
_applyBossBonus, collectGold, convertGold, descend, die, endCombat, endRun, enemiesTurn, floorClearBonus, killMonster, killRewards, makeElite, monsterStats, promptStairs, retreat, smashBarrel, startCombat, triggerVictory, tryAct, tryActOnStep, tryRest

### js/effects.js
applyEffect, applyPlayerEffect, playerWeakened, statusColor, tickMonsterEffects, tickPlayerEffects

### js/log.js
clearLog, flushLogWindow, log, logConsumable, logDeath, logDodge, logEnemyAtk, logEquip, logFloor, logHeal, logKill, logPickup, logPlayerAtk, logSecondWind, logSystem, logTrait

### js/render.js
addFloater, addShake, draw

### js/pathfind.js
findPath, stepPath

### js/input.js
(present at load; no persistent Delve.* functions beyond event wiring — tap handling)

### js/ui.js
buildHub, buildShop, equipSlots, hideHub, initDebug, isSlotUnlocked, markVisited, openInventory, openShop, refreshHub, renderAbilityBar, renderMinimap, showBossIntro, showEndScreen, showFloorCard, showHub, showItemCard, showStairsPrompt, showVictory, startRun, updateHUD

### js/progression.js
_hooks, hasProgression, markRunTrait, (plus internal: renderTabs, renderTree, renderPanels, injectRunStart — registered into _hooks)

### js/main.js
H, W, camX, camY, canvas, computeView, ctx, resize, ts, viewH, viewW

---

## Hooks (replaces the old overrides)

Delve._hooks = { hubLoaded:[], runStart:[] }

- js/state.js → newRun() calls Delve._hooks.runStart
- js/ui.js → refreshHub() calls Delve._hooks.hubLoaded
- js/progression.js → registers injectRunStart into runStart, renderTabs/renderPanels into hubLoaded

No file redefines another file's function. Script order no longer matters.

---

## Biome System

Two wards exist as of the Blackvein release:

| Ward | Floors | Biome index | Boss (floor) |
|------|--------|-------------|--------------|
| 1 — Upper Ruins  | 1–10  | 0 | The Warden (10) |
| 2 — The Blackvein | 11–20 | 1 | The Thorn Sovereign (20) |

Each ward entry in `C.WARDS` sets `biome:<index>` pointing at a matching entry in `C.BIOMES` for visuals. A future biome needs one new entry in each array plus matching bands, roster additions, and a boss def.

### Boss shard bonus

Applied once per boss at victory, in `combat.js` → `_applyBossBonus(wardIdx)`. Percentage is read from `BOSS_DEFS[wardIdx].shardBonusPct` and multiplied against the current run's `runShards`. Bonuses are cumulative across wards within a single run.

| Ward | Boss | Bonus |
|------|------|-------|
| 1 | The Warden | 10% |
| 2 | The Thorn Sovereign | 15% |

### Leave-vs-continue flow

After a boss kill, `killMonster` → `triggerVictory(wardIdx)`. Victory converts gold to shards, applies the boss bonus, and calls `showVictory(totalBanked, canContinue)`. `canContinue` is `true` for ward 1 only — the player may descend into the next biome. For ward 2, `canContinue` is `false` and the "Descend deeper" button is hidden. Update the `canContinue` line in `triggerVictory` when content is added past the current terminal ward.

### Blackvein enemy roster (in con-monsters.js)

| Kind | HP | Speed | On-hit |
|------|----|-------|--------|
| spore_swarm  | 14 | 1.40 | — |
| barkling     | 16 | 1.30 | — |
| thornling    | 24 | 1.35 | bleed  |
| vine_stalker | 28 | 1.15 | poison |
| dryad        | 34 | 0.95 | weaken |
| treant       | 48 | 0.55 | weaken |

On-hit status chance is 15%, set by `ON_HIT_STATUS_CHANCE` in `combat.js`. Status reads from `MONSTER_ROSTER[kind].onHitEffect`.

### Blackvein special floors (in levels.js)

Two special floor types are rolled once per run, from floors 11–19:

- **Swarm floor** — 18–26 spore swarms packed into one chamber. Standard monsters cleared; a high-value chest spawns at the room centre.
- **Clustered loot floor** — 4–5 guards ring a high-value chest in a normal room. Standard floor monsters remain.

Clustered floors: 2–3 per run. Swarm floors: 25% chance per remaining floor. Chest rewards for high-value chests (item tier 3+, tier-3 potion, boosted gold) are handled in `openChest`.

### Elite spawn range

`C.elite.minFloor = 3`, `C.elite.maxFloor = 99999`. Elites may spawn on any floor from 3 onward. Chance is flat 10% across all biomes.

---

## Adding content going forward

New monster:  edit js/content/con-monsters.js (add MONSTER_ROSTER row + a band weight)
New item:     edit js/content/con-items.js (add one L(...) line)
New biome:    edit js/content/con-biomes.js (add WARDS entry + BIOMES entry)
New trait:    edit js/content/con-traits.js (add entry to TRAITS)

None of these touch engine files.
