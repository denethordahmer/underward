window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;

 // combat.js : the auto-combat loop, monster/player swings, ambient attacks,
 // kill resolution, and run lifecycle (end/retreat/die/victory).
 // Tile movement, rest, barrels, gold pickup and descent now live in
 // js/movement.js. Economy lives in js/rewards.js.
 // Exports Delve.rowFor / Delve.onHitEffectFor for rewards.js to consume.

 // Chance for an enemy with an on-hit status to actually apply it.
 const ON_HIT_STATUS_CHANCE = 0.15;

 // ── Shared monster-data lookups ──────────────────────────────
 function rowFor(kind){
  const cfg = Delve.CONFIG;
  for(const key in cfg.MONSTER_ROSTER){
   if(cfg.MONSTER_ROSTER[key].kind === kind) return cfg.MONSTER_ROSTER[key];
  }
  return cfg.MONSTER_ROSTER.goblin;
 }
 Delve.rowFor = rowFor;

 // Returns the status id an enemy applies on a successful hit, or null.
 function onHitEffectFor(m){
  if(!m) return null;
  const row = rowFor(m.kind);
  if(row && row.onHitEffect) return row.onHitEffect;
  return null;
 }
 Delve.onHitEffectFor = onHitEffectFor;

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
  const gained = Delve.convertGold();            // js/rewards.js
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
  if(G.dead || G.runEnded) return;

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
   if(Delve.sfx) Delve.sfx("crit");
  }

  // Weaken applied BEFORE display — floater, log, and stats all show
  // the real damage dealt.
  if(weakened){
   const wpct = (C().STATUS_EFFECTS.weaken && C().STATUS_EFFECTS.weaken.pct) || 0.30;
   dmg = Math.max(1, Math.round(dmg * (1 - wpct)));
  }

  Delve.addFloater(isCrit ? ("CRIT " + dmg) : ("-" + dmg), m.x, m.y, isCrit ? "#ff9d3d" : "#ffd75e");
  if(!isCrit && Delve.sfx) Delve.sfx("hit");
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
  if(Delve.sfx) Delve.sfx("hurt");
  if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name || m.kind || "enemy", hit);

  // On-hit status: any enemy with an onHitEffect in the roster applies it
  // on a successful hit, at ON_HIT_STATUS_CHANCE.
  const effectId = onHitEffectFor(m);
  if(effectId && Delve.applyPlayerEffect && Math.random() < ON_HIT_STATUS_CHANCE){
   Delve.applyPlayerEffect(effectId);
   const ed = C().STATUS_EFFECTS[effectId];
   if(ed) Delve.addFloater(ed.name.toUpperCase(), G.px, G.py - 0.6, ed.color);
  }

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

 // ── Enemies turn (ambient attacks) ───────────────────────────
 // Stays here: it is monsters attacking you, and it shares
 // ON_HIT_STATUS_CHANCE / onHitEffectFor with monsterSwing.
 Delve.enemiesTurn = function(){
  const G = Delve.G;
  if(G.hp <= 0 || G.dead || G.runEnded) return;
  if(G.stoneSkin > 0) G.stoneSkin--;
  if(Delve.tickPlayerEffects) Delve.tickPlayerEffects();
  if(G.hp <= 0 || G.dead || G.runEnded) return;
  if(G.boss && !G.inCombat) ambientMob(G.boss);
  for(const m of G.monsters){
   if(G.hp <= 0 || G.dead || G.runEnded) break;
   if(!G.inCombat) ambientMob(m);
  }
 };

 function ambientMob(m){
  const G = Delve.G;
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
   if(Delve.sfx) Delve.sfx("hurt");
   if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name || "enemy", hit);

   const effectId = onHitEffectFor(m);
   if(effectId && Delve.applyPlayerEffect && Math.random() < ON_HIT_STATUS_CHANCE){
    Delve.applyPlayerEffect(effectId);
    const ed = C().STATUS_EFFECTS[effectId];
    if(ed) Delve.addFloater(ed.name.toUpperCase(), G.px, G.py - 0.6, ed.color);
   }

   if(G.hp <= 0) Delve.die();
  }
 }

 // ── Kill monster ─────────────────────────────────────────────
 Delve.killMonster = function(m){
  const G = Delve.G, g = G.grid;
  const buffs = Delve.itemBuffs();
  const rewards = Delve.killRewards(m);          // js/rewards.js

  Delve.recordStat("kills", 1);
  if(m.elite) Delve.recordStat("elitesKilled", 1);

  if(m.isBoss){
   G.boss = null;
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
    G.gold += Math.round(rewards.gold * mult);
   Delve.recordStat("goldEarned", Math.round(rewards.gold * mult));
   // Boss floors no longer drop a staircase — the arena stays a clean chamber
   // and the run continues (or ends) from the victory screen. Restore the tile
   // to floor either way so the arena centre never becomes a blocked BOSS tile.
   if(G.floorType === "boss"){
    G.stairs = null;
    g[m.y][m.x] = T().FLOOR;
   } else {
    G.stairs = { x: m.x, y: m.y };
    g[m.y][m.x] = T().STAIR;
   }
   const bossName = m.name || "The Warden";
   Delve.flash(bossName.toUpperCase() + " FALLS!");
   Delve.addShake(6);
   if(Delve.sfx) Delve.sfx("kill");
   if(Delve.logSystem) Delve.logSystem(bossName + " has fallen.");
   if(!G.bossesBeaten) G.bossesBeaten = [];
   const wardIdx = Math.ceil(G.floor / 10);
   if(G.bossesBeaten.indexOf(wardIdx) < 0) G.bossesBeaten.push(wardIdx);
   if(Delve.rollKillDrop) Delve.rollKillDrop(m.x, m.y, { guaranteed:true, minTier:3, name:m.name, elite:false, boss:true });
   Delve.triggerVictory(wardIdx);
  } else {
   G.monsters = G.monsters.filter(x => x !== m);
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   G.goldPiles = G.goldPiles || [];
   G.goldPiles.push({ x: m.x, y: m.y, amount: Math.round(rewards.gold * mult) });
   g[m.y][m.x] = T().GOLD;
   Delve.addShake(2);
   if(Delve.sfx) Delve.sfx("kill");
   if(Delve.rollKillDrop) Delve.rollKillDrop(m.x, m.y, { name:m.name, elite:!!m.elite });
   if(m.elite && C().elite.guaranteedPotion && Delve.dropPotion){
    Delve.dropPotion(m.x, m.y, 2, { kind:"monster", name:m.name, elite:true });
   }
  }

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
 Delve.triggerVictory = function(wardIdx){
  const G = Delve.G;
  const idx = wardIdx || Math.ceil(G.floor / 10);
  if(!G._victoriesProcessed) G._victoriesProcessed = [];
  if(G._victoriesProcessed.indexOf(idx) >= 0) return;
  G._victoriesProcessed.push(idx);

  G.inCombat = false;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }

  const gained = Delve.convertGold();            // js/rewards.js
  const bonus = Delve._applyBossBonus(idx);      // js/rewards.js
  const totalBanked = gained + bonus;

  Delve.recordStat("victories", 1);
  if(Delve.sfx) Delve.sfx("victory");

  // canContinue: offer "Descend deeper" only if there's content past this ward.
  const canContinue = (idx === 1);

  if(Delve.showVictory) Delve.showVictory(totalBanked, canContinue);
  else Delve.flash("WARD CLEARED! +" + totalBanked + " shards");

  Delve.updateHUD();
  Delve.draw();
 };

 // ── Die ────────────────────────────────────────────────────────
 Delve.die = function(){
  const G = Delve.G;
  if(G.dead || G.runEnded) return;
  G.dead = true;
  G.inCombat = false;
  if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
  if(Delve.sfx) Delve.sfx("death");
  if(Delve.logDeath) Delve.logDeath();
  Delve.endRun("death", {});
 };
})();
