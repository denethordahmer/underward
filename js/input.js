window.Delve = window.Delve || {};
(function(){
 const canvas = document.getElementById("canvas");

 // Any visible blocking overlay swallows the tap.
 Delve.uiBlocked = function uiBlocked(){
  const blocking = ["deathScreen","levelupScreen","inventoryScreen","itemCardOverlay",
   "stairsPrompt","shopScreen","hubScreen","victoryScreen","bossIntroOverlay",
   "logWindow","pauseMenu","introOverlay"];  // FIX #16: was only 5 screens — shop/log/pause/hub/victory could be tapped through
  for(let i=0;i<blocking.length;i++){
   const el = document.getElementById(blocking[i]);
   if(el && el.style.display === "flex") return true;
  }
  return false;
 }

 function handleTap(e){
  e.preventDefault();
  const G = Delve.G;
  if(!G || G.dead) return;
  if(uiBlocked()) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const tx = Math.floor(x / Delve.ts) + (Delve.camX || 0);
  const ty = Math.floor(y / Delve.ts) + (Delve.camY || 0);

  if(tx < 0 || ty < 0 || !G.grid ||
     tx >= G.grid[0].length || ty >= G.grid.length) return;

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

  // In combat — tapping anything other than combat target tile = flee
  if(G.inCombat && G.combatTarget){
   if(tx !== G.combatTarget.x || ty !== G.combatTarget.y){
    Delve.endCombat(true);
    // Update vignette
    const vig = document.getElementById("combatVignette");
    if(vig) vig.classList.remove("active");
    Delve.draw();
    return;
   }
   return; // tapping the monster during combat does nothing extra
  }

  const cell = g[ty] && g[ty][tx];
  if(cell === T.WALL){
   // Check false wall
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
   // Update combat vignette
   const vig = document.getElementById("combatVignette");
   if(vig) vig.classList.toggle("active", !!(G.inCombat));
   Delve.draw();
   return;
  }

  // Pathfind
  const path = Delve.findPath(tx, ty);
  if(!path || !path.length) return;
  G._path = path;
  Delve.stepPath();
  Delve.draw();

  clearInterval(G._pathTimer);
  if(G._path && G._path.length > 0){
   G._pathTimer = setInterval(function(){
    if(!Delve.G||Delve.G.dead||!Delve.G._path||!Delve.G._path.length||Delve.G.inCombat){
     clearInterval(Delve.G && Delve.G._pathTimer);
     return;
    }
    Delve.stepPath();
    const vig = document.getElementById("combatVignette");
    if(vig) vig.classList.toggle("active", !!(Delve.G.inCombat));
    Delve.draw();
    if(!Delve.G._path||!Delve.G._path.length) clearInterval(Delve.G._pathTimer);
   }, 110);
  }
 }

 canvas.addEventListener("pointerdown", handleTap, {passive:false});
})();
