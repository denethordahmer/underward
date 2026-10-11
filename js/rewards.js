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
  // ── Chests ───────────────────────────────────────────────────
 // MOVED here from levels.js: a chest is a loot grant (item / potion / gold),
 // which is this file's job. levels.js keeps pure floor GENERATION.
 Delve.prob = function(p){ var r = Math.random(); return Math.min(r,p) === r; };
 Delve.openChest = function(x, y){
  const G = Delve.G;
  if(!G) return;
  const chest = G.chests.find(function(c){ return c.x===x && c.y===y; });
  if(!chest || chest.open) return;
  chest.open = true;
  G.grid[y][x] = Delve.T.FLOOR;
  if(Delve.sfx) Delve.sfx("chest");
  if(Delve.logSystem) Delve.logSystem("You open a chest.");
  const source = chest.secret ? { kind:"secret" } : { kind:"chest" };

  // high-value chest (Blackvein cluster or swarm): guaranteed tier 3+ item,
  // tier 3 potion, and boosted gold
  if(chest.highValue){
   let tier = Math.max(3, Delve.rollTier(G.floor));
   if(Delve.hasProgression && Delve.hasProgression("lucky_find")) tier = Math.min(4, tier+1);
   const it = Delve.makeItem(tier);
   it.x = x; it.y = y;
   Delve.stampProvenance(it, source);
   G.items.push(it);
   Delve.dropPotion(x, y, 3, source);
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   const gold = Math.round((30 + Math.floor(Math.random()*20) + G.floor*3) * mult);
   G.gold += gold;
   Delve.recordStat("goldEarned", gold);
   Delve.addFloater("+" + gold + "g", x, y, "#ffd75e");
   Delve.updateHUD();
   Delve.draw();
   return;
  }

  if(Delve.prob(0.45)){
   let tier = Delve.rollTier(G.floor);
   if(Delve.hasProgression && Delve.hasProgression("lucky_find")) tier = Math.min(4, tier+1);
   const it = Delve.makeItem(tier);
   it.x = x; it.y = y;
   Delve.stampProvenance(it, source);
   G.items.push(it);
  } else if(Delve.prob(0.8)){
   Delve.dropPotion(x, y, 2, source);
  } else {
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   const gold = Math.round((15 + Math.floor(Math.random()*10) + G.floor*2) * mult);
   G.gold += gold;
   Delve.recordStat("goldEarned", gold);
   Delve.addFloater("+" + gold + "g", x, y, "#ffd75e");
   if(Delve.logSystem) Delve.logSystem("Chest contained " + gold + " gold.");
  }
  Delve.updateHUD();
  Delve.draw();
 };

 // ── World pickups ────────────────────────────────────────────
 // MOVED here from movement.js: barrels, gold piles and chests are loot
 // grants, which is this file's job. movement.js keeps traversal only
 // (tryAct / tryActOnStep / tryRest / descend / promptStairs), though it
 // still CALLS these when you step onto a barrel or gold pile.
 // ── Smash barrel ─────────────────────────────────────────────
 Delve.smashBarrel = function(tx, ty){
 const G = Delve.G, b = Delve.CONFIG.barrel;
 if(!G || G.dead || G.runEnded) return; // C-017 guard
 let gold = 0;
 if(Math.random() < b.goldChance) gold = Delve.rng(b.goldMin, b.goldMax);

 if(G.grid[ty] && G.grid[ty][tx] === Delve.T.BARREL) G.grid[ty][tx] = Delve.T.FLOOR;
 G.barrels = (G.barrels || []).filter(x => !(x.x === tx && x.y === ty));
 Delve.addShake(1);
 if(Delve.sfx) Delve.sfx("barrel");
 Delve.recordStat("barrelsSmashed", 1);

 if(gold > 0){
 const mult = Delve.goldMult ? Delve.goldMult() : 1;
 const gained = Math.round(gold * mult);
 G.gold += gained;
 Delve.recordStat("goldEarned", gained);
 Delve.addFloater("+" + gained + "g", tx, ty, "#ffd75e");
 if(Delve.logSystem) Delve.logSystem("Barrel smashed! +" + gained + " gold");
 } else {
 Delve.addFloater("empty", tx, ty, "#9fb3c5");
 if(Delve.logSystem) Delve.logSystem("Barrel smashed — empty.");
 }
 Delve.updateHUD();
 };

 Delve.collectGold = function(tx, ty){
 const G = Delve.G;
 if(!G || !G.goldPiles) return; // C-017 guard
 const idx = G.goldPiles.findIndex(p => p.x === tx && p.y === ty);
 if(idx < 0) return;
 const pile = G.goldPiles.splice(idx,1)[0];
 G.gold += pile.amount;
 Delve.recordStat("goldEarned", pile.amount);
 if(Delve.sfx) Delve.sfx("pickup_gold");
 if(G.grid[ty] && G.grid[ty][tx] === Delve.T.GOLD) G.grid[ty][tx] = Delve.T.FLOOR;
 if(Delve.logSystem) Delve.logSystem("+" + pile.amount + " gold");
 Delve.updateHUD();
 };
})();
