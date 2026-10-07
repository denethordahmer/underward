window.Delve = window.Delve || {};
(function(){
  // Monster creation helpers. The actual spawner lives in levels.js,
  // but combat/render use these accessors so they never need to know placement.
  Delve.monsterStats = function(type, floor){
    const cfg = Delve.CONFIG;
    const row = cfg.MONSTER_ROSTER[type] || cfg.MONSTER_ROSTER.goblin;
    return {
      name: row.name,
      kind: row.kind,
      hp: Math.round(row.hp + row.hpPerFloor * (floor - 1)),
      atk: Math.max(1, Math.round(row.atk + row.atkPerFloor * floor)),
      xp: row.xp,
      shards: row.shards + Math.floor(floor * 0.5),
      gold: row.gold + Math.floor(floor * 0.5)
    };
  };

  Delve.killRewards = function(m){
    const buffs = (typeof Delve.itemBuffs === "function") ? Delve.itemBuffs() : {};
    const shardGain = (m.shards || 0) + (buffs.shardBonus || 0);
    const goldMult = 1 + Delve.luckPts() * (Delve.CONFIG.goldLuckMult || 0.05) + (buffs.goldBonus || 0);
    return {
      shards: shardGain,
      gold: Math.round((m.gold || 0) * goldMult),
      xp: m.xp || 1
    };
  };
})();
