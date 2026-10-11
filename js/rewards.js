window.Delve = window.Delve || {};
(function(){
 const C = () => Delve.CONFIG;
 const eco = () => Delve.CONFIG.economy;

 // rewards.js : run economy — gold→shards, boss bonuses, kill rewards,
 // floor-clear bonuses, elite promotion, monster stat lookup.
 // Load AFTER js/combat.js (uses Delve.rowFor, exported from there).
 // Everything else it touches (save, recordStat, luckPts, logSystem) is
 // resolved at call time, so no other ordering constraint applies.

 // ── Gold → shards conversion (successful run ends) ──────────
 Delve.convertGold = function(rate){
 const G = Delve.G;
 const r = rate || eco().goldToShardRate;
 const shards = Math.floor(G.gold / r);
 G.gold -= shards * r;
 G.runShards += shards;
 Delve.save.shards += shards;
 Delve.persist();
 return shards;
 };

 // ── Boss shard bonus ─────────────────────────────────────────
 // Applied once per boss, at the moment of the victory screen.
 // Bonus is bossDef.shardBonusPct × current runShards.
 Delve.applyBossBonus = Delve._applyBossBonus = function(wardIdx){
 const G = Delve.G;
 if(!G._bonusesApplied) G._bonusesApplied = [];
 if(G._bonusesApplied.indexOf(wardIdx) >= 0) return 0;
 G._bonusesApplied.push(wardIdx);
 const def = C().BOSS_DEFS[wardIdx];
 if(!def || !def.shardBonusPct) return 0;
 const bonus = Math.round((G.runShards || 0) * def.shardBonusPct);
 if(bonus > 0){
 Delve.save.shards += bonus;
 G.runShards += bonus;
 Delve.recordStat("shardsEarned", bonus);
 if(Delve.logSystem) Delve.logSystem(def.name + " bonus: +" + bonus + " shards");
 }
 return bonus;
 };

 // ── Monster roster / rewards ────────────────────────────────
 Delve.monsterStats = function(type, floor){
 const cfg = Delve.CONFIG;
 const row = cfg.MONSTER_ROSTER[type] || cfg.MONSTER_ROSTER.goblin;
 return {
 name: row.name,
 kind: row.kind,
 hp: Math.round(row.hp + row.hpPerFloor * (floor - 1)),
 atk: Math.max(1, Math.round(row.atk + row.atkPerFloor * floor)),
 xp: row.xp,
 shards: row.shards,
 gold: row.gold
 };
 };

 Delve.killRewards = function(m){
 const G = Delve.G, cfg = Delve.CONFIG, eco = cfg.economy;
 const floor = G.floor;
 const luckMult = 1 + Delve.luckPts() * (eco.goldLuckMult || 0.05);

 let gold, shards, xp;

 if(m.isBoss){
 gold = cfg.goldBossBase || 80;
 shards = eco.bossShards || 40;
 xp = (cfg.xpKill && cfg.xpKill.boss) || 30;
 } else {
 const row = Delve.rowFor(m.kind); // exported by js/combat.js
 gold = row.gold + (eco.goldCurveK || 3.0) * Math.log(floor + 1);
 shards = row.shards;
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

 Delve.floorClearBonus = function(){
 const G = Delve.G, eco = Delve.CONFIG.economy;
 return (eco.floorClearBonus || 0) + (eco.floorClearBonusPerFloor || 0) * G.floor;
 };

 Delve.makeElite = function(m){
 const e = Delve.CONFIG.elite;
 m.elite = true;
 m.maxHp = Math.round(m.maxHp * e.hpMult);
 m.hp = m.maxHp;
 m.atk = Math.max(1, Math.round(m.atk * e.atkMult));
 m.name = "Elite " + m.name;
 if(Delve.sfx) Delve.sfx("elite");
 return m;
 };
})();
