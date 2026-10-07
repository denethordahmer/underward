window.Delve = window.Delve || {};
(function(){
  const canvas = document.getElementById("canvas");

  function handleTap(e){
    e.preventDefault();
    if(!Delve.G || Delve.G.dead || document.getElementById("deathScreen").style.display === "flex") return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tx = Math.floor(x / Delve.ts) + (Delve.camX || 0);
    const ty = Math.floor(y / Delve.ts) + (Delve.camY || 0);

    if(tx < 0 || ty < 0 || !Delve.G.grid || tx >= Delve.G.grid[0].length || ty >= Delve.G.grid.length){
      Delve.flash("Tap inside the dungeon");
      return;
    }

    Delve.tryAct(tx, ty);
    Delve.draw();
  }

  canvas.addEventListener("pointerdown", handleTap, {passive:false});
  canvas.addEventListener("touchstart", handleTap, {passive:false});
})();
