window.Delve = window.Delve || {};
Delve.CONFIG = {

 // ---------- ATTRIBUTES ----------
 costGrowth: 1.28,

 ATTRS: {
 con: { name:"Constitution", short:"CON", base:30, perLevel:5, costBase:20,
 desc:"+5 max HP per level. 3+ levels unlocks Second Wind (auto-heal at low HP)" , kind:"hp" },
 str: { name:"Strength", short:"STR", base:6, perLevel:1, costBase:15,
 desc:"+1 attack per level. 3+ levels unlocks Overkill (excess damage heals you)", kind:"atk" },
 tou: { name:"Toughness", short:"TOU", base:4, perLevel:0.05, costBase:18, cap:0.50,
 desc:"+5% damage reduction per level (cap 50%). TOU 5 total unlocks Bulwark", kind:"pct" },
 luc: { name:"Luck", short:"LCK", base:1, perLevel:1, costBase:20,
 desc:"+1% crit, better loot tier and drop rates, gold bonuses, shop discount — luck touches everything", kind:"luck" },
 agi: { name:"Agility", short:"AGI", base:1, perLevel:1, costBase:18,
 desc:"+4% dodge and +0.05 attack speed per point. 3+ levels unlocks First Strike", kind:"agi" },
 eng: { name:"Energy", short:"ENG", base:10, perLevel:1, costBase:55,
 desc:"Resource pool for combat abilities", kind:"dormant" }
 },
 ATTR_ORDER: ["con","str","tou","luc","agi","eng"],

 secondaries: {
 secondWindUnlock: 3, secondWindTrigger: 0.20, secondWindHeal: 0.30,
 overkillUnlock: 3, overkillHealPct: 0.5,
 bulwarkTotal: 5, bulwarkHitCap: 0.60,
 critPerLuck: 0.01, critCap: 0.50, critMult: 1.5,
 dodgePerAgi: 0.04, dodgeCap: 0.40,
 firstStrikeUnlock: 3, firstStrikeDiv: 2,
 baseInterval: 600,   // ms between player hits at speed 1.0
 speedPerAgi: 0.05
 },

 // ---------- RUN STRUCTURE ----------
 bossEvery: 10,
 healOnDescendPct: 0.5,

 // ---------- REST MECHANIC (scales with max HP) ----------
 restHealPct: 0.06,
 restMinHeal: 1,
 restPerFloor: 3,

 // ---------- WARDS ----------
 WARDS: [
 {
 id:1, name:"Upper Ruins", floors:[1,10],
 biome:0,
 roomMin:8, roomMax:11,
 roomWMin:4, roomWMax:12, roomHMin:4, roomHMax:12,
 roomMaxDuplicateSize:2,
 roomSplitArea:80,
 dungeonSize:34,
 bossArenaPadding:2,
 treasureChanceBase:0.14,
 treasureChanceLuck:0.018,
 treasureChanceCap:0.45,
 secretRoomChanceBase: 0.20,
 secretRoomChanceLuck: 0.04,
 secretRoomChanceCap: 0.70
 }
 ],

 BIOMES: [
 { name:"Upper Ruins",
 wall:"#64707c", wallEdge:"#8d99a6", wallBrick:"#3a4248",
 mortar:"#0b0f14",
 floor:"#2e3842", floor2:"#283039", moss:"#3f6d55",
 water:"#1e3a4a", torch:"#ffb347", light:"rgba(70,140,255,0.06)" },
 { name:"Sunken Halls",
 wall:"#13261f", wallEdge:"#2f5c4a", wallBrick:"#0c1814",
 mortar:"#08100c",
 floor:"#254034", floor2:"#1f3730", moss:"#4f9a67",
 water:"#1a344c", torch:"#5ad8c3", light:"rgba(64,190,150,0.07)" }
 ],

 // ---------- MONSTER ROSTER (sim-rebalanced) ----------
 MONSTER_ROSTER: {
 rat: { name:"Rotten Rat", hp:8, hpPerFloor:1.2, atk:2, atkPerFloor:0.4, xp:1, gold:1, shards:1, kind:"rat", speed:1.5 },
 slime: { name:"Slime", hp:18, hpPerFloor:2.0, atk:2, atkPerFloor:0.3, xp:2, gold:2, shards:2, kind:"slime", speed:0.7 },
 goblin: { name:"Goblin", hp:12, hpPerFloor:2.5, atk:4, atkPerFloor:0.6, xp:3, gold:3, shards:3, kind:"goblin", speed:1.0 },
 brute: { name:"Brute", hp:18, hpPerFloor:4.0, atk:7, atkPerFloor:0.8, xp:5, gold:5, shards:5, kind:"brute", speed:0.75 },
 wraith: { name:"Wraith", hp:16, hpPerFloor:3.0, atk:4, atkPerFloor:0.7, xp:6, gold:6, shards:6, kind:"wraith", speed:1.2 }
 },

 MONSTER_BANDS: [
 { floors:[1,2], boss:false, countMin:10, countMax:14, weights:{ rat:60, slime:40 } },
 { floors:[3,4], boss:false, countMin:10, countMax:14, weights:{ rat:35, slime:35, goblin:30 } },
 { floors:[5,6], boss:false, countMin:10, countMax:14, weights:{ rat:15, slime:25, goblin:40, brute:20 } },
 { floors:[7,9], boss:false, countMin:10, countMax:14, weights:{ rat:8, slime:15, goblin:30, brute:25, wraith:22 } },
 { floors:[10,10], boss:true, countMin:4, countMax:4, weights:{ goblin:100 } },
 // Post-ward fallback (plugs into Ward 2 later)
 { floors:[11,999], boss:false, countMin:10, countMax:14, weights:{ rat:5, slime:12, goblin:28, brute:28, wraith:27 } }
 ],

 spawnSafetyRadius: 4,

 // ---------- BOSS ----------
 monsterHpBase: 5, monsterHpPerFloor: 1.5,
 monsterAtkBase: 1, monsterAtkPerFloor: 0.5,
 monsterShardBase: 2, monsterShardPerFloor:0.5,
 bossHpBase: 100, bossHpPerFloor: 0,   // The Warden: flat 100
 bossAtkBase: 9, bossAtkPerFloor: 0,
 bossShardBase: 60, bossShardPerFloor: 0,
 bossSpeed: 0.65,

 BOSS_DEFS: {
 1: {
 name: "The Warden",
 title: "Guardian of the Undercroft",
 flavour:"He has watched these stones since before your grandfather was born.\nHe will not step aside.",
 hp: 100,
 atk: 9,
 speed: 0.65,
 chainHitEvery: 3   // every 3rd hit deals double damage
 }
 },

 // ---------- ECONOMY (sim-calibrated) ----------
 economy: {
 goldCurveType: "log",     // gold added per kill = K × ln(floor+1)
 goldCurveK: 3.0,
 goldLuckMult: 0.05,       // +5% gold per Luck point
 healCostA: 30,            // shop heal = 30 + 8×ln(floor+1)
 healCostB: 8,
 tierPrices: [12, 35, 90, 240],      // T1..T4 gear (rarity-locked)
 consumablePrices: { 1:10, 2:20, 3:40 },
 luckDiscountPerPoint: 0.02,         // shop discount per Luck
 maxLuckDiscount: 0.20,
 goldToShardRate: 10                // successful run converts gold→shards at 10:1
 },

 // ---------- GOLD ----------
 goldKillBase: 2,
 goldKillPerFloor: 0.5,
 goldBossBase: 80,

 // ---------- BARRELS ----------
 barrel: {
 goldChance: 0.40,
 goldMin: 1,
 goldMax: 3
 },

 // ---------- SHOP ----------
 shop: {
 offset: 5,        // appears on floors where floor % 10 === offset (5, 15, 25...)
 stockConsumables: 4,
 stockGear: 1,
 healPct: 0.5      // heal service restores 50% max HP
 },

 // ---------- ELITES ----------
 elite: {
 chance: 0.10,          // 10% one elite per normal floor
 minFloor: 3,
 maxFloor: 9,
 hpMult: 1.6,
 atkMult: 1.3,
 rewardMult: 3,
 guaranteedPotion: true,
 glow: "#ffd75e"
 },

 // ---------- STATUS EFFECTS ----------
 STATUS_EFFECTS: {
 poison: { name:"Poison", perTurn:3, turns:3, stackable:false, appliedBy:"consumable", color:"#a855f7" },
 bleed:  { name:"Bleed",  perTurn:3, turns:2, stackable:true,  appliedBy:"consumable", color:"#ef4444" },
 burn:   { name:"Burn",   perTurn:4, turns:2, stackable:false, appliedBy:"ability",   color:"#f97316" },
 weaken: { name:"Weaken", pct:0.30, turns:2, stackable:false, appliedBy:"wraith",    color:"#64748b" }
 },

 // ---------- XP & LEVEL-UPS ----------
 XP_CURVE: [4, 9, 16, 25, 36, 50, 66],
 xpWardStep: 2,
 xpKill: { rat:1, slime:2, goblin:3, brute:5, wraith:6, boss:30 },
 levelMaxAbilities:3,
 energyPerKill: 1,
 energyStart: 10,

 // ---------- WEAPON SPEEDS ----------
 WEAPON_SPEEDS: {
 spear: 0.95,
 sword: 1.00,
 dagger: 1.40,
 axe: 0.85,
 hammer: 0.70
 },

 // ---------- TRAITS ----------
 TRAITS: {
 passives: [
 { id:"sharpened_edge", name:"Sharpened Edge", rarity:"common", desc:"+2 ATK", effects:{ atk:2 } },
 { id:"thick_hide", name:"Thick Hide", rarity:"common", desc:"+6 max HP", effects:{ maxHp:6 } },
 { id:"light_feet", name:"Light Feet", rarity:"common", desc:"+8% dodge", effects:{ dodge:0.08 } },
 { id:"fortunes_nod", name:"Fortune's Nod", rarity:"common", desc:"+1 Luck", effects:{ luck:1 } },
 { id:"coin_pusher", name:"Coin Pusher", rarity:"common", desc:"+15% gold", effects:{ goldMult:0.15 } },
 { id:"studied_reflexes", name:"Studied Reflexes", rarity:"uncommon", desc:"+10% crit chance", effects:{ crit:0.10 } },
 { id:"brute_force", name:"Brute Force", rarity:"uncommon", desc:"+3 damage vs bosses", effects:{ bossAtk:3 } },
 { id:"field_dressing", name:"Field Dressing", rarity:"uncommon", desc:"Heal 4 HP per floor cleared", effects:{ healPerFloor:4 } },
 { id:"bulwark_plate", name:"Bulwark Plate", rarity:"uncommon", desc:"+2 flat damage reduction", effects:{ flatRed:2 } },
 { id:"bloodthirst", name:"Bloodthirst", rarity:"rare", desc:"Heal 2 HP per kill", effects:{ healOnKill:2 } },
 { id:"ember_blood", name:"Ember Blood", rarity:"rare", desc:"+2 Energy per kill", effects:{ extraEnergyPerKill:2 } },
 { id:"evasive", name:"Evasive", rarity:"uncommon", desc:"+3% dodge and +1 AGI", effects:{ dodge:0.03, agi:1 } },
 { id:"hardened_bones", name:"Hardened Bones", rarity:"rare", desc:"+4 max HP and +1 TOU", effects:{ maxHp:4, tou:1 } },
 { id:"deep_sight", name:"Deep Sight", rarity:"rare", desc:"+8% drop chance", effects:{ dropBonus:0.08 } },
 { id:"swift_hands", name:"Swift Hands", rarity:"uncommon", desc:"+0.15 attack speed", effects:{ speedBonus:0.15 } },
 { id:"iron_will", name:"Iron Will", rarity:"rare", desc:"Survive one killing blow at 1 HP", effects:{ unbroken:true } }
 ],

 uniques: [
 { id:"vampiric_strike", name:"Vampiric Strike", desc:"Crits heal for half damage dealt", unique:true, effects:{ vampiric:true } },
 { id:"wardens_oath", name:"Warden's Oath", desc:"Second Wind heals 50% instead of 30%", unique:true, effects:{ secondWindHealOverride:0.50 } },
 { id:"unbroken", name:"Unbroken", desc:"Survive one killing blow at 1 HP, once", unique:true, effects:{ unbroken:true } },
 { id:"deep_pockets", name:"Deep Pockets", desc:"+50% gold for the rest of the run", unique:true, effects:{ goldMult:0.50 } }
 ],

 abilities: [
 { id:"cleave", name:"Cleave", cost:4, target:"adjacent", desc:"Hit target and every enemy adjacent to it" },
 { id:"lunge", name:"Lunge", cost:5, target:"line4", desc:"Dash in a straight line up to 4 tiles and strike" },
 { id:"stone_skin", name:"Stone Skin", cost:6, target:"self", desc:"Take 60% less damage for 2 turns" },
 { id:"cinderbolt", name:"Cinderbolt", cost:4, target:"range5", desc:"10 damage, ignores armour, no retaliation, applies Burn" },
 { id:"rally", name:"Rally", cost:7, target:"self", desc:"Heal 35% max HP and clear bleed" },
 { id:"blink", name:"Blink", cost:5, target:"teleport4", desc:"Teleport to a visible empty tile within 4" },
 { id:"whirlwind", name:"Whirlwind", cost:8, target:"self", desc:"Strike every adjacent enemy at once" }
 ]
 },

 // ---------- INVENTORY ----------
 inventorySlots: 16,

 // ---------- LOOT ----------
 loot: {
 baseDrop: 0.22, luckDrop: 0.025, dropCap: 0.45,
 cacheBase: 0.08, cacheLuck:0.015,
 weights: {
 common: () => 100,
 uncommon: luck => 40 + luck*6,
 rare: (luck, ward) => ward >= 1 ? 5 + luck*3 : 0,
 legendary: (luck, ward) => ward >= 3 ? 1 + luck*0.8 : 0
 }
 }
};
