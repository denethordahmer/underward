# underward — Structure Reference

Generated from test.html's ownership registry. Regenerate after any file change.

## Load order (index.html)

1. js/config.js            — pure config/mechanics data
2. js/content/monsters.js  — monster data
3. js/content/items.js     — item catalogue data
4. js/content/biomes.js    — wards + biome visual data
5. js/content/traits.js    — trait/ability data
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
- js/content/monsters.js  → MONSTER_ROSTER, MONSTER_BANDS, BOSS_DEFS, elite, xpKill, spawnSafetyRadius, monster/boss scaling constants
- js/content/items.js      → TIERS, SLOT_DEFS, itemDefs, potionDefs (the full item catalogue)
- js/content/biomes.js     → WARDS, BIOMES
- js/content/traits.js     → TRAITS (passives, uniques, abilities)

ENGINE (logic, locked once working — change only by small patch):
everything else.

Rule: content files WRITE into Delve.CONFIG / registries. Engine files READ from them. Engine files never redefine another file's function.

---

## Function ownership (from registry)

### js/config.js
CONFIG (the whole config object).

### js/content/monsters.js
(no functions — sets CONFIG.MONSTER_ROSTER, MONSTER_BANDS, BOSS_DEFS, elite, xpKill, spawnSafetyRadius, monster/boss scaling)

### js/content/items.js
(no functions — sets CONFIG-independent registries: TIERS, SLOT_DEFS, itemDefs, potionDefs)

### js/content/biomes.js
(no functions — sets CONFIG.WARDS, CONFIG.BIOMES)

### js/content/traits.js
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
genFloor, openChest

### js/traits.js (logic)
XP_CURVE, addAbility, addXP, castAbility, hasUnbroken, secondWindHealOverride, traitBuffs, traits

### js/combat.js
collectGold, convertGold, descend, die, endCombat, endRun, enemiesTurn, floorClearBonus, killMonster, killRewards, makeElite, monsterStats, promptStairs, retreat, smashBarrel, startCombat, triggerVictory, tryAct, tryActOnStep, tryRest

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

## Adding content going forward

New monster:  edit js/content/monsters.js (add MONSTER_ROSTER row + a band weight)
New item:     edit js/content/items.js (add one L(...) line)
New biome:    edit js/content/biomes.js (add WARDS entry + BIOMES entry)
New trait:    edit js/content/traits.js (add entry to TRAITS)

None of these touch engine files.
