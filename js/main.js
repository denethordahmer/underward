window.Delve = window.Delve || {};
(function(){
  Delve.canvas = document.getElementById("canvas");
  Delve.ctx = Delve.canvas.getContext("2d");
  Delve.W=0; Delve.H=0; Delve.ts=0; Delve.viewW=0; Delve.viewH=0; Delve.camX=0; Delve.camY=0;

  Delve.resize = function(){
    const dpr = window.devicePixelRatio || 1;
    Delve.W = window.innerWidth;
    Delve.H = window.innerHeight;
    Delve.canvas.width  = Math.round(Delve.W*dpr);
    Delve.canvas.height = Math.round(Delve.H*dpr);
    Delve.canvas.style.width = Delve.W+"px";
    Delve.canvas.style.height = Delve.H+"px";
    Delve.ctx.setTransform(dpr,0,0,dpr,0,0);
    Delve.ts = Math.floor(Math.min(Delve.W,Delve.H)/9);
    if(Delve.ts<28) Delve.ts=28;
    Delve.computeView();
  };

  Delve.computeView = function(){
    Delve.viewW = Math.floor(Delve.W/Delve.ts);
    Delve.viewH = Math.floor(Delve.H/Delve.ts);
    // Never allow a view larger than the grid — prevents camera weirdness on big tiles/small grids
    if(Delve.G && Delve.G.grid && Delve.G.grid.length){
      Delve.viewW = Math.min(Delve.viewW, Delve.G.grid.length);
      Delve.viewH = Math.min(Delve.viewH, Delve.G.grid[0].length);
    }
  };

  window.addEventListener("resize", function(){
    Delve.resize();
    if(Delve.G) Delve.draw();
  });

  // Allow taps to register even when PWA/standalone misreports sizes
  window.addEventListener("orientationchange", function(){
    setTimeout(function(){ Delve.resize(); if(Delve.G) Delve.draw(); }, 250);
  });

  Delve.resize();
  Delve.showHub();
})();
