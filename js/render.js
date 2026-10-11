window.Delve = window.Delve || {};
(function(){

 // ── render.js ────────────────────────────────────────────────
 // Owns all canvas drawing: tiles, sprites, entities, floaters, camera,
 // plus the two figure-drawing routines that used to live in ui.js —
 // the inventory paper doll and the minimap.
 // Depends on: Delve.SPR (sprites.js), Delve.T / Delve.G (state.js),
 //             Delve.TIERS (con-items.js), Delve.CONFIG.BIOMES (con-biomes.js).
 // Loads BEFORE ui.js and input.js.
 // Uses document.getElementById directly (not ui.js's guarded $), because
 // ui.js does not exist yet at this file's load time.

 let shakeT = 0, shakeMag = 0;
 let floaters = [];
 const FLOAT_LIFE = 1200;
 const floaterDepth = new Map();

 const recoils = new Map();
 function dirAway(fx, fy, tx, ty){
  let dx = fx - tx, dy = fy - ty;
  const len = Math.hypot(dx, dy);
  if(len < 0.001) return { x: 0, y: -1 };
  return { x: dx/len, y: dy/len };
 }
 function ensureRecoil(key, flashTime, dx, dy){
  const r = recoils.get(key);
  if(!r || r.flash < flashTime) recoils.set(key, { flash: flashTime, dx, dy });
 }
 function recoilOffset(key, ts){
  const r = recoils.get(key);
  if(!r) return { x: 0, y: 0 };
  const t = (Date.now() - r.flash) / 200;
  if(t >= 1){ recoils.delete(key); return { x: 0, y: 0 }; }
  const disp = Math.sin(t * Math.PI) * ts * 0.13;
  return { x: r.dx * disp, y: r.dy * disp };
 }
 function nearestThreat(x, y){
  let best = null, bd = Infinity;
  const list = (Delve.G && Delve.G.monsters) || [];
  for(const m of list){
   const d = Math.hypot(m.x - x, m.y - y);
   if(d < bd){ bd = d; best = m; }
  }
  const b = Delve.G && Delve.G.boss;
  if(b){
   const d = Math.hypot(b.x - x, b.y - y);
   if(d < bd){ bd = d; best = b; }
  }
  return best;
 }

 function hash2(x, y){
  let n = x*374761393 + y*668265263;
  n = (n ^ (n>>13)) * 1274126177;
  return ((n ^ (n>>16)) >>> 0) / 4294967295;
 }
 function hash3(x, y, salt){ return hash2(x*2053+salt, y*3571+salt*7); }

 // Rounded-rect path with a fallback for engines without ctx.roundRect.
 // Used everywhere a hard square edge used to give the "everything is a grid"
 // look — slabs, highlights, seams.
 function rrectPath(ctx, x, y, w, h, r){
  if(r > w/2) r = w/2;
  if(r > h/2) r = h/2;
  if(r < 0) r = 0;
  ctx.beginPath();
  if(ctx.roundRect){ ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);   ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);   ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r);     ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
 }

 // Warm/soft radial pool of light, used for torches, braziers and runes.
 function lightPool(ctx, cx, cy, r, inner, mid){
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx-r, cy-r, r*2, r*2);
 }

 function biome(){
  const G = Delve.G;
  const ward = G ? Delve.getWard(G.floor) : null;
  const idx = (ward && ward.biome !== undefined) ? ward.biome : 0;
  const b = (Delve.CONFIG.BIOMES && Delve.CONFIG.BIOMES[idx]) || Delve.CONFIG.BIOMES[0] || {};
  return {
   wall: b.wall || "#64707c", wallEdge: b.wallEdge || "#8d99a6", wallBrick: b.wallBrick || "#3a4248",
   mortar: b.mortar || "#0b0f14", floor: b.floor || "#2e3842", floor2: b.floor2 || "#283039",
   moss: b.moss || "#3f6d55", water: b.water || "#1e3a4a", torch: b.torch || "#ffb347",
   light: b.light || "rgba(70,140,255,0.06)"
  };
 }

 function tileAt(gx, gy){
  const g = Delve.G.grid;
  return (g[gy] && g[gy][gx] !== undefined) ? g[gy][gx] : null;
 }

 // ── OFFSCREEN TILE CACHE ─────────────────────────────────────
 let tileCache = {}, cacheFloor = -1, cacheTs = 0;
 function ensureCache(G){
  if(cacheFloor !== G.floor || cacheTs !== Delve.ts){
   cacheFloor = G.floor; cacheTs = Delve.ts; tileCache = {};
  }
 }
 function isTorchTile(gx, gy){
  if(tileAt(gx, gy) !== Delve.T.WALL) return false;
  const below = tileAt(gx, gy+1);
  if(below === null || below === Delve.T.WALL) return false;
  return hash3(gx, gy, 137) < 0.04;
 }
 function blitTile(ctx, gx, gy, sx, sy, ts, b, t){
  const key = gx + "," + gy;
  const entry = tileCache[key];
  if(entry && entry.v === t){ ctx.drawImage(entry.c, sx, sy, ts, ts); return; }
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement("canvas");
  c.width = Math.round(ts*dpr); c.height = Math.round(ts*dpr);
  const cx = c.getContext("2d"); cx.scale(dpr, dpr);
  if(t !== Delve.T.WALL){
   drawFloorTile(cx, 0, 0, ts, gx, gy, b);
   if(t === Delve.T.STAIR) drawStairs(cx, 0, 0, ts, b);
  } else {
   drawWallTile(cx, 0, 0, ts, gx, gy, b);
  }
  tileCache[key] = { v:t, c:c };
  ctx.drawImage(c, sx, sy, ts, ts);
 }

 // ── FLOOR ────────────────────────────────────────────────────
 // Deliberately softer than it used to be: the mortar is a thin translucent
 // seam rather than a solid border, each slab is a rounded, top-lit stone with
 // a gentle gradient, and the checker contrast is low. That removes most of
 // the "everything is a square on a grid" read.
 function drawFloorTile(ctx, sx, sy, ts, gx, gy, b){
  const n = hash2(gx,gy), n2 = hash3(gx,gy,17), n3 = hash3(gx,gy,31), n4 = hash3(gx,gy,53);
  const base = ((gx+gy)%2===0) ? b.floor : b.floor2;
  const slabCol = n3 < 0.05
   ? blendHex(base, "#0a0e12", 0.30)
   : blendHex(base, n >= 0.5 ? "#ffffff" : "#000000", Math.abs(n-0.5)*0.16);

  // seam: translucent grout wash instead of an opaque full-tile square
  ctx.fillStyle = b.mortar; ctx.globalAlpha = 0.52;
  ctx.fillRect(sx, sy, ts, ts);
  ctx.globalAlpha = 1;

  const g = Math.max(1, ts*0.055), r = Math.max(2, ts*0.14);
  const iw = ts-g*2, ih = ts-g*2;
  ctx.save();
  rrectPath(ctx, sx+g, sy+g, iw, ih, r); ctx.clip();

  const grd = ctx.createLinearGradient(sx, sy, sx+ts*0.45, sy+ts);
  grd.addColorStop(0, blendHex(slabCol, "#ffffff", 0.07));
  grd.addColorStop(0.5, slabCol);
  grd.addColorStop(1, blendHex(slabCol, "#000000", 0.18));
  ctx.fillStyle = grd; ctx.fillRect(sx+g, sy+g, iw, ih);

  // soft directional light from the top-left, soft occlusion bottom-right
  const lg = ctx.createLinearGradient(sx+g, sy+g, sx+g+ts*0.32, sy+g+ts*0.32);
  lg.addColorStop(0, "rgba(255,255,255,0.085)"); lg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lg; ctx.fillRect(sx+g, sy+g, iw, ih);
  const sg = ctx.createLinearGradient(sx+ts-g, sy+ts-g, sx+g+ts*0.45, sy+g+ts*0.45);
  sg.addColorStop(0, "rgba(0,0,0,0.17)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg; ctx.fillRect(sx+g, sy+g, iw, ih);

  // speckled grain so the stone reads as a surface, not a fill
  ctx.globalAlpha = 0.055;
  for(let k=0;k<4;k++){
   const sxp = sx+g + hash3(gx,gy,200+k)*iw, syp = sy+g + hash3(gx,gy,214+k)*ih;
   ctx.fillStyle = (k%2) ? "#ffffff" : "#000000";
   ctx.beginPath(); ctx.arc(sxp, syp, ts*(0.02+hash3(gx,gy,228+k)*0.035), 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // worn corner chip
  if(n2 < 0.08){
   const corner = Math.floor(n2/0.02)%4, cs = Math.max(3, Math.floor(ts*0.18));
   ctx.globalAlpha = 0.55; ctx.fillStyle = b.mortar;
   if(corner===0) ctx.fillRect(sx, sy, cs, cs);
   if(corner===1) ctx.fillRect(sx+ts-cs, sy, cs, cs);
   if(corner===2) ctx.fillRect(sx, sy+ts-cs, cs, cs);
   if(corner===3) ctx.fillRect(sx+ts-cs, sy+ts-cs, cs, cs);
   ctx.globalAlpha = 1;
  }
  if(n > 0.82){
   const crackType = Math.floor(hash3(gx,gy,7)*10);
   ctx.save(); ctx.strokeStyle="rgba(0,0,0,0.30)"; ctx.lineWidth=Math.max(1,ts*0.03);
   ctx.globalAlpha=0.45; ctx.lineCap="round";
   const m=g+2, x0=sx+m, y0=sy+m, tw=ts-m*2;
   ctx.beginPath();
   switch(crackType){
    case 0: ctx.moveTo(x0,y0); ctx.lineTo(x0+tw*0.5,y0+tw*0.5); break;
    case 1: ctx.moveTo(x0+tw*0.5,y0+tw*0.1); ctx.lineTo(x0+tw*0.5,y0+tw*0.55); ctx.moveTo(x0+tw*0.5,y0+tw*0.55); ctx.lineTo(x0+tw*0.2,y0+tw*0.9); ctx.moveTo(x0+tw*0.5,y0+tw*0.55); ctx.lineTo(x0+tw*0.8,y0+tw*0.9); break;
    case 2: for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2; ctx.moveTo(x0+tw*0.5,y0+tw*0.5); ctx.lineTo(x0+tw*0.5+Math.cos(a)*tw*0.28, y0+tw*0.5+Math.sin(a)*tw*0.28);} break;
    case 3: ctx.moveTo(x0,y0+tw*0.15); ctx.lineTo(x0+tw,y0+tw*0.85); break;
    case 4: ctx.moveTo(x0+tw*0.2,y0+tw*0.3); ctx.lineTo(x0+tw*0.45,y0+tw*0.6); ctx.moveTo(x0+tw*0.55,y0+tw*0.35); ctx.lineTo(x0+tw*0.75,y0+tw*0.65); break;
    case 5: ctx.moveTo(x0+tw*0.35,y0+tw*0.05); ctx.lineTo(x0+tw*0.55,y0+tw*0.40); ctx.lineTo(x0+tw*0.40,y0+tw*0.42); ctx.lineTo(x0+tw*0.65,y0+tw*0.95); break;
    case 6: ctx.moveTo(x0,y0); ctx.lineTo(x0+tw*0.30,y0+tw*0.15); ctx.lineTo(x0+tw*0.15,y0+tw*0.35); break;
    case 7: ctx.arc(x0+tw*0.5,y0+tw*1.0,tw*0.55,Math.PI*1.1,Math.PI*1.9); break;
    case 8: ctx.moveTo(x0+tw*0.2,y0+tw*0.2); ctx.lineTo(x0+tw*0.75,y0+tw*0.8); ctx.moveTo(x0+tw*0.75,y0+tw*0.2); ctx.lineTo(x0+tw*0.2,y0+tw*0.8); break;
    case 9: ctx.moveTo(x0,y0+tw*0.8); ctx.lineTo(x0+tw*0.6,y0+tw*0.8); ctx.lineTo(x0+tw*0.6,y0+tw*0.4); break;
   }
   ctx.stroke(); ctx.restore();
  }
  if(n4 < 0.03){
   ctx.save(); ctx.globalAlpha=0.55;
   const px=sx+ts*(0.25+hash3(gx,gy,99)*0.4), py=sy+ts*(0.35+hash3(gx,gy,101)*0.3), pr=ts*(0.10+hash3(gx,gy,103)*0.08);
   const grad=ctx.createRadialGradient(px,py,1,px,py,pr*2);
   grad.addColorStop(0,b.water+"cc"); grad.addColorStop(1,b.water+"22");
   ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(px,py,pr*2,pr,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.7; ctx.fillStyle="rgba(255,255,255,0.55)";
   ctx.beginPath(); ctx.arc(px-pr*0.3,py-pr*0.2,pr*0.22,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  const weedRoll = hash3(gx,gy,43);
  if(weedRoll < 0.06 && n <= 0.82){
   drawWeed(ctx, sx, sy, ts, gx, gy, b, Math.floor(hash3(gx,gy,47)*6));
  }
  ctx.restore();
 }

 function drawWeed(ctx, sx, sy, ts, gx, gy, b, type){
  ctx.save(); ctx.globalAlpha=0.72;
  const cx=sx+ts*(0.3+hash3(gx,gy,61)*0.4), cy=sy+ts*(0.35+hash3(gx,gy,67)*0.4), sc=ts/40;
  switch(type){
   case 0: ctx.strokeStyle="#4a7c42"; ctx.lineWidth=Math.max(1,sc*1.4); ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(cx,cy+sc*7); ctx.quadraticCurveTo(cx+sc*4,cy,cx+sc*6,cy-sc*8); ctx.stroke(); break;
   case 1: ctx.strokeStyle="#3d6e36"; ctx.lineWidth=Math.max(1,sc*1.2); ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(cx-sc*2,cy+sc*6); ctx.quadraticCurveTo(cx-sc*4,cy,cx-sc*7,cy-sc*7); ctx.moveTo(cx+sc*2,cy+sc*6); ctx.quadraticCurveTo(cx+sc*5,cy,cx+sc*8,cy-sc*6); ctx.stroke(); break;
   case 2: ctx.strokeStyle="#4a7c42"; ctx.lineWidth=Math.max(1,sc*1.2); ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(cx,cy+sc*6); ctx.lineTo(cx,cy-sc*4); ctx.stroke(); ctx.fillStyle="#c8b88a"; for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2; ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*sc*3,cy-sc*4+Math.sin(a)*sc*3,sc*2.5,sc*1.2,a,0,Math.PI*2); ctx.fill();} break;
   case 3: ctx.strokeStyle="#3f6d3a"; ctx.lineWidth=Math.max(1,sc*1.0); ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(sx+ts*0.1,cy+sc*2); ctx.bezierCurveTo(cx-sc*4,cy-sc*3,cx+sc*4,cy+sc*5,cx+sc*10,cy); ctx.stroke(); ctx.fillStyle="#3f6d3a"; ctx.beginPath(); ctx.ellipse(cx+sc*2,cy-sc*2,sc*3,sc*1.5,-0.5,0,Math.PI*2); ctx.fill(); break;
   case 4: ctx.fillStyle="#7a5c3a"; ctx.fillRect(cx-sc,cy,sc*2,sc*5); ctx.fillStyle="#c47a3a"; ctx.beginPath(); ctx.ellipse(cx,cy,sc*5,sc*3.5,0,Math.PI,0); ctx.fill(); ctx.fillStyle="rgba(255,240,200,0.6)"; ctx.beginPath(); ctx.arc(cx-sc*1.5,cy-sc*1.5,sc*0.8,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+sc*1.8,cy-sc*1.0,sc*0.7,0,Math.PI*2); ctx.fill(); break;
   case 5: ctx.fillStyle=b.moss; ctx.globalAlpha=0.45; ctx.beginPath(); ctx.arc(cx,cy,sc*5,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#2e5c2a"; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(cx+sc*2,cy-sc*1,sc*3,0,Math.PI*2); ctx.fill(); break;
  }
  ctx.restore();
 }

 function drawClutter(ctx, sx, sy, ts, gx, gy){
  const roll = hash3(gx, gy, 71);
  if(roll < 0.03){
   ctx.save(); ctx.globalAlpha=0.5;
   if(roll < 0.01){
    ctx.fillStyle="#c9c2b0";
    ctx.fillRect(sx+ts*0.35, sy+ts*0.55, ts*0.3, ts*0.08);
    ctx.beginPath(); ctx.arc(sx+ts*0.35, sy+ts*0.59, ts*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+ts*0.65, sy+ts*0.59, ts*0.05, 0, Math.PI*2); ctx.fill();
   } else if(roll < 0.02){
    ctx.fillStyle="#7a7a80"; ctx.beginPath();
    ctx.moveTo(sx+ts*0.3, sy+ts*0.6); ctx.lineTo(sx+ts*0.5, sy+ts*0.5); ctx.lineTo(sx+ts*0.7, sy+ts*0.62); ctx.closePath(); ctx.fill();
   } else { ctx.beginPath(); ctx.arc(sx+ts*0.5, sy+ts*0.55, ts*0.07, 0, Math.PI*2); ctx.fill(); }
   ctx.restore();
  }
 }

 // ── WALL ─────────────────────────────────────────────────────
 // Same idea as the floor: no flat fill and no hard white cap. A vertical
 // gradient plus a soft top-light and a soft bottom shadow makes a run of wall
 // tiles read as one continuous lit surface with volume.
 function drawWallTile(ctx, sx, sy, ts, gx, gy, b){
  const n=hash2(gx,gy), n2=hash3(gx,gy,11), n3=hash3(gx,gy,23);
  const mood = n2<0.18?1:n2<0.38?2:n2<0.52?3:0;
  const base = mood===2 ? blendHex(b.wall, b.moss, 0.14) : b.wall;
  const grd=ctx.createLinearGradient(sx,sy,sx,sy+ts);
  grd.addColorStop(0, blendHex(base,"#ffffff",0.13));
  grd.addColorStop(0.42, base);
  grd.addColorStop(1, blendHex(base,"#000000",0.34));
  ctx.fillStyle=grd; ctx.fillRect(sx,sy,ts,ts);
  if(mood===3){ const grad=ctx.createLinearGradient(sx+ts*0.5,sy,sx+ts*0.5,sy+ts); grad.addColorStop(0,"rgba(70,40,20,0.38)"); grad.addColorStop(0.6,"rgba(50,30,15,0.12)"); grad.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=grad; ctx.fillRect(sx+ts*0.25,sy,ts*0.5,ts); }
  if(ts>=20){
   ctx.strokeStyle=b.wallBrick; ctx.lineWidth=1; ctx.globalAlpha=mood===1?0.55:0.32; ctx.lineCap="round";
   ctx.beginPath(); ctx.moveTo(sx+2,sy+ts*0.50); ctx.lineTo(sx+ts-2,sy+ts*0.50);
   const vOff=(gy%2===0)?0.25:0.75; ctx.moveTo(sx+ts*vOff,sy+ts*0.50); ctx.lineTo(sx+ts*vOff,sy+ts-2);
   if(n>0.40){ const vOff2=(gy%2===0)?0.75:0.25; ctx.moveTo(sx+ts*vOff2,sy+2); ctx.lineTo(sx+ts*vOff2,sy+ts*0.50); }
   ctx.stroke(); ctx.globalAlpha=1;
   if(mood===1){ const cr=hash3(gx,gy,89); const brickX=sx+(cr>0.5?ts*vOff:0)+2; const brickY=sy+(cr>0.5?0:ts*0.51); const brickW=ts*(cr>0.5?(1-vOff):vOff)-3; const brickH=ts*0.49-2; ctx.fillStyle="rgba(0,0,0,0.20)"; ctx.fillRect(brickX,brickY,brickW,brickH); ctx.fillStyle=b.wallBrick; ctx.fillRect(brickX+brickW*0.3,brickY-1,brickW*0.25,3); }
   if(mood===2){ ctx.fillStyle=b.moss; ctx.globalAlpha=0.18; ctx.fillRect(sx+1,sy+ts*0.48,ts-2,4); ctx.globalAlpha=1; }
  }
  // soft cap where the wall meets the light, and a soft occlusion at its foot
  const cap=ctx.createLinearGradient(sx,sy,sx,sy+ts*0.20);
  cap.addColorStop(0,"rgba(255,255,255,0.16)"); cap.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=cap; ctx.fillRect(sx,sy,ts,ts*0.20);
  ctx.globalAlpha=0.34; ctx.fillStyle=b.wallEdge; ctx.fillRect(sx,sy,ts,Math.max(1,ts*0.045)); ctx.globalAlpha=1;
  const oc=ctx.createLinearGradient(sx,sy+ts*0.68,sx,sy+ts);
  oc.addColorStop(0,"rgba(0,0,0,0)"); oc.addColorStop(1,"rgba(0,0,0,0.32)");
  ctx.fillStyle=oc; ctx.fillRect(sx,sy+ts*0.68,ts,ts*0.32);
  // left-edge light so adjacent wall tiles don't merge into one flat block
  const eg=ctx.createLinearGradient(sx,sy,sx+ts*0.16,sy);
  eg.addColorStop(0,"rgba(255,255,255,0.07)"); eg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=eg; ctx.fillRect(sx,sy,ts*0.16,ts);
 }

 // ── TORCH ────────────────────────────────────────────────────
 let torchFrame=0;
 function drawWallTorch(ctx, sx, sy, ts, b){
  const flicker=[{h:0.22,w:0.10,a:0.90},{h:0.26,w:0.12,a:1.00},{h:0.20,w:0.09,a:0.80}][torchFrame];
  const cx=sx+ts*0.5, by=sy+ts*0.72;
  ctx.save(); ctx.globalAlpha=0.18+(torchFrame===1?0.06:0); const glowY=by+ts*0.3;
  const grd=ctx.createRadialGradient(cx,glowY,2,cx,glowY,ts*1.1); grd.addColorStop(0,b.torch+"cc"); grd.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grd; ctx.fillRect(sx-ts,sy,ts*3,ts*2); ctx.restore();
  ctx.save(); ctx.strokeStyle="#6a5030"; ctx.lineWidth=Math.max(1.5,ts*0.04); ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(cx,by); ctx.lineTo(cx,by-ts*0.12); ctx.moveTo(cx-ts*0.06,by-ts*0.08); ctx.lineTo(cx+ts*0.06,by-ts*0.08); ctx.stroke(); ctx.restore();
  ctx.save(); const fh=ts*flicker.h, fw=ts*flicker.w, fy=by-ts*0.12;
  const flamGrad=ctx.createLinearGradient(cx,fy,cx,fy-fh); flamGrad.addColorStop(0,b.torch+"ff"); flamGrad.addColorStop(0.5,"#ff6020dd"); flamGrad.addColorStop(1,"#ffee8800");
  ctx.fillStyle=flamGrad; ctx.globalAlpha=flicker.a;
  ctx.beginPath(); ctx.moveTo(cx-fw,fy); ctx.quadraticCurveTo(cx-fw*1.2,fy-fh*0.5,cx,fy-fh); ctx.quadraticCurveTo(cx+fw*1.2,fy-fh*0.5,cx+fw,fy); ctx.closePath(); ctx.fill();
  ctx.globalAlpha=flicker.a*0.7; ctx.fillStyle="#fff8c0"; ctx.beginPath(); ctx.ellipse(cx,fy-fh*0.25,fw*0.4,fh*0.28,0,0,Math.PI*2); ctx.fill(); ctx.restore();
 }

 // ── STAIRS ───────────────────────────────────────────────────
 function drawStairs(ctx, sx, sy, ts, b){
  const g=Math.max(1,ts*0.055), r=Math.max(2,ts*0.14);
  ctx.fillStyle=b.mortar; ctx.globalAlpha=0.6; ctx.fillRect(sx,sy,ts,ts); ctx.globalAlpha=1;
  ctx.save();
  rrectPath(ctx,sx+g,sy+g,ts-g*2,ts-g*2,r); ctx.clip();
  ctx.fillStyle=blendHex(b.floor2,"#000000",0.30); ctx.fillRect(sx+g,sy+g,ts-g*2,ts-g*2);
  const inner=ts-g*2, steps=4, stepH=inner/steps;
  for(let i=0;i<steps;i++){
   const y0=sy+g+i*stepH, t=0.30+i*0.12;
   ctx.fillStyle=blendHex(b.floor2,"#05070a",t); ctx.fillRect(sx+g,y0,inner,stepH);
   ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fillRect(sx+g,y0,inner,Math.max(1,ts*0.02));
  }
  // light spilling up out of the stairwell
  const glow=ctx.createLinearGradient(0,sy+g,0,sy+ts-g);
  glow.addColorStop(0,"rgba(126,224,255,0.04)"); glow.addColorStop(1,"rgba(126,224,255,0.24)");
  ctx.fillStyle=glow; ctx.fillRect(sx+g,sy+g,inner,inner);
  ctx.restore();
 }

 // ── SPRITES ──────────────────────────────────────────────────
 function drawShadow(ctx, cx, cy, ts){
  const s = Delve.SPR && Delve.SPR.shadow;
  if(s){ const w=ts*0.8, h=w*(s.height/s.width)*0.5; ctx.drawImage(s,cx-w/2,cy+ts*0.30,w,h); }
  else { ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.33,ts*0.28,ts*0.09,0,0,Math.PI*2); ctx.fill(); }
 }
 function drawSprite(ctx, kind, cx, cy, ts, hurt, elite){
  const S = Delve.SPR && Delve.SPR[kind];
  if(!S){ ctx.fillStyle="#ff5c7a"; ctx.beginPath(); ctx.arc(cx,cy,ts*0.3,0,Math.PI*2); ctx.fill(); return; }
  let img;
  if(elite && S.elite) img=S.elite;
  else img = hurt ? (S.hurt || S.idle) : S.idle;
  const size=ts*0.9; ctx.drawImage(img,cx-size/2,cy-size/2,size,size);
 }
 function drawWorldSprite(ctx, key, cx, cy, ts){
  const S = Delve.SPR && Delve.SPR.world && Delve.SPR.world[key];
  if(!S) return; const size=ts*0.75; ctx.drawImage(S,cx-size/2,cy-size/2,size,size);
 }

 function drawPlayer(ctx, cx, cy, ts, hurt, ox, oy){
  drawShadow(ctx, cx, cy, ts);
  drawSprite(ctx, "soldier", cx+(ox||0), cy+(oy||0), ts, hurt);
 }

 function drawMob(ctx, m, cx, cy, ts){
  drawShadow(ctx, cx, cy, ts);
  const hurt = m.hitFlash && Date.now()-m.hitFlash < 130;
  let rx=0, ry=0;
  if(hurt){ const dir=dirAway(m.x,m.y,Delve.G.px,Delve.G.py); ensureRecoil(m,m.hitFlash,dir.x,dir.y); const off=recoilOffset(m,ts); rx=off.x; ry=off.y; }
  else recoils.delete(m);
  drawSprite(ctx, m.kind||"goblin", cx+rx, cy+ry, ts, hurt, m.elite);
  if(m.elite){ ctx.save(); ctx.strokeStyle=Delve.CONFIG.elite.glow||"#ffd75e"; ctx.lineWidth=1.5; ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(cx+rx, cy+ry-ts*0.1, ts*0.42, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  if(m.effects && m.effects.length){
   const pips=m.effects.length, pw=5, gap=3, totalW=pips*pw+(pips-1)*gap;
   let px=cx+rx-totalW/2; const py=cy+ry-ts*0.55;
   m.effects.forEach(e => { ctx.fillStyle=Delve.statusColor?Delve.statusColor(e.id):"#fff"; ctx.fillRect(px,py,pw,3); px+=pw+gap; });
  }

  // Boss objects carry maxHp like all monsters — read it directly.
  const mhp = m.maxHp;
  const frac = Math.max(0,Math.min(1,m.hp/mhp));
  ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(cx+rx-ts*0.34, cy+ry-ts*0.48, ts*0.68, 4);
  ctx.fillStyle = m.isBoss?"#c98aff":m.elite?"#ffd75e":"#ff7d93";
  ctx.fillRect(cx+rx-ts*0.34, cy+ry-ts*0.48, ts*0.68*frac, 4);
 }

 function drawItem(ctx, it, cx, cy, ts){
  drawWorldSprite(ctx, "itemPile", cx, cy, ts);
  ctx.fillStyle = Delve.TIERS.colors[it.tier] || "#fff";
  ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(cx,cy,ts*0.22,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
 }

 function drawBarrel(ctx, cx, cy, ts){ drawWorldSprite(ctx, "barrel", cx, cy, ts); }

 function drawChest(ctx, chest, cx, cy, ts){
  drawShadow(ctx, cx, cy, ts*0.5);
  drawWorldSprite(ctx, chest.open ? "chestOpen" : "chestClosed", cx, cy, ts);
 }

 function drawTreasure(ctx, thing, cx, cy, ts){
  if(thing==="gold") drawWorldSprite(ctx,"goldPile",cx,cy,ts);
  else if(thing==="potion") drawWorldSprite(ctx,"potionPile",cx,cy,ts);
  else if(thing==="chest") drawWorldSprite(ctx,"chestClosed",cx,cy,ts);
  else if(thing==="chestOpen") drawWorldSprite(ctx,"chestOpen",cx,cy,ts);
  else drawWorldSprite(ctx,"itemPile",cx,cy,ts);
 }

 function drawShopkeeper(ctx, cx, cy, ts){
  drawShadow(ctx, cx, cy, ts);
  drawWorldSprite(ctx, "shopkeeper", cx, cy, ts*1.2);
  ctx.fillStyle="#5a4a34"; ctx.fillRect(cx-ts*0.5, cy+ts*0.15, ts*1.0, ts*0.12);
  ctx.fillStyle="#7a654a"; ctx.fillRect(cx-ts*0.5, cy+ts*0.15, ts*1.0, ts*0.05);
  ctx.fillStyle="#7ea8e8"; ctx.fillRect(cx-ts*0.15, cy+ts*0.05, ts*0.12, ts*0.12);
  ctx.fillRect(cx+ts*0.03, cy+ts*0.05, ts*0.12, ts*0.12);
 }

 // ── PAPER DOLL (inventory character figure) ──────────────────
 // Moved here from ui.js: it is canvas drawing, and ui.js loads later.
 Delve.drawPaperDoll = function(){
  const cv = document.getElementById("charCanvas");
  if(!cv || !cv.getContext) return;
  const W = cv.width, H = cv.height;
  const ctx = cv.getContext("2d");
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);

  const eq = Delve.equipSlots();
  const cx = W/2;

  // backdrop shadow
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath(); ctx.ellipse(cx, H-24, 46, 10, 0, 0, Math.PI*2); ctx.fill();

  const skin = "#e8c39a", hair = "#5a3d2c", bodyBase = "#33507a", bodyDark = "#233a5c";
  const tier = function(item){
   return item ? (Delve.TIERS.colors[item.tier] || "#cfd8e0") : "#1a2532";
  };

  // cloak (behind everything)
  if(eq.cloak){
   ctx.fillStyle = tier(eq.cloak);
   ctx.beginPath();
   ctx.moveTo(cx-16, H-120);
   ctx.lineTo(cx-42, H-36);
   ctx.lineTo(cx+42, H-36);
   ctx.lineTo(cx+16, H-120);
   ctx.closePath();
   ctx.fill();
  }

  // legs
  ctx.fillStyle = "#4d3622";
  ctx.fillRect(cx-15, H-80, 12, 52);
  ctx.fillRect(cx+3, H-80, 12, 52);
  // feet
  if(eq.feet){ drawSwatch(ctx, cx-17, H-32, 16, 8, tier(eq.feet)); drawSwatch(ctx, cx+1, H-32, 16, 8, tier(eq.feet)); }
  else { ctx.fillStyle = "#2b2118"; ctx.fillRect(cx-17, H-34, 16, 8); ctx.fillRect(cx+1, H-34, 16, 8); }

  // torso
  const bodyCol = eq.body ? tier(eq.body) : bodyBase;
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.roundRect(cx-22, H-132, 44, 58, 8);
  ctx.fill();
  ctx.fillStyle = eq.body ? bodyCol : bodyDark;
  ctx.fillRect(cx-22, H-132, 5, 58);
  ctx.fillRect(cx+17, H-132, 5, 58);

  // arms
  ctx.fillStyle = skin;
  ctx.fillRect(cx-36, H-128, 9, 40);
  ctx.fillRect(cx+27, H-128, 9, 40);
  // hands
  if(eq.hands){ drawSwatch(ctx, cx-37, H-90, 11, 8, tier(eq.hands)); drawSwatch(ctx, cx+26, H-90, 11, 8, tier(eq.hands)); }
  else { ctx.fillStyle = skin; ctx.fillRect(cx-37, H-90, 11, 7); ctx.fillRect(cx+26, H-90, 11, 7); }

  // neck + head
  ctx.fillStyle = skin;
  ctx.fillRect(cx-5, H-140, 10, 8);
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx, H-152, 20, 0, Math.PI*2); ctx.fill();
  // hair
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(cx, H-158, 20, Math.PI, 0); ctx.fill();
  // face
  ctx.fillStyle = "#1d232b";
  ctx.fillRect(cx-8, H-156, 3, 3); ctx.fillRect(cx+5, H-156, 3, 3);
  // head equipment
  if(eq.head){
   ctx.fillStyle = tier(eq.head);
   ctx.beginPath(); ctx.arc(cx, H-156, 21, Math.PI, Math.PI*2); ctx.fill();
   ctx.fillRect(cx-22, H-158, 44, 7);
  }

  // weapon (right hand side)
  if(eq.weapon){
   ctx.save();
   ctx.translate(cx+30, H-98);
   ctx.rotate(-0.6);
   ctx.fillStyle = tier(eq.weapon);
   ctx.fillRect(-3, -34, 6, 34);      // blade
   ctx.fillStyle = "#8a5a33"; ctx.fillRect(-8, -4, 16, 5);   // hilt
   ctx.restore();
  }
  // offhand
  if(eq.offhand){
   ctx.fillStyle = tier(eq.offhand);
   ctx.beginPath(); ctx.arc(cx-40, H-106, 13, 0, Math.PI*2); ctx.fill();
   ctx.fillStyle = "rgba(0,0,0,0.2)";
   ctx.beginPath(); ctx.arc(cx-40, H-106, 13, 0, Math.PI*2); ctx.stroke();
  }

  // amulet (chest)
  if(eq.amulet){
   ctx.fillStyle = tier(eq.amulet);
   ctx.beginPath(); ctx.arc(cx, H-112, 5, 0, Math.PI*2); ctx.fill();
  }

  function drawSwatch(ctx2, x, y, w, h, col){
   ctx2.fillStyle = col; ctx2.fillRect(x, y, w, h);
   ctx2.fillStyle = "rgba(255,255,255,0.12)"; ctx2.fillRect(x, y, w, 2);
  }
 };

 // ── MINIMAP ──────────────────────────────────────────────────
 // markVisited records the fog-of-war reveal radius as the player moves;
 // renderMinimap draws it. Delve.draw() calls markVisited, and
 // ui.js's updateHUD() calls renderMinimap every HUD refresh.
 Delve.markVisited = function(x, y){
  const G = Delve.G; if(!G || !G.grid || !G.grid.length) return;
  if(G._visitedFloor !== G.floor){ G.visited = []; G._visitedFloor = G.floor; }
  if(!G.visited) G.visited = [];
  const h = G.grid.length, w = G.grid[0].length, R = 5;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
   if(Math.abs(dx)+Math.abs(dy) > R) continue;
   const ux=x+dx, uy=y+dy;
   if(ux<0||uy<0||ux>=w||uy>=h) continue;
   if(!G.visited[uy]) G.visited[uy] = [];
   G.visited[uy][ux] = 1;
  }
 };

 Delve.renderMinimap = function(){
  const wrap = document.getElementById("minimapWrap");
  if(!wrap || getComputedStyle(wrap).display === "none") return;
  const cv = document.getElementById("minimap"); if(!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  if(!ctx) return;
  const G = Delve.G;
  ctx.fillStyle = "#070a0e";
  ctx.fillRect(0,0,cv.width,cv.height);
  if(!G || !G.grid || !G.grid.length) return;
  const gw = G.grid[0].length, gh = G.grid.length;
  const s = Math.min(cv.width/gw, cv.height/gh);
  const ox = (cv.width-gw*s)/2, oy = (cv.height-gh*s)/2;
  const vis = G.visited || [];
  const T = Delve.T;
  const seen = function(x,y){ return vis[y] && vis[y][x]; };
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++){
   const t = G.grid[y][x];
   if(t === T.WALL || !seen(x,y)) continue;
   let col = "#2a333d";
   if(t === T.STAIR) col = "#2ad0b0";
   else if(t === T.GOLD) col = "#d9a11f";
   else if(t === T.CHEST) col = "#c9971f";
   else if(t === T.BARREL) col = "#7a5c3a";
   ctx.fillStyle = col;
   ctx.fillRect(ox+x*s, oy+y*s, s+0.5, s+0.5);
  }
  if(G.shop && G.shop.x >= 0 && seen(G.shop.x, G.shop.y)){
   ctx.fillStyle = "#ffd75e";
   ctx.fillRect(ox+G.shop.x*s, oy+G.shop.y*s, s+1, s+1);
  }
  const dot = function(x,y,col,r){
   ctx.fillStyle = col;
   ctx.beginPath();
   ctx.arc(ox+x*s+s/2, oy+y*s+s/2, s*r, 0, Math.PI*2);
   ctx.fill();
  };
  (G.monsters||[]).forEach(function(m){ if(seen(m.x,m.y)) dot(m.x,m.y,m.elite?"#c98aff":"#e05a6a",0.45); });
  if(G.boss && seen(G.boss.x,G.boss.y)) dot(G.boss.x,G.boss.y,"#ff4a3d",0.6);
  dot(G.px,G.py,"#ffffff",0.4);
 };

 // ── WALL SHADOWS (ambient occlusion) ─────────────────────────
 // Bleeds a soft shadow out of every wall tile into the floor beside it, so
 // walls read as raised volumes instead of flat squares on a grid.
 function drawWallShadows(ctx, camX, camY, vw, vh, ts){
  const T = Delve.T;
  for(let y=0;y<vh+1;y++) for(let x=0;x<vw+1;x++){
   const gx=camX+x, gy=camY+y;
   if(tileAt(gx,gy)!==T.WALL) continue;
   const sx=x*ts, sy=y*ts;
   if(tileAt(gx,gy+1)===T.FLOOR){
    const g=ctx.createLinearGradient(sx,sy+ts,sx,sy+ts*1.75);
    g.addColorStop(0,"rgba(0,0,0,0.36)"); g.addColorStop(0.45,"rgba(0,0,0,0.14)"); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g; ctx.fillRect(sx,sy+ts,ts,ts*0.75);
   }
   if(tileAt(gx,gy-1)===T.FLOOR){
    const g=ctx.createLinearGradient(sx,sy,sx,sy-ts*0.45);
    g.addColorStop(0,"rgba(0,0,0,0.30)"); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g; ctx.fillRect(sx,sy-ts*0.45,ts,ts*0.45);
   }
   if(tileAt(gx+1,gy)===T.FLOOR){
    const g=ctx.createLinearGradient(sx+ts,sy,sx+ts*1.5,sy);
    g.addColorStop(0,"rgba(0,0,0,0.22)"); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g; ctx.fillRect(sx+ts,sy,ts*0.5,ts);
   }
   if(tileAt(gx-1,gy)===T.FLOOR){
    const g=ctx.createLinearGradient(sx,sy,sx-ts*0.5,sy);
    g.addColorStop(0,"rgba(0,0,0,0.22)"); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g; ctx.fillRect(sx-ts*0.5,sy,ts*0.5,ts);
   }
  }
 }

 // ── DRIFTING DUST ────────────────────────────────────────────
 // Slow, barely-there motes that catch the torch light. Cheap, and fills the
 // empty air over big rooms.
 const motes=[];
 (function initMotes(){
  for(let i=0;i<34;i++) motes.push({ x:Math.random(), y:Math.random(), r:0.6+Math.random()*1.7, v:0.00010+Math.random()*0.00026, p:Math.random()*6.283, s:0.4+Math.random()*0.9 });
 })();
 function drawMotes(ctx, W, H, col){
  ctx.save();
  for(let i=0;i<motes.length;i++){
   const m=motes[i];
   m.y-=m.v; m.p+=0.006*m.s;
   if(m.y<-0.02){ m.y=1.02; m.x=Math.random(); }
   const px=(m.x+Math.sin(m.p)*0.014)*W, py=m.y*H;
   ctx.globalAlpha=0.05+0.07*Math.abs(Math.sin(m.p*0.7));
   ctx.fillStyle=col;
   ctx.beginPath(); ctx.arc(px,py,m.r,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
 }

 // ── FLOOR PROPS ──────────────────────────────────────────────
 // Deterministic hash-placed dressing so big empty rooms have something to look
 // at. Drawn after walls and before entities, sorted by row so nearer props
 // overlap the ones behind them.
 function drawPropRubble(ctx,cx,cy,ts,b){
  ctx.save();
  ctx.globalAlpha=0.35; ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.11,ts*0.30,ts*0.11,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  const cols=[blendHex(b.wall,"#ffffff",0.08), blendHex(b.wall,"#000000",0.24), blendHex(b.floor,"#ffffff",0.12)];
  for(let i=0;i<4;i++){
   const dx=(hash3(i+1,3,301)*2-1)*ts*0.20, dy=(hash3(i+1,5,302)*2-1)*ts*0.14;
   const rr=ts*(0.065+hash3(i+1,7,303)*0.065);
   ctx.fillStyle=cols[i%cols.length];
   ctx.beginPath(); ctx.ellipse(cx+dx,cy+dy,rr,rr*0.8,hash3(i+1,9,304)*6.283,0,Math.PI*2); ctx.fill();
   ctx.fillStyle="rgba(255,255,255,0.10)";
   ctx.beginPath(); ctx.ellipse(cx+dx-rr*0.25,cy+dy-rr*0.3,rr*0.42,rr*0.28,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
 }
 function drawPropBones(ctx,cx,cy,ts,b){
  ctx.save();
  ctx.globalAlpha=0.32; ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.10,ts*0.24,ts*0.09,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  const bone="#ded6c4", shade="#a89e88";
  const boneAt=function(x,y,len,ang){
   ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
   ctx.strokeStyle=bone; ctx.lineWidth=Math.max(1,ts*0.055); ctx.lineCap="round";
   ctx.beginPath(); ctx.moveTo(-len/2,0); ctx.lineTo(len/2,0); ctx.stroke();
   ctx.fillStyle=bone;
   ctx.beginPath(); ctx.arc(-len/2,0,ts*0.045,0,Math.PI*2); ctx.arc(len/2,0,ts*0.045,0,Math.PI*2); ctx.fill();
   ctx.fillStyle=shade;
   ctx.beginPath(); ctx.arc(len/2,0,ts*0.022,0,Math.PI*2); ctx.fill();
   ctx.restore();
  };
  boneAt(cx-ts*0.08, cy+ts*0.12, ts*0.34, 0.35);
  boneAt(cx+ts*0.10, cy+ts*0.16, ts*0.30, -0.5);
  const hx=cx+ts*0.06, hy=cy-ts*0.04, hr=ts*0.11;
  ctx.fillStyle=bone;
  ctx.beginPath(); ctx.ellipse(hx,hy,hr,hr*0.92,0,0,Math.PI*2); ctx.fill();
  ctx.fillRect(hx-hr*0.55,hy+hr*0.5,hr*1.1,hr*0.5);
  ctx.fillStyle="#241f18";
  ctx.beginPath(); ctx.ellipse(hx-hr*0.38,hy-hr*0.05,hr*0.26,hr*0.30,0,0,Math.PI*2); ctx.ellipse(hx+hr*0.38,hy-hr*0.05,hr*0.26,hr*0.30,0,0,Math.PI*2); ctx.fill();
  ctx.fillRect(hx-hr*0.12,hy+hr*0.25,hr*0.24,hr*0.3);
  ctx.restore();
 }
 function drawPropMushrooms(ctx,cx,cy,ts,b){
  ctx.save();
  ctx.globalAlpha=0.30; ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.12,ts*0.22,ts*0.08,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  const cap=blendHex(b.moss,"#ffffff",0.18);
  for(let i=0;i<3;i++){
   const a=hash3(i+2,13,311);
   const dx=(a*2-1)*ts*0.16, h=ts*(0.14+hash3(i+2,15,312)*0.12), r=ts*(0.055+hash3(i+2,17,313)*0.045);
   const x=cx+dx, y=cy+ts*0.06;
   ctx.strokeStyle="#e8e2d0"; ctx.lineWidth=Math.max(1,ts*0.035); ctx.lineCap="round";
   ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-h); ctx.stroke();
   ctx.fillStyle=cap;
   ctx.beginPath(); ctx.ellipse(x,y-h,r,r*0.72,0,Math.PI,0); ctx.fill();
   ctx.fillStyle="rgba(255,255,255,0.22)";
   ctx.beginPath(); ctx.ellipse(x-r*0.3,y-h-r*0.12,r*0.22,r*0.14,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.30; ctx.fillStyle=b.torch;
   ctx.beginPath(); ctx.arc(x,y-h,r*0.55,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=1;
  }
  ctx.restore();
 }
 function drawPropCrate(ctx,cx,cy,ts,b){
  ctx.save();
  const w=ts*0.44, h=ts*0.42, x=cx-w/2, y=cy-h/2+ts*0.04;
  ctx.globalAlpha=0.35; ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.20,w*0.62,h*0.30,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,"#7a5734"); g.addColorStop(1,"#4e361f");
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="#3a2717"; ctx.lineWidth=Math.max(1,ts*0.03);
  ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
  ctx.globalAlpha=0.55;
  ctx.beginPath();
  ctx.moveTo(x+1,y+1); ctx.lineTo(x+w-1,y+h-1); ctx.moveTo(x+w-1,y+1); ctx.lineTo(x+1,y+h-1);
  ctx.stroke(); ctx.globalAlpha=1;
  ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fillRect(x,y,w,Math.max(1,ts*0.035));
  ctx.restore();
 }

 function drawPropPillar(ctx,cx,cy,ts,b){
  ctx.save();
  const w=ts*0.32, h=ts*0.92;
  ctx.globalAlpha=0.38; ctx.fillStyle="#000";
  ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.16,w*1.05,w*0.36,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  const g=ctx.createLinearGradient(cx-w/2,0,cx+w/2,0);
  g.addColorStop(0,blendHex(b.wall,"#000000",0.32));
  g.addColorStop(0.34,blendHex(b.wall,"#ffffff",0.12));
  g.addColorStop(1,blendHex(b.wall,"#000000",0.44));
  ctx.fillStyle=g; ctx.fillRect(cx-w/2,cy-h,w,h);
  ctx.globalAlpha=0.22; ctx.fillStyle="#000";
  ctx.fillRect(cx-w*0.22,cy-h,w*0.07,h); ctx.fillRect(cx+w*0.14,cy-h,w*0.07,h);
  ctx.globalAlpha=1;
  ctx.fillStyle=blendHex(b.wall,"#ffffff",0.10);
  ctx.beginPath();
  ctx.moveTo(cx-w/2,cy-h); ctx.lineTo(cx-w*0.12,cy-h-ts*0.11);
  ctx.lineTo(cx+w*0.22,cy-h+ts*0.04); ctx.lineTo(cx+w/2,cy-h-ts*0.06);
  ctx.lineTo(cx+w/2,cy-h+ts*0.14); ctx.lineTo(cx-w/2,cy-h+ts*0.14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=blendHex(b.wall,"#000000",0.24);
  ctx.fillRect(cx-w*0.78,cy-ts*0.10,w*1.56,ts*0.16);
  ctx.fillStyle="rgba(255,255,255,0.10)";
  ctx.fillRect(cx-w*0.78,cy-ts*0.10,w*1.56,Math.max(1,ts*0.03));
  ctx.restore();
 }
 function drawPropBrazier(ctx,cx,cy,ts,b){
  const flick=0.86+0.14*Math.sin(Date.now()*0.006+cx*0.7);
  ctx.save();
  lightPool(ctx,cx,cy,ts*1.5,"rgba(255,170,70,"+(0.24*flick).toFixed(3)+")","rgba(255,140,50,0.09)");
  ctx.fillStyle="#3a3f47";
  ctx.beginPath();
  ctx.moveTo(cx-ts*0.22,cy-ts*0.12); ctx.lineTo(cx+ts*0.22,cy-ts*0.12);
  ctx.lineTo(cx+ts*0.14,cy+ts*0.10); ctx.lineTo(cx-ts*0.14,cy+ts*0.10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle="#565c66"; ctx.fillRect(cx-ts*0.24,cy-ts*0.17,ts*0.48,ts*0.06);
  ctx.strokeStyle="#3a3f47"; ctx.lineWidth=Math.max(1,ts*0.04); ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(cx-ts*0.12,cy+ts*0.10); ctx.lineTo(cx-ts*0.17,cy+ts*0.22);
  ctx.moveTo(cx+ts*0.12,cy+ts*0.10); ctx.lineTo(cx+ts*0.17,cy+ts*0.22);
  ctx.stroke();
  const fh=ts*0.36*flick, fw=ts*0.12, fy=cy-ts*0.17;
  const fg=ctx.createLinearGradient(cx,fy,cx,fy-fh);
  fg.addColorStop(0,"#ffe9a8"); fg.addColorStop(0.45,"#ff9a30"); fg.addColorStop(1,"rgba(255,220,130,0)");
  ctx.fillStyle=fg;
  ctx.beginPath();
  ctx.moveTo(cx-fw,fy); ctx.quadraticCurveTo(cx-fw*1.35,fy-fh*0.55,cx,fy-fh);
  ctx.quadraticCurveTo(cx+fw*1.35,fy-fh*0.55,cx+fw,fy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle="rgba(255,255,220,0.65)";
  ctx.beginPath(); ctx.ellipse(cx,fy-fh*0.30,fw*0.38,fh*0.20,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
 }
 function drawPropCobweb(ctx,cx,cy,ts,b){
  ctx.save();
  ctx.globalAlpha=0.30; ctx.strokeStyle="#dfe8f0"; ctx.lineWidth=Math.max(1,ts*0.022);
  const r=ts*0.42, ox=cx-ts*0.42, oy=cy-ts*0.42;
  for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(ox,oy,r*(i/3),0,Math.PI*0.5); ctx.stroke(); }
  for(let i=0;i<=3;i++){
   const a=i*Math.PI*0.5/3;
   ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+Math.cos(a)*r,oy+Math.sin(a)*r); ctx.stroke();
  }
  ctx.restore();
 }
 function drawPropRune(ctx,cx,cy,ts,b){
  const pulse=0.5+0.5*Math.sin(Date.now()*0.0022+cx);
  ctx.save();
  lightPool(ctx,cx,cy,ts*0.85,"rgba(126,224,255,"+(0.14+0.10*pulse).toFixed(3)+")","rgba(90,180,255,0.05)");
  ctx.globalAlpha=0.30+0.22*pulse;
  ctx.strokeStyle="#8fe4ff"; ctx.lineWidth=Math.max(1,ts*0.03);
  ctx.beginPath(); ctx.arc(cx,cy,ts*0.26,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,ts*0.16,0,Math.PI*2); ctx.stroke();
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+pulse*0.3;
   ctx.beginPath();
   ctx.moveTo(cx+Math.cos(a)*ts*0.16, cy+Math.sin(a)*ts*0.16);
   ctx.lineTo(cx+Math.cos(a)*ts*0.26, cy+Math.sin(a)*ts*0.26);
   ctx.stroke();
  }
  ctx.restore();
 }

 function drawProps(ctx, camX, camY, vw, vh, ts, b){
  const T=Delve.T, G=Delve.G;
  const list=[];
  for(let y=0;y<vh+1;y++) for(let x=0;x<vw+1;x++){
   const gx=camX+x, gy=camY+y;
   if(tileAt(gx,gy)!==T.FLOOR) continue;
   if(G && G.shop && G.shop.x===gx && G.shop.y===gy) continue;
   if(hash3(gx,gy,401) < 0.070) list.push({ x:gx, y:gy, sx:x*ts, sy:y*ts, k:hash3(gx,gy,402) });
   if(hash3(gx,gy,405) < 0.053 && tileAt(gx,gy-1)===T.WALL) list.push({ x:gx, y:gy, sx:x*ts, sy:y*ts, web:true });
  }
  list.sort(function(a,b){ return a.y-b.y; });
  for(let i=0;i<list.length;i++){
   const it=list[i], cx=it.sx+ts*0.5, cy=it.sy+ts*0.5;
   if(it.web){ drawPropCobweb(ctx,cx,cy,ts,b); continue; }
   const k=it.k;
   if(k<0.082) drawPropRubble(ctx,cx,cy,ts,b);
   else if(k<0.149) drawPropBones(ctx,cx,cy,ts,b);
   else if(k<0.213) drawPropMushrooms(ctx,cx,cy,ts,b);
   else if(k<0.266) drawPropRune(ctx,cx,cy,ts,b);
   else if(k<0.351) drawPropCrate(ctx,cx,cy,ts,b);
   else if(k<0.424){ if(tileAt(it.x,it.y-1)===T.FLOOR) drawPropPillar(ctx,cx,cy,ts,b); else drawPropRubble(ctx,cx,cy,ts,b); }
   else drawPropBrazier(ctx,cx,cy,ts,b);
  }
 }


 // ── MAIN DRAW ────────────────────────────────────────────────
 Delve.draw = function(){
  const G = Delve.G;
  if(!G) return;
  const ctx=Delve.ctx, W=Delve.W, H=Delve.H, ts=Delve.ts;
  Delve.computeView();
  const vw=Delve.viewW, vh=Delve.viewH, b=biome(), T=Delve.T;
  ensureCache(G);

  let camX=Math.floor(G.px-vw/2), camY=Math.floor(G.py-vh/2);
  camX=Math.max(0,Math.min(camX,G.grid[0].length-vw));
  camY=Math.max(0,Math.min(camY,G.grid.length-vh));
  Delve.camX=camX; Delve.camY=camY;

  let ox=0, oy=0;
  if(shakeT>0){ ox=(Math.random()-0.5)*shakeMag; oy=(Math.random()-0.5)*shakeMag; shakeT--; } else shakeMag=0;

  ctx.save(); ctx.translate(ox,oy); ctx.fillStyle="#06090d"; ctx.fillRect(-10,-10,W+20,H+20);

  // floors
  for(let y=0;y<vh+1;y++) for(let x=0;x<vw+1;x++){
   const gx=camX+x, gy=camY+y, t=tileAt(gx,gy);
   if(t===null||t===T.WALL) continue;
   const sx=x*ts, sy=y*ts;
   blitTile(ctx,gx,gy,sx,sy,ts,b,t);
   if(t===T.FLOOR) drawClutter(ctx,sx,sy,ts,gx,gy);
  }
  // walls
  for(let y=0;y<vh+1;y++) for(let x=0;x<vw+1;x++){
   const gx=camX+x, gy=camY+y, t=tileAt(gx,gy);
   if(t!==T.WALL) continue;
   const sx=x*ts, sy=y*ts;
   if(isTorchTile(gx,gy)){ drawWallTile(ctx,sx,sy,ts,gx,gy,b); drawWallTorch(ctx,sx,sy,ts,b); }
   else blitTile(ctx,gx,gy,sx,sy,ts,b,t);
   const fd=G.floorData;
   if(fd && fd.secretRoom && fd.secretRoom.falseWallX===gx && fd.secretRoom.falseWallY===gy){
    const pulse=0.5+0.5*Math.sin(Date.now()*0.003);
    ctx.save(); ctx.globalAlpha=pulse*0.55; ctx.fillStyle="#7ee0ff"; ctx.beginPath(); ctx.arc(sx+ts*0.5,sy+ts*0.5,ts*0.15,0,Math.PI*2); ctx.fill(); ctx.restore();
   }
  }

  // ambient occlusion from the walls, then the loose floor dressing
  drawWallShadows(ctx, camX, camY, vw, vh, ts);
  drawProps(ctx, camX, camY, vw, vh, ts, b);

  // path highlight
  if(G._path && G._path.length>0){
   const dest=G._path[G._path.length-1];
   if(dest.x>=camX&&dest.y>=camY&&dest.x<camX+vw&&dest.y<camY+vh){
    const sx=(dest.x-camX)*ts, sy=(dest.y-camY)*ts;
    const pulse=0.5+0.5*Math.sin(Date.now()*0.004);
    ctx.save();
    rrectPath(ctx,sx+2,sy+2,ts-4,ts-4,Math.max(3,ts*0.18));
    ctx.fillStyle="rgba(255,232,120,"+(0.12+0.06*pulse).toFixed(3)+")"; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle="rgba(255,225,110,"+(0.55+0.30*pulse).toFixed(3)+")";
    ctx.shadowColor="rgba(255,220,90,0.75)"; ctx.shadowBlur=ts*0.35; ctx.stroke();
    ctx.restore();
   }
  }

  // adjacency highlights — rounded and softly pulsing instead of hard squares
  const hPulse=0.5+0.5*Math.sin(Date.now()*0.004);
  [[0,1],[0,-1],[1,0],[-1,0]].forEach(d=>{
   const gx=G.px+d[0], gy=G.py+d[1];
   if(gx<camX||gx>=camX+vw||gy<camY||gy>=camY+vh) return;
   const t=tileAt(gx,gy);
   if(t===null||t===T.WALL) return;
   const sx=(gx-camX)*ts, sy=(gy-camY)*ts;
   const hostile=(t===T.MONSTER||t===T.BOSS);
   const fill=hostile?"rgba(255,140,90,":"rgba(110,200,255,";
   const line=hostile?"rgba(255,180,130,":"rgba(150,225,255,";
   ctx.save();
   rrectPath(ctx,sx+2,sy+2,ts-4,ts-4,Math.max(3,ts*0.18));
   ctx.fillStyle=fill+(0.10+0.07*hPulse).toFixed(3)+")"; ctx.fill();
   ctx.lineWidth=2; ctx.strokeStyle=line+(0.45+0.32*hPulse).toFixed(3)+")";
   ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=ts*0.30; ctx.stroke();
   ctx.restore();
  });

  // chests
  (G.chests||[]).forEach(ch=>{
   if(ch.x<camX||ch.y<camY||ch.x>=camX+vw||ch.y>=camY+vh) return;
   drawChest(ctx, ch, (ch.x-camX)*ts+ts/2, (ch.y-camY)*ts+ts/2, ts);
  });

  // items
  (G.items||[]).forEach(it=>{
   if(it.x<camX||it.y<camY||it.x>=camX+vw||it.y>=camY+vh) return;
   drawItem(ctx, it, (it.x-camX)*ts+ts/2, (it.y-camY)*ts+ts/2, ts);
  });

  // gold piles
  (G.goldPiles||[]).forEach(p=>{
   if(p.x<camX||p.y<camY||p.x>=camX+vw||p.y>=camY+vh) return;
   drawTreasure(ctx,"gold",(p.x-camX)*ts+ts/2,(p.y-camY)*ts+ts/2,ts);
  });

  // barrels
  (G.barrels||[]).forEach(bar=>{
   if(bar.x<camX||bar.y<camY||bar.x>=camX+vw||bar.y>=camY+vh) return;
   drawBarrel(ctx,(bar.x-camX)*ts+ts/2,(bar.y-camY)*ts+ts/2,ts);
  });

  // decor (legacy)
  const decor=(G.floorData&&G.floorData.decor)||[];
  decor.forEach(d=>{
   if(d.x<camX||d.y<camY||d.x>=camX+vw||d.y>=camY+vh) return;
   drawTreasure(ctx,d.thing,(d.x-camX)*ts+ts/2,(d.y-camY)*ts+ts/2,ts);
  });

  // shopkeeper
  if(G.shop && G.shop.x>=camX && G.shop.y>=camY && G.shop.x<camX+vw && G.shop.y<camY+vh){
   drawShopkeeper(ctx,(G.shop.x-camX)*ts+ts/2,(G.shop.y-camY)*ts+ts/2,ts);
  }

  // monsters
  G.monsters.forEach(m=>{
   if(m.x<camX||m.y<camY||m.x>=camX+vw||m.y>=camY+vh) return;
   drawMob(ctx,m,(m.x-camX)*ts+ts/2,(m.y-camY)*ts+ts/2,ts);
  });

  // boss
  if(G.boss && G.boss.x>=camX && G.boss.y>=camY && G.boss.x<camX+vw && G.boss.y<camY+vh){
   drawMob(ctx,G.boss,(G.boss.x-camX)*ts+ts/2,(G.boss.y-camY)*ts+ts/2,ts);
  }

  // player
  const pSX=(G.px-camX)*ts, pSY=(G.py-camY)*ts;
  const pHurt=G.playerHit && Date.now()-G.playerHit<150;
  let prx=0, pry=0;
  if(pHurt){ const atk=nearestThreat(G.px,G.py); const dir=atk?dirAway(G.px,G.py,atk.x,atk.y):{x:0,y:-1}; ensureRecoil("player",G.playerHit,dir.x,dir.y); const off=recoilOffset("player",ts); prx=off.x; pry=off.y; }
  else recoils.delete("player");
  drawPlayer(ctx,pSX+ts/2,pSY+ts/2,ts,pHurt,prx,pry);

  if(Delve.markVisited) Delve.markVisited(G.px,G.py);

  drawFloaters(ctx,camX,camY,ts);

  // dust catching the torchlight, then a softer vignette
  drawMotes(ctx,W,H,b.torch);
  const vig=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.32,W/2,H/2,Math.max(W,H)*0.82);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(0.7,"rgba(0,0,0,0.16)"); vig.addColorStop(1,"rgba(0,0,0,0.46)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  ctx.restore();

  if(G.msg && Date.now()<G.msgUntil){
   ctx.font="700 16px system-ui, sans-serif"; ctx.textAlign="center"; ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillText(G.msg,W/2+1,H-45); ctx.fillStyle="#eafff5"; ctx.fillText(G.msg,W/2,H-46);
  }
 };

 function drawFloaters(ctx, camX, camY, ts){
  const now=Date.now(), alive=[];
  floaters.forEach(f=>{
   const age=now-f.born; if(age>=FLOAT_LIFE) return;
   const t=age/FLOAT_LIFE; const alpha=t<0.15?t/0.15:1-((t-0.15)/0.85); const rise=t*ts*2.2;
   const sx=(f.x-camX)*ts+ts*0.5, sy=(f.y-camY)*ts-rise;
   ctx.save(); ctx.globalAlpha=alpha; ctx.font="700 "+Math.max(11,ts*0.32)+"px system-ui, sans-serif"; ctx.textAlign="center";
   ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillText(f.txt,sx+1,sy+1); ctx.fillStyle=f.col; ctx.fillText(f.txt,sx,sy); ctx.restore();
   alive.push(f);
  });
  floaters=alive;
 }

 function blendHex(hex,hex2,t){
  const p=c=>parseInt(c,16);
  const r1=p(hex.slice(1,3)),g1=p(hex.slice(3,5)),b1=p(hex.slice(5,7));
  const r2=p(hex2.slice(1,3)),g2=p(hex2.slice(3,5)),b2=p(hex2.slice(5,7));
  const r=Math.round(r1+(r2-r1)*t).toString(16).padStart(2,"0");
  const g=Math.round(g1+(g2-g1)*t).toString(16).padStart(2,"0");
  const b=Math.round(b1+(b2-b1)*t).toString(16).padStart(2,"0");
  return "#"+r+g+b;
 }

 Delve.addFloater = function(txt,x,y,col){
  while(floaters.length>=60) floaters.shift();
  const key=Math.round(x)+","+Math.round(y);
  const depth=floaterDepth.get(key)||0;
  const jx=(Math.random()-0.5)*0.45;
  floaters.push({txt, x:x+jx, y:y-depth*0.6, col, born:Date.now()});
  floaterDepth.set(key,depth+1);
  setTimeout(function(){ const d=floaterDepth.get(key)||0; if(d>1) floaterDepth.set(key,d-1); else floaterDepth.delete(key); },520);
 };
 Delve.addShake = function(mag){ shakeMag=Math.max(shakeMag,mag); shakeT=6; };

 setInterval(function(){ torchFrame=(torchFrame+1)%3; if(Delve.G && !Delve.G.dead) Delve.draw(); },400);

})();
