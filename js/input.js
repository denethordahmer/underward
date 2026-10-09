window.Delve = window.Delve || {};
(function(){
  const canvas = document.getElementById("canvas");

  function handleTap(e){
    e.preventDefault();
    if(!Delve.G || Delve.G.dead) return;
    if(document.getElementById("deathScreen").style.display === "flex") return;
    if(document.getElementById("levelupScreen").style.display === "flex") return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tx = Math.floor(x / Delve.ts) + (Delve.camX || 0);
    const ty = Math.floor(y / Delve.ts) + (Delve.camY || 0);

    const G = Delve.G;
    if(tx < 0 || ty < 0 || !G.grid ||
       tx >= G.grid[0].length || ty >= G.grid.length) return;

    // If targeting ability, resolve immediately
    if(G.targetingAbility){
      const ok = Delve.castAbility(G.targetingAbility, tx, ty);
      G.targetingAbility = null;
      if(ok !== false) Delve.enemiesTurn();
      Delve.updateHUD();
      Delve.draw();
      return;
    }

    const T = Delve.T, g = G.grid;
    const cell = g[ty] && g[ty][tx];

    // Tap on a wall — ignore
    if(cell === T.WALL) return;

    const manh = Math.abs(tx - G.px) + Math.abs(ty - G.py);

    if(manh === 1){
      // Adjacent: act immediately (move/attack)
      G._path = null;
      Delve.tryAct(tx, ty);
      Delve.draw();
      return;
    }

    // Multi-step: pathfind and start walking
    const path = Delve.findPath(tx, ty);
    if(!path || !path.length){ return; }

    G._path = path;
    // Walk the first step now
    Delve.stepPath();
    Delve.draw();

    // Continue walking remaining steps at move speed
    clearInterval(G._pathTimer);
    if(G._path && G._path.length > 0){
      G._pathTimer = setInterval(function(){
        if(!Delve.G || Delve.G.dead || !Delve.G._path || !Delve.G._path.length){
          clearInterval(Delve.G && Delve.G._pathTimer);
          return;
        }
        Delve.stepPath();
        Delve.draw();
        if(!Delve.G._path || !Delve.G._path.length){
          clearInterval(Delve.G._pathTimer);
        }
      }, 110);
    }
  }

  canvas.addEventListener("pointerdown", handleTap, {passive: false});
})();
