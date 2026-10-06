window.Delve = window.Delve || {};
(function(){
  let camX=0, camY=0;

  const COL = {
    floorA:  "#26303c",
    floorB:  "#222b36",
    grid:    "rgba(0,0,0,0.18)",
    wall:    "#0d1219",
    wallEdge:"#2a3542",
    stair:   "#2ad0b0",
    stairGlow:"rgba(42,208,176,0.35)",
    player:  "#3ad5ff",
    playerRing:"#dffaff",
    move:    "rgba(110,200,255,0.20)",
    attack:  "rgba(255,140,90,0.32)"
  };

  Delve.draw = function(){
    const G=Delve.G; if(!G) return;
    const ctx=Delve.ctx, W=Delve.W, H=Delve.H, ts=Delve.ts;
    Delve.computeView();
    const vw=Delve.viewW, vh=Delve.viewH;

    camX = Delve.clamp(G.px - Math.floor(vw/2), 0, G.grid.length - vw);
    camY = Delve.clamp(G.py - Math.floor(vh/2), 0, G.grid.length - vh);
    Delve.camX=camX; Delve.camY=camY;

    ctx.fillStyle="#0b0f14"; ctx.fillRect(0,0,W,H);

    // ---- tiles ----
    for(let y=0;y<vh;y++){
      for(let x=0;x<vw;x++){
        const gx=camX+x, gy=camY+y;
        if(!G.grid[gy] || G.grid[gy][gx]===undefined) continue;
        const sx=x*ts, sy=y*ts;
        const c=G.grid[gy][gx];

        if(c===Delve.T.WALL){
          ctx.fillStyle=COL.wall; ctx.fillRect(sx,sy,ts,ts);
          // bevel — top/left light edge reads as a raised wall
          ctx.fillStyle=COL.wallEdge;
          ctx.fillRect(sx,sy,ts,2);
          ctx.fillRect(sx,sy,2,ts);
          continue;
        }

        // checkerboard floor for depth, without needing a visible grid
        ctx.fillStyle = ((gx+gy)%2===0) ? COL.floorA : COL.floorB;
        ctx.fillRect(sx,sy,ts,ts);

        // faint grid lines so tiles read individually
        ctx.strokeStyle=COL.grid; ctx.lineWidth=1;
        ctx.strokeRect(sx+0.5, sy+0.5, ts, ts);

        if(c===Delve.T.STAIR){
          // soft glow under the stairs
          ctx.fillStyle=COL.stairGlow;
          ctx.fillRect(sx,sy,ts,ts);
          // steps
          ctx.fillStyle=COL.stair;
          ctx.fillRect(sx+ts*0.18, sy+ts*0.18, ts*0.64, ts*0.62);
          ctx.fillStyle="#0b0f14";
          ctx.fillRect(sx+ts*0.42, sy+ts*0.40, ts*0.16, ts*0.16);
          ctx.fillRect(sx+ts*0.42, sy+ts*0.56, ts*0.16, ts*0.16);
        }
      }
    }

    // ---- move/attack highlights (the "invisible grid" made subtly visible) ----
    const adj=[[0,1],[0,-1],[1,0],[-1,0]];
    for(const [ax,ay] of adj){
      const gx=G.px+ax, gy=G.py+ay;
      if(gx-camX<0||gy-camY<0||gx-camX>=vw||gy-camY>=vh) continue;
      const c=G.grid[gy][gx];
      if(c===Delve.T.WALL) continue;
      const sx=(gx-camX)*ts, sy=(gy-camY)*ts;
      ctx.fillStyle = (c===Delve.T.MONSTER||c===Delve.T.BOSS) ? COL.attack : COL.move;
      ctx.fillRect(sx,sy,ts,ts);
      ctx.strokeStyle = (c===Delve.T.MONSTER||c===Delve.T.BOSS) ? "rgba(255,160,110,0.85)" : "rgba(130,215,255,0.8)";
      ctx.lineWidth=1.5;
      ctx.strokeRect(sx+1, sy+1, ts-2, ts-2);
    }

    // ---- monsters ----
    for(const m of G.monsters) drawMob(m);
    if(G.boss) drawMob(G.boss);

    // ---- player ----
    const pxp=(G.px-camX)*ts, pyp=(G.py-camY)*ts;
    const cx=pxp+ts/2, cy=pyp+ts/2;
    // soft glow
    const glow = ctx.createRadialGradient(cx,cy,0,cx,cy,ts*0.6);
    glow.addColorStop(0,"rgba(58,213,255,0.5)");
    glow.addColorStop(1,"rgba(58,213,255,0)");
    ctx.fillStyle=glow;
    ctx.fillRect(pxp, pyp, ts, ts);
    // diamond body
    ctx.fillStyle=COL.player;
    ctx.beginPath();
    ctx.moveTo(cx, cy-ts*0.34);
    ctx.lineTo(cx+ts*0.34, cy);
    ctx.lineTo(cx, cy+ts*0.34);
    ctx.lineTo(cx-ts*0.34, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=COL.playerRing; ctx.lineWidth=2;
    ctx.stroke();

    // ---- message ----
    if(G.msg && Date.now()<G.msgUntil){
      ctx.font="700 15px system-ui";
      ctx.textAlign="center";
      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.fillText(G.msg, W/2+1, H-45);
      ctx.fillStyle="#eafff5";
      ctx.fillText(G.msg, W/2, H-46);
    }
  };

  function drawMob(m){
    const ctx=Delve.ctx, ts=Delve.ts;
    const sx=(m.x-Delve.camX)*ts, sy=(m.y-Delve.camY)*ts;
    const cx=sx+ts/2, cy=sy+ts/2, r=m.isBoss?ts*0.45:ts*0.33;

    // shadow
    ctx.fillStyle="rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy+r*0.75, r*0.8, r*0.32, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle=m.isBoss?"#b45aff":"#ff5c7a";
    ctx.strokeStyle="rgba(0,0,0,0.45)";
    ctx.lineWidth=2;
    ctx.beginPath();
    if(m.isBoss){
      ctx.arc(cx,cy,r,0,Math.PI*2);
    } else {
      ctx.moveTo(cx,cy-r);
      ctx.lineTo(cx+r*0.9, cy+r*0.5);
      ctx.lineTo(cx-r*0.9, cy+r*0.5);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // hp bar
    const mhp = m.isBoss ? Delve.bossHp() : (Delve.CONFIG.monsterHpBase+Delve.CONFIG.monsterHpPerFloor*(Delve.G.floor-1));
    const frac=Math.max(0, m.hp/mhp);
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(sx+2, sy-3, ts-4, 4);
    ctx.fillStyle=m.isBoss?"#c98aff":"#ff7d93";
    ctx.fillRect(sx+2, sy-3, (ts-4)*frac, 4);
  }
})();
