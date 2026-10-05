window.Delve = window.Delve || {};
Delve.CONFIG = {

  // ---------- ATTRIBUTES (economy core — sim-validated) ----------
  costGrowth: 1.28,

  ATTRS: {
    con: { name:"Constitution", short:"CON", base:30, perLevel:5, costBase:50,
           desc:"+5 max HP per level. 3+ levels: Second Wind (auto-heal at low HP)", kind:"hp" },
    str: { name:"Strength",     short:"STR", base:6,  perLevel:1, costBase:40,
           desc:"+1 attack per level. 3+ levels: Overkill (excess damage heals you)", kind:"atk" },
    tou: { name:"Toughness",    short:"TOU", base:4,  perLevel:0.05, costBase:45, cap:0.50,
           desc:"+5% damage reduction per level (cap 50%). TOU 5 total: Bulwark (hits capped at 60% max HP)", kind:"pct" },
    luc: { name:"Luck",         short:"LCK", base:1,  perLevel:1, costBase:60,
           desc:"Loot rolls (future) and +1% crit chance per point", kind:"luck" },
    agi: { name:"Agility",      short:"AGI", base:1,  perLevel:1, costBase:45,
           desc:"+4% dodge per point. 3+ levels: First Strike bonus vs unalerted enemies", kind:"agi" },
    eng: { name:"Energy",       short:"ENG", base:10, perLevel:1, costBase:55,
           desc:"Resource for skills (not built yet)", kind:"dormant" }
  },
  ATTR_ORDER: ["con","str","tou","luc","agi","eng"],

  // secondary effects tuning
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

  // ---------- MONSTERS (sim-validated) ----------
  monsterHpBase: 5, monsterHpPerFloor: 1.5,
  monsterAtkBase: 1, monsterAtkPerFloor: 0.5,
  monsterShardBase: 2, monsterShardPerFloor: 0.5,

  // ---------- BOSS (floor 10: 120 HP, 6 ATK, 240 shards — sim-validated) ----------
  bossHpBase: 30, bossHpPerFloor: 9,
  bossAtkBase: 2, bossAtkPerFloor: 0.4,
  bossShardBase: 40, bossShardPerFloor: 20,

  // ---------- LOOT (Luck engine — sim-validated, inert until items.js) ----------
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
