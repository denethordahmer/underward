window.Delve = window.Delve || {};
(function(){

  let shakeT = 0, shakeMag = 0;
  let floaters = [];

  function hash2(x,y){
    let n = x*374761393 + y*668265263;
    n = (n ^ (n>>13)) * 1274126177;
    return ((n ^ (n>>16)) >>> 0) / 4294967295;
  }

  function biome(floor){
    if(floor<=4)  return { wall:"#192129", edge:"#4d5b67", floor:"#2e3842", floor2:"#283039", moss:"#3f6d55" };
    if(floor<=9)  return { wall:"#17241b", edge:"#41614a", floor:"#2f4033", floor2:"#28382c", moss:"#5c8a59" };
    if(floor<=14) return { wall:"#271d22", edge:"#78506c", floor:"#3d2a3b", floor2:"#362435", moss:"#8c5f96" };
    return { wall:"#2a1d12", edge:"#82613b", floor:"#47351f", floor2:"#3e2e1c", moss:"#b8863c" };
  }

  function tileAt(gx,gy){
    const g = Delve.G.grid;
    return (g[gy] && g[gy][gx] !== undefined) ? g[gy][gx] : null;
  }

  function drawFloorTile(ctx,sx,sy,ts,gx,gy,b){
    ctx.fillStyle = ((gx+gy)%2===0) ? b.floor : b.floor2;
    ctx.fillRect(sx,sy,ts,ts);

    const n = hash2(gx,gy);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for(let i=0;i<4;i++){
      const rx = sx + ((n*(i+3)*7919) % 1)*(ts-4);
      const ry = sy + ((n*(i+7)*104729) % 1)*(ts-4);
      ctx.fillRect(rx, ry, 2, 2);
    }

    if(n > 0.68){
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx+ts*0.2, sy+ts*0.15);
      ctx.lineTo(sx+ts*0.4, sy+ts*0.55);
      ctx.lineTo(sx+ts*0.3, sy+ts*0.85);
      ctx.stroke();
    }

    if(n < 0.12){
      ctx.fillStyle = b.moss;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(sx + ((n*97) % 1)*ts*0.5, sy + ts*0.6, ts*0.35, ts*0.2);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx+0.5, sy+0.5, ts, ts);
  }

  function drawWallTile(ctx,sx,sy,ts,gx,gy,b){
    ctx.fillStyle = b.wall;
    ctx.fillRect(sx,sy,ts,ts);

    ctx.fillStyle = b.edge;
    ctx.fillRect(sx,sy,ts,Math.max(2, ts*0.12));
    ctx.fillRect(sx,sy,Math.max(2, ts*0.12),ts);

    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    if(ts >= 24){
      ctx.beginPath();
      ctx.moveTo(sx, sy+ts*0.5); ctx.lineTo(sx+ts, sy+ts*0.5);
      ctx.moveTo(sx+ts*0.5, sy+ts*0.5); ctx.lineTo(sx+ts*0.5, sy+ts);
      if(hash2(gx,gy)>0.5){ ctx.moveTo(sx, sy+ts*0.75); ctx.lineTo(sx+ts*0.5, sy+ts*0.75); }
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(sx, sy, ts, 2);
  }

  function drawStairs(ctx,sx,sy,ts){
    ctx.fillStyle = "rgba(42,208,176,0.20)";
    ctx.fillRect(sx,sy,ts,ts);
    ctx.fillStyle = "#2ad0b0";
    ctx.fillRect(sx+ts*0.15, sy+ts*0.15, ts*0.70, ts*0.70);
    ctx.fillStyle = "#0b201b";
    ctx.fillRect(sx+ts*0.4, sy+ts*0.35, ts*0.2, ts*0.14);
    ctx.fillRect(sx+ts*0.4, sy+ts*0.55, ts*0.2, ts*0.14);
  }

  function drawShadow(ctx,cx,cy,ts){
    const s = Delve.SPR && Delve.SPR.shadow;
    if(s){
      const w = ts*0.8, h = w * (s.height/s.width) * 0.5;
      ctx.drawImage(s, cx-w/2, cy+ts*0.30, w, h);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(cx, cy+ts*0.33, ts*0.28, ts*0.09, 0, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawSprite(ctx,kind,cx,cy,ts,hurt){
    const S = Delve.SPR && Delve.SPR[kind];
    if(!S){
      // fallback if sprites failed to build
      ctx.fillStyle = "#ff5c7a";
      ctx.beginPath();
      ctx.arc(cx,cy,ts*0.3,0,Math.PI*2);
      ctx.fill();
      return;
    }
    const img = hurt ? (S.hurt || S.idle) : S.idle;
    const size = ts * 0.9;
    ctx.drawImage(img, cx-size/2, cy-size/2, size, size);
  }

  function drawPlayer(ctx,cx,cy,ts,hurt){
    drawShadow(ctx,cx,cy,ts);
    drawSprite(ctx,"soldier",cx,cy,ts,hurt);
  }

  function drawMob(ctx,m,cx,cy,ts){
    drawShadow(ctx,cx,cy,ts);
    const hurt = m.hitFlash && Date.now() - m.hitFlash < 130;
    drawSprite(ctx, m.kind || "goblin", cx, cy, ts, hurt);
    // hp bar
    const mhp = m.isBoss ? Delve.bossHp()
              : (Delve.CONFIG.monsterHpBase + Delve.CONFIG.monsterHpPerFloor*(Delve.G.floor-1));
    const frac = Math.max(0, Math.min(1, m.hp/mhp));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(cx-ts*0.34, cy-ts*0.55, ts*0.68, 4);
    ctx.fillStyle = m.isBoss ? "#c98aff" : "#ff7d93";
    ctx.fillRect(cx-ts*0.34, cy-ts*0.55, ts*0.68*frac, 4);
  }

  function drawItem(ctx,it,cx,cy,ts){
    const col = Delve.TIERS.colors[it.tier] || "#ffffff";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy+ts*0.30, ts*0.20, ts*0.08, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = col;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy-ts*0.26);
    ctx.lineTo(cx+ts*0.26, cy);
    ctx.lineTo(cx, cy+ts*0.26);
    ctx.lineTo(cx-ts*0.26, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(cx-ts*0.06, cy-ts*0.06, ts*0.12, ts*0.12);
  }

  function drawFloaters(ctx,camX,camY,ts){
    const now = Date.now();
    const alive = [];
    for(const f of floaters){
      const age = f.t;
      if(age > 28) continue;
      f.t++;
      const sx = (f.x - camX)*ts + ts*0.5;
      const sy = (f.y - camY)*ts - age*2;
      const alpha = Math.max(0, 1 - age/28);
      ctx.globalAlpha = alpha;
      ctx.font = "700 " + Math.max(11, ts*0.32) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillText(f.txt, sx+1, sy+1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.txt, sx, sy);
      ctx.globalAlpha = 1;
      alive.push(f);
    }
    floaters = alive;
  }

  Delve.draw = function(){
    const G = Delve.G;
    if(!G) return;

    const ctx = Delve.ctx, W = Delve.W, H = Delve.H, ts = Delve.ts;
    Delve.computeView();
    const vw = Delve.viewW, vh = Delve.viewH;
    const b = biome(G.floor);

    let camX = Math.floor(G.px - vw/2);
    let camY = Math.floor(G.py - vh/2);
    camX = Math.max(0, Math.min(camX, G.grid[0].length - vw));
    camY = Math.max(0, Math.min(camY, G.grid.length - vh));
    Delve.camX = camX;
    Delve.camY = camY;

    let ox = 0, oy = 0;
    if(shakeT > 0){
      ox = (Math.random()-0.5)*shakeMag;
      oy = (Math.random()-0.5)*shakeMag;
      shakeT--;
    }

    ctx.save();
    ctx.translate(ox, oy);

    // background
    ctx.fillStyle = "#06090d";
    ctx.fillRect(-10, -10, W+20, H+20);

    // tiles
    for(let y=0; y<vh+1; y++){
      for(let x=0; x<vw+1; x++){
        const gx = camX+x, gy = camY+y;
        const t = tileAt(gx,gy);
        if(t === null) continue;
        const sx = x*ts, sy = y*ts;
        if(t === Delve.T.WALL){
          drawWallTile(ctx,sx,sy,ts,gx,gy,b);
        } else {
          drawFloorTile(ctx,sx,sy,ts,gx,gy,b);
          if(t === Delve.T.STAIR) drawStairs(ctx,sx,sy,ts);
        }
      }
    }

    // adjacent highlights
    const adj = [[0,1],[0,-1],[1,0],[-1,0]];
    for(const d of adj){
      const gx = G.px+d[0], gy = G.py+d[1];
      if(gx<camX || gy<camY || gx>=camX+vw || gy>=camY+vh) continue;
      const t = tileAt(gx,gy);
      if(t === null || t === Delve.T.WALL) continue;
      const sx = (gx-camX)*ts, sy = (gy-camY)*ts;
      if(t === Delve.T.MONSTER || t === Delve.T.BOSS){
        ctx.fillStyle = "rgba(255,140,90,0.30)";
        ctx.strokeStyle = "rgba(255,170,120,0.9)";
      } else {
        ctx.fillStyle = "rgba(110,200,255,0.22)";
        ctx.strokeStyle = "rgba(140,220,255,0.85)";
      }
      ctx.fillRect(sx,sy,ts,ts);
      ctx.lineWidth = 2;
      ctx.strokeRect(sx+1, sy+1, ts-2, ts-2);
    }

    // dropped items
    for(const it of (G.items || [])){
      if(it.x < camX || it.y < camY || it.x >= camX+vw || it.y >= camY+vh) continue;
      drawItem(ctx, it, (it.x-camX)*ts + ts/2, (it.y-camY)*ts + ts/2, ts);
    }

    // monsters
    for(const m of G.monsters){
      if(m.x < camX || m.y < camY || m.x >= camX+vw || m.y >= camY+vh) continue;
      drawMob(ctx, m, (m.x-camX)*ts + ts/2, (m.y-camY)*ts + ts/2, ts);
    }

    // boss
    if(G.boss && G.boss.x >= camX && G.boss.y >= camY && G.boss.x < camX+vw && G.boss.y < camY+vh){
      drawMob(ctx, G.boss, (G.boss.x-camX)*ts + ts/2, (G.boss.y-camY)*ts + ts/2, ts);
    }

    // player
    const pSX = (G.px-camX)*ts, pSY = (G.py-camY)*ts;
    const pHurt = G.playerHit && Date.now() - G.playerHit < 150;
    drawPlayer(ctx, pSX+ts/2, pSY+ts/2, ts, pHurt);

    // floating combat numbers (world-coordinate)
    drawFloaters(ctx, camX, camY, ts);

    // vignette
    const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();

    // message
    if(G.msg && Date.now() < G.msgUntil){
      ctx.font = "700 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(G.msg, W/2+1, H-45);
      ctx.fillStyle = "#eafff5";
      ctx.fillText(G.msg, W/2, H-46);
    }
  };

  Delve.addFloater = function(txt,x,y,col){
    floaters.push({ txt:txt, x:x, y:y, col:col, t:0 });
  };

  Delve.addShake = function(mag){
    shakeMag = Math.max(shakeMag, mag);
    shakeT = 6;
  };
})();
