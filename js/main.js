window.Delve = window.Delve || {};
(function(){
  Delve.canvas = document.getElementById("canvas");
  Delve.ctx = Delve.canvas.getContext("2d");
  Delve.W=0; Delve.H=0; Delve.ts=0; Delve.viewW=0; Delve.viewH=0; Delve.camX=0; Delve.camY=0;

  Delve.resize = function(){
    const dpr = window.devicePixelRatio || 1;
    Delve.W = window.innerWidth; Delve.H = window.innerHeight;
    Delve.canvas.width  = Math.round(Delve.W*dpr);
    Delve.canvas.height = Math.round(Delve.H*dpr);
    Delve.canvas.style.width = Delve.W+"px";
    Delve.canvas.style.height = Delve.H+"px";
    Delve.ctx.setTransform(dpr,0,0,dpr,0,0);
    Delve.ts = Math.floor(Math.min(Delve.W,Delve.H)/9);
    if(Delve.ts<20) Delve.ts=20;
    Delve.computeView();
  };

  Delve.computeView = function(){
    Delve.viewW = Math.floor(Delve.W/Delve.ts);
    Delve.viewH = Math.floor(Delve.H/Delve.ts);
    if(Delve.G && Delve.G.grid.length < Delve.viewW) Delve.viewW = Delve.G.grid.length;
    if(Delve.G && Delve.G.grid.length < Delve.viewH) Delve.viewH = Delve.G.grid.length;
  };

  window.addEventListener("resize", ()=>{ Delve.resize(); if(Delve.G) Delve.draw(); });

  Delve.resize();
  Delve.showHub();
})();
