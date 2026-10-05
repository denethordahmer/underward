window.Delve = window.Delve || {};
Delve.CONFIG = {
  // ---- Player baseline ----
  baseMaxHp: 30,
  baseAtk: 5,
  hpPerLevel: 5,
  atkPerLevel: 1,

  // ---- Permanent upgrade costs (shards) ----
  hpBaseCost: 20,
  atkBaseCost: 15,
  costGrowth: 1.45,

  // ---- Run structure ----
  bossEvery: 10,          // full boss on floors 10, 20, 30...
  healOnDescendPct: 0.5,  // heal % of max HP when descending a floor

  // ---- Normal monsters (scale with floor) ----
  monsterHpBase: 5,
  monsterHpPerFloor: 2,
  monsterAtkBase: 1,
  monsterAtkPerFloor: 0.8,
  monsterShardBase: 3,
  monsterShardPerFloor: 1,

  // ---- Boss (scale with floor) ----
  bossHpBase: 45,
  bossHpPerFloor: 15,
  bossAtkBase: 3,
  bossAtkPerFloor: 0.6,
  bossShardBase: 40,
  bossShardPerFloor: 20

  // ---- Mini-boss (TODO: add later, spawns every 7th floor) ----
  // miniBossEvery: 7,
  // miniBossHpBase: ...,
  // ...
};
