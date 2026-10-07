window.Delve = window.Delve || {};
(function(){
  let shakeT=0, shakeMag=0, floaters=[], lastHp=null;

  // ----- deterministic hash (stable per tile) -----
  function hash2(x,y){
    let n = x*374761393 + y*668265263;
    n = (n ^ (n>>13)) * 1274126177;
    return ((n ^ (n>>16)) >>> 0) / 4294967295;
  }
  function rng01(seed){ return hash2(seed, Math.floor(seed*7919)); }

  // ----- biome palettes (deeper = different look) -----
  function biome(floor){
    if(floor<=4) return { wall:"#192129", edge:"#4d5b67", floor:"#2e3842", floor2:"#283039", moss:"#3f6d55", light:"rgba(70,140,255,0.08)" };
    if(floor<=9) return { wall:"#17241b", edge:"#41614a", floor:"#2f4033", floor2:"#28382c", moss:"#5c8a59", light:"rgba(90,180,120,0.08)" };
    if(floor<=14) return { wall:"#271d22", edge:"#78506c", floor:"#3d2a3b", floor2:"#362435", moss:"#8c5f96", light:"rgba(160,80,180,0.08)" };
    return { wall:"#2a1d12", edge:"#82613b", floor:"#47351f", floor2:"#3e2e1c", moss:"#b8863c", light:"rgba(220,140,60,0.10)" };
  }

  function tileAt(gx,gy){
    const g = Delve.G.grid;
    return (g[gy] && g[gy][gx]!==undefined) ? g[gy][gx] : null;
  }

  function drawFloorTile(ctx, sx, sy, ts, gx, gy, b){
    const alt = ((gx+gy)%2===0);
    ctx.fillStyle = alt ? b.floor : b.floor2;
    ctx.fillRect(sx,sy,ts,ts);

    // texture speckle
    const n = hash2(gx,gy);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for(let i=0;i<4;i++){
      const rx = sx + (n* (i+3)*7919 % 1)*(ts-4);
      const ry = sy + (n* (i+7)*104729 % 1)*(ts-4);
      ctx.fillRect(rx, ry, 2, 2);
    }
    // cracks
    if(n>0.68){
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(sx+ts*0.2, sy+ts*0.15);
      ctx.lineTo(sx+ts*0.4, sy+ts*0.55);
      ctx.lineTo(sx+ts*0.3, sy+ts*0.85);
      ctx.stroke();
    }
    // occasional moss for depth
    if(n<0.12){
      ctx.fillStyle=b.moss;
      ctx.globalAlpha=0.5;
      ctx.fillRect(sx+ (n*97%1)*ts*0.5, sy + ts*0.6, ts*0.35, ts*0.2);
      ctx.globalAlpha=1;
    }
    // tile grid (subtle)
    ctx.strokeStyle="rgba(0,0,0,0.28)"; ctx.lineWidth=1;
    ctx.strokeRect(sx+0.5, sy+0.5, ts, ts);
  }

  function drawWallTile(ctx, sx, sy, ts, gx, gy, b){
    ctx.fillStyle=b.wall; ctx.fillRect(sx,sy,ts,ts);
    // bricks
    ctx.fillStyle=b.edge; ctx.fillRect(sx,sy,ts,Math.max(2,ts*0.12));
    ctx.fillRect(sx,sy,Math.max(2,ts*0.12),ts);
    ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1;
    if(ts>=24){
      ctx.beginPath();
      ctx.moveTo(sx, sy+ts*0.5); ctx.lineTo(sx+ts, sy+ts*0.5);
      ctx.moveTo(sx+ts*0.5, sy+ts*0.5); ctx.lineTo(sx+ts*0.5, sy+ts);
      if(hash2(gx,gy)>0.5){ ctx.moveTo(sx, sy+ts*0.75); ctx.lineTo(sx+ts*0.5, sy+ts*0.75); }
      ctx.stroke();
    }
    // top bevel highlight
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(sx, sy, ts, 2);
  }

  function drawStairs(ctx, sx, sy, ts){
    ctx.fillStyle="rgba(42,208,176,0.20)"; ctx.fillRect(sx,sy,ts,ts);
    ctx.fillStyle="#2ad0b0"; ctx.fillRect(sx+ts*0.15, sy+ts*0.15, ts*0.70, ts*0.70);
    ctx.fillStyle="#0b201b"; 
    ctx.fillRect(sx+ts*0.4, sy+ts*0.35, ts*0.2, ts*0.14);
    ctx.fillRect(sx+ts*0.4, sy+ts*0.55, ts*0.2, ts*0.14);
  }

  function reflectShader(ctx, cx, cy, r){
    const sh = ctx.createRadialGradient(cx+2, cy+2, 2, cx, cy, r+4);
    sh.addColorStop(0,"rgba(255,255,255,0.9)");
    sh.addColorStop(0.35,"rgba(255,255,255,0.25)");
    sh.addColorStop(1,"rgba(255,255,255,0)");
    return sh;
  }

  function drawGoblin(ctx, cx, cy, c, r){
    // body
    ctx.fillStyle=c; ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r, cy+r); ctx.lineTo(cx-r, cy+r); ctx.closePath(); ctx.fill(); ctx.stroke();
    // eyes
    ctx.fillStyle="#fff"; ctx.fillRect(cx-r*0.4, cy-r*0.15, r*0.25, r*0.25); ctx.fillRect(cx+r*0.1, cy-r*0.15, r*0.25, r*0.25);
  }

  function drawBrute(ctx, cx, cy, c, r){
    // wide body
    ctx.fillStyle=c; ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.7, cy-r*0.5); ctx.lineTo(cx+r, cy); ctx.lineTo(cx-r, cy); ctx.lineTo(cx-r*0.7, cy-r*0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // angry eyes
    ctx.fillStyle="#fff"; ctx.fillRect(cx-r*0.5, cy-r*0.4, r*0.3, r*0.2); ctx.fillRect(cx+r*0.2, cy-r*0.4, r*0.3, r*0.2);
  }

  function drawShade(ctx, cx, cy, c, r){
    // wispy undead
    ctx.fillStyle=c; ctx.strokeStyle="rgba(0,0,0,0.6)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.9, cy); ctx.lineTo(cx, cy+r); ctx.lineTo(cx-r*0.9, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    // hollow eyes
    ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fillRect(cx-r*0.6, cy-r*0.5, r*0.25, r*0.25); ctx.fillRect(cx+r*0.35, cy-r*0.5, r*0.25, r*0.25);
  }

  function drawBoss(ctx, cx, cy, r){
    // huge circular boss with crown spikes
    ctx.fillStyle="#b45aff"; ctx.strokeStyle="rgba(0,0,0,0.6)"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // spikes
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a = i*Math.PI/3 + Math.PI/6;
      const px = cx + Math.cos(a)*r, py = cy + Math.sin(a)*r;
      ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a)*r*0.4, py + Math.sin(a)*r*0.4);
    }
    ctx.stroke();
    // central eye
    ctx.fillStyle="#fff"; ctx.fillRect(cx-r*0.2, cy-r*0.3, r*0.4, r*0.4);
    ctx.fillStyle="#000"; ctx.fillRect(cx, cy-r*0.15, r*0.12, r*0.12);
  }

  function drawPlayer(ctx, cx, cy, s, dir){
    // glowing aura
    const aura = ctx.createRadialGradient(cx,cy,s*0.1,cx,cy,s*2.8);
    aura.addColorStop(0,"rgba(80,190,255,0.25)");
    aura.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=aura; ctx.fillRect(cx-s*2.5, cy-s*2.5, s*5, s*5);

    // body (rounded humanoid)
    ctx.fillStyle="#5ad6ff"; ctx.strokeStyle="#e8fdff"; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(cx, cy, s*0.32, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // face
    ctx.fillStyle="#fff";
    ctx.beginPath(); ctx.arc(cx-s*0.1, cy-s*0.05, s*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+s*0.1, cy-s*0.05, s*0.08, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#0c2633";
    ctx.fillRect(cx-s*0.13, cy-s*0.05, s*0.05, s*0.05);
    ctx.fillRect(cx+s*0.08, cy-s*0.05, s*0.05, s*0.05);

    // little weapon in direction of last move
    ctx.strokeStyle="#ffd75e"; ctx.lineWidth=2;
    ctx.beginPath();
    if(dir==="left"){ ctx.moveTo(cx-s*0.4, cy); ctx.lineTo(cx-s*0.7, cy); }
    if(dir==="right"){ ctx.moveTo(cx+s*0.4, cy); ctx.lineTo(cx+s*0.7, cy); }
    if(dir==="up"){ ctx.moveTo(cx, cy-s*0.4); ctx.lineTo(cx, cy-s*0.7); }
    if(dir==="down"){ ctx.moveTo(cx, cy+s*0.4); ctx.lineTo(cx, cy+s*0.7); }
    ctx.stroke();
  }

  Delve.draw = function(){
    const G=Delve.G; if(!G) return;
    const ctx=Delve.ctx, W=Delve.W, H=Delve.H;
    const ts=Delve.ts;
    Delve.computeView();
    const vw=Delve.viewW, vh=Delve.viewH;
    const b = biome(G.floor);

    // camera center (with clamp)
    let camX = Math.floor(G.px - vw/2);
    let camY = Math.floor(G.py - vh/2);
    camX = Math.max(0, Math.min(camX, G.grid[0].length - vw));
    camY = Math.max(0, Math.min(camY, G.grid.length - vh));
    Delve.camX=camX; Delve.camY=camY;

    // shake
    let ox=0, oy=0;
    if(shakeT>0){
      ox=(Math.random()-0.5)*shakeMag;
      oy=(Math.random()-0.5)*shakeMag;
      shakeT--;
    }

    ctx.save();
    ctx.translate(ox, oy);

    ctx.fillStyle="#06090d"; ctx.fillRect(-8,-8,W+16,H+16);

    // tiles
    for(let y=0;y<vh+1;y++){
      for(let x=0;x<vw+1;x++){
        const gx=camX+x, gy=camY+y;
        const t=tileAt(gx,gy);
        if(t===null) continue;
        const sx=x*ts, sy=y*ts;
        if(t===Delve.T.WALL) drawWallTile(ctx,sx,sy,ts,gx,gy,b);
        else if(t===Delve.T.STAIR) { drawFloorTile(ctx,sx,sy,ts,gx,gy,b); drawStairs(ctx,sx,sy,ts); }
        else drawFloorTile(ctx,sx,sy,ts,gx,gy,b);
      }
    }

    // items
    (G.items||[]).forEach(function(it){
      if(it.x<camX||it.y<camY||it.x>=camX+vw||it.y>=camY+vh) return;
      const sx=(it.x-camX)*ts, sy=(it.y-camY)*ts;
      const cx2=sx+ts/2, cy2=sy+ts/2;
      const col=Delve.TIERS.colors[it.tier]||"#fff";
      ctx.fillStyle=col; ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2-ts*0.28); ctx.lineTo(cx2+ts*0.28, cy2); ctx.lineTo(cx2, cy2+ts*0.28); ctx.lineTo(cx2-ts*0.28, cy2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fillRect(cx2-ts*0.06, cy2-ts*0.06, ts*0.12, ts*0.12);
    });

    // monsters (different looks by floor family)
    (G.monsters||[]).forEach(function(m){
      const sx=(m.x-camX)*ts, sy=(m.y-camY)*ts;
      const cx2=sx+ts/2, cy2=sy+ts/2, r=ts*0.35;
      if(m.kind==="brute") drawBrute(ctx,cx2,cy2,"#ff5c7a",r);
      else if(m.kind==="shade") drawShade(ctx,cx2,cy2,"#b45aff",r*0.8);
      else drawGoblin(ctx,cx2,cy2,"#ff5c7a",r);
      // hp bar
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(sx+2, sy-3, ts-4, 4);
      const frac=m.hp/(Delve.CONFIG.monsterHpBase+Delve.CONFIG.monsterHpPerFloor*(G.floor-1));
      ctx.fillStyle="#ff7d93"; ctx.fillRect(sx+2, sy-3, (ts-4)*Math.max(0,Math.min(1,frac)), 4);
    });

    if(G.boss){
      const sx=(G.boss.x-camX)*ts, sy=(G.boss.y-camY)*ts;
      drawBoss(ctx, sx+ts/2, sy+ts/2, ts*0.44);
    }

    // player (drawn last = on top)
    const sx=(G.px-camX)*ts, sy=(G.py-camY)*ts;
    drawPlayer(ctx, sx+ts/2, sy+ts/2, ts, G.lastDir||"right");

    // vignette
    const vig=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.8);
    vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.45)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    ctx.restore();

    // floating numbers
    floaters.forEach(function(f){ f.t++; });
    floaters = floaters.filter(function(f){ return f.t<20; });

    if(G.msg && Date.now()<G.msgUntil){
      ctx.font="700 16px system-ui"; ctx.textAlign="center";
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillText(G.msg, W/2+1, H-45);
      ctx.fillStyle="#eafff5"; ctx.fillText(G.msg, W/2, H-46);
    }
  };

  Delve.addFloater = function(txt,x,y,col){
    floaters.push({txt,x,y,col,t:0});
  };
  Delve.addShake = function(mag){
    shakeMag=mag; shakeT=6;
  };
})();
