window.Delve = window.Delve || {};
(function(){

 // ── Roster accessors ─────────────────────────────────────────
 // Spawning lives in levels.js; combat/rewards read stats from
 // here so all scaling stays single-source.
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
   gold: row.gold
  };
 };

 function rowFor(kind){
  const cfg = Delve.CONFIG;
  for(const key in cfg.MONSTER_ROSTER){
   if(cfg.MONSTER_ROSTER[key].kind === kind){
    return cfg.MONSTER_ROSTER[key];
   }
  }
  return cfg.MONSTER_ROSTER.goblin;
 }

 // ── Kill-reward calculator (single source of truth) ─────────
 Delve.killRewards = function(m){
  const G = Delve.G, cfg = Delve.CONFIG, eco = cfg.economy;
  const floor = G.floor;
  const luckMult = 1 + Delve.luckPts() * (eco.goldLuckMult || 0.05);

  let gold, shards, xp;

  if(m.isBoss){
   gold = cfg.goldBossBase || 80;
   shards = cfg.bossShardBase + cfg.bossShardPerFloor * floor;
   xp = (cfg.xpKill && cfg.xpKill.boss) || 30;
  } else {
   const row = rowFor(m.kind);
   // Sim-calibrated log-curve gold: base + K × ln(floor+1)
   gold = row.gold + eco.goldCurveK * Math.log(floor + 1);
   shards = row.shards + Math.floor(floor * 0.5);
   xp = row.xp;
  }

  if(m.elite){
   const r = cfg.elite.rewardMult || 3;
   gold *= r; shards *= r; xp *= r;
  }

  return {
   gold: Math.round(gold * luckMult),
   shards: Math.round(shards),
   xp: Math.round(xp)
  };
 };

 // ── Elite monster builder (used by levels.js) ────────────────
 Delve.makeElite = function(m){
  const e = Delve.CONFIG.elite;
  m.elite = true;
  m.maxHp = Math.round(m.maxHp * e.hpMult);
  m.hp = m.maxHp;
  m.atk = Math.max(1, Math.round(m.atk * e.atkMult));
  m.name = "Elite " + m.name;
  return m;
 };

})();
