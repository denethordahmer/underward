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
 // Attack telegraph: a short lunge TOWARD the target, mirroring the recoil
 // system above. This is what tells you a monster is swinging at you.
 const lunges = new Map();
 const ATTACK_MS = 260;
 function ensureLunge(key, flashTime, dx, dy){
  const l = lunges.get(key);
  if(!l || l.flash < flashTime) lunges.set(key, { flash: flashTime, dx, dy });
 }
 function lungeOffset(key, ts){
  const l = lunges.get(key);
  if(!l) return { x: 0, y: 0 };
  const t = (Date.now() - l.flash) / ATTACK_MS;
  if(t >= 1){ lunges.delete(key); return { x: 0, y: 0 }; }
  const disp = Math.sin(t * Math.PI) * ts * 0.30;
  return { x: l.dx * disp, y: l.dy * disp };
 }
 function attacking(m){
  return !!(m && m.attackFlash && Date.now() - m.attackFlash < ATTACK_MS);
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

 function biome(){
  const G = Delve.G;
  const ward = G ? Delve.getWard(G.floor) : null;
  const idx = (ward && ward.biome !== undefined) ? ward.biome : 0;
  const b = (Delve.CONFIG.BIOMES && Delve.CONFIG.BIOMES[idx]) || Delve.CONFIG.BIOMES[0] || {};
  return {
   wall: b.wall || "#64707c", wallEdge: b.wallEdge || "#8d99a6", wallBrick: b.wallBrick || "#3a4248",
   mortar: b.mortar || "#0b0f14", floor: b.floor || "#2e3842", floor2: b.floor2 || "#283039",
   moss: b.moss || "#3f6d55", water: b.water || "#1e3a4a", torch: b.torch || "#ffb347",
   light: b.light || "rgba(70,140,255,0.06)",
   clutter: b.clutter || "ruins",     // decoration family for floor tiles
   ambient: b.ambient || null         // drifting weather, null = none
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
 // Braziers. Everywhere else a torch is a 4% roll; a boss arena instead gets a
 // guaranteed, deterministic set derived from its geometry (G.bossArena), so the
 // chamber you fight in is always lit — and always lit the same way, so a boss
 // room is somewhere you can learn. Rebuilt only when the floor or the arena
 // object changes, never per tile.
 let arenaSrc = null, arenaTorchSet = null, arenaTorchFloor = -1;
 function arenaTorches(){
  const G = Delve.G, A = G && G.bossArena;
  if(!A){ arenaSrc = null; arenaTorchSet = null; return null; }
  if(arenaSrc === A && arenaTorchFloor === G.floor) return arenaTorchSet;
  const set = {};
  const add = function(x, y){ set[x + "," + y] = 1; };
  const spread = function(a, z, n){
   const out = [];
   for(let i = 1; i <= n; i++) out.push(Math.round(a + (z - a) * i / (n + 1)));
   return out;
  };
  // the back wall of the chamber
  spread(A.bossX, A.bossX + A.bossW - 1, Math.max(3, Math.min(5, Math.floor(A.bossW / 3))))
   .forEach(function(x){ add(x, A.bossY - 1); });
  // both side walls, a third and two thirds down (never the last row: its
  // neighbour below may not be floor)
  spread(A.bossY, A.bossY + A.bossH - 2, 2).forEach(function(y){
   add(A.bossX - 1, y); add(A.bossX + A.bossW, y);
  });
  // the approach: both walls of the corridor
  spread(A.corrTop, A.corrTop + A.corrH - 1, Math.max(2, Math.min(4, Math.floor(A.corrH / 4))))
   .forEach(function(y){ add(A.corrX - 1, y); add(A.corrX + A.corrW, y); });
  // and the walls you walk in past, so the entry chamber isn't black either
  const ey = A.entryY + Math.floor(A.entryH / 2) - 1;
  add(A.entryX - 1, ey); add(A.entryX + A.entryW, ey);
  arenaSrc = A; arenaTorchFloor = G.floor; arenaTorchSet = set;
  return set;
 }
 function isTorchTile(gx, gy){
  if(tileAt(gx, gy) !== Delve.T.WALL) return false;
  // Arena braziers are chosen from the arena's own boundary, so they don't need
  // the "something to light underneath" test the random roll uses for wild
  // torches (a side wall of a chamber has wall below it, not floor).
  const arena = arenaTorches();
  if(arena && arena[gx + "," + gy]) return true;
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
 function drawFloorTile(ctx, sx, sy, ts, gx, gy, b){
  const n = hash2(gx,gy), n2 = hash3(gx,gy,17), n3 = hash3(gx,gy,31), n4 = hash3(gx,gy,53);
  let slabCol = ((gx+gy)%2===0) ? b.floor : b.floor2;
  if(n3 < 0.05) slabCol = blendHex(slabCol, "#0a0e12", 0.35);
  const mortar = 2;
  ctx.fillStyle = b.mortar; ctx.fillRect(sx, sy, ts, ts);
  ctx.fillStyle = slabCol; ctx.fillRect(sx+mortar, sy+mortar, ts-mortar*2, ts-mortar*2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(sx+mortar, sy+mortar, ts-mortar*2, 2);
  ctx.fillRect(sx+mortar, sy+mortar, 2, ts-mortar*2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(sx+ts-mortar-2, sy+mortar, 2, ts-mortar*2);
  ctx.fillRect(sx+mortar, sy+ts-mortar-2, ts-mortar*2, 2);
  if(n2 < 0.08){
   const corner = Math.floor(n2/0.02)%4, cs = Math.max(3, Math.floor(ts*0.18));
   ctx.fillStyle = b.mortar;
   if(corner===0) ctx.fillRect(sx+mortar, sy+mortar, cs, cs);
   if(corner===1) ctx.fillRect(sx+ts-mortar-cs, sy+mortar, cs, cs);
   if(corner===2) ctx.fillRect(sx+mortar, sy+ts-mortar-cs, cs, cs);
   if(corner===3) ctx.fillRect(sx+ts-mortar-cs, sy+ts-mortar-cs, cs, cs);
  }
  if(n > 0.82){
   const crackType = Math.floor(hash3(gx,gy,7)*10);
   ctx.save(); ctx.strokeStyle="rgba(0,0,0,0.32)"; ctx.lineWidth=Math.max(1,ts*0.03);
   ctx.globalAlpha=0.6; ctx.lineCap="round";
   const m=mortar+2, x0=sx+m, y0=sy+m, tw=ts-m*2;
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
 }

 function drawWeed(ctx, sx, sy, ts, gx, gy, b, type){
  // Growth follows the biome too: frost ferns and ice crystals in the vault,
  // thorn tendrils and spore stalks in the blackvein, meadow weeds in the ruins.
  if(b.clutter === "frost") return drawFrostGrowth(ctx, sx, sy, ts, gx, gy, b, type);
  if(b.clutter === "blackvein") return drawThornGrowth(ctx, sx, sy, ts, gx, gy, b, type);
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

 // Per-tile decoration. The family comes from the biome (`clutter`), so the
 // frozen vault isn't quietly growing meadow weeds and mushrooms.
 function drawClutter(ctx, sx, sy, ts, gx, gy, b){
  const roll = hash3(gx, gy, 71);
  if(roll < 0.03){
   if(b.clutter === "frost"){ drawFrostClutter(ctx, sx, sy, ts, roll); return; }
   if(b.clutter === "blackvein"){ drawThornClutter(ctx, sx, sy, ts, roll); return; }
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

 // ── BIOME DECORATION FAMILIES ────────────────────────────────
 // Two per non-ruins biome: floor clutter (bones/pebbles in the ruins) and
 // growth (weeds in the ruins). Colours are the biome's own, so a future area
 // reusing a family only needs its palette to fit.
 function drawFrostClutter(ctx, sx, sy, ts, roll){
  ctx.save(); ctx.globalAlpha=0.55;
  if(roll < 0.012){
   // ice shards pushing through the slab
   ctx.fillStyle="#7ec8e0";
   [[0.40,0.62,1.0],[0.55,0.64,0.72],[0.30,0.63,0.55]].forEach(function(s){
    const bx=sx+ts*s[0], by=sy+ts*s[1], hh=ts*0.17*s[2];
    ctx.beginPath(); ctx.moveTo(bx,by-hh); ctx.lineTo(bx-ts*0.05*s[2],by); ctx.lineTo(bx+ts*0.05*s[2],by); ctx.closePath(); ctx.fill();
   });
  } else if(roll < 0.02){
   // a drift of snow
   ctx.fillStyle="#dff0ff";
   ctx.beginPath(); ctx.ellipse(sx+ts*0.50,sy+ts*0.60,ts*0.26,ts*0.09,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.35; ctx.fillStyle="#ffffff";
   ctx.beginPath(); ctx.ellipse(sx+ts*0.46,sy+ts*0.57,ts*0.15,ts*0.05,0,0,Math.PI*2); ctx.fill();
  } else {
   // frozen puddle: dark water under a skin of ice
   ctx.globalAlpha=0.45; ctx.fillStyle="#1a3a5e";
   ctx.beginPath(); ctx.ellipse(sx+ts*0.50,sy+ts*0.58,ts*0.19,ts*0.10,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.5; ctx.strokeStyle="#cfeeff"; ctx.lineWidth=Math.max(1,ts*0.02);
   ctx.beginPath(); ctx.moveTo(sx+ts*0.37,sy+ts*0.56); ctx.lineTo(sx+ts*0.61,sy+ts*0.62); ctx.stroke();
  }
  ctx.restore();
 }

 function drawThornClutter(ctx, sx, sy, ts, roll){
  ctx.save(); ctx.globalAlpha=0.62;
  if(roll < 0.012){
   // a thorn breaking the surface
   ctx.fillStyle="#4a3a1e";
   ctx.beginPath(); ctx.moveTo(sx+ts*0.50,sy+ts*0.44); ctx.lineTo(sx+ts*0.42,sy+ts*0.66); ctx.lineTo(sx+ts*0.58,sy+ts*0.66); ctx.closePath(); ctx.fill();
   ctx.fillStyle="#c8d84a";
   ctx.beginPath(); ctx.arc(sx+ts*0.50,sy+ts*0.47,ts*0.04,0,Math.PI*2); ctx.fill();
  } else if(roll < 0.02){
   // a spore pod, pulsing faintly
   ctx.fillStyle="#3d5a22";
   ctx.beginPath(); ctx.ellipse(sx+ts*0.50,sy+ts*0.58,ts*0.09,ts*0.12,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.4; ctx.fillStyle="#7a9a3a";
   ctx.beginPath(); ctx.arc(sx+ts*0.50,sy+ts*0.56,ts*0.12,0,Math.PI*2); ctx.fill();
  } else {
   // a patch of glowing seam-moss
   ctx.globalAlpha=0.35; ctx.fillStyle="#7a9a3a";
   ctx.beginPath(); ctx.ellipse(sx+ts*0.50,sy+ts*0.58,ts*0.16,ts*0.07,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
 }

 function drawFrostGrowth(ctx, sx, sy, ts, gx, gy, b, type){
  ctx.save(); ctx.globalAlpha=0.75;
  const cx=sx+ts*(0.3+hash3(gx,gy,61)*0.4), cy=sy+ts*(0.4+hash3(gx,gy,67)*0.4), sc=ts/40;
  switch(type % 3){
   case 0:   // frost fern
    ctx.strokeStyle="#7ec8e0"; ctx.lineWidth=Math.max(1,sc*1.1); ctx.lineCap="round";
    ctx.beginPath();
    for(let i=-1;i<=1;i++){
     ctx.moveTo(cx,cy+sc*5);
     ctx.quadraticCurveTo(cx+i*sc*4, cy+sc*1, cx+i*sc*8, cy-sc*6);
    }
    ctx.stroke(); break;
   case 1:   // cluster of ice crystals
    ctx.fillStyle="#7ec8e0";
    [[-3.2,3,5.0],[0,3,8.0],[3.2,3,5.5]].forEach(function(s){
     const bx=cx+s[0]*sc, by=cy+sc*2;
     ctx.beginPath(); ctx.moveTo(bx,by-s[2]*sc); ctx.lineTo(bx-sc*1.5,by); ctx.lineTo(bx+sc*1.5,by); ctx.closePath(); ctx.fill();
    });
    ctx.globalAlpha=0.45; ctx.fillStyle="#eaffff";
    ctx.beginPath(); ctx.arc(cx,cy+sc*1,sc*2,0,Math.PI*2); ctx.fill();
    break;
   default:  // blades of grass, frozen stiff
    ctx.strokeStyle="#a8e8ff"; ctx.lineWidth=Math.max(1,sc*0.9); ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(cx-sc*4,cy+sc*5); ctx.lineTo(cx-sc*2,cy-sc*4);
    ctx.moveTo(cx,cy+sc*5); ctx.lineTo(cx+sc*1,cy-sc*6);
    ctx.moveTo(cx+sc*4,cy+sc*5); ctx.lineTo(cx+sc*6,cy-sc*3);
    ctx.stroke();
    ctx.globalAlpha=0.5; ctx.fillStyle="#eaffff";
    ctx.beginPath(); ctx.arc(cx+sc*1,cy-sc*6,sc*1.2,0,Math.PI*2); ctx.fill();
    break;
  }
  ctx.restore();
 }

 function drawThornGrowth(ctx, sx, sy, ts, gx, gy, b, type){
  ctx.save(); ctx.globalAlpha=0.8;
  const cx=sx+ts*(0.3+hash3(gx,gy,61)*0.4), cy=sy+ts*(0.4+hash3(gx,gy,67)*0.4), sc=ts/40;
  switch(type % 3){
   case 0:   // thorn tendril
    ctx.strokeStyle="#4a3a1e"; ctx.lineWidth=Math.max(1,sc*1.3); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(cx,cy+sc*6); ctx.quadraticCurveTo(cx-sc*6,cy+sc*2,cx-sc*2,cy-sc*6); ctx.stroke();
    ctx.strokeStyle="#c8d84a"; ctx.lineWidth=Math.max(1,sc*0.9);
    ctx.beginPath(); ctx.moveTo(cx-sc*3,cy+sc*1); ctx.lineTo(cx-sc*5,cy-sc*2);
    ctx.moveTo(cx-sc*2,cy-sc*2); ctx.lineTo(cx-sc*1,cy-sc*5); ctx.stroke();
    break;
   case 1:   // spore stalk with a glowing head
    ctx.strokeStyle="#6a7a2e"; ctx.lineWidth=Math.max(1,sc*1.1); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(cx,cy+sc*6); ctx.lineTo(cx+sc,cy-sc*3); ctx.stroke();
    ctx.globalAlpha=0.45; ctx.fillStyle="#7a9a3a";
    ctx.beginPath(); ctx.arc(cx+sc,cy-sc*4,sc*2.6,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.9; ctx.fillStyle="#eaffa8";
    ctx.beginPath(); ctx.arc(cx+sc,cy-sc*4,sc*1.1,0,Math.PI*2); ctx.fill();
    break;
   default:  // curled vine running across the slab
    ctx.strokeStyle="#3d5a22"; ctx.lineWidth=Math.max(1,sc*1.1); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(sx+ts*0.08,cy+sc*3); ctx.bezierCurveTo(cx-sc*5,cy-sc*4,cx+sc*5,cy+sc*5,cx+sc*9,cy-sc*2); ctx.stroke();
    ctx.globalAlpha=0.35; ctx.fillStyle="#7a9a3a";
    ctx.beginPath(); ctx.ellipse(cx+sc*2,cy-sc*3,sc*3,sc*1.4,-0.5,0,Math.PI*2); ctx.fill();
    break;
  }
  ctx.restore();
 }

 // ── WALL ─────────────────────────────────────────────────────
 function drawWallTile(ctx, sx, sy, ts, gx, gy, b){
  const n=hash2(gx,gy), n2=hash3(gx,gy,11), n3=hash3(gx,gy,23);
  const mood = n2<0.18?1:n2<0.38?2:n2<0.52?3:0;
  ctx.fillStyle=b.wall; ctx.fillRect(sx,sy,ts,ts);
  if(mood===2){ ctx.fillStyle="rgba(60,90,60,0.28)"; ctx.fillRect(sx,sy,ts,ts); }
  if(mood===3){ const grad=ctx.createLinearGradient(sx+ts*0.5,sy,sx+ts*0.5,sy+ts); grad.addColorStop(0,"rgba(70,40,20,0.45)"); grad.addColorStop(0.6,"rgba(50,30,15,0.15)"); grad.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=grad; ctx.fillRect(sx+ts*0.25,sy,ts*0.5,ts); }
  ctx.fillStyle=b.wallEdge; ctx.fillRect(sx,sy,ts,Math.max(2,ts*0.09)); ctx.fillRect(sx,sy,Math.max(2,ts*0.06),ts);
  if(ts>=20){
   ctx.strokeStyle=b.wallBrick; ctx.lineWidth=1; ctx.globalAlpha=mood===1?0.75:0.5;
   ctx.beginPath(); ctx.moveTo(sx+1,sy+ts*0.50); ctx.lineTo(sx+ts-1,sy+ts*0.50);
   const vOff=(gy%2===0)?0.25:0.75; ctx.moveTo(sx+ts*vOff,sy+ts*0.50); ctx.lineTo(sx+ts*vOff,sy+ts-1);
   if(n>0.40){ const vOff2=(gy%2===0)?0.75:0.25; ctx.moveTo(sx+ts*vOff2,sy+1); ctx.lineTo(sx+ts*vOff2,sy+ts*0.50); }
   ctx.stroke(); ctx.globalAlpha=1;
   if(mood===1){ const cr=hash3(gx,gy,89); const brickX=sx+(cr>0.5?ts*vOff:0)+2; const brickY=sy+(cr>0.5?0:ts*0.51); const brickW=ts*(cr>0.5?(1-vOff):vOff)-3; const brickH=ts*0.49-2; ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.fillRect(brickX,brickY,brickW,brickH); ctx.fillStyle=b.wallBrick; ctx.fillRect(brickX+brickW*0.3,brickY-1,brickW*0.25,3); }
   if(mood===2){ ctx.fillStyle=b.moss; ctx.globalAlpha=0.22; ctx.fillRect(sx+1,sy+ts*0.48,ts-2,4); ctx.globalAlpha=1; }
  }
  ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.fillRect(sx,sy,ts,2);
  ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.fillRect(sx,sy+ts-2,ts,2);
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
  ctx.fillStyle=b.mortar; ctx.fillRect(sx,sy,ts,ts);
  ctx.fillStyle=b.floor2; ctx.fillRect(sx+2,sy+2,ts-4,ts-4);
  const inner=ts-4, steps=4, stepH=inner/steps;
  for(let i=0;i<steps;i++){ const y0=sy+2+i*stepH; const t=0.12+i*0.18; ctx.fillStyle=blendHex(b.floor2,"#05070a",t); ctx.fillRect(sx+2,y0,inner,stepH); ctx.fillStyle="rgba(255,255,255,0.07)"; ctx.fillRect(sx+2,y0,inner,1); }
  ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(sx+2,sy+ts-4,inner,2);
 }

 // ── SPRITES ──────────────────────────────────────────────────
 function drawShadow(ctx, cx, cy, ts, scale){
  const k = scale || 1;
  const s = Delve.SPR && Delve.SPR.shadow;
  if(s){ const w=ts*0.8*k, h=w*(s.height/s.width)*0.5; ctx.drawImage(s,cx-w/2,cy+ts*0.30,w,h); }
  else { ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx,cy+ts*0.33,ts*0.28*k,ts*0.09,0,0,Math.PI*2); ctx.fill(); }
 }
 // `size` is an optional {w,h} in tiles (bosses are 2x2). Placement is
 // bottom-anchored: a 1x1 sprite's feet land exactly where they always did, and
 // extra height grows upward, so a bigger sprite stands on its tile.
 function drawSprite(ctx, kind, cx, cy, ts, hurt, elite, attack, size){
  const S = Delve.SPR && Delve.SPR[kind];
  if(!S){ ctx.fillStyle="#ff5c7a"; ctx.beginPath(); ctx.arc(cx,cy,ts*0.3,0,Math.PI*2); ctx.fill(); return; }
  let img;
  if(attack && S.attack) img = S.attack;      // its own action wins the pose
  else if(elite && S.elite) img = S.elite;
  else img = hurt ? (S.hurt || S.idle) : S.idle;
  const w = ts * 0.9 * ((size && size.w) || 1);
  const h = ts * 0.9 * ((size && size.h) || 1);
  const bottom = cy + ts * 0.45;
  ctx.drawImage(img, cx - w/2, bottom - h, w, h);
 }
 function drawWorldSprite(ctx, key, cx, cy, ts){
  const S = Delve.SPR && Delve.SPR.world && Delve.SPR.world[key];
  if(!S) return; const size=ts*0.75; ctx.drawImage(S,cx-size/2,cy-size/2,size,size);
 }

 // ── ARENA PROPS ──────────────────────────────────────────────
 // G.decor (levels.js dressBossArena). Floor props sit centred on their tile.
 // Wall props hang from the top of their tile and spill into the tile below —
  // their art is taller than one tile, which is what makes it read as hanging.
 // Nothing here touches the grid, so props can't block, be tapped, or be walked
 // into: they are purely painted.
 function drawDecor(ctx, camX, camY, vw, vh, ts, layer){
  const G = Delve.G;
  const list = G && G.decor;
  if(!list || !list.length) return;
  const W = Delve.SPR && Delve.SPR.world;
  if(!W) return;
  for(let i=0;i<list.length;i++){
   const d = list[i];
   if(d.layer !== layer) continue;
   if(d.x<camX || d.y<camY || d.x>=camX+vw || d.y>=camY+vh) continue;
   const img = W[d.key];
   if(!img) continue;
   const tx = (d.x-camX)*ts, ty = (d.y-camY)*ts;
   const w = ts*0.95;
   if(layer === "wall"){
    const h = w * (img.height / img.width);
    ctx.drawImage(img, tx+ts*0.5-w*0.5, ty, w, h);
   } else {
    ctx.drawImage(img, tx+ts*0.5-w*0.5, ty+ts*0.5-w*0.5, w, w);
   }
  }
 }

 function drawPlayer(ctx, cx, cy, ts, hurt, ox, oy, attack){
  drawShadow(ctx, cx, cy, ts);
  drawSprite(ctx, "soldier", cx+(ox||0), cy+(oy||0), ts, hurt, false, attack, null);
 }

 function drawMob(ctx, m, cx, cy, ts){
  // A boss's art covers a w x h block of tiles; its own tile is the bottom-left
  // of that block, so a wide body straddles its columns evenly.
  const size = m.isBoss ? (m.size || { w:1, h:1 }) : null;
  const bw = size ? size.w : 1, bh = size ? size.h : 1;
  const ax = cx + (bw - 1) * ts * 0.5;
  drawShadow(ctx, ax, cy, ts, bw);

  const hurt = m.hitFlash && Date.now()-m.hitFlash < 130;
  const atk = attacking(m);
  let rx=0, ry=0;
  if(hurt || atk){
   // Recoil pushes away, the attack lunge pulls toward — they naturally cancel.
   const dir = dirAway(m.x, m.y, Delve.G.px, Delve.G.py);
   if(hurt) ensureRecoil(m, m.hitFlash, dir.x, dir.y);
   if(atk)  ensureLunge(m, m.attackFlash, -dir.x, -dir.y);
   const ro = recoilOffset(m, ts), lo = lungeOffset(m, ts);
   rx = ro.x + lo.x; ry = ro.y + lo.y;
  } else recoils.delete(m);

  drawSprite(ctx, m.kind||"goblin", ax+rx, cy+ry, ts, hurt, m.elite, atk, size);

  if(m.elite){ ctx.save(); ctx.strokeStyle=Delve.CONFIG.elite.glow||"#ffd75e"; ctx.lineWidth=1.5; ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(ax+rx, cy+ry-ts*0.1, ts*0.42*bw, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
  if(m.effects && m.effects.length){
   const pips=m.effects.length, pw=5, gap=3, totalW=pips*pw+(pips-1)*gap;
   let px=ax+rx-totalW/2; const py=cy+ry-ts*0.55-(bh-1)*ts*0.9;
   m.effects.forEach(e => { ctx.fillStyle=Delve.statusColor?Delve.statusColor(e.id):"#fff"; ctx.fillRect(px,py,pw,3); px+=pw+gap; });
  }

  // Boss objects carry maxHp like all monsters — read it directly.
  const mhp = m.maxHp;
  const frac = Math.max(0,Math.min(1,m.hp/mhp));
  const barW = ts*0.68*bw, barY = cy+ry-ts*0.48-(bh-1)*ts*0.9;
  ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(ax+rx-barW/2, barY, barW, 4);
  ctx.fillStyle = m.isBoss?"#c98aff":m.elite?"#ffd75e":"#ff7d93";
  ctx.fillRect(ax+rx-barW/2, barY, barW*frac, 4);
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
   if(t===T.FLOOR) drawClutter(ctx,sx,sy,ts,gx,gy,b);
  }
  // floor props first, so wall edges and their shadows fall over the bases
  drawDecor(ctx,camX,camY,vw,vh,ts,"floor");
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
  // hanging props, over the wall art. Drawn before the entities below, so a boss
  // or monster standing in front of a banner still covers it.
  drawDecor(ctx,camX,camY,vw,vh,ts,"wall");

  // path highlight
  if(G._path && G._path.length>0){
   const dest=G._path[G._path.length-1];
   if(dest.x>=camX&&dest.y>=camY&&dest.x<camX+vw&&dest.y<camY+vh){
    const sx=(dest.x-camX)*ts, sy=(dest.y-camY)*ts;
    ctx.fillStyle="rgba(255,230,100,0.18)"; ctx.strokeStyle="rgba(255,220,80,0.7)"; ctx.fillRect(sx,sy,ts,ts); ctx.lineWidth=2; ctx.strokeRect(sx+1,sy+1,ts-2,ts-2);
   }
  }

  // adjacency highlights
  [[0,1],[0,-1],[1,0],[-1,0]].forEach(d=>{
   const gx=G.px+d[0], gy=G.py+d[1];
   if(gx<camX||gx>=camX+vw||gy<camY||gy>=camY+vh) return;
   const t=tileAt(gx,gy);
   if(t===null||t===T.WALL) return;
   const sx=(gx-camX)*ts, sy=(gy-camY)*ts;
   if(t===T.MONSTER||t===T.BOSS){ ctx.fillStyle="rgba(255,140,90,0.30)"; ctx.strokeStyle="rgba(255,170,120,0.9)"; }
   else { ctx.fillStyle="rgba(110,200,255,0.20)"; ctx.strokeStyle="rgba(140,220,255,0.80)"; }
   ctx.fillRect(sx,sy,ts,ts); ctx.lineWidth=2; ctx.strokeRect(sx+1,sy+1,ts-2,ts-2);
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
   // a pool of torchlight under him, so a 2x2 body doesn't sink into the floor
   const bx=(G.boss.x-camX)*ts+ts/2, by=(G.boss.y-camY)*ts+ts/2;
   const pool=ctx.createRadialGradient(bx,by,ts*0.25,bx,by,ts*1.8);
   pool.addColorStop(0,b.torch+"2e"); pool.addColorStop(1,"rgba(0,0,0,0)");
   ctx.fillStyle=pool; ctx.fillRect(bx-ts*1.8,by-ts*1.8,ts*3.6,ts*3.6);
   drawMob(ctx,G.boss,(G.boss.x-camX)*ts+ts/2,(G.boss.y-camY)*ts+ts/2,ts);
  }

  // player
  const pSX=(G.px-camX)*ts, pSY=(G.py-camY)*ts;
  const pHurt=G.playerHit && Date.now()-G.playerHit<150;
  const pAtk=G.swing && Date.now()-G.swing<ATTACK_MS;
  if(pHurt){ const atk=nearestThreat(G.px,G.py); const dir=atk?dirAway(G.px,G.py,atk.x,atk.y):{x:0,y:-1}; ensureRecoil("player",G.playerHit,dir.x,dir.y); }
  else recoils.delete("player");
  if(pAtk){
   const tgt=G.combatTarget||nearestThreat(G.px,G.py);
   const d=tgt?dirAway(G.px,G.py,tgt.x,tgt.y):{x:0,y:-1};
   ensureLunge("player",G.swing,-d.x,-d.y);
  }
  const ro=recoilOffset("player",ts), lo=lungeOffset("player",ts);
  drawPlayer(ctx,pSX+ts/2,pSY+ts/2,ts,pHurt,ro.x+lo.x,ro.y+lo.y,pAtk);

  if(Delve.markVisited) Delve.markVisited(G.px,G.py);

  drawAmbience(ctx,ts,b);
  drawFloaters(ctx,camX,camY,ts);

  // a faint per-biome colour wash, then the vignette
  if(b.light){ ctx.fillStyle=b.light; ctx.fillRect(0,0,W,H); }

  const vig=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.8);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.45)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  ctx.restore();

  if(G.msg && Date.now()<G.msgUntil){
   ctx.font="700 16px system-ui, sans-serif"; ctx.textAlign="center"; ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillText(G.msg,W/2+1,H-45); ctx.fillStyle="#eafff5"; ctx.fillText(G.msg,W/2,H-46);
  }
 };

 // ── AMBIENCE ─────────────────────────────────────────────────
 // Drifting weather. Screen-space, and completely stateless: each particle's
 // position is derived from a hash of its index plus the clock, so nothing is
 // stored between frames and nothing has to be cleaned up. The wrap-around
 // comes free by taking the fractional part of the position.
 function drawAmbience(ctx, ts, b){
  const a = b.ambient;
  if(!a || !a.count) return;
  const W = Delve.W, H = Delve.H, now = Date.now()/1000;
  ctx.save();
  for(let i=0;i<a.count;i++){
   const ox=hash3(i,3,211), oy=hash3(i,7,419), sp=0.75+hash3(i,11,653)*0.5;
   const fall=oy + now*a.vy*sp;
   const y=fall-Math.floor(fall);
   const sway=Math.sin(now*0.35*sp + i*1.7)*a.drift;
   const moved=ox+sway, x=moved-Math.floor(moved);
   const px=x*W, py=y*H;
   // fade in off the top edge and out at the bottom, so nothing pops
   const edge=Math.min(1,y*5)*Math.min(1,(1-y)*5);
   if(edge<=0) continue;
   const alpha=a.alpha*edge*(0.55+hash3(i,13,877)*0.45);
   const r=a.size*ts*(0.7+hash3(i,17,941)*0.6);
   ctx.globalAlpha=alpha;
   if(a.type==="ember"){
    ctx.fillStyle=a.col2;
    ctx.fillRect(px-r*0.5, py-r*0.5, r, r);
    ctx.globalAlpha=alpha*0.5; ctx.fillStyle=a.col;
    ctx.beginPath(); ctx.arc(px,py,r*1.6,0,Math.PI*2); ctx.fill();
   } else if(a.type==="snow"){
    ctx.fillStyle=a.col;
    ctx.fillRect(px-r*0.5, py-r*0.5, r*0.9, r*0.9);
    if(hash3(i,19,911)<0.3){
     ctx.globalAlpha=alpha*0.7; ctx.fillStyle=a.col2;
     ctx.fillRect(px-r*0.4, py-r*0.4, r*0.6, r*0.6);
    }
   } else {
    ctx.fillStyle=a.col;
    ctx.beginPath(); ctx.arc(px,py,r*0.7,0,Math.PI*2); ctx.fill();
   }
  }
  ctx.restore();
 }

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
 // Introspection hook for test.html: is this wall tile lit? (see arenaTorches)
 Delve.isTorchTile = isTorchTile;

 // ── ANIMATION CLOCK ──────────────────────────────────────────
 // One timer for everything that moves: torches flicker, weather drifts, lunges
 // and floaters play out. It redraws only while something is genuinely animating,
 // and it stops entirely while the tab is hidden — a phone in a pocket shouldn't
 // be redrawing a dungeon. Raise ANIM_MS if a device runs warm.
 const ANIM_MS = 150;
 let animTick = 0;
 function animating(){
  const G = Delve.G;
  if(!G) return false;
  const B = biome();
  if(B.ambient && B.ambient.count) return true;          // drifting weather
  if(floaters.length || shakeT > 0) return true;
  if(lunges.size || recoils.size) return true;
  if(G.swing && Date.now()-G.swing < ATTACK_MS) return true;
  if(G.playerHit && Date.now()-G.playerHit < ATTACK_MS*2) return true;
  if(attacking(G.boss)) return true;
  for(const m of (G.monsters || [])){ if(attacking(m)) return true; }
  return false;
 }
 setInterval(function(){
  if(document.hidden) return;
  torchFrame=(torchFrame+1)%3;
  animTick++;
  if(Delve.G && !Delve.G.dead && (animating() || animTick%3===0)) Delve.draw();
 }, ANIM_MS);

})();
