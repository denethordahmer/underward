# underward — Structure Reference

Generated from test.html's ownership registry. Regenerate after any file change.

## Load order (index.html — 25 files)

 1. js/config.js                  — pure config/mechanics data
 2. js/content/con-monsters.js    — monster data
 3. js/content/con-items.js       — item catalogue data
 4. js/content/con-biomes.js      — wards + biome visual data
 5. js/content/con-traits.js      — trait/ability data
 6. js/content/con-progression.js — progression tree data
 7. js/save.js
 8. js/attrs.js
 9. js/items.js                   — item logic (no catalogue)
10. js/sprites.js
11. js/content/con-bosssprites.js — boss sprite builders (needs #10 _spriteUtils)
12. js/state.js
13. js/levels.js
14. js/traits.js                  — trait/ability logic
15. js/combat.js
16. js/effects.js
17. js/sfx.js
18. js/log.js
19. js/render.js
20. js/pathfind.js
21. js/input.js
22. js/ui.js                      — ⚠ shop wrapper redefines tryAct (Tier 4 debt)
23. js/progression.js
24. js/main.js
25. js/onboarding.js              — ⚠ wraps showHub (Tier 4 debt)

Content block (2–6) order-independent within itself; must precede readers.

---

## Content vs Engine

CONTENT (pure data, no logic — append-only, plug-and-play):
- js/content/con-monsters.js   → CONFIG.MONSTER_ROSTER, MONSTER_BANDS, BOSS_DEFS, elite,
                                  xpKill, spawnSafetyRadius, monster/boss scaling constants
- js/content/con-items.js      → Delve.TIERS, SLOT_DEFS, itemDefs, potionDefs
                                  (deliberate deviation: writes to Delve.* not CONFIG)
- js/content/con-biomes.js     → CONFIG.WARDS (gen tuning), CONFIG.BIOMES (palettes)
- js/content/con-traits.js     → CONFIG.TRAITS
- js/content/con-progression.js→ CONFIG.PROGRESSION (TREES + NODES)
- js/content/con-bosssprites.js→ registers boss sprite builders via Delve.registerBossSprite()

ENGINE (logic — change only by targeted patch):
all remaining files.

Rule: content files WRITE into Delve.CONFIG / registries.
      Engine files READ from them.
      Engine files never redefine another file's function.

---

## Biomes

Ward 1 — "Upper Ruins" / The Undercroft (floors 1–10)
  Boss floor: 10 — The Warden
  Palette: dark grey-blue stone, damp, overgrown
  Sprite key: boss_warden

Ward 2 — "The Blackvein" / Corrupted Forest (floors 11–20)
  Boss floor: 20 — The Thorn Sovereign (or similar — name TBC)
  Palette: dark greens, blacks, sickly yellows, deep purples
  Sprite key: boss_thorn
  Enemies: Thornlings, Corrupted Treants, Vine Stalkers, Spore Swarms
  Biome 1 enemies phase out on floors 11–12 as Biome 2 phases in

After floor 10 boss: player chooses Leave (small shard bonus) or Continue to Biome 2.
After floor 20 boss: run ends.

---

## Hooks system

Delve._hooks = { hubLoaded:[], runStart:[] }

- js/state.js    → newRun() fires Delve._hooks.runStart
- js/ui.js       → refreshHub() fires Delve._hooks.hubLoaded
- js/progression.js → registers injectRunStart into runStart,
                       renderTabs/renderPanels into hubLoaded

No file redefines another file's function via hooks.

---

## Function ownership (full registry)

Key                      | Defined in
-------------------------|---------------------------
CONFIG                   | js/config.js
G                        | js/state.js
H                        | js/main.js
SLOT_DEFS                | js/content/con-items.js
SPR                      | js/sprites.js
T                        | js/state.js
TIERS                    | js/content/con-items.js
W                        | js/main.js
XP_CURVE                 | js/traits.js
_applyBossBonus          | js/combat.js
applyBossBonus           | js/combat.js  (alias — same fn)
_bossSpriteBuilders      | js/sprites.js
_hooks                   | js/progression.js
_spriteUtils             | js/sprites.js
addAbility               | js/traits.js
addFloater               | js/render.js
addShake                 | js/render.js
addXP                    | js/traits.js
agiPts                   | js/attrs.js
applyEffect              | js/effects.js
applyPlayerEffect        | js/effects.js
atk                      | js/attrs.js
attrCost                 | js/attrs.js
attrLevel                | js/attrs.js
attrLvl                  | js/attrs.js
attrValue                | js/attrs.js
baseAtk                  | js/attrs.js
baseLuck                 | js/attrs.js
baseMaxHp                | js/attrs.js
bossBonus                | js/attrs.js
buildHub                 | js/ui.js
buildShop                | js/ui.js
camX                     | js/main.js
camY                     | js/main.js
canvas                   | js/main.js
castAbility              | js/traits.js
clamp                    | js/state.js
clearLog                 | js/log.js
collectGold              | js/combat.js
computeView              | js/main.js
convertGold              | js/combat.js
createDefaultSave        | js/save.js
crit                     | js/attrs.js
ctx                      | js/main.js
descend                  | js/combat.js
die                      | js/combat.js
dmgRed                   | js/attrs.js
dodge                    | js/attrs.js
draw                     | js/render.js
dropChance               | js/attrs.js
dropPotion               | js/items.js
endCombat                | js/combat.js
endRun                   | js/combat.js
enemiesTurn              | js/combat.js
equipArmour              | js/items.js
equipItem                | js/items.js
equipSlots               | js/ui.js
equipWeapon              | js/items.js
findPath                 | js/pathfind.js
firstStrikeBonus         | js/attrs.js
flash                    | js/state.js
flatRed                  | js/attrs.js
floorClearBonus          | js/combat.js
flushLogWindow           | js/log.js
genFloor                 | js/levels.js
getMonsterBand           | js/state.js
getWard                  | js/state.js
goldMult                 | js/attrs.js
hasBulwark               | js/attrs.js
hasOverkill              | js/attrs.js
hasProgression           | js/progression.js
hasSecondWind            | js/attrs.js
hasUnbroken              | js/traits.js
healCost                 | js/state.js
hideHub                  | js/ui.js
hideIntro                | js/onboarding.js
hitCap                   | js/attrs.js
initDebug                | js/ui.js
injectHubAbilities       | js/traits.js
inventoryCap             | js/items.js
isShopFloor              | js/state.js
isSlotUnlocked           | js/ui.js
itemBuffs                | js/items.js
itemDefs                 | js/content/con-items.js
itemPrice                | js/items.js
itemStatLines            | js/items.js
itemsByTier              | js/items.js
killMonster              | js/combat.js
killRewards              | js/combat.js
loadSave                 | js/save.js
log                      | js/log.js
logConsumable            | js/log.js
logDeath                 | js/log.js
logDodge                 | js/log.js
logEnemyAtk              | js/log.js
logEquip                 | js/log.js
logFloor                 | js/log.js
logHeal                  | js/log.js
logKill                  | js/log.js
logPickup                | js/log.js
logPlayerAtk             | js/log.js
logSecondWind            | js/log.js
logSystem                | js/log.js
logTrait                 | js/log.js
logXP                    | js/log.js
luckDiscount             | js/attrs.js
luckPts                  | js/attrs.js
makeElite                | js/combat.js
makeItem                 | js/items.js
markRunTrait             | js/progression.js
markVisited              | js/ui.js
maxHp                    | js/attrs.js
mdist                    | js/state.js
monsterStats             | js/combat.js
newRun                   | js/state.js
openChest                | js/levels.js
openInventory            | js/ui.js
openShop                 | js/ui.js
persist                  | js/save.js
pickWeighted             | js/state.js
pickupItem               | js/items.js
playerSpeed              | js/items.js
playerWeakened           | js/effects.js
potionDefs               | js/content/con-items.js
promptStairs             | js/combat.js
rebuildSprites           | js/sprites.js
recordStat               | js/state.js
refreshHub               | js/ui.js
registerBossSprite       | js/sprites.js
renderAbilityBar         | js/ui.js
renderMinimap            | js/ui.js
resetSave                | js/save.js
resize                   | js/main.js
retreat                  | js/combat.js
rng                      | js/state.js
rngF                     | js/state.js
rollKillDrop             | js/items.js
rollTier                 | js/items.js
save                     | js/save.js  (alias for persist)
secondWindHealOverride   | js/traits.js
sfx                      | js/sfx.js
sfxGetVolume             | js/sfx.js
sfxMuted                 | js/sfx.js
sfxSetVolume             | js/sfx.js
sfxToggleMute            | js/sfx.js
showBossIntro            | js/ui.js
showEndScreen            | js/ui.js
showFloorCard            | js/ui.js
showHub                  | js/ui.js
showIntro                | js/onboarding.js
showItemCard             | js/ui.js
showStairsPrompt         | js/ui.js
showVictory              | js/ui.js
smashBarrel              | js/combat.js
stampProvenance          | js/items.js
startCombat              | js/combat.js
startRun                 | js/ui.js
statusColor              | js/effects.js
stepPath                 | js/pathfind.js
strPts                   | js/attrs.js
tickMonsterEffects       | js/effects.js
tickPlayerEffects        | js/effects.js
touPts                   | js/attrs.js
traitBuffs               | js/traits.js
traitHealPerFloor        | js/attrs.js
traits                   | js/traits.js
triggerVictory           | js/combat.js
tryAct                   | js/combat.js
tryActOnStep             | js/combat.js
tryRest                  | js/combat.js
ts                       | js/main.js
uiBlocked                | js/input.js
unequipItem              | js/items.js
updateHUD                | js/ui.js
useConsumable            | js/items.js
viewH                    | js/main.js
viewW                    | js/main.js
wardOf                   | js/items.js
weaponStatus             | js/items.js

---

## Adding content going forward

New monster:    edit js/content/con-monsters.js  (add MONSTER_ROSTER row + band weight)
New item:       edit js/content/con-items.js      (add one entry to itemDefs)
New biome:      edit js/content/con-biomes.js     (add WARDS entry + BIOMES palette entry)
New trait:      edit js/content/con-traits.js     (add entry to TRAITS)
New tree node:  edit js/content/con-progression.js (add node to NODES)
New boss:       edit js/content/con-monsters.js   (BOSS_DEFS entry)
              + edit js/content/con-bosssprites.js (registerBossSprite call)
New ward:       con-biomes.js + con-monsters.js band entry
                — zero engine file edits required if ward follows existing pattern

None of these require touching engine files.

---

## Known Tier 2–4 debt (non-breaking, future cleanup)

Tier 2 — content splits pending:
  - Ability numbers still hardcoded in traits.js (Lunge +4, Cinderbolt 10 etc)
    → move to con-traits.js data block (makes balance table-driven)
  - con-bosssprites.js candidate for renaming to match con-* convention fully

Tier 3 — logic patches pending:
  - traits.js: read save.abilityRanks, save.abilities (hub purchases enter runs),
    save.nodes modifiers; call markRunTrait in applyTrait (fixes Cleave III chain)
  - items.js: useConsumable — implement reveal/revealFloor/escape/floorHeal gates
  - combat.js: skipNext delete-or-implement; chain-hit defence policy
  - ui.js: victoryContinue → route through descend(); delete openInventory stub + dibb1
  - log.js: logXP confirmed present (added v3.1)
  - levels.js: boss-arena guard exclusion; swarm-elite intent confirmation

Tier 4 — pattern debt:
  - tryAct wrapper in ui.js → convert to hooks
  - showHub wrap in onboarding.js → convert to hooks
  - CONFIG.SLOTS vs Delve.SLOT_DEFS unification (pick one home)
  - Loot weight functions + ward gates out of config.js

---

## Known bugs fixed (v3.1 + current session)

  #37  save.js         — whitelist now includes nodes/inventoryCap/abilities/
                         abilityRanks/runTraits/runTraitsSeen; purchases persist
  #1   attrs.js        — strPts() added
  #18  attrs.js        — duplicate attrCost removed
  #27  con-monsters.js — sprite keys added to BOSS_DEFS
  #30  con-monsters.js — accent colours added to BOSS_DEFS
  #35  render.js       — drawMob uses m.maxHp not phantom Delve.bossHp()
  wraith migration     — onHitEffect:"weaken" in con-monsters.js
  levels.js            — duplicate corrupted block removed (syntax error)
  combat.js            — applyBossBonus exposed as public alias
  save.js              — Delve.save exposed as function alias for persist
  input.js             — uiBlocked exposed as Delve.uiBlocked
  ui.js                — hideAll() now includes introOverlay + pauseMenu;
                         startRun() calls hideIntro() before hideAll()
                         (fixes: tapping did nothing after first run started)
