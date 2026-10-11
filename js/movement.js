window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;

 // movement.js : tile interaction and traversal — tapping to move, step-on
 // pathfinding, rest, barrels, gold pickup, and floor descent.
 // Split out of combat.js. Load AFTER js/combat.js (calls Delve.startCombat,
 // Delve.enemiesTurn, Delve.openShop). All references are call-time, so no
 // load-time dependency exists in either direction.

 // ── Single-step act (tap to move) ────────────────────────────
 Delve.tryAct = function(tx, ty){
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  const g = G.grid;

  // Shopkeeper: tapping him opens the shop instead of moving.
  if(G.shop && G.shop.x === tx && G.shop.y === ty && !G.inCombat && !G.targetingAbility){
   G._path = null;
   if(G._pathTimer){ clearInterval(G._pathTimer); G._pathTimer = null; }
   Delve.openShop();
   return;
  }

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
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  const g = G.grid;

  if(G.shop && G.shop.x === tx && G.shop.y === ty && !G.inCombat && !G.targetingAbility){
   G._path = null;
   if(G._pathTimer){ clearInterval(G._pathTimer); G._pathTimer = null; }
   Delve.openShop();
   return;
  }

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
  // Hearty Stew / floorHeal: consume one charge on descend.
  if(G.floorHealLeft > 0){
   G.floorHealLeft--;
   G.hp = Math.min(Delve.maxHp(), G.hp + 3);
   Delve.addFloater("+3 stew", G.px, G.py, "#ffd75e");
   if(Delve.logSystem) Delve.logSystem("The stew warms you. +3 HP.");
  }
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

 Delve.promptStairs = function(){
  if(Delve.showStairsPrompt) Delve.showStairsPrompt();
  else Delve.descend();
 };
})();
