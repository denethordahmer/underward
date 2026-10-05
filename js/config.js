window.Delve = window.Delve || {};
Delve.CONFIG = {
  // ---- Player baseline ----
  baseMaxHp: 30,
  baseAtk: 5,
  hpPerLevel: 5,
  atkPerLevel: 1,

  // ---- Tuned upgrade economy ----
  // Higher base stops Run-1 snowball; 1.28 growth stops late-game wall
  hpBaseCost: 50,
  atkBaseCost: 40,
  costGrowth: 1.28,

  // ---- Run structure ----
  bossEvery: 10,
  healOnDescendPct: 0.50,

  // ---- Normal monsters (scale with floor) ----
  monsterHpBase: 5,
  monsterHpPerFloor: 1.5,
  monsterAtkBase: 1,
  monsterAtkPerFloor: 0.5,
  monsterShardBase: 2,
  monsterShardPerFloor: 0.5,

  // ---- Boss (floor 10 benchmark: 160 HP, 8 ATK, 240 shards) ----
  bossHpBase: 40,
  bossHpPerFloor: 12,
  bossAtkBase: 3,
  bossAtkPerFloor: 0.5,
  bossShardBase: 40,
  bossShardPerFloor: 20,

  // ---- Consumables (INERT — requires items.js, not built yet) ----
  itemDropChance: 0.26,
  potionHealPct: 0.30,
  bombDamage: 12,
  maxItemSlots: 1
};
