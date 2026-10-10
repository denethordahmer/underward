window.Delve = window.Delve || {};
Delve.CONFIG = {

 // ---------- ATTRIBUTES ----------
 costGrowth: 1.28,

 ATTRS: {
  con: { name:"Constitution", short:"CON", base:30, perLevel:5, costBase:20, desc:"+5 max HP and +1 max rest heal per level. 3+ levels unlocks Second Wind", kind:"hp" },
  str: { name:"Strength", short:"STR", base:6, perLevel:1, costBase:15, desc:"+1 attack per level. 2+ points also offset heavy armour's speed penalty", kind:"atk" },
  tou: { name:"Toughness", short:"TOU", base:4, perLevel:0.05, costBase:18, cap:0.50, desc:"+5% damage reduction per level (cap 50%). TOU 5 total unlocks Bulwark", kind:"pct" },
  luc: { name:"Luck", short:"LCK", base:1, perLevel:1, costBase:20, desc:"+1% crit, better loot, more gold, shop discount — luck touches everything", kind:"luck" },
  agi: { name:"Agility", short:"AGI", base:1, perLevel:1, costBase:18, desc:"+4% dodge and +0.05 attack speed per point. 3+ levels unlocks First Strike", kind:"agi" },
  eng: { name:"Energy", short:"ENG", base:10, perLevel:1, costBase:55, desc:"Resource pool for combat abilities", kind:"dormant" }
 },
 ATTR_ORDER: ["con","str","tou","luc","agi","eng"],

 secondaries: {
  secondWindUnlock: 3, secondWindTrigger: 0.20, secondWindHeal: 0.30,
  overkillUnlock: 3, overkillHealPct: 0.5,
  bulwarkTotal: 5, bulwarkHitCap: 0.60,
  critPerLuck: 0.01, critCap: 0.50, critMult: 1.5,
  dodgePerAgi: 0.04, dodgeCap: 0.40,
  firstStrikeUnlock: 3, firstStrikeDiv: 2,
  baseInterval: 600,
  speedPerAgi: 0.05
 },

 // ---------- RUN STRUCTURE ----------
 bossEvery: 10,
 healOnDescendPct: 0.5,

 // ---------- REST MECHANIC ----------
 restHealPct: 0.06,
 restMinHeal: 1,
 restPerFloor: 3,
 
 // ---------- ECONOMY (sim-locked shard pacing) ----------
  economy: {
  goldCurveType: "log", goldCurveK: 3.0, goldLuckMult: 0.05,
  healCostA: 30, healCostB: 8,
  tierPrices: [12, 35, 90, 240],
  consumablePrices: { 1:10, 2:20, 3:40 },
  luckDiscountPerPoint: 0.02, maxLuckDiscount: 0.20, goldToShardRate: 10,
  floorClearBonus: 2, floorClearBonusPerFloor: 1, bossShards: 40
 },

 // ---------- GOLD ----------
 goldKillBase: 2, goldKillPerFloor: 0.5, goldBossBase: 80,

 // ---------- BARRELS ----------
 barrel: { goldChance: 0.40, goldMin: 1, goldMax: 3 },

 // ---------- SHOP ----------
 shop: { offset: 5, stockConsumables: 4, stockGear: 1, healPct: 0.5 },

 // ---------- STATUS EFFECTS ----------
 STATUS_EFFECTS: {
  poison: { name:"Poison", perTurn:3, turns:3, stackable:false, appliedBy:"weaponOrConsumable", color:"#a855f7" },
  bleed:  { name:"Bleed",  perTurn:3, turns:2, stackable:true,  appliedBy:"weapon", color:"#ef4444" },
  burn:   { name:"Burn",   perTurn:4, turns:2, stackable:false, appliedBy:"ability", color:"#f97316" },
  weaken: { name:"Weaken", pct:0.30, turns:2, stackable:false, appliedBy:"wraith", color:"#64748b" }
 },

 // ---------- WEAPON ON-HIT STATUS CHANCES (by tier) ----------
 statusChance: {
  poison: { 1:0.10, 2:0.14, 3:0.18, 4:0.22 },
  bleed:  { 1:0.08, 2:0.11, 3:0.14, 4:0.17 },
  burn:   { 1:0.06, 2:0.09, 3:0.12, 4:0.15 }
 },

 // ---------- EQUIPMENT SLOTS ----------
 SLOTS: {
  weapon:  { label:"Weapon",  icon:"⚔", unlock:0 },
  offhand: { label:"Off-hand", icon:"🛡", unlock:80 },
  head:    { label:"Head",    icon:"⛑", unlock:0 },
  body:    { label:"Body",    icon:"🛡", unlock:0 },
  hands:   { label:"Hands",   icon:"🧤", unlock:0 },
  feet:    { label:"Feet",    icon:"👢", unlock:0 },
  cloak:   { label:"Cloak",   icon:"🧣", unlock:0 },
  amulet:  { label:"Amulet",  icon:"📿", unlock:0 },
  ring1:   { label:"Ring",    icon:"💍", unlock:0 },
  ring2:   { label:"Ring II", icon:"💍", unlock:120 }
 },
 SLOT_ORDER: ["weapon","offhand","head","body","hands","feet","cloak","amulet","ring1","ring2"],

 // ---------- ARMOUR WEIGHT (trade-offs) ----------
 WEIGHT: {
  light:  { name:"Light",  speed:0.05, dodge:0.04 },
  medium: { name:"Medium", speed:0.00, dodge:0.00 },
  heavy:  { name:"Heavy",  speed:-0.18, dodge:-0.06 }
 },
 weightMitigation: { strPerPoint:0.01, speedPenaltyFloor:-0.04 },

 // ---------- XP & LEVEL-UPS ----------
 XP_CURVE: [4, 9, 16, 25, 36, 50, 66],
 xpWardStep: 2,
 levelMaxAbilities: 3,
 energyPerKill: 1,
 energyStart: 10,

 // ---------- WEAPON SPEEDS ----------
 WEAPON_SPEEDS: { spear:0.95, sword:1.00, dagger:1.40, axe:0.85, hammer:0.70 },

 // ---------- INVENTORY ----------
 inventorySlots: 16,
 inventoryMax: 24,

 // ---------- LOOT ----------
 loot: {
  baseDrop: 0.22, luckDrop: 0.025, dropCap: 0.45,
  cacheBase: 0.08, cacheLuck: 0.015,
  weights: {
   common: () => 100,
   uncommon: luck => 40 + luck*6,
   rare: (luck, ward) => ward >= 1 ? 5 + luck*3 : 0,
   legendary: (luck, ward) => ward >= 3 ? 1 + luck*0.8 : 0
  }
 }
};
