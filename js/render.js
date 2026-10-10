window.Delve = window.Delve || {};
(function(){

  let shakeT = 0, shakeMag = 0;
  let floaters = [];   // {txt, x, y, col, born} — born = Date.now()
  const FLOAT_LIFE = 1200; // ms

  function hash2(x,y){
    let n = x*374761393 + y*668265263;
    n = (n ^ (n>>13)) * 1274126177;
    return ((n ^ (n>>16)) >>> 0) / 4294967295;
  }

  function biome(){
    // Use floor to pick biome index
    const G = Delve.G;
    const ward = G ? Delve.getWard(G.floor) : null;
    const idx = (ward && ward.biome !== undefined) ? ward.biome : 0;
    const b = (Delve.CONFIG.BIOMES && Delve.CONFIG.BIOMES[idx]) || Delve.CONFIG.BIOMES[0] || {};
    return {
      wall: b.wall || "#192129", wallEdge: b.wallEdge || "#4d5b67",
      wallBrick: b.wallBrick || "#10161d",
      floor: b.floor || "#2e3842", floor2: b.floor2 || "#283039",
      moss: b.moss || "#3f6d55", water: b.water || "#1e3a4a",
      torch: b.torch || "#ffb347", light: b.light || "rgba(70,140,255,0.06)"
    };
  }

  function tileAt(gx,gy){
    const g = Delve.G.grid;
    return (g[gy] && g[gy][gx] !== undefined) ? g[gy][gx] : null;
  }

  // ── FLOOR TILE (no grid lines) ──────────────────────────────
  function drawFloorTile(ctx,sx,sy,ts,gx,gy,b){
    // Base checker
    ctx.fillStyle = ((gx+gy)%2===0) ? b.floor : b.floor2;
    ctx.fillRect(sx,sy,ts,ts);

    const n = hash2(gx,gy);

    // Subtle stone crack
    if(n > 0.72){
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      const cx1 = sx + n*ts*0.4 + ts*0.1;
      const cy1 = sy + ((n*7)%1)*ts*0.3 + ts*0.1;
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx1 + ts*0.22, cy1 + ts*0.30);
      ctx.lineTo(cx1 + ts*0.18, cy1 + ts*0.55);
      ctx.stroke();
      ctx.restore();
    }

    // Mossy patch
    if(n < 0.10){
      ctx.fillStyle = b.moss;
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.ellipse(sx + ((n*173)%1)*ts*0.5 + ts*0.15, sy + ts*0.65, ts*0.22, ts*0.10, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Subtle rubble dots
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for(let i=0;i<3;i++){
      const rx = sx + ((n*(i+3)*7919) % 1)*(ts-3);
      const ry = sy + ((n*(i+5)*104729) % 1)*(ts-3);
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }
  }

  // ── WALL TILE ───────────────────────────────────────────────
  function drawWallTile(ctx,sx,sy,ts,gx,gy,b){
    // Main wall fill
    ctx.fillStyle = b.wall;
    ctx.fillRect(sx,sy,ts,ts);

    // Top-left bevel (lighter edge — light from above)
    ctx.fillStyle = b.wallEdge;
    ctx.fillRect(sx, sy, ts, Math.max(2, ts*0.10));
    ctx.fillRect(sx, sy, Math.max(2, ts*0.07), ts);

    const n = hash2(gx,gy);

    if(ts >= 22){
      // Horizontal mortar line (top half / bottom half)
      ctx.strokeStyle = b.wallBrick;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(sx+1, sy+ts*0.50);
      ctx.lineTo(sx+ts-1, sy+ts*0.50);
      // Vertical break — offset every other row for brick pattern
      const vOff = (gy % 2 === 0) ? 0.25 : 0.75;
      ctx.moveTo(sx+ts*vOff, sy+ts*0.50);
      ctx.lineTo(sx+ts*vOff, sy+ts-1);
      if(n > 0.50){
        const vOff2 = (gy % 2 === 0) ? 0.75 : 0.25;
        ctx.moveTo(sx+ts*vOff2, sy+1);
        ctx.lineTo(sx+ts*vOff2, sy+ts*0.50);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Highlight sheen top edge
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(sx, sy, ts, 2);
    // Shadow bottom edge
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx, sy+ts-2, ts, 2);
  }

  // ── STAIRS ─────────────────────────────────────────────────
  function drawStairs(ctx,sx,sy,ts){
    ctx.fillStyle = "rgba(42,208,176,0.18)";
    ctx.fillRect(sx,sy,ts,ts);
    // Step outlines
    ctx.strokeStyle = "#2ad0b0";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    const steps = 3;
    for(let i=0;i<steps;i++){
      const inset = ts*(0.12 + i*0.10);
      ctx.strokeRect(sx+inset, sy+inset, ts-inset*2, ts-inset*2);
    }
    ctx.globalAlpha = 1;
    // Arrow glyph
    ctx.fillStyle = "#2ad0b0";
    ctx.font = "bold " + Math.round(ts*0.38) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▼", sx+ts/2, sy+ts/2);
    ctx.textBaseline = "alphabetic";
  }

  // ── SHADOWS / SPRITES ──────────────────────────────────────
  function drawShadow(ctx,cx,cy,ts){
    const s = Delve.SPR && Delve.SPR.shadow;
    if(s){
      const w = ts*0.8, h = w*(s.height/s.width)*0.5;
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
      ctx.fillStyle = "#ff5c7a";
      ctx.beginPath(); ctx.arc(cx,cy,ts*0.3,0,Math.PI*2); ctx.fill();
      return;
    }
    const img = hurt ? (S.hurt || S.idle) : S.idle;
    const size = ts*0.9;
    ctx.drawImage(img, cx-size/2, cy-size/2, size, size);
  }

  function drawWorldSprite(ctx,key,cx,cy,ts){
    const S = Delve.SPR && Delve.SPR.world && Delve.SPR.world[key];
    if(!S) return;
    const size = ts*0.75;
    ctx.drawImage(S, cx-size/2, cy-size/2, size, size);
  }

  function drawPlayer(ctx,cx,cy,ts,hurt){
    drawShadow(ctx,cx,cy,ts);
    drawSprite(ctx,"soldier",cx,cy,ts,hurt);
  }

  function drawMob(ctx,m,cx,cy,ts){
    drawShadow(ctx,cx,cy,ts);
    const hurt = m.hitFlash && Date.now() - m.hitFlash < 130;
    drawSprite(ctx, m.kind || "goblin", cx, cy, ts, hurt);
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
    drawWorldSprite(ctx,"itemPile",cx,cy,ts);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, ts*0.22, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTreasure(ctx,thing,cx,cy,ts){
    if(thing === "gold")       drawWorldSprite(ctx,"goldPile",cx,cy,ts);
    else if(thing === "potion") drawWorldSprite(ctx,"potionPile",cx,cy,ts);
    else if(thing === "chest")  drawWorldSprite(ctx,"chestClosed",cx,cy,ts);
    else if(thing === "chestOpen") drawWorldSprite(ctx,"chestOpen",cx,cy,ts);
    else                        drawWorldSprite(ctx,"itemPile",cx,cy,ts);
  }

  // ── FLOATERS — time-based alpha, no move dependency ────────
  function drawFloaters(ctx,camX,camY,ts){
    const now = Date.now();
    const alive = [];
    for(const f of floaters){
      const age = now - f.born;
      if(age >= FLOAT_LIFE) continue;
      const t = age / FLOAT_LIFE; // 0→1
      const alpha = t < 0.15 ? t/0.15 : 1 - ((t-0.15)/0.85); // fade in, then out
      const rise = t * ts * 2.2; // float upward

      const sx = (f.x - camX)*ts + ts*0.5;
      const sy = (f.y - camY)*ts - rise;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "700 " + Math.max(11, ts*0.32) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillText(f.txt, sx+1, sy+1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.txt, sx, sy);
      ctx.restore();
      alive.push(f);
    }
    floaters = alive;
  }

  // ── MAIN DRAW ───────────────────────────────────────────────
  Delve.draw = function(){
    const G = Delve.G;
    if(!G) return;

    const ctx = Delve.ctx, W = Delve.W, H = Delve.H, ts = Delve.ts;
    Delve.computeView();
    const vw = Delve.viewW, vh = Delve.viewH;
    const b = biome();

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
    ctx.fillStyle = "#06090d";
    ctx.fillRect(-10, -10, W+20, H+20);

    // ── tiles
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

    // ── tap-target highlight (path destination)
    if(G._path && G._path.length > 0){
      const dest = G._path[G._path.length - 1];
      if(dest.x >= camX && dest.y >= camY && dest.x < camX+vw && dest.y < camY+vh){
        const sx = (dest.x-camX)*ts, sy = (dest.y-camY)*ts;
        ctx.fillStyle = "rgba(255,230,100,0.18)";
        ctx.strokeStyle = "rgba(255,220,80,0.7)";
        ctx.fillRect(sx,sy,ts,ts);
        ctx.lineWidth = 2;
        ctx.strokeRect(sx+1,sy+1,ts-2,ts-2);
      }
    }

    // ── adjacency highlights (lit squares the player can step to)
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
        ctx.fillStyle = "rgba(110,200,255,0.20)";
        ctx.strokeStyle = "rgba(140,220,255,0.80)";
      }
      ctx.fillRect(sx,sy,ts,ts);
      ctx.lineWidth = 2;
      ctx.strokeRect(sx+1,sy+1,ts-2,ts-2);
    }

    // ── items
    for(const it of (G.items || [])){
      if(it.x < camX || it.y < camY || it.x >= camX+vw || it.y >= camY+vh) continue;
      drawItem(ctx, it, (it.x-camX)*ts + ts/2, (it.y-camY)*ts + ts/2, ts);
    }

    // ── decor (gold piles etc)
    const decor = G.floorData && G.floorData.decor || [];
    for(const d of decor){
      if(d.x < camX || d.y < camY || d.x >= camX+vw || d.y >= camY+vh) continue;
      drawTreasure(ctx, d.thing, (d.x-camX)*ts + ts/2, (d.y-camY)*ts + ts/2, ts);
    }

    // ── monsters
    for(const m of G.monsters){
      if(m.x < camX || m.y < camY || m.x >= camX+vw || m.y >= camY+vh) continue;
      drawMob(ctx, m, (m.x-camX)*ts + ts/2, (m.y-camY)*ts + ts/2, ts);
    }

    // ── boss
    if(G.boss && G.boss.x >= camX && G.boss.y >= camY && G.boss.x < camX+vw && G.boss.y < camY+vh){
      drawMob(ctx, G.boss, (G.boss.x-camX)*ts + ts/2, (G.boss.y-camY)*ts + ts/2, ts);
    }

    // ── player
    const pSX = (G.px-camX)*ts, pSY = (G.py-camY)*ts;
    const pHurt = G.playerHit && Date.now() - G.playerHit < 150;
    drawPlayer(ctx, pSX+ts/2, pSY+ts/2, ts, pHurt);

    // ── floaters
    drawFloaters(ctx, camX, camY, ts);

    // ── vignette
    const vig = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.8);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(1,"rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0,0,W,H);

    ctx.restore();

    // ── flash message (non-floater)
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
    // Offset multiple floaters at the same tile so they don't perfectly overlap
    const sameSpot = floaters.filter(f => f.x === x && f.y === y).length;
    floaters.push({ txt:txt, x:x, y:y + sameSpot*0.5, col:col, born:Date.now() });
  };
  Delve.addShake = function(mag){
    shakeMag = Math.max(shakeMag, mag);
    shakeT = 6;
  };

  // ── Continuous render loop so floaters fade without player moving ──
  (function loop(){
    if(Delve.G && floaters.length > 0) Delve.draw();
    requestAnimationFrame(loop);
  })();

})();
