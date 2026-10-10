window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;

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
 if(!G.combatTarget || G.dead){ Delve.endCombat(false); return; }
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

 function playerSwing(m){
 const G = Delve.G, sec = C().secondaries;
 G.swing = Date.now();
 m.hitFlash = Date.now();

 let dmg = Delve.atk();
 if(m.isBoss) dmg += Delve.itemBuffs().bossAtk;

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
 if(Delve.logPlayerAtk) Delve.logPlayerAtk(m.name||m.kind||"enemy", dmg, isCrit);
 m.hp -= dmg;

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

 function monsterSwing(m){
 const G = Delve.G, sec = C().secondaries;
 m.hasActed = true;
 if(m.skipNext){ m.skipNext = false; return; }

 if(m.isBoss && m.chainHitEvery){
 m.chainHitCount = (m.chainHitCount||0) + 1;
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
 if(Delve.logDodge) Delve.logDodge(m.name||m.kind||"enemy");
 return;
 }

 let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())) - Delve.flatRed());
 if(G.stoneSkin > 0) hit = Math.round(hit * 0.4);
 if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());

 G.hp -= hit;
 G.playerHit = Date.now();
 Delve.addFloater("-" + hit, G.px, G.py, "#ff5c5c");
 Delve.addShake(1);
 if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name||m.kind||"enemy", hit);

 if(Delve.hasSecondWind() && !G.secondWindUsed &&
 G.hp <= Math.floor(Delve.maxHp() * sec.secondWindTrigger)){
 const heal = Math.round(Delve.maxHp() * (G.traits && G.traits.secondWindHealOverride || sec.secondWindHeal));
 G.hp = Math.min(Delve.maxHp(), G.hp + heal);
 G.secondWindUsed = true;
 Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
 if(Delve.logSecondWind) Delve.logSecondWind(heal);
 }

 if(G.hp <= 0 && G.traits && G.traits.unbroken && !G.unbrokenUsed){
 G.hp = 1; G.unbrokenUsed = true;
 Delve.flash("Unbroken! Survived at 1 HP");
 }

 if(G.hp <= 0){ Delve.die(); Delve.endCombat(false); }
 }

 // ── Single-step act (tap to move) ────────────────────────────
 Delve.tryAct = function(tx, ty){
 const G = Delve.G, g = G.grid;
 if(!G||G.dead) return;

 if(G.targetingAbility){
 const ok = Delve.castAbility(G.targetingAbility, tx, ty);
 G.targetingAbility = null;
 if(ok !== false){ Delve.enemiesTurn(); Delve.updateHUD(); }
 return;
 }

 if(!g[ty]||g[ty][tx]===undefined) return;
 const manh = Math.abs(tx-G.px)+Math.abs(ty-G.py);
 if(manh !== 1){ Delve.flash("Too far"); return; }

 if(tx>G.px) G.lastDir="right";
 else if(tx<G.px) G.lastDir="left";
 else if(ty>G.py) G.lastDir="down";
 else G.lastDir="up";

 const cell = g[ty][tx];
 if(cell===T().MONSTER){
 const m=G.monsters.find(m=>m.x===tx&&m.y===ty);
 if(m) Delve.startCombat(m);
 } else if(cell===T().BOSS){
 if(G.boss&&G.boss.x===tx&&G.boss.y===ty) Delve.startCombat(G.boss);
 } else if(cell===T().WALL){
 const fd=G.floorData;
 if(fd&&fd.secretRoom&&fd.secretRoom.falseWallX===tx&&fd.secretRoom.falseWallY===ty){
 g[ty][tx]=T().FLOOR;
 Delve.flash("A secret passage!");
 if(Delve.logSystem) Delve.logSystem("You found a secret room!");
 }
 } else if(cell===T().CHEST){
 Delve.openChest(tx, ty);
 } else if(cell===T().STAIR){
 Delve.promptStairs();
 } else {
 if(cell===T().BARREL){
 Delve.smashBarrel(tx, ty);
 }
 G.px=tx; G.py=ty;
 Delve.collectGold(tx, ty);
 const idx=G.items.findIndex(i=>i.x===tx&&i.y===ty);
 if(idx>=0){ const it=G.items.splice(idx,1)[0]; Delve.pickupItem(it); }
 Delve.enemiesTurn();
 }
 Delve.updateHUD();
 };

 // ── Pathfinder step version ──────────────────────────────────
 Delve.tryActOnStep = function(tx, ty){
 const G=Delve.G, g=G.grid;
 if(!G||G.dead) return;
 if(!g[ty]||g[ty][tx]===undefined) return;
 if(G.inCombat){ G._path=null; return; }

 if(tx>G.px) G.lastDir="right";
 else if(tx<G.px) G.lastDir="left";
 else if(ty>G.py) G.lastDir="down";
 else G.lastDir="up";

 const cell=g[ty][tx];
 if(cell===T().MONSTER){
 const m=G.monsters.find(m=>m.x===tx&&m.y===ty);
 if(m){ G._path=null; Delve.startCombat(m); }
 } else if(cell===T().BOSS){
 if(G.boss&&G.boss.x===tx&&G.boss.y===ty){ G._path=null; Delve.startCombat(G.boss); }
 } else if(cell===T().WALL){
 G._path=null;
 } else if(cell===T().CHEST){
 G._path=null; Delve.openChest(tx,ty);
 } else if(cell===T().STAIR){
 G._path=null; Delve.promptStairs();
 } else {
 if(cell===T().BARREL){
 Delve.smashBarrel(tx, ty);
 }
 G.px=tx; G.py=ty;
 Delve.collectGold(tx, ty);
 const idx=G.items.findIndex(i=>i.x===tx&&i.y===ty);
 if(idx>=0){ const it=G.items.splice(idx,1)[0]; Delve.pickupItem(it); }
 Delve.enemiesTurn();
 }
 Delve.updateHUD();
 };

 // ── Smash barrel (step onto it) ─────────────────────────────
 Delve.smashBarrel = function(tx, ty){
 const G=Delve.G;
 const roll = Math.random();
 let gold = 0;
 if(roll < 0.35) gold = Delve.rng(1,4);
 else if(roll < 0.55) gold = Delve.rng(4,8);

 if(G.grid[ty] && G.grid[ty][tx]===T().BARREL) G.grid[ty][tx]=T().FLOOR;

 // Remove the barrel from the floor's list so it stops being drawn
 G.barrels = (G.barrels||[]).filter(b => !(b.x===tx && b.y===ty));

 Delve.addShake(1);

 if(gold>0){
 G.gold += gold;
 Delve.addFloater("+" + gold + "g", tx, ty, "#ffd75e");
 if(Delve.logSystem) Delve.logSystem("Barrel smashed! +" + gold + " gold");
 } else {
 Delve.addFloater("empty", tx, ty, "#9fb3c5");
 if(Delve.logSystem) Delve.logSystem("Barrel smashed — empty.");
 }
 Delve.updateHUD();
 };

 // ── Rest ─────────────────────────────────────────────────────
 Delve.tryRest = function(){
 const G=Delve.G, cfg=C();
 if(G.inCombat) return;
 if(G.restCount >= cfg.restPerFloor){
 Delve.flash("No more rest available this floor");
 return;
 }
 const heal=cfg.restHealAmt;
 G.hp=Math.min(Delve.maxHp(), G.hp+heal);
 G.restCount++;
 Delve.addFloater("+"+heal, G.px, G.py, "#7ee08a");
 if(Delve.logHeal) Delve.logHeal(heal, "Rest");
 Delve.flash("Rested. ("+(cfg.restPerFloor-G.restCount)+" left)");
 Delve.enemiesTurn();
 Delve.updateHUD();
 Delve.draw();
 };

 // ── Enemies turn ─────────────────────────────────────────────
 Delve.enemiesTurn = function(){
 const G=Delve.G;
 if(G.hp<=0||G.dead) return;
 if(G.stoneSkin>0) G.stoneSkin--;
 if(G.boss&&!G.inCombat) ambientMob(G.boss);
 for(const m of G.monsters){
 if(G.hp<=0||G.dead) break;
 if(!G.inCombat) ambientMob(m);
 }
 };

 function ambientMob(m){
 const G=Delve.G;
 if(m.skipNext){ m.skipNext=false; return; }
 const manh=Delve.mdist(G.px,G.py,m.x,m.y);
 if(manh===1){
 m.hasActed=true;
 if(Math.random()<Delve.dodge()){
 Delve.addFloater("dodged",G.px,G.py,"#c2ff4d");
 if(Delve.logDodge) Delve.logDodge(m.name||"enemy");
 return;
 }
 let hit=Math.max(1,Math.round(m.atk*(1-Delve.dmgRed()))-Delve.flatRed());
 if(G.stoneSkin>0) hit=Math.round(hit*0.4);
 if(Delve.hasBulwark()) hit=Math.min(hit,Delve.hitCap());
 G.hp-=hit; G.playerHit=Date.now();
 Delve.addFloater("-"+hit,G.px,G.py,"#ff5c5c");
 Delve.addShake(1);
 if(Delve.logEnemyAtk) Delve.logEnemyAtk(m.name||"enemy",hit);
 if(G.hp<=0) Delve.die();
 }
 }

 // ── Kill monster ─────────────────────────────────────────────
 Delve.killMonster = function(m){
 const G=Delve.G, g=G.grid;
 const buffs=Delve.itemBuffs();
 const rewards=Delve.killRewards(m);

 if(m.isBoss){
 G.boss=null;
 G.stairs={x:m.x,y:m.y};
 g[m.y][m.x]=T().STAIR;
 Delve.flash("BOSS DOWN!");
 Delve.addShake(6);
 } else {
 G.monsters=G.monsters.filter(x=>x!==m);
 G.goldPiles = G.goldPiles || [];
 G.goldPiles.push({ x:m.x, y:m.y, amount:rewards.gold });
 g[m.y][m.x]=T().GOLD;
 Delve.addShake(2);
 }

 Delve.save.shards+=rewards.shards; G.runShards+=rewards.shards; Delve.persist();

 if(Delve.logKill) Delve.logKill(m.name||m.kind||"enemy",rewards.gold,rewards.shards,m.isBoss);

 if(buffs.healOnKill){
 G.hp=Math.min(Delve.maxHp(),G.hp+buffs.healOnKill);
 Delve.addFloater("+"+buffs.healOnKill,G.px,G.py,"#7ee08a");
 if(Delve.logHeal) Delve.logHeal(buffs.healOnKill,"Bloodthirst");
 }
 if(Delve.rollKillDrop) Delve.rollKillDrop(m.x,m.y);
 if(Delve.addXP) Delve.addXP(rewards.xp);
 G.energy=Math.min(100,(G.energy||0)+C().energyPerKill);
 };

 // ── Collect gold pile (walk-over) ────────────────────────────
 Delve.collectGold = function(tx, ty){
 const G=Delve.G;
 if(!G.goldPiles) return;
 const idx=G.goldPiles.findIndex(p=>p.x===tx&&p.y===ty);
 if(idx<0) return;
 const pile=G.goldPiles.splice(idx,1)[0];
 G.gold+=pile.amount;
 if(G.grid[ty] && G.grid[ty][tx]===Delve.T.GOLD) G.grid[ty][tx]=Delve.T.FLOOR;
 if(Delve.logSystem) Delve.logSystem("+" + pile.amount + " gold");
 Delve.updateHUD();
 };

 // ── Descend ──────────────────────────────────────────────────
 Delve.descend = function(){
 const G=Delve.G, cfg=C();
 G.hp=Math.min(Delve.maxHp(),G.hp+Math.round(Delve.maxHp()*cfg.healOnDescendPct));
 G.floor++;
 if(G.floor>Delve.save.bestFloor){ Delve.save.bestFloor=G.floor; Delve.persist(); }
 G.secondWindUsed=false;
 if(Delve.logFloor) Delve.logFloor(G.floor);
 Delve.genFloor();
 Delve.updateHUD();
 if(Delve.showFloorCard) Delve.showFloorCard(G.floor);
 };

 // ── Die ──────────────────────────────────────────────────────
 Delve.die = function(){
 const G=Delve.G;
 if(G.dead) return;
 G.dead=true;
 G.inCombat=false;
 if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer=null; }
 if(Delve.logDeath) Delve.logDeath();
 document.getElementById("deathInfo").textContent=
 "You reached floor "+G.floor+" — best "+Delve.save.bestFloor;
 document.getElementById("deathShards").textContent=
 "+"+G.runShards+" shards this run";
 document.getElementById("deathScreen").style.display="flex";
 };

 Delve.promptStairs = function(){
 if(Delve.showStairsPrompt) Delve.showStairsPrompt();
 else Delve.descend();
 };
})();
