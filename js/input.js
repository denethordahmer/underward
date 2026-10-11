window.Delve = window.Delve || {};
(function(){
 const canvas = document.getElementById("canvas");
 if(!canvas){
  try { console.error("input.js: #canvas not found"); } catch(_e){}
  return;
 }

 // Diagnostic on-screen panel when the URL contains ?diag=1
 const DIAG = /[?&]diag=1/.test(location.search);
 let diagEl = null;

 function diag(msg){
  try { console.log("[tap] " + msg); } catch(_e){}
  if(!DIAG) return;
  if(!diagEl){
   diagEl = document.createElement("div");
   diagEl.id = "tapDiag";
   diagEl.style.cssText =
    "position:fixed;left:6px;right:6px;bottom:6px;z-index:9999;" +
    "background:rgba(0,0,0,.88);color:#7ee0ff;font:11px/1.45 monospace;" +
    "padding:7px 9px;border-radius:8px;white-space:pre-wrap;" +
    "pointer-events:none;max-height:45vh;overflow:hidden;";
   document.body.appendChild(diagEl);
  }
  diagEl.textContent = msg;
 }

 // Any visible blocking overlay swallows the tap.
 Delve.uiBlocked = function uiBlocked(){
  const blocking = ["deathScreen","levelupScreen","inventoryScreen","itemCardOverlay",
   "stairsPrompt","shopScreen","hubScreen","victoryScreen","bossIntroOverlay",
   "logWindow","pauseMenu","introOverlay"];
  const hits = [];
  for(let i=0;i<blocking.length;i++){
   const el = document.getElementById(blocking[i]);
   if(el && el.style.display === "flex") hits.push(blocking[i]);
  }
  Delve._lastBlockers = hits;
  return hits.length > 0;
 };

 // Ignore a duplicate event from a second listener on the same physical tap
 let lastTap = { t:0, x:-9999, y:-9999 };
 function isDuplicate(x, y){
  const now = Date.now();
  if(now - lastTap.t < 250 && Math.abs(x - lastTap.x) < 14 && Math.abs(y - lastTap.y) < 14) return true;
  lastTap = { t:now, x:x, y:y };
  return false;
 }

 function handleTap(e){
  try { handleTapInner(e); }
  catch(err){
   const m = "TAP ERROR: " + (err && err.message ? err.message : String(err));
   diag(m);
   if(Delve.flash) Delve.flash(m);
  }
 }

 function handleTapInner(e){
  if(e && e.preventDefault) e.preventDefault();

  const G = Delve.G;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const ts = Delve.ts;
  const camX = Delve.camX || 0;
  const camY = Delve.camY || 0;
  const tx = Math.floor(cx / ts) + camX;
  const ty = Math.floor(cy / ts) + camY;

  // What element is actually under the finger? The single most useful clue.
  let overName = "none";
  try {
   const over = document.elementFromPoint(e.clientX, e.clientY);
   if(over){
    if(over.id) overName = "#" + over.id;
    else if(over.className) overName = "." + String(over.className).split(" ")[0];
    else overName = over.tagName;
   }
  } catch(_e){}

  const blocked = Delve.uiBlocked();

  diag(
   "tap  " + Math.round(cx) + "," + Math.round(cy) + "   over " + overName + "\n" +
   "tile " + tx + "," + ty + "   player " + (G ? G.px + "," + G.py : "-") + "\n" +
   "ts " + ts + "   cam " + camX + "," + camY + "\n" +
   "G " + (G ? "ok" : "NULL") + (G && G.dead ? " DEAD" : "") + (G && G.runEnded ? " ENDED" : "") +
   "   grid " + (G && G.grid && G.grid.length ? G.grid[0].length + "x" + G.grid.length : "-") + "\n" +
   "blocked " + (blocked ? (Delve._lastBlockers || []).join("+") : "no") +
   "   combat " + (G && G.inCombat ? "yes" : "no") +
   "   tgt " + (G && G.targetingAbility ? G.targetingAbility.id : "no")
  );

  if(!G || G.dead) return;

  if(blocked){
   if(Delve.flash) Delve.flash("Tap blocked: " + (Delve._lastBlockers || []).join(", "));
   return;
  }

  if(typeof ts !== "number" || !isFinite(ts) || ts <= 0){
   if(Delve.flash) Delve.flash("Bad tile size ts=" + ts);
   return;
  }

  if(!G.grid || !G.grid.length){
   if(Delve.flash) Delve.flash("No grid loaded");
   return;
  }

  if(tx < 0 || ty < 0 || tx >= G.grid[0].length || ty >= G.grid.length){
   if(Delve.flash) Delve.flash("Outside map " + tx + "," + ty);
   return;
  }

  const T = Delve.T, g = G.grid;

  // Targeting ability
  if(G.targetingAbility){
   const ok = Delve.castAbility(G.targetingAbility, tx, ty);
   G.targetingAbility = null;
   if(ok !== false){ Delve.enemiesTurn(); Delve.updateHUD(); }
   Delve.draw();
   return;
  }

  // Tap own tile = rest
  if(tx === G.px && ty === G.py){
   Delve.tryRest();
   return;
  }

  // In combat — tapping anything other than the combat target tile = flee
  if(G.inCombat && G.combatTarget){
   if(tx !== G.combatTarget.x || ty !== G.combatTarget.y){
    Delve.endCombat(true);
    const vig = document.getElementById("combatVignette");
    if(vig) vig.classList.remove("active");
    Delve.draw();
    return;
   }
   return;
  }

  const cell = g[ty] && g[ty][tx];
  if(cell === T.WALL){
   const fd = G.floorData;
   if(fd && fd.secretRoom &&
      fd.secretRoom.falseWallX === tx && fd.secretRoom.falseWallY === ty){
    g[ty][tx] = T.FLOOR;
    Delve.flash("A secret passage!");
    if(Delve.logSystem) Delve.logSystem("You found a secret room!");
    Delve.draw();
   }
   return;
  }

  const manh = Math.abs(tx - G.px) + Math.abs(ty - G.py);

  if(manh === 1){
   G._path = null;
   Delve.tryAct(tx, ty);
   const vig = document.getElementById("combatVignette");
   if(vig) vig.classList.toggle("active", !!(G.inCombat));
   Delve.draw();
   return;
  }

  // Pathfind
  const path = Delve.findPath(tx, ty);
  if(!path || !path.length){
   if(Delve.flash) Delve.flash("No path to " + tx + "," + ty);
   return;
  }
  G._path = path;
  Delve.stepPath();
  Delve.draw();

  clearInterval(G._pathTimer);
  if(G._path && G._path.length > 0){
   G._pathTimer = setInterval(function(){
    if(!Delve.G || Delve.G.dead || !Delve.G._path || !Delve.G._path.length || Delve.G.inCombat){
     clearInterval(Delve.G && Delve.G._pathTimer);
     return;
    }
    Delve.stepPath();
    const vig = document.getElementById("combatVignette");
    if(vig) vig.classList.toggle("active", !!(Delve.G.inCombat));
    Delve.draw();
    if(!Delve.G._path || !Delve.G._path.length) clearInterval(Delve.G._pathTimer);
   }, 110);
  }
 }

 // ── Event binding ─────────────────────────────────────────────
 const opts = { passive:false };

 if(window.PointerEvent){
  canvas.addEventListener("pointerdown", handleTap, opts);
 } else {
  // Fallback for browsers that don't deliver pointer events to the canvas
  canvas.addEventListener("touchstart", function(e){
   if(!e.touches || e.touches.length !== 1) return;
   const t = e.touches[0];
   if(isDuplicate(t.clientX, t.clientY)) return;
   handleTap({
    clientX: t.clientX,
    clientY: t.clientY,
    preventDefault: function(){ if(e.cancelable) e.preventDefault(); }
   });
  }, opts);
  canvas.addEventListener("mousedown", function(e){
   if(isDuplicate(e.clientX, e.clientY)) return;
   handleTap(e);
  }, opts);
 }

 // Diagnostic-only: confirms whether a plain click ever reaches the canvas
 if(DIAG){
  canvas.addEventListener("click", function(e){
   diag("CLICK reached canvas at " + Math.round(e.clientX) + "," + Math.round(e.clientY) +
        "\n(pointerdown did " + (lastTap.t ? "fire at " + Math.round(lastTap.x) + "," + Math.round(lastTap.y) : "NOT fire") + ")");
  }, { passive:true });
 }
})();
