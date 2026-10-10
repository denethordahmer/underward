window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;
 const eco = () => Delve.CONFIG.economy;

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

 // ── End a run (death / retreat / victory) ────────────────────
 Delve.endRun = function(kind, extra){
  const G = Delve.G;
  G.runEnded = true;
  G.inCombat = false;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
  Delve.persist();
  if(Delve.showEndScreen){
   Delve.showEndScreen(kind, extra);
  } else if(kind === "death"){
   if(document.getElementById("deathScreen")) document.getElementById("deathScreen").style.display = "flex";
  }
 };

 // ── Retreat to surface — counts as a SUCCESS (gold kept) ────
 Delve.retreat = function(){
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  if(G.inCombat){ Delve.flash("Can't retreat mid-fight!"); return; }
  const gained = Delve.convertGold();
  Delve.recordStat("retreated", 1);
  if(Delve.logSystem) Delve.logSystem("Retreated — " + gained + " shards banked.");
  Delve.endRun("retreat", { shards: gained });
 };

 // ── Start auto-combat ────────────────────────────────────────
 Delve.startCombat = function(m){
  const G = Delve.G;
  if(G.combatTarget) Delve.endCombat(true);

  G.combatTarget = m;
  G._path = null;
  if(G._pathTimer){ clearInterval(G._pathTimer); G._pathTimer = null; }
  G.inCombat = true;

  const playerInterval = Math.round(C().secondaries.baseInterval / Delve.playerSpeed());
  const monsterInterval = Math.round(C().secondaries.baseInterval / (m.speed || 1.0));
  let playerTimer = playerInterval;
  let monsterTimer = monsterInterval;
  const TICK = 80;

  G.combatTimer = setInterval(function(){
   if(!G.combatTarget || G.dead || G.runEnded){ Delve.endCombat(false); return; }
   const m = G.combatTarget;

   playerTimer -= TICK;
   monsterTimer -= TICK;

   if(playerTimer <= 0){
    playerTimer = playerInterval;
    playerSwing(m);
    if(!G.combatTarget) return;
   }
   if(monsterTimer <= 0){
    monsterTimer = monsterInterval;
    if(G.combatTarget) monsterSwing(m);
   }

   Delve.updateHUD();
   Delve.draw();
  }, TICK);
 };

 Delve.endCombat = function(fled){
  const G = Delve.G;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
  const m = G.combatTarget;
  G.combatTarget = null;
  G.inCombat = false;

  if(fled && m){
   const hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed()) - Delve.flatRed()));
   if(Math.random() >= Delve.dodge()){
    G.hp -= hit;
    Delve.addFloater("-" + hit, G.px, G.py, "#ff5c5c");
    if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name, hit);
    Delve.addShake(2);
   }
   m.hp = m.maxHp;
   if(Delve.logSystem) Delve.logSystem("Fled — " + m.name + " recovers.");
   if(G.hp <= 0){ Delve.die(); return; }
  }
  Delve.updateHUD();
  Delve.draw();
 };

 // ── Player swing (status-on-hit, crit, vampiric) ─────────────
 function playerSwing(m){
  const G = Delve.G, sec = C().secondaries;

  const weakened = Delve.playerWeakened ? Delve.playerWeakened() : false;
  if(Delve.tickPlayerEffects) Delve.tickPlayerEffects();

  G.swing = Date.now();
  m.hitFlash = Date.now();

  let dmg = Delve.atk();
  if(m.isBoss) dmg += Delve.bossBonus ? Delve.bossBonus() : (Delve.itemBuffs().bossAtk || 0);

  const fs = Delve.firstStrikeBonus();
  if(fs && !m.hasActed) dmg += fs;

  let isCrit = false;
  if(Math.random() < Delve.crit()){
   dmg = Math.round(dmg * sec.critMult);
   isCrit = true;
   Delve.addFloater("CRIT " + dmg, m.x, m.y, "#ff9d3d");
  } else {
   Delve.addFloater("-" + dmg, m.x, m.y, "#ffd75e");
  }

  if(weakened) dmg = Math.max(1, Math.round(dmg * 0.7));
  if(Delve.logPlayerAtk) Delve.logPlayerAtk(m.name || m.kind || "enemy", dmg, isCrit);
  Delve.recordStat("damageDealt", dmg);
  m.hp -= dmg;

  // Weapon on-hit status (poison/bleed/burn from item)
  const equip = G.equip || {};
  const wpn = equip.weapon;
  const ws = wpn && Delve.weaponStatus ? Delve.weaponStatus(wpn) : null;
  if(ws && m.hp > 0 && Math.random() < ws.chance){
   if(Delve.applyEffect) Delve.applyEffect(m, ws.kind);
   Delve.addFloater(Delve.CONFIG.STATUS_EFFECTS[ws.kind].name.toUpperCase(), m.x, m.y - 0.6, Delve.CONFIG.STATUS_EFFECTS[ws.kind].color);
  }

  // Vampiric Strike: crits heal for half damage
  if(isCrit && tb().vampiric){
   const heal = Math.round(dmg / 2);
   G.hp = Math.min(Delve.maxHp(), G.hp + heal);
   Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
  }

  if(m.hp <= 0){
   if(Delve.hasOverkill()){
    const excess = -m.hp;
    const heal = Math.round(excess * sec.overkillHealPct);
    if(heal > 0){
     G.hp = Math.min(Delve.maxHp(), G.hp + heal);
     Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
     if(Delve.logHeal) Delve.logHeal(heal, "Overkill");
    }
   }
   Delve.killMonster(m);
   Delve.endCombat(false);
  }
 }

 // helper for trait buffs inside combat tick
 const tb = () => Delve.traitBuffs ? Delve.traitBuffs() : {};

 // ── Monster swing (DOTs tick at start of its cycle) ──────────
 function monsterSwing(m){
  const G = Delve.G, sec = C().secondaries;

  if(Delve.tickMonsterEffects && Delve.tickMonsterEffects(m)){
   Delve.killMonster(m);
   Delve.endCombat(false);
   return;
  }

  m.hasActed = true;
  if(m.skipNext){ m.skipNext = false; return; }

  if(m.isBoss && m.chainHitEvery){
   m.chainHitCount = (m.chainHitCount || 0) + 1;
   if(m.chainHitCount % m.chainHitEvery === 0){
    const chainDmg = m.atk * 2;
    G.hp -= chainDmg;
    Delve.addFloater("CHAIN -" + chainDmg, G.px, G.py, "#c98aff");
    Delve.addShake(4);
    if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name + " (chain)", chainDmg);
    if(G.hp <= 0){ Delve.die(); Delve.endCombat(false); return; }
    return;
   }
  }

  if(Math.random() < Delve.dodge()){
   Delve.addFloater("dodged", G.px, G.py, "#c2ff4d");
   if(Delve.logDodge) Delve.logDodge(m.name || m.kind || "enemy");
   return;
  }

  let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())) - Delve.flatRed());
  if(G.stoneSkin > 0) hit = Math.round(hit * 0.4);
  if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());

  G.hp -= hit;
  G.playerHit = Date.now();
  Delve.addFloater("-" + hit, G.px, G.py, "#ff5c5c");
  Delve.addShake(1);
  if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name || m.kind || "enemy", hit);

  // Wraiths apply Weaken on a successful hit
  if(m.kind === "wraith" && Delve.applyPlayerEffect) Delve.applyPlayerEffect("weaken");

  if(Delve.hasSecondWind() && !G.secondWindUsed &&
     G.hp <= Math.floor(Delve.maxHp() * sec.secondWindTrigger)){
   const ov = tb().secondWindHealOverride;
   const pct = ov > 0 ? ov : sec.secondWindHeal;
   const heal = Math.round(Delve.maxHp() * pct);
   G.hp = Math.min(Delve.maxHp(), G.hp + heal);
   G.secondWindUsed = true;
   Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
   if(Delve.logSecondWind) Delve.logSecondWind(heal);
  }

  if(G.hp <= 0 && tb().unbroken && !G.unbrokenUsed){
   G.hp = 1; G.unbrokenUsed = true;
   Delve.flash("Unbroken! Survived at 1 HP");
  }

  if(G.hp <= 0){ Delve.die(); Delve.endCombat(false); }
 }

 // ── Single-step act (tap to move) ────────────────────────────
 Delve.tryAct = function(tx, ty){
  const G = Delve.G, g = G.grid;
  if(!G || G.dead || G.runEnded) return;

  if(G.targetingAbility){
   const ok = Delve.castAbility ? Delve.castAbility(G.targetingAbility, tx, ty) : false;
   G.targetingAbility = null;
   if(ok !== false){ Delve.enemiesTurn(); Delve.updateHUD(); }
   return;
  }

  if(!g[ty] || g[ty][tx] === undefined) return;
  if(Math.abs(tx-G.px) + Math.abs(ty-G.py) !== 1){ Delve.flash("Too far"); return; }

  if(tx > G.px) G.lastDir = "right";
  else if(tx < G.px) G.lastDir = "left";
  else if(ty > G.py) G.lastDir = "down";
  else G.lastDir = "up";

  const cell = g[ty][tx];
  if(cell === T().MONSTER){
   const m = G.monsters.find(m => m.x===tx && m.y===ty);
   if(m) Delve.startCombat(m);
  } else if(cell === T().BOSS){
   if(G.boss && G.boss.x===tx && G.boss.y===ty) Delve.startCombat(G.boss);
  } else if(cell === T().WALL){
   const fd = G.floorData;
   if(fd && fd.secretRoom && fd.secretRoom.falseWallX===tx && fd.secretRoom.falseWallY===ty){
    g[ty][tx] = T().FLOOR;
    Delve.flash("A secret passage!");
    if(Delve.logSystem) Delve.logSystem("You found a secret room!");
   }
  } else if(cell === T().CHEST){
   Delve.openChest(tx, ty);
  } else if(cell === T().STAIR){
   Delve.promptStairs();
  } else {
   if(cell === T().BARREL) Delve.smashBarrel(tx, ty);
   G.px = tx; G.py = ty;
   Delve.collectGold(tx, ty);
   const idx = G.items.findIndex(i => i.x===tx && i.y===ty);
   if(idx >= 0){ const it = G.items.splice(idx,1)[0]; Delve.pickupItem(it); }
   Delve.enemiesTurn();
  }
  Delve.updateHUD();
 };

 // ── Pathfinder step version ──────────────────────────────────
 Delve.tryActOnStep = function(tx, ty){
  const G = Delve.G, g = G.grid;
  if(!G || G.dead || G.runEnded) return;
  if(!g[ty] || g[ty][tx] === undefined) return;
  if(G.inCombat){ G._path = null; return; }

  if(tx > G.px) G.lastDir = "right";
  else if(tx < G.px) G.lastDir = "left";
  else if(ty > G.py) G.lastDir = "down";
  else G.lastDir = "up";

  const cell = g[ty][tx];
  if(cell === T().MONSTER){
   const m = G.monsters.find(m => m.x===tx && m.y===ty);
   if(m){ G._path = null; Delve.startCombat(m); }
  } else if(cell === T().BOSS){
   if(G.boss && G.boss.x===tx && G.boss.y===ty){ G._path = null; Delve.startCombat(G.boss); }
  } else if(cell === T().WALL){
   G._path = null;
  } else if(cell === T().CHEST){
   G._path = null; Delve.openChest(tx, ty);
  } else if(cell === T().STAIR){
   G._path = null; Delve.promptStairs();
  } else {
   if(cell === T().BARREL) Delve.smashBarrel(tx, ty);
   G.px = tx; G.py = ty;
   Delve.collectGold(tx, ty);
   const idx = G.items.findIndex(i => i.x===tx && i.y===ty);
   if(idx >= 0){ const it = G.items.splice(idx,1)[0]; Delve.pickupItem(it); }
   Delve.enemiesTurn();
  }
  Delve.updateHUD();
 };

 // ── Smash barrel ─────────────────────────────────────────────
 Delve.smashBarrel = function(tx, ty){
  const G = Delve.G, b = C().barrel;
  let gold = 0;
  if(Math.random() < b.goldChance) gold = Delve.rng(b.goldMin, b.goldMax);

  if(G.grid[ty] && G.grid[ty][tx] === T().BARREL) G.grid[ty][tx] = T().FLOOR;
  G.barrels = (G.barrels || []).filter(x => !(x.x === tx && x.y === ty));
  Delve.addShake(1);
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

 // ── Rest ─────────────────────────────────────────────────────
 Delve.tryRest = function(){
  const G = Delve.G, cfg = C();
  if(G.inCombat || G.runEnded) return;
  if(G.restCount >= cfg.restPerFloor){ Delve.flash("No more rest available this floor"); return; }
  const heal = Math.max(cfg.restMinHeal, Math.round(Delve.maxHp() * cfg.restHealPct));
  G.hp = Math.min(Delve.maxHp(), G.hp + heal);
  G.restCount++;
  Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
  if(Delve.logHeal) Delve.logHeal(heal, "Rest");
  Delve.flash("Rested. (" + (cfg.restPerFloor - G.restCount) + " left)");
  Delve.enemiesTurn();
  Delve.updateHUD();
  Delve.draw();
 };

 // ── Enemies turn (ambient attacks) ───────────────────────────
 Delve.enemiesTurn = function(){
  const G = Delve.G;
  if(G.hp <= 0 || G.dead || G.runEnded) return;
  if(G.stoneSkin > 0) G.stoneSkin--;
  if(Delve.tickPlayerEffects) Delve.tickPlayerEffects();
  if(G.boss && !G.inCombat) ambientMob(G.boss);
  for(const m of G.monsters){
   if(G.hp <= 0 || G.dead || G.runEnded) break;
   if(!G.inCombat) ambientMob(m);
  }
 };

 function ambientMob(m){
  const G = Delve.G;
  if(m.skipNext){ m.skipNext = false; return; }
  if(Delve.mdist(G.px, G.py, m.x, m.y) === 1){
   m.hasActed = true;
   if(Math.random() < Delve.dodge()){
    Delve.addFloater("dodged", G.px, G.py, "#c2ff4d");
    if(Delve.logDodge) Delve.logDodge(m.name || "enemy");
    return;
   }
   let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())) - Delve.flatRed());
   if(G.stoneSkin > 0) hit = Math.round(hit * 0.4);
   if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());
   G.hp -= hit; G.playerHit = Date.now();
   Delve.addFloater("-" + hit, G.px, G.py, "#ff5c5c");
   Delve.addShake(1);
   if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name || "enemy", hit);
   if(m.kind === "wraith" && Delve.applyPlayerEffect) Delve.applyPlayerEffect("weaken");
   if(G.hp <= 0) Delve.die();
  }
 }

 // ── Kill monster ─────────────────────────────────────────────
 Delve.killMonster = function(m){
  const G = Delve.G, g = G.grid;
  const buffs = Delve.itemBuffs();
  const rewards = Delve.killRewards(m);

  Delve.recordStat("kills", 1);
  if(m.elite) Delve.recordStat("elitesKilled", 1);

  if(m.isBoss){
   G.boss = null;
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   G.gold += Math.round(rewards.gold * mult);
   Delve.recordStat("goldEarned", Math.round(rewards.gold * mult));
   G.stairs = { x: m.x, y: m.y };
   g[m.y][m.x] = T().STAIR;
   Delve.flash("THE WARDEN FALLS!");
   Delve.addShake(6);
   if(Delve.logSystem) Delve.logSystem("The Warden has fallen.");
   // drop a guaranteed boss item (legendary-leaning)
   if(Delve.rollKillDrop) Delve.rollKillDrop(m.x, m.y, { guaranteed:true, minTier:3, name:m.name, elite:false, boss:true });
   Delve.triggerVictory();
  } else {
   G.monsters = G.monsters.filter(x => x !== m);
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   G.goldPiles = G.goldPiles || [];
   G.goldPiles.push({ x: m.x, y: m.y, amount: Math.round(rewards.gold * mult) });
   g[m.y][m.x] = T().GOLD;
   Delve.addShake(2);
   if(Delve.rollKillDrop) Delve.rollKillDrop(m.x, m.y, { name:m.name, elite:!!m.elite });
   if(m.elite && C().elite.guaranteedPotion && Delve.dropPotion){
    Delve.dropPotion(m.x, m.y, 2, { kind:"monster", name:m.name, elite:true });
   }
  }

  // shards: small-int + elite multiplier
  Delve.save.shards += rewards.shards;
  G.runShards += rewards.shards;
  Delve.recordStat("shardsEarned", rewards.shards);

  // floor-clear bonus: granted if this emptied the floor
  if(!m.isBoss && G.monsters.length === 0 && !G.floorCleared){
   G.floorCleared = true;
   const bonus = Delve.floorClearBonus ? Delve.floorClearBonus() : 0;
   if(bonus > 0){
    Delve.save.shards += bonus;
    G.runShards += bonus;
    Delve.recordStat("shardsEarned", bonus);
    Delve.addFloater("+" + bonus + "◇ floor cleared", G.px, G.py, "#7ee0ff");
    if(Delve.logSystem) Delve.logSystem("Floor cleared! +" + bonus + " shards");
   }
  }

  Delve.persist();

  if(Delve.logKill) Delve.logKill(m.name || m.kind || "enemy", rewards.gold, rewards.shards, m.isBoss);

  if(buffs.healOnKill){
   G.hp = Math.min(Delve.maxHp(), G.hp + buffs.healOnKill);
   Delve.addFloater("+" + buffs.healOnKill, G.px, G.py, "#7ee08a");
   if(Delve.logHeal) Delve.logHeal(buffs.healOnKill, "Life Steal");
  }
  if(Delve.addXP) Delve.addXP(rewards.xp);
  G.energy = Math.min(100, (G.energy || 0) + C().energyPerKill + (tb().extraEnergyPerKill || 0));
 };

 // ── Victory ──────────────────────────────────────────────────
 Delve.triggerVictory = function(){
  const G = Delve.G;
  if(G.victoryDone) return;
  G.victoryDone = true;
  G.inCombat = false;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
  const gained = Delve.convertGold();
  Delve.recordStat("victories", 1);
  if(Delve.showVictory) Delve.showVictory(gained);
  else Delve.flash("WARD CLEARED! +" + gained + " shards");
  Delve.updateHUD();
  Delve.draw();
 };

 // ── Collect gold pile ────────────────────────────────────────
 Delve.collectGold = function(tx, ty){
  const G = Delve.G;
  if(!G.goldPiles) return;
  const idx = G.goldPiles.findIndex(p => p.x === tx && p.y === ty);
  if(idx < 0) return;
  const pile = G.goldPiles.splice(idx,1)[0];
  G.gold += pile.amount;
  Delve.recordStat("goldEarned", pile.amount);
  if(G.grid[ty] && G.grid[ty][tx] === T().GOLD) G.grid[ty][tx] = T().FLOOR;
  if(Delve.logSystem) Delve.logSystem("+" + pile.amount + " gold");
  Delve.updateHUD();
 };

 // ── Descend ──────────────────────────────────────────────────
 Delve.descend = function(){
  const G = Delve.G, cfg = C();
  G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp() * cfg.healOnDescendPct));
  G.floor++;
  if(G.floor > Delve.save.bestFloor){ Delve.save.bestFloor = G.floor; Delve.persist(); }
  G.secondWindUsed = false;
  G.floorCleared = false;
  Delve.recordStat("floorsDescended", 1);
  if(Delve.logFloor) Delve.logFloor(G.floor);
  Delve.genFloor();
  Delve.updateHUD();
  if(Delve.showFloorCard) Delve.showFloorCard(G.floor);
 };

 // ── Die ──────────────────────────────────────────────────────
 Delve.die = function(){
  const G = Delve.G;
  if(G.dead || G.runEnded) return;
  G.dead = true;
  G.inCombat = false;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
  if(Delve.logDeath) Delve.logDeath();
  Delve.endRun("death", {});
 };

 Delve.promptStairs = function(){
  if(Delve.showStairsPrompt) Delve.showStairsPrompt();
  else Delve.descend();
 };
})();
