window.Delve = window.Delve || {};
(function(){
  let camX=0, camY=0;

  function biomeTint(floor){
    const t = [
      {wall:"#10151d", wallEdge:"#39444f", floor:"#2a3440", speck:"#232c37"},
      {wall:"#0e1a15", wallEdge:"#2f4a3f", floor:"#253c33", speck:"#1e322b"},
      {wall:"#15111d", wallEdge:"#4a3750", floor:"#2d2640", speck:"#251f35"},
      {wall:"#1a120d", wallEdge:"#574127", floor:"#3d3122", speck:"#342919"}
    ];
    if(floor <= 4)  return t[0];
    if(floor <= 9)  return t[1];
    if(floor <= 14) return t[2];
    return t[3];
  }

  function hash2(x,y){
    let n = x*374761393 + y*668265263;
    n = (n ^ (n>>13)) * 1274126177;
    return ((n ^ (n>>16)) >>> 0) / 4294967295;
  }

  Delve.draw = function(){
    const G=Delve.G; if(!G) return;
    const ctx=Delve.ctx, W=Delve.W, H=Delve.H, ts=Delve.ts;
    Delve.computeView();
    const vw=Delve.viewW, vh=Delve.viewH;
    const B = biomeTint(G.floor);

    camX = Delve.clamp(G.px - Math.floor(vw/2), 0, G.grid.length - vw);
    camY = Delve.clamp(G.py - Math.floor(vh/2), 0, G.grid.length - vh);
    Delve.camX=camX; Delve.camY=camY;

    ctx.fillStyle="#070a0e"; ctx.fillRect(0,0,W,H);

    // ---- tiles ----
    for(let y=0;y<vh;y++){
      for(let x=0;x<vw;x++){
        const gx=camX+x, gy=camY+y;
        if(!G.grid[gy] || G.grid[gy][gx]===undefined) continue;
        const sx=x*ts, sy=y*ts;
        const c=G.grid[gy][gx];

        if(c===Delve.T.WALL){
          ctx.fillStyle=B.wall; ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle=B.wallEdge;
          ctx.fillRect(sx,sy,ts,Math.max(2,ts*0.10));
          ctx.fillRect(sx,sy,Math.max(2,ts*0.10),ts);
          ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=1;
          if(ts>=24){
            ctx.beginPath();
            ctx.moveTo(sx, sy+ts*0.5); ctx.lineTo(sx+ts, sy+ts*0.5);
            ctx.moveTo(sx+ts*0.5, sy+ts*0.5); ctx.lineTo(sx+ts*0.5, sy+ts);
            if(hash2(gx,gy)>0.5){ ctx.moveTo(sx, sy+ts*0.75); ctx.lineTo(sx+ts*0.5, sy+ts*0.75); }
            ctx.stroke();
          }
          continue;
        }

        const shade = ((gx+gy)%2===0) ? B.floor : B.speck;
        ctx.fillStyle = shade; ctx.fillRect(sx,sy,ts,ts);

        if(ts>=26){
          ctx.fillStyle="rgba(0,0,0,0.22)";
          for(let s=0;s<3;s++){
            const rx = sx + 2 + hash2(gx*7+s, gy*13+s)* (ts-4);
            const ry = sy + 2 + hash2(gx*13+s, gy*7+s)* (ts-4);
            ctx.fillRect(rx, ry, 2, 2);
          }
          if(hash2(gx,gy*3)>0.82){
            ctx.strokeStyle="rgba(0,0,0,0.28)"; ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(sx+ts*0.15, sy+ts*0.2);
            ctx.lineTo(sx+ts*0.45, sy+ts*0.5);
            ctx.lineTo(sx+ts*0.25, sy+ts*0.8);
            ctx.stroke();
          }
        }

        ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=1;
        ctx.strokeRect(sx+0.5, sy+0.5, ts, ts);

        if(c===Delve.T.STAIR){
          ctx.fillStyle="rgba(42,208,176,0.28)";
          ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="#2ad0b0";
          ctx.fillRect(sx+ts*0.16, sy+ts*0.16, ts*0.68, ts*0.68);
          ctx.fillStyle="#0a1815";
          ctx.fillRect(sx+ts*0.42, sy+ts*0.38, ts*0.16, ts*0.16);
          ctx.fillRect(sx+ts*0.42, sy+ts*0.60, ts*0.16, ts*0.16);
        }
      }
    }

    // ---- adjacent highlights ----
    const adj=[[0,1],[0,-1],[1,0],[-1,0]];
    for(const [ax,ay] of adj){
      const gx=G.px+ax, gy=G.py+ay;
      if(gx-camX<0||gy-camY<0||gx-camX>=vw||gy-camY>=vh) continue;
      const c=G.grid[gy][gx];
      if(c===Delve.T.WALL) continue;
      const sx=(gx-camX)*ts, sy=(gy-camY)*ts;
      const hostile = (c===Delve.T.MONSTER||c===Delve.T.BOSS);
      ctx.fillStyle = hostile ? "rgba(255,140,90,0.30)" : "rgba(110,200,255,0.22)";
      ctx.fillRect(sx,sy,ts,ts);
      ctx.strokeStyle = hostile ? "rgba(255,170,120,0.9)" : "rgba(140,220,255,0.85)";
      ctx.lineWidth=2;
      ctx.strokeRect(sx+1, sy+1, ts-2, ts-2);
    }

    // ---- monsters ----
    for(const m of G.monsters) drawMob(m);
    if(G.boss) drawMob(G.boss);

    // ---- dropped items ----
    for(const it of G.items){
      if(it.x < camX || it.y < camY || it.x >= camX+vw || it.y >= camY+vh) continue;
      const sx=(it.x-camX)*ts, sy=(it.y-camY)*ts;
      const cx=sx+ts/2, cy=sy+ts/2;
      const col = Delve.TIERS.colors[it.tier] || "#ffffff";

      ctx.fillStyle="rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(cx, cy+ts*0.28, ts*0.22, ts*0.10, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle="rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(cx, cy, ts*0.32, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle=col;
      ctx.strokeStyle="rgba(255,255,255,0.85)";
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy-ts*0.26);
      ctx.lineTo(cx+ts*0.26, cy);
      ctx.lineTo(cx, cy+ts*0.26);
      ctx.lineTo(cx-ts*0.26, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle="rgba(255,255,255,0.9)";
      ctx.fillRect(cx-ts*0.06, cy-ts*0.06, ts*0.12, ts*0.12);
    }

    // ---- player ----
    const pxp=(G.px-camX)*ts, pyp=(G.py-camY)*ts;
    const pcx=pxp+ts/2, pcy=pyp+ts/2;

    const light = ctx.createRadialGradient(pcx,pcy,ts*0.2,pcx,pcy,ts*3.2);
    light.addColorStop(0,"rgba(80,190,255,0.20)");
    light.addColorStop(0.5,"rgba(80,170,255,0.06)");
    light.addColorStop(1,"rgba(0,0,0,0.35)");
    ctx.fillStyle=light;
    ctx.fillRect(pxp-ts*2, pyp-ts*2, ts*5, ts*5);

    ctx.fillStyle="#4fd8ff";
    ctx.beginPath();
    ctx.moveTo(pcx, pcy-ts*0.34);
    ctx.lineTo(pcx+ts*0.34, pcy);
    ctx.lineTo(pcx, pcy+ts*0.34);
    ctx.lineTo(pcx-ts*0.34, pcy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle="#e8fbff"; ctx.lineWidth=2;
    ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.85)";
    ctx.fillRect(pcx-ts*0.08, pcy-ts*0.08, ts*0.16, ts*0.16);

    // vignette
    const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.75);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(1,"rgba(0,0,0,0.42)");
    ctx.fillStyle=vig;
    ctx.fillRect(0,0,W,H);

    if(G.msg && Date.now()<G.msgUntil){
      ctx.font="700 16px system-ui";
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

    ctx.fillStyle="rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy+r*0.8, r*0.85, r*0.3, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle=m.isBoss?"#b45aff":"#ff5c7a";
    ctx.strokeStyle="rgba(0,0,0,0.5)";
    ctx.lineWidth=2;
    ctx.beginPath();
    if(m.isBoss){
      ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.85)";
      ctx.fillRect(cx-ts*0.14, cy-ts*0.05, ts*0.08, ts*0.08);
      ctx.fillRect(cx+ts*0.06, cy-ts*0.05, ts*0.08, ts*0.08);
    } else {
      ctx.moveTo(cx,cy-r);
      ctx.lineTo(cx+r*0.9, cy+r*0.5);
      ctx.lineTo(cx-r*0.9, cy+r*0.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.8)";
      ctx.fillRect(cx-ts*0.10, cy-ts*0.0, ts*0.06, ts*0.06);
      ctx.fillRect(cx+ts*0.04, cy-ts*0.0, ts*0.06, ts*0.06);
    }

    const mhp = m.isBoss ? Delve.bossHp()
              : (Delve.CONFIG.monsterHpBase+Delve.CONFIG.monsterHpPerFloor*(Delve.G.floor-1));
    const frac=Math.max(0, m.hp/mhp);
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(sx+2, sy-3, ts-4, 4);
    ctx.fillStyle=m.isBoss?"#c98aff":"#ff7d93";
    ctx.fillRect(sx+2, sy-3, (ts-4)*frac, 4);
  }
})();
