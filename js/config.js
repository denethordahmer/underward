window.Delve = window.Delve || {};
Delve.CONFIG = {

  // ---------- ATTRIBUTES (economy core) ----------
  costGrowth: 1.28,

  ATTRS: {
    con: { name:"Constitution", short:"CON", base:30, perLevel:5, costBase:50,
           desc:"+5 max HP per level. 3+ levels: Second Wind (auto-heal at low HP)", kind:"hp" },
    str: { name:"Strength",     short:"STR", base:6,  perLevel:1, costBase:40,
           desc:"+1 attack per level. 3+ levels: Overkill (excess damage heals you)", kind:"atk" },
    tou: { name:"Toughness",    short:"TOU", base:4,  perLevel:0.05, costBase:45, cap:0.50,
           desc:"+5% damage reduction per level (cap 50%). TOU 5 total: Bulwark", kind:"pct" },
    luc: { name:"Luck",         short:"LCK", base:1,  perLevel:1, costBase:60,
           desc:"Loot rolls, treasure rooms and +1% crit chance per point", kind:"luck" },
    agi: { name:"Agility",      short:"AGI", base:1,  perLevel:1, costBase:45,
           desc:"+4% dodge per point. 3+ levels: First Strike", kind:"agi" },
    eng: { name:"Energy",       short:"ENG", base:10, perLevel:1, costBase:55,
           desc:"Resource for abilities", kind:"dormant" }
  },
  ATTR_ORDER: ["con","str","tou","luc","agi","eng"],

  secondaries: {
    secondWindUnlock: 3, secondWindTrigger: 0.20, secondWindHeal: 0.30,
    overkillUnlock: 3,  overkillHealPct: 0.5,
    bulwarkTotal: 5,    bulwarkHitCap: 0.60,
    critPerLuck: 0.01,  critCap: 0.50, critMult: 1.5,
    dodgePerAgi: 0.04,  dodgeCap: 0.40,
    firstStrikeUnlock: 3, firstStrikeDiv: 2
  },

  // ---------- RUN STRUCTURE ----------
  bossEvery: 10,
  healOnDescendPct: 0.5,

  // ---------- WARDS (data; Ward 2 onward is appended here) ----------
  WARDS: [
    {
      id:1, name:"Upper Ruins", floors:[1,10],
      biome:0,
      roomMin:8, roomMax:10,
      roomWMin:4, roomWMax:12, roomHMin:4, roomHMax:12,
      roomMaxDuplicateSize:2,
      dungeonSize:30,
      bossArenaPadding:2,
      treasureChanceBase:0.10,
      treasureChanceLuck:0.015,
      treasureChanceCap:0.35
    }
  ],

  BIOMES: [
    { name:"Upper Ruins",
      wall:"#192129", wallEdge:"#4d5b67", wallBrick:"#10161d",
      floor:"#2e3842", floor2:"#283039", moss:"#3f6d55",
      water:"#1e3a4a", torch:"#ffb347", light:"rgba(70,140,255,0.06)" },
    { name:"Sunken Halls",
      wall:"#13261f", wallEdge:"#2f5c4a", wallBrick:"#0c1814",
      floor:"#254034", floor2:"#1f3730", moss:"#4f9a67",
      water:"#1a344c", torch:"#5ad8c3", light:"rgba(64,190,150,0.07)" }
  ],

  // ---------- MONSTER ROSTER (data rows; scaling included) ----------
  MONSTER_ROSTER: {
    rat:    { name:"Rotten Rat",  hp:3,  hpPerFloor:0.4,  atk:2, atkPerFloor:0.3, xp:1, gold:1, shards:1, kind:"rat" },
    slime:  { name:"Slime",       hp:12, hpPerFloor:1.2,  atk:1, atkPerFloor:0.2, xp:2, gold:2, shards:2, kind:"slime" },
    goblin: { name:"Goblin",      hp:5,  hpPerFloor:1.5,  atk:3, atkPerFloor:0.5, xp:3, gold:3, shards:3, kind:"goblin" },
    brute:  { name:"Brute",       hp:14, hpPerFloor:2.5,  atk:6, atkPerFloor:0.7, xp:5, gold:5, shards:5, kind:"brute" },
    wraith: { name:"Wraith",      hp:10, hpPerFloor:2.0,  atk:4, atkPerFloor:0.6, xp:6, gold:6, shards:6, kind:"wraith" }
  },

  MONSTER_BANDS: [
    { floors:[1,2],  boss:false, countMin:4,  countMax:6,  weights:{ rat:50,    slime:50 } },
    { floors:[3,4],  boss:false, countMin:6,  countMax:8,  weights:{ rat:30,    slime:35, goblin:35 } },
    { floors:[5,6],  boss:false, countMin:7,  countMax:9,  weights:{ rat:15,    slime:25, goblin:40, brute:20 } },
    { floors:[7,9],  boss:false, countMin:9,  countMax:11, weights:{ rat:10,    slime:15, goblin:30, brute:25, wraith:20 } },
    { floors:[10,999], boss:true, countMin:4, countMax:4,  weights:{ goblin:100 } }
  ],

  // spawn placement
  spawnSafetyRadius: 4,
  monsterFloatPrecision: 0,

  // ---------- BOSS (floor 10 legacy numbers retained) ----------
  monsterHpBase: 5, monsterHpPerFloor: 1.5,
  monsterAtkBase: 1, monsterAtkPerFloor: 0.5,
  monsterShardBase: 2, monsterShardPerFloor: 0.5,
  bossHpBase: 30, bossHpPerFloor: 9,
  bossAtkBase: 2, bossAtkPerFloor: 0.4,
  bossShardBase: 40, bossShardPerFloor: 20,

  // ---------- GOLD ----------
  goldKillBase: 2,
  goldKillPerFloor: 0.5,
  goldBossBase: 60,
  goldLuckMult: 0.05,

  // ---------- XP & LEVEL-UPS (tapering; ~6-8 by floor 10) ----------
  XP_CURVE: [4, 9, 16, 25, 36, 50, 66],
  xpWardStep: 2,
  xpKill: {
    rat:1, slime:2, goblin:3, brute:5, wraith:6, boss:25
  },
  levelMaxAbilities: 3,
  energyPerKill: 1,
  energyStart: 10,

  // ---------- TRAITS ----------
  TRAITS: {
    passives: [
      { id:"sharpened_edge", name:"Sharpened Edge", rarity:"common", desc:"+2 ATK", effects:{ atk:2 } },
      { id:"thick_hide",     name:"Thick Hide",     rarity:"common", desc:"+6 max HP", effects:{ maxHp:6 } },
      { id:"light_feet",     name:"Light Feet",     rarity:"common", desc:"+8% dodge", effects:{ dodge:0.08 } },
      { id:"fortunes_nod",   name:"Fortune's Nod",  rarity:"common", desc:"+1 Luck", effects:{ luck:1 } },
      { id:"coin_pusher",    name:"Coin Pusher",    rarity:"common", desc:"+15% gold", effects:{ goldMult:0.15 } },
      { id:"studied_reflexes", name:"Studied Reflexes", rarity:"uncommon", desc:"+10% crit chance", effects:{ crit:0.10 } },
      { id:"brute_force",    name:"Brute Force",    rarity:"uncommon", desc:"+3 damage vs bosses", effects:{ bossAtk:3 } },
      { id:"field_dressing", name:"Field Dressing", rarity:"uncommon", desc:"Heal 4 HP per floor cleared", effects:{ healPerFloor:4 } },
      { id:"bulwark_plate",  name:"Bulwark Plate",  rarity:"uncommon", desc:"+2 flat damage reduction", effects:{ flatRed:2 } },
      { id:"bloodthirst",    name:"Bloodthirst",    rarity:"rare", desc:"Heal 2 HP per kill", effects:{ healOnKill:2 } },
      { id:"ember_blood",    name:"Ember Blood",    rarity:"rare", desc:"+2 Energy per kill", effects:{ extraEnergyPerKill:2 } },
      { id:"evasive",        name:"Evasive",        rarity:"uncommon", desc:"+3% dodge and +1 AGI", effects:{ dodge:0.03, agi:1 } },
      { id:"hardened_bones", name:"Hardened Bones", rarity:"rare", desc:"+4 max HP and +1 TOU", effects:{ maxHp:4, tou:1 } },
      { id:"deep_sight",     name:"Deep Sight",     rarity:"rare", desc:"+8% drop chance", effects:{ dropBonus:0.08 } }
    ],

    uniques: [
      { id:"vampiric_strike", name:"Vampiric Strike", desc:"Crits heal for half the damage dealt", unique:true, effects:{ vampiric:true } },
      { id:"wardens_oath",   name:"Warden's Oath",   desc:"Second Wind heals 50% instead of 30%", unique:true, effects:{ secondWindHealOverride:0.50 } },
      { id:"unbroken",       name:"Unbroken",        desc:"Survive one killing blow at 1 HP, once per run", unique:true, effects:{ unbroken:true } },
      { id:"deep_pockets",   name:"Deep Pockets",    desc:"+50% gold for the rest of the run", unique:true, effects:{ goldMult:0.50 } }
    ],

    abilities: [
      { id:"cleave",       name:"Cleave",       cost:4, target:"adjacent",  desc:"Hit the target and every enemy adjacent to it" },
      { id:"lunge",        name:"Lunge",        cost:5, target:"line4",     desc:"Dash in a straight line up to 4 tiles and strike" },
      { id:"stone_skin",   name:"Stone Skin",   cost:6, target:"self",      desc:"Take 60% less damage for 2 turns" },
      { id:"cinderbolt",   name:"Cinderbolt",   cost:4, target:"range5",    desc:"10 damage, ignores armour, no retaliation" },
      { id:"rally",        name:"Rally",        cost:7, target:"self",      desc:"Heal 35% max HP and cure bleed/drain" },
      { id:"blink",        name:"Blink",        cost:5, target:"teleport4", desc:"Teleport to a visible empty tile within 4" },
      { id:"whirlwind",    name:"Whirlwind",    cost:8, target:"self",      desc:"Strike every adjacent enemy at once" }
    ]
  },

  // ---------- INVENTORY (final) ----------
  inventorySlots: 16,

  // ---------- LOOT (luck engine) ----------
  loot: {
    baseDrop: 0.08, luckDrop: 0.015, dropCap: 0.25,
    cacheBase: 0.015, cacheLuck: 0.005,
    weights: {
      common: () => 100,
      uncommon: luck => 40 + luck*6,
      rare: (luck, ward) => ward >= 2 ? 10 + luck*3 : 0,
      legendary: (luck, ward) => ward >= 3 ? 1 + luck*0.8 : 0
    }
  }
};
