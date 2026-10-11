window.Delve = window.Delve || {};
(function(){

 // ── lifecycle.js ─────────────────────────────────────────────
 // Owns: the run lifecycle — starting a run (newRun) and ending one
 //       (endRun / die / retreat / triggerVictory). The whole start→end
 //       story now reads top to bottom in one file.
 // Assembled from definitions that previously lived in state.js (newRun)
 // and combat.js (endRun/retreat/die/triggerVictory). combat.js keeps the
 // combat loop, which CALLS Delve.die / Delve.triggerVictory at call time.
 // Loads BEFORE js/state.js, since state.js only declares Delve.G = null and
 // does not depend on these — order between the two is otherwise free.


Delve.newRun = function(){
 const cfg = Delve.CONFIG;
 Delve.G = {
  dead:false, runEnded:false, floor:1, level:1, xp:0, gold:0,
  energy:cfg.energyStart || 10, restCount:0,
  traits:[], abilities:[], takenUniques:[], inventory:[],
  equip:{ weapon:null, offhand:null, head:null, body:null, hands:null, feet:null, cloak:null, amulet:null, ring1:null, ring2:null },
  atkBuff:0, speedBuff:0, redBuff:0, luckBuff:0,
  secondWindUsed:false, unbrokenUsed:false, victoryDone:false, stoneSkin:0,
  effects:[], runStats:{}, runShards:0,
  combatTarget:null, inCombat:false, combatTimer:null, targetingAbility:null,
  pendingLevelUps:0, levelUpOpen:false,
  lastDir:"right", msg:"", msgUntil:0,
  visited:[], _visitedFloor:-1,
  monsters:[], goldPiles:[], barrels:[], chests:[], items:[],
  shop:{ x:-1, y:-1, stock:null }, stairs:null, boss:null, floorData:{},
  px:0, py:0, gridW:0, gridH:0, grid:[]
 };
  Delve.G.hp = Delve.maxHp();

 (Delve._hooks && Delve._hooks.runStart || []).forEach(function(fn){ fn(); });

 Delve.genFloor();
 Delve.updateHUD();
};

 // ── End a run (death / retreat / victory) ────────────────────
 Delve.endRun = function(kind, extra){
 const G = Delve.G;
 G.runEnded = true;
 G.inCombat = false;
 if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
 if(Delve.sfxStopAmbience) Delve.sfxStopAmbience();
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
 const gained = Delve.convertGold(); // js/rewards.js
 Delve.recordStat("retreated", 1);
 if(Delve.logSystem) Delve.logSystem("Retreated — " + gained + " shards banked.");
 Delve.endRun("retreat", { shards: gained });
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

 const gained = Delve.convertGold(); // js/rewards.js
 const bonus = Delve._applyBossBonus(idx); // js/rewards.js
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
