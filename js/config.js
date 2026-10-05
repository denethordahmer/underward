window.Delve = window.Delve || {};
Delve.CONFIG = {
  baseMaxHp: 30,
  baseAtk: 5,
  hpPerLevel: 5,
  atkPerLevel: 1,

  hpBaseCost: 20,
  atkBaseCost: 15,
  costGrowth: 1.45,

  bossEvery: 5,
  healOnDescendPct: 0.5,

  // monsters — scale with floor
  monsterHpBase: 5,
  monsterHpPerFloor: 2,
  monsterAtkBase: 1,
  monsterAtkPerFloor: 0.8,
  monsterShardBase: 3,
  monsterShardPerFloor: 1,

  // boss
  bossHpBase: 45,
  bossHpPerFloor: 15,
  bossAtkBase: 3,
  bossAtkPerFloor: 0.6,
  bossShardBase: 40,
  bossShardPerFloor: 20
};
