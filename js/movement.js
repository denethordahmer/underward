window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;

 // movement.js : tile interaction and traversal — tapping to move, step-on
 // pathfinding, rest, barrels, gold pickup, chests, and floor descent.
 // Split out of combat.js (C-006). Load AFTER js/combat.js (calls Delve.startCombat,
 // Delve.enemiesTurn); Delve.openShop lives in ui.js. All references are call-time,
 // so no load-time dependency exists in either direction.
 //
 // C-017: every entry point that reads Delve.G now guards it before dereferencing.

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
 if(Delve.sfx) Delve.sfx("secret");
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
 if(Delve.sfx) Delve.sfx("footstep");
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
 if(Delve.sfx) Delve.sfx("footstep");
 Delve.collectGold(tx, ty);
 const idx = G.items.findIndex(i => i.x===tx && i.y===ty);
 if(idx >= 0){ const it = G.items.splice(idx,1)[0]; Delve.pickupItem(it); }
 Delve.enemiesTurn();
 }
 Delve.updateHUD();
 };

 // ── Rest ─────────────────────────────────────────────────────
 Delve.tryRest = function(){
 const G = Delve.G, cfg = C();
 if(!G || G.dead || G.runEnded) return; // C-017 guard
 if(G.inCombat) return;
 if(G.restCount >= cfg.restPerFloor){ Delve.flash("No more rest available this floor"); return; }
 const heal = Math.max(cfg.restMinHeal, Math.round(Delve.maxHp() * cfg.restHealPct));
 G.hp = Math.min(Delve.maxHp(), G.hp + heal);
 G.restCount++;
 if(Delve.sfx) Delve.sfx("rest");
 Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
 if(Delve.logHeal) Delve.logHeal(heal, "Rest");
 Delve.flash("Rested. (" + (cfg.restPerFloor - G.restCount) + " left)");
 Delve.enemiesTurn();
 Delve.updateHUD();
 Delve.draw();
 };
 // ── Descend ──────────────────────────────────────────────────
 Delve.descend = function(){
 const G = Delve.G, cfg = C();
 if(!G || G.dead || G.runEnded) return; // C-017 guard
 G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp() * cfg.healOnDescendPct));
 // Hearty Stew / floorHeal: consume one charge on descend.
 if(G.floorHealLeft > 0){
 G.floorHealLeft--;
 G.hp = Math.min(Delve.maxHp(), G.hp + 3);
 Delve.addFloater("+3 stew", G.px, G.py, "#ffd75e");
 if(Delve.logSystem) Delve.logSystem("The stew warms you. +3 HP.");
 }
 G.floor++;
 if(Delve.sfx) Delve.sfx("stairs");
 if(Delve.sfxSetWard) Delve.sfxSetWard((Delve.getWard(G.floor)||{}).id || 1);
 if(G.floor > Delve.save.bestFloor){ Delve.save.bestFloor = G.floor; Delve.persist(); }
 G.secondWindUsed = false;
 G.floorCleared = false;
 Delve.recordStat("floorsDescended", 1);
 if(Delve.logFloor) Delve.logFloor(G.floor);
 Delve.genFloor();
 Delve.updateHUD();
 if(Delve.showFloorCard) Delve.showFloorCard(G.floor);
 };

 // ── Stairs prompt ────────────────────────────────────────────
 // Reads no G state of its own, so no guard is needed here — the ui.js
 // prompt and the descend() fallback both handle their own.
 Delve.promptStairs = function(){
 if(Delve.showStairsPrompt) Delve.showStairsPrompt();
 else Delve.descend();
 };
})();
