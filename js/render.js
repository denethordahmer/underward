window.Delve = window.Delve || {};
(function(){
  let camX=0, camY=0;

  Delve.draw = function(){
    const G=Delve.G; if(!G) return;
    const ctx=Delve.ctx, W=Delve.W, H=Delve.H, ts=Delve.ts;
    Delve.computeView();
    const vw=Delve.viewW, vh=Delve.viewH;

    camX = Delve.clamp(G.px - Math.floor(vw/2), 0, G.grid.length - vw);
    camY = Delve.clamp(G.py - Math.floor(vh/2), 0, G.grid.length - vh);
    Delve.camX=camX; Delve.camY=camY;

    ctx.fillStyle="#0b0f14"; ctx.fillRect(0,0,W,H);

    for(let y=0;y<vh;y++){
      for(let x=0;x<vw;x++){
        const gx=camX+x, gy=camY+y, sx=x*ts, sy=y*ts;
        if(!G.grid[gy] || G.grid[gy][gx]===undefined) continue;
        const c=G.grid[gy][gx];
        ctx.fillStyle = c===Delve.T.WALL ? "#1b2530" : "#141b23";
        ctx.fillRect(sx,sy,ts,ts);
        if(c===Delve.T.STAIR){
          ctx.fillStyle="#2ad0b0"; ctx.fillRect(sx+ts*0.2,sy+ts*0.2,ts*0.6,ts*0.6);
          ctx.fillStyle="#0b0f14"; ctx.fillRect(sx+ts*0.42,sy+ts*0.42,ts*0.16,ts*0.16);
        }
      }
    }

    // adjacent highlights
    const adj=[[0,1],[0,-1],[1,0],[-1,0]];
    for(const [ax,ay] of adj){
      const gx=G.px+ax, gy=G.py+ay;
      if(gx-camX<0||gy-camY<0||gx-camX>=vw||gy-camY>=vh) continue;
      const c=G.grid[gy][gx]; if(c===Delve.T.WALL) continue;
      const sx=(gx-camX)*ts, sy=(gy-camY)*ts;
      ctx.fillStyle = (c===Delve.T.MONSTER||c===Delve.T.BOSS) ? "rgba(255,140,90,0.35)" : "rgba(110,200,255,0.22)";
      ctx.fillRect(sx,sy,ts,ts);
    }

    for(const m of G.monsters) drawMob(m);
    if(G.boss) drawMob(G.boss);

    const pxp=(G.px-camX)*ts, pyp=(G.py-camY)*ts;
    ctx.fillStyle="#38d5ff";
    ctx.beginPath(); ctx.arc(pxp+ts/2,pyp+ts/2,ts*0.36,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#dff6ff"; ctx.lineWidth=2; ctx.stroke();

    if(G.msg && Date.now()<G.msgUntil){
      ctx.fillStyle="#eafff5"; ctx.font="700 15px system-ui"; ctx.textAlign="center";
      ctx.fillText(G.msg, W/2, H-46);
    }
  };

  function drawMob(m){
    const ctx=Delve.ctx, ts=Delve.ts;
    const sx=(m.x-Delve.camX)*ts, sy=(m.y-Delve.camY)*ts;
    const cx=sx+ts/2, cy=sy+ts/2, r=m.isBoss?ts*0.45:ts*0.34;
    ctx.fillStyle=m.isBoss?"#b45aff":"#ff5c7a";
    ctx.beginPath();
    if(m.isBoss){ ctx.arc(cx,cy,r,0,Math.PI*2); }
    else { ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.9,cy+r*0.5); ctx.lineTo(cx-r*0.9,cy+r*0.5); ctx.closePath(); }
    ctx.fill(); ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=2; ctx.stroke();

    const mhp = m.isBoss ? Delve.bossHp() : (Delve.CONFIG.monsterHpBase+Delve.CONFIG.monsterHpPerFloor*(Delve.G.floor-1));
    const frac=Math.max(0, m.hp/mhp);
    ctx.fillStyle="#33121a"; ctx.fillRect(sx+2,sy-2,ts-4,4);
    ctx.fillStyle="#ff5c7a"; ctx.fillRect(sx+2,sy-2,(ts-4)*frac,4);
  }
})();
