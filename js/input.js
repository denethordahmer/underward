window.Delve = window.Delve || {};
(function(){
  Delve.canvas.addEventListener("pointerdown", e=>{
    if(!Delve.G || document.getElementById("deathScreen").style.display==="flex") return;
    const rect=Delve.canvas.getBoundingClientRect();
    const px=e.clientX-rect.left, py=e.clientY-rect.top;
    const tx=Math.floor(px/Delve.ts)+Delve.camX;
    const ty=Math.floor(py/Delve.ts)+Delve.camY;
    Delve.tryAct(tx,ty);
    Delve.draw();
  });
})();
