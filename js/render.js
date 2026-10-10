window.Delve = window.Delve || {};
(function(){

 let shakeT = 0, shakeMag = 0;
 let floaters = [];
 const FLOAT_LIFE = 1200;
 const floaterDepth = new Map();

 // ── Hit recoil (sprite nudge/bounce) ────────────────────────
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

 // ── Hash helpers ─────────────────────────────────────────────
 function hash2(x, y){
 let n = x*374761393 + y*668265263;
 n = (n ^ (n>>13)) * 1274126177;
 return ((n ^ (n>>16)) >>> 0) / 4294967295;
 }
 function hash3(x, y, salt){
 return hash2(x * 2053 + salt, y * 3571 + salt * 7);
 }

 // ── Biome lookup ─────────────────────────────────────────────
 function biome(){
 const G = Delve.G;
 const ward = G ? Delve.getWard(G.floor) : null;
 const idx = (ward && ward.biome !== undefined) ? ward.biome : 0;
 const b = (Delve.CONFIG.BIOMES && Delve.CONFIG.BIOMES[idx]) || Delve.CONFIG.BIOMES[0] || {};
 return {
 wall: b.wall || "#64707c",
 wallEdge: b.wallEdge || "#8d99a6",
 wallBrick: b.wallBrick || "#3a4248",
 mortar: b.mortar || "#0b0f14",
 floor: b.floor || "#2e3842",
 floor2: b.floor2 || "#283039",
 moss: b.moss || "#3f6d55",
 water: b.water || "#1e3a4a",
 torch: b.torch || "#ffb347",
 light: b.light || "rgba(70,140,255,0.06)"
 };
 }

 function tileAt(gx, gy){
 const g = Delve.G.grid;
 return (g[gy] && g[gy][gx] !== undefined) ? g[gy][gx] : null;
 }

 // ── OFFSCREEN TILE CACHE ─────────────────────────────────────
 let tileCache = {};
 let cacheFloor = -1;
 let cacheTs = 0;
 function ensureCache(G){
 if(cacheFloor !== G.floor || cacheTs !== Delve.ts){
 cacheFloor = G.floor;
 cacheTs = Delve.ts;
 tileCache = {};
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
 if(entry && entry.v === t){
 ctx.drawImage(entry.c, sx, sy, ts, ts);
 return;
 }
 const dpr = window.devicePixelRatio || 1;
 const c = document.createElement("canvas");
 c.width = Math.round(ts * dpr);
 c.height = Math.round(ts * dpr);
 const cx = c.getContext("2d");
 cx.scale(dpr, dpr);
 if(t !== Delve.T.WALL){
 drawFloorTile(cx, 0, 0, ts, gx, gy, b);
 if(t === Delve.T.STAIR) drawStairs(cx, 0, 0, ts, b);
 } else {
 drawWallTile(cx, 0, 0, ts, gx, gy, b);
 }
 tileCache[key] = { v: t, c: c };
 ctx.drawImage(c, sx, sy, ts, ts);
 }

 // ── FLAGSTONE FLOOR TILE ─────────────────────────────────────
 function drawFloorTile(ctx, sx, sy, ts, gx, gy, b){
 const n = hash2(gx, gy);
 const n2 = hash3(gx, gy, 17);
 const n3 = hash3(gx, gy, 31);
 const n4 = hash3(gx, gy, 53);

 let slabCol = ((gx + gy) % 2 === 0) ? b.floor : b.floor2;
 if(n3 < 0.05) slabCol = blendHex(slabCol, "#0a0e12", 0.35);

 const mortar = 2;
 ctx.fillStyle = b.mortar;
 ctx.fillRect(sx, sy, ts, ts);
 ctx.fillStyle = slabCol;
 ctx.fillRect(sx + mortar, sy + mortar, ts - mortar*2, ts - mortar*2);

 ctx.fillStyle = "rgba(255,255,255,0.04)";
 ctx.fillRect(sx + mortar, sy + mortar, ts - mortar*2, 2);
 ctx.fillRect(sx + mortar, sy + mortar, 2, ts - mortar*2);
 ctx.fillStyle = "rgba(0,0,0,0.18)";
 ctx.fillRect(sx + ts - mortar - 2, sy + mortar, 2, ts - mortar*2);
 ctx.fillRect(sx + mortar, sy + ts - mortar - 2, ts - mortar*2, 2);

 if(n2 < 0.08){
 const corner = Math.floor(n2 / 0.02) % 4;
 const cs = Math.max(3, Math.floor(ts * 0.18));
 ctx.fillStyle = b.mortar;
 if(corner === 0) ctx.fillRect(sx + mortar, sy + mortar, cs, cs);
 if(corner === 1) ctx.fillRect(sx + ts - mortar - cs, sy + mortar, cs, cs);
 if(corner === 2) ctx.fillRect(sx + mortar, sy + ts - mortar - cs, cs, cs);
 if(corner === 3) ctx.fillRect(sx + ts - mortar - cs, sy + ts - mortar - cs, cs, cs);
 }

 if(n > 0.82){
 const crackType = Math.floor(hash3(gx, gy, 7) * 10);
 ctx.save();
 ctx.strokeStyle = "rgba(0,0,0,0.32)";
 ctx.lineWidth = Math.max(1, ts * 0.03);
 ctx.globalAlpha = 0.6;
 ctx.lineCap = "round";
 const m = mortar + 2;
 const x0 = sx + m, y0 = sy + m;
 const tw = ts - m*2;
 ctx.beginPath();
 switch(crackType){
 case 0: ctx.moveTo(x0, y0); ctx.lineTo(x0 + tw*0.5, y0 + tw*0.5); break;
 case 1:
 ctx.moveTo(x0 + tw*0.5, y0 + tw*0.1); ctx.lineTo(x0 + tw*0.5, y0 + tw*0.55);
 ctx.moveTo(x0 + tw*0.5, y0 + tw*0.55); ctx.lineTo(x0 + tw*0.2, y0 + tw*0.9);
 ctx.moveTo(x0 + tw*0.5, y0 + tw*0.55); ctx.lineTo(x0 + tw*0.8, y0 + tw*0.9);
 break;
 case 2:
 for(let i = 0; i < 5; i++){
 const a = (i / 5) * Math.PI * 2;
 ctx.moveTo(x0 + tw*0.5, y0 + tw*0.5);
 ctx.lineTo(x0 + tw*0.5 + Math.cos(a)*tw*0.28, y0 + tw*0.5 + Math.sin(a)*tw*0.28);
 }
 break;
 case 3: ctx.moveTo(x0, y0 + tw*0.15); ctx.lineTo(x0 + tw, y0 + tw*0.85); break;
 case 4:
 ctx.moveTo(x0 + tw*0.2, y0 + tw*0.3); ctx.lineTo(x0 + tw*0.45, y0 + tw*0.6);
 ctx.moveTo(x0 + tw*0.55, y0 + tw*0.35); ctx.lineTo(x0 + tw*0.75, y0 + tw*0.65);
 break;
 case 5:
 ctx.moveTo(x0 + tw*0.35, y0 + tw*0.05); ctx.lineTo(x0 + tw*0.55, y0 + tw*0.40);
 ctx.lineTo(x0 + tw*0.40, y0 + tw*0.42); ctx.lineTo(x0 + tw*0.65, y0 + tw*0.95);
 break;
 case 6: ctx.moveTo(x0, y0); ctx.lineTo(x0 + tw*0.30, y0 + tw*0.15); ctx.lineTo(x0 + tw*0.15, y0 + tw*0.35); break;
 case 7: ctx.arc(x0 + tw*0.5, y0 + tw*1.0, tw*0.55, Math.PI*1.1, Math.PI*1.9); break;
 case 8:
 ctx.moveTo(x0 + tw*0.2, y0 + tw*0.2); ctx.lineTo(x0 + tw*0.75, y0 + tw*0.8);
 ctx.moveTo(x0 + tw*0.75, y0 + tw*0.2); ctx.lineTo(x0 + tw*0.2, y0 + tw*0.8);
 break;
 case 9:
 ctx.moveTo(x0, y0 + tw*0.8); ctx.lineTo(x0 + tw*0.6, y0 + tw*0.8); ctx.lineTo(x0 + tw*0.6, y0 + tw*0.4);
 break;
 }
 ctx.stroke();
 ctx.restore();
 }

 if(n4 < 0.03){
 ctx.save();
 ctx.globalAlpha = 0.55;
 const px = sx + ts * (0.25 + hash3(gx,gy,99)*0.4);
 const py = sy + ts * (0.35 + hash3(gx,gy,101)*0.3);
 const pr = ts * (0.10 + hash3(gx,gy,103)*0.08);
 const grad = ctx.createRadialGradient(px, py, 1, px, py, pr*2);
 grad.addColorStop(0, b.water + "cc");
 grad.addColorStop(1, b.water + "22");
 ctx.fillStyle = grad;
 ctx.beginPath();
 ctx.ellipse(px, py, pr*2, pr, 0, 0, Math.PI*2);
 ctx.fill();
 ctx.globalAlpha = 0.7;
 ctx.fillStyle = "rgba(255,255,255,0.55)";
 ctx.beginPath();
 ctx.arc(px - pr*0.3, py - pr*0.2, pr*0.22, 0, Math.PI*2);
 ctx.fill();
 ctx.restore();
 }

 const weedRoll = hash3(gx, gy, 43);
 if(weedRoll < 0.06 && n <= 0.82){
 const weedType = Math.floor(hash3(gx, gy, 47) * 6);
 drawWeed(ctx, sx, sy, ts, gx, gy, b, weedType);
 }
 }

 function drawWeed(ctx, sx, sy, ts, gx, gy, b, type){
 ctx.save();
 ctx.globalAlpha = 0.72;
 const cx = sx + ts * (0.3 + hash3(gx,gy,61)*0.4);
 const cy = sy + ts * (0.35 + hash3(gx,gy,67)*0.4);
 const sc = ts / 40;

 switch(type){
 case 0:
 ctx.strokeStyle = "#4a7c42"; ctx.lineWidth = Math.max(1, sc*1.4); ctx.lineCap = "round";
 ctx.beginPath(); ctx.moveTo(cx, cy + sc*7); ctx.quadraticCurveTo(cx + sc*4, cy, cx + sc*6, cy - sc*8); ctx.stroke();
 break;
 case 1:
 ctx.strokeStyle = "#3d6e36"; ctx.lineWidth = Math.max(1, sc*1.2); ctx.lineCap = "round";
 ctx.beginPath();
 ctx.moveTo(cx - sc*2, cy + sc*6); ctx.quadraticCurveTo(cx - sc*4, cy, cx - sc*7, cy - sc*7);
 ctx.moveTo(cx + sc*2, cy + sc*6); ctx.quadraticCurveTo(cx + sc*5, cy, cx + sc*8, cy - sc*6);
 ctx.stroke();
 break;
 case 2:
 ctx.strokeStyle = "#4a7c42"; ctx.lineWidth = Math.max(1, sc*1.2); ctx.lineCap = "round";
 ctx.beginPath(); ctx.moveTo(cx, cy + sc*6); ctx.lineTo(cx, cy - sc*4); ctx.stroke();
 ctx.fillStyle = "#c8b88a";
 for(let i = 0; i < 4; i++){
 const a = (i/4) * Math.PI*2;
 ctx.beginPath();
 ctx.ellipse(cx + Math.cos(a)*sc*3, cy - sc*4 + Math.sin(a)*sc*3, sc*2.5, sc*1.2, a, 0, Math.PI*2);
 ctx.fill();
 }
 break;
 case 3:
 ctx.strokeStyle = "#3f6d3a"; ctx.lineWidth = Math.max(1, sc*1.0); ctx.lineCap = "round";
 ctx.beginPath();
 ctx.moveTo(sx + ts*0.1, cy + sc*2); ctx.bezierCurveTo(cx - sc*4, cy - sc*3, cx + sc*4, cy + sc*5, cx + sc*10, cy);
 ctx.stroke();
 ctx.fillStyle = "#3f6d3a";
 ctx.beginPath(); ctx.ellipse(cx + sc*2, cy - sc*2, sc*3, sc*1.5, -0.5, 0, Math.PI*2); ctx.fill();
 break;
 case 4:
 ctx.fillStyle = "#7a5c3a"; ctx.fillRect(cx - sc, cy, sc*2, sc*5);
 ctx.fillStyle = "#c47a3a";
 ctx.beginPath(); ctx.ellipse(cx, cy, sc*5, sc*3.5, 0, Math.PI, 0); ctx.fill();
 ctx.fillStyle = "rgba(255,240,200,0.6)";
 ctx.beginPath(); ctx.arc(cx - sc*1.5, cy - sc*1.5, sc*0.8, 0, Math.PI*2); ctx.fill();
 ctx.beginPath(); ctx.arc(cx + sc*1.8, cy - sc*1.0, sc*0.7, 0, Math.PI*2); ctx.fill();
 break;
 case 5:
 ctx.fillStyle = b.moss; ctx.globalAlpha = 0.45;
 ctx.beginPath(); ctx.arc(cx, cy, sc*5, 0, Math.PI*2); ctx.fill();
 ctx.fillStyle = "#2e5c2a"; ctx.globalAlpha = 0.35;
 ctx.beginPath(); ctx.arc(cx + sc*2, cy - sc*1, sc*3, 0, Math.PI*2); ctx.fill();
 break;
 }
 ctx.restore();
 }

 // ── Ambient clutter (bones / rubble) on empty floor tiles ───
 function drawClutter(ctx, sx, sy, ts, gx, gy){
 const roll = hash3(gx, gy, 71);
 if(roll < 0.03){
 ctx.save();
 ctx.globalAlpha = 0.5;
 ctx.fillStyle = "#c9c2b0";
 if(roll < 0.01){
 // small bone
 ctx.fillRect(sx+ts*0.35, sy+ts*0.55, ts*0.3, ts*0.08);
 ctx.beginPath(); ctx.arc(sx+ts*0.35, sy+ts*0.59, ts*0.05, 0, Math.PI*2); ctx.fill();
 ctx.beginPath(); ctx.arc(sx+ts*0.65, sy+ts*0.59, ts*0.05, 0, Math.PI*2); ctx.fill();
 } else if(roll < 0.02){
 // rubble chunk
 ctx.fillStyle = "#7a7a80";
 ctx.beginPath();
 ctx.moveTo(sx+ts*0.3, sy+ts*0.6);
 ctx.lineTo(sx+ts*0.5, sy+ts*0.5);
 ctx.lineTo(sx+ts*0.7, sy+ts*0.62);
 ctx.closePath(); ctx.fill();
 } else {
 // small pebble
 ctx.beginPath(); ctx.arc(sx+ts*0.5, sy+ts*0.55, ts*0.07, 0, Math.PI*2); ctx.fill();
 }
 ctx.restore();
 }
 }

 // ── WALL TILE — three brick moods ────────────────────────────
 function drawWallTile(ctx, sx, sy, ts, gx, gy, b){
 const n = hash2(gx, gy);
 const n2 = hash3(gx, gy, 11);
 const n3 = hash3(gx, gy, 23);

 const mood = n2 < 0.18 ? 1 : n2 < 0.38 ? 2 : n2 < 0.52 ? 3 : 0;

 ctx.fillStyle = b.wall;
 ctx.fillRect(sx, sy, ts, ts);

 if(mood === 2){
 ctx.fillStyle = "rgba(60,90,60,0.28)";
 ctx.fillRect(sx, sy, ts, ts);
 }

 if(mood === 3){
 const grad = ctx.createLinearGradient(sx + ts*0.5, sy, sx + ts*0.5, sy + ts);
 grad.addColorStop(0, "rgba(70,40,20,0.45)");
 grad.addColorStop(0.6, "rgba(50,30,15,0.15)");
 grad.addColorStop(1, "rgba(0,0,0,0)");
 ctx.fillStyle = grad;
 ctx.fillRect(sx + ts*0.25, sy, ts*0.5, ts);
 }

 ctx.fillStyle = b.wallEdge;
 ctx.fillRect(sx, sy, ts, Math.max(2, ts*0.09));
 ctx.fillRect(sx, sy, Math.max(2, ts*0.06), ts);

 if(ts >= 20){
 ctx.strokeStyle = b.wallBrick;
 ctx.lineWidth = 1;
 ctx.globalAlpha = mood === 1 ? 0.75 : 0.5;
 ctx.beginPath();
 ctx.moveTo(sx+1, sy + ts*0.50);
 ctx.lineTo(sx+ts-1, sy + ts*0.50);
 const vOff = (gy % 2 === 0) ? 0.25 : 0.75;
 ctx.moveTo(sx + ts*vOff, sy + ts*0.50);
 ctx.lineTo(sx + ts*vOff, sy + ts - 1);
 if(n > 0.40){
 const vOff2 = (gy % 2 === 0) ? 0.75 : 0.25;
 ctx.moveTo(sx + ts*vOff2, sy + 1);
 ctx.lineTo(sx + ts*vOff2, sy + ts*0.50);
 }
 ctx.stroke();
 ctx.globalAlpha = 1;

 if(mood === 1){
 const cr = hash3(gx, gy, 89);
 const brickX = sx + (cr > 0.5 ? ts*vOff : 0) + 2;
 const brickY = sy + (cr > 0.5 ? 0 : ts*0.51);
 const brickW = ts * (cr > 0.5 ? (1 - vOff) : vOff) - 3;
 const brickH = ts*0.49 - 2;
 ctx.fillStyle = "rgba(0,0,0,0.22)";
 ctx.fillRect(brickX, brickY, brickW, brickH);
 ctx.fillStyle = b.wallBrick;
 ctx.fillRect(brickX + brickW*0.3, brickY - 1, brickW*0.25, 3);
 }

 if(mood === 2){
 ctx.fillStyle = b.moss;
 ctx.globalAlpha = 0.22;
 ctx.fillRect(sx + 1, sy + ts*0.48, ts - 2, 4);
 ctx.globalAlpha = 1;
 }
 }

 ctx.fillStyle = "rgba(255,255,255,0.06)";
 ctx.fillRect(sx, sy, ts, 2);
 ctx.fillStyle = "rgba(0,0,0,0.35)";
 ctx.fillRect(sx, sy + ts - 2, ts, 2);
 }

 // ── WALL TORCH (animated — drawn live, never cached) ────────
 let torchFrame = 0;
 function drawWallTorch(ctx, sx, sy, ts, b){
 const flicker = [
 { h:0.22, w:0.10, a:0.90 },
 { h:0.26, w:0.12, a:1.00 },
 { h:0.20, w:0.09, a:0.80 }
 ][torchFrame];

 const cx = sx + ts * 0.5;
 const by = sy + ts * 0.72;

 ctx.save();
 ctx.globalAlpha = 0.18 + (torchFrame === 1 ? 0.06 : 0);
 const glowY = by + ts * 0.3;
 const grd = ctx.createRadialGradient(cx, glowY, 2, cx, glowY, ts*1.1);
 grd.addColorStop(0, b.torch + "cc");
 grd.addColorStop(1, "rgba(0,0,0,0)");
 ctx.fillStyle = grd;
 ctx.fillRect(sx - ts, sy, ts*3, ts*2);
 ctx.restore();

 ctx.save();
 ctx.strokeStyle = "#6a5030";
 ctx.lineWidth = Math.max(1.5, ts*0.04);
 ctx.lineCap = "round";
 ctx.beginPath();
 ctx.moveTo(cx, by);
 ctx.lineTo(cx, by - ts*0.12);
 ctx.moveTo(cx - ts*0.06, by - ts*0.08);
 ctx.lineTo(cx + ts*0.06, by - ts*0.08);
 ctx.stroke();
 ctx.restore();

 ctx.save();
 const fh = ts * flicker.h;
 const fw = ts * flicker.w;
 const fy = by - ts*0.12;

 const flamGrad = ctx.createLinearGradient(cx, fy, cx, fy - fh);
 flamGrad.addColorStop(0, b.torch + "ff");
 flamGrad.addColorStop(0.5, "#ff6020dd");
 flamGrad.addColorStop(1, "#ffee8800");
 ctx.fillStyle = flamGrad;
 ctx.globalAlpha = flicker.a;
 ctx.beginPath();
 ctx.moveTo(cx - fw, fy);
 ctx.quadraticCurveTo(cx - fw*1.2, fy - fh*0.5, cx, fy - fh);
 ctx.quadraticCurveTo(cx + fw*1.2, fy - fh*0.5, cx + fw, fy);
 ctx.closePath();
 ctx.fill();

 ctx.globalAlpha = flicker.a * 0.7;
 ctx.fillStyle = "#fff8c0";
 ctx.beginPath();
 ctx.ellipse(cx, fy - fh*0.25, fw*0.4, fh*0.28, 0, 0, Math.PI*2);
 ctx.fill();
 ctx.restore();
 }

 // ── STAIRS (carved stone steps, descending) ──────────────────
 function drawStairs(ctx, sx, sy, ts, b){
 ctx.fillStyle = b.mortar;
 ctx.fillRect(sx, sy, ts, ts);
 ctx.fillStyle = b.floor2;
 ctx.fillRect(sx+2, sy+2, ts-4, ts-4);

 const inner = ts - 4;
 const steps = 4;
 const stepH = inner / steps;
 for(let i = 0; i < steps; i++){
 const y0 = sy + 2 + i*stepH;
 const t = 0.12 + i*0.18;
 ctx.fillStyle = blendHex(b.floor2, "#05070a", t);
 ctx.fillRect(sx+2, y0, inner, stepH);
 ctx.fillStyle = "rgba(255,255,255,0.07)";
 ctx.fillRect(sx+2, y0, inner, 1);
 }
 ctx.fillStyle = "rgba(0,0,0,0.45)";
 ctx.fillRect(sx+2, sy+ts-4, inner, 2);
 }

 // ── SPRITES ──────────────────────────────────────────────────
 function drawShadow(ctx, cx, cy, ts){
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

 function drawSprite(ctx, kind, cx, cy, ts, hurt){
 const S = Delve.SPR && Delve.SPR[kind];
 if(!S){
 ctx.fillStyle = "#ff5c7a";
 ctx.beginPath(); ctx.arc(cx, cy, ts*0.3, 0, Math.PI*2); ctx.fill();
 return;
 }
 const img = hurt ? (S.hurt || S.idle) : S.idle;
 const size = ts*0.9;
 ctx.drawImage(img, cx-size/2, cy-size/2, size, size);
 }

 function drawWorldSprite(ctx, key, cx, cy, ts){
 const S = Delve.SPR && Delve.SPR.world && Delve.SPR.world[key];
 if(!S) return;
 const size = ts*0.75;
 ctx.drawImage(S, cx-size/2, cy-size/2, size, size);
 }

 function drawPlayer(ctx, cx, cy, ts, hurt, ox, oy){
 drawShadow(ctx, cx, cy, ts);
 drawSprite(ctx, "soldier", cx + (ox||0), cy + (oy||0), ts, hurt);
 }

 function drawMob(ctx, m, cx, cy, ts){
 drawShadow(ctx, cx, cy, ts);
 const hurt = m.hitFlash && Date.now() - m.hitFlash < 130;

 let rx = 0, ry = 0;
 if(hurt){
 const dir = dirAway(m.x, m.y, Delve.G.px, Delve.G.py);
 ensureRecoil(m, m.hitFlash, dir.x, dir.y);
 const off = recoilOffset(m, ts);
 rx = off.x; ry = off.y;
 } else {
 recoils.delete(m);
 }

 drawSprite(ctx, m.kind || "goblin", cx + rx, cy + ry, ts, hurt);

 const mhp = m.isBoss
 ? Delve.bossHp()
 : (m.maxHp);
 const frac = Math.max(0, Math.min(1, m.hp/mhp));
 ctx.fillStyle = "rgba(0,0,0,0.6)";
 ctx.fillRect(cx + rx - ts*0.34, cy + ry - ts*0.55, ts*0.68, 4);
 ctx.fillStyle = m.isBoss ? "#c98aff" : "#ff7d93";
 ctx.fillRect(cx + rx - ts*0.34, cy + ry - ts*0.55, ts*0.68*frac, 4);
 }

 function drawItem(ctx, it, cx, cy, ts){
 const col = Delve.TIERS.colors[it.tier] || "#ffffff";
 drawWorldSprite(ctx, "itemPile", cx, cy, ts);
 ctx.fillStyle = col;
 ctx.globalAlpha = 0.5;
 ctx.beginPath(); ctx.arc(cx, cy, ts*0.22, 0, Math.PI*2); ctx.fill();
 ctx.globalAlpha = 1;
 }

 function drawBarrel(ctx, cx, cy, ts){
 const S = Delve.SPR && Delve.SPR.world && Delve.SPR.world.barrel;
 if(!S) return;
 const size = ts*0.72;
 ctx.drawImage(S, cx-size/2, cy-size/2, size, size);
 }

 function drawTreasure(ctx, thing, cx, cy, ts){
 if(thing === "gold") drawWorldSprite(ctx, "goldPile", cx, cy, ts);
 else if(thing === "potion") drawWorldSprite(ctx, "potionPile", cx, cy, ts);
 else if(thing === "chest") drawWorldSprite(ctx, "chestClosed", cx, cy, ts);
 else if(thing === "chestOpen") drawWorldSprite(ctx, "chestOpen", cx, cy, ts);
 else drawWorldSprite(ctx, "itemPile", cx, cy, ts);
 }

 // ── FLOATERS ────────────────────────────────────────────────
 function drawFloaters(ctx, camX, camY, ts){
 const now = Date.now();
 const alive = [];
 for(const f of floaters){
 const age = now - f.born;
 if(age >= FLOAT_LIFE) continue;
 const t = age / FLOAT_LIFE;
 const alpha = t < 0.15 ? t/0.15 : 1 - ((t-0.15)/0.85);
 const rise = t * ts * 2.2;
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

 function blendHex(hex, hex2, t){
 const p = c => parseInt(c, 16);
 const r1=p(hex.slice(1,3)), g1=p(hex.slice(3,5)), b1=p(hex.slice(5,7));
 const r2=p(hex2.slice(1,3)),g2=p(hex2.slice(3,5)),b2=p(hex2.slice(5,7));
 const r=Math.round(r1+(r2-r1)*t).toString(16).padStart(2,"0");
 const g=Math.round(g1+(g2-g1)*t).toString(16).padStart(2,"0");
 const b=Math.round(b1+(b2-b1)*t).toString(16).padStart(2,"0");
 return "#"+r+g+b;
 }

 // ── MAIN DRAW ────────────────────────────────────────────────
 Delve.draw = function(){
 const G = Delve.G;
 if(!G) return;

 const ctx = Delve.ctx, W = Delve.W, H = Delve.H, ts = Delve.ts;
 Delve.computeView();
 const vw = Delve.viewW, vh = Delve.viewH;
 const b = biome();
 const T = Delve.T;
 ensureCache(G);

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
 } else {
 shakeMag = 0;
 }

 ctx.save();
 ctx.translate(ox, oy);
 ctx.fillStyle = "#06090d";
 ctx.fillRect(-10, -10, W+20, H+20);

 for(let y = 0; y < vh+1; y++){
 for(let x = 0; x < vw+1; x++){
 const gx = camX+x, gy = camY+y;
 const t = tileAt(gx, gy);
 if(t === null || t === T.WALL) continue;
 const sx = x*ts, sy = y*ts;
 blitTile(ctx, gx, gy, sx, sy, ts, b, t);
 if(t === T.FLOOR) drawClutter(ctx, sx, sy, ts, gx, gy);
 }
 }

 for(let y = 0; y < vh+1; y++){
 for(let x = 0; x < vw+1; x++){
 const gx = camX+x, gy = camY+y;
 const t = tileAt(gx, gy);
 if(t !== T.WALL) continue;
 const sx = x*ts, sy = y*ts;

 if(isTorchTile(gx, gy)){
 drawWallTile(ctx, sx, sy, ts, gx, gy, b);
 drawWallTorch(ctx, sx, sy, ts, b);
 } else {
 blitTile(ctx, gx, gy, sx, sy, ts, b, t);
 }

 const fd = G.floorData;
 if(fd && fd.secretRoom &&
 fd.secretRoom.falseWallX === gx && fd.secretRoom.falseWallY === gy){
 const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.003);
 ctx.save();
 ctx.globalAlpha = pulse * 0.55;
 ctx.fillStyle = "#7ee0ff";
 ctx.beginPath();
 ctx.arc(sx + ts*0.5, sy + ts*0.5, ts*0.15, 0, Math.PI*2);
 ctx.fill();
 ctx.restore();
 }
 }
 }

 if(G._path && G._path.length > 0){
 const dest = G._path[G._path.length - 1];
 if(dest.x >= camX && dest.y >= camY && dest.x < camX+vw && dest.y < camY+vh){
 const sx = (dest.x-camX)*ts, sy = (dest.y-camY)*ts;
 ctx.fillStyle = "rgba(255,230,100,0.18)";
 ctx.strokeStyle = "rgba(255,220,80,0.7)";
 ctx.fillRect(sx, sy, ts, ts);
 ctx.lineWidth = 2;
 ctx.strokeRect(sx+1, sy+1, ts-2, ts-2);
 }
 }

 const adj = [[0,1],[0,-1],[1,0],[-1,0]];
 for(const d of adj){
 const gx = G.px+d[0], gy = G.py+d[1];
 if(gx < camX || gx >= camX+vw || gy < camY || gy >= camY+vh) continue;
 const t = tileAt(gx, gy);
 if(t === null || t === T.WALL) continue;
 const sx = (gx-camX)*ts, sy = (gy-camY)*ts;
 if(t === T.MONSTER || t === T.BOSS){
 ctx.fillStyle = "rgba(255,140,90,0.30)";
 ctx.strokeStyle = "rgba(255,170,120,0.9)";
 } else {
 ctx.fillStyle = "rgba(110,200,255,0.20)";
 ctx.strokeStyle = "rgba(140,220,255,0.80)";
 }
 ctx.fillRect(sx, sy, ts, ts);
 ctx.lineWidth = 2;
 ctx.strokeRect(sx+1, sy+1, ts-2, ts-2);
 }

 for(const it of (G.items || [])){
 if(it.x < camX || it.y < camY || it.x >= camX+vw || it.y >= camY+vh) continue;
 drawItem(ctx, it, (it.x-camX)*ts + ts/2, (it.y-camY)*ts + ts/2, ts);
 }

 for(const p of (G.goldPiles || [])){
 if(p.x < camX || p.y < camY || p.x >= camX+vw || p.y >= camY+vh) continue;
 drawTreasure(ctx, "gold", (p.x-camX)*ts + ts/2, (p.y-camY)*ts + ts/2, ts);
 }

 // Barrels
 for(const b of (G.barrels || [])){
 if(b.x < camX || b.y < camY || b.x >= camX+vw || b.y >= camY+vh) continue;
 drawBarrel(ctx, (b.x-camX)*ts + ts/2, (b.y-camY)*ts + ts/2, ts);
 }

 const decor = (G.floorData && G.floorData.decor) || [];
 for(const d of decor){
 if(d.x < camX || d.y < camY || d.x >= camX+vw || d.y >= camY+vh) continue;
 drawTreasure(ctx, d.thing, (d.x-camX)*ts + ts/2, (d.y-camY)*ts + ts/2, ts);
 }

 for(const m of G.monsters){
 if(m.x < camX || m.y < camY || m.x >= camX+vw || m.y >= camY+vh) continue;
 drawMob(ctx, m, (m.x-camX)*ts + ts/2, (m.y-camY)*ts + ts/2, ts);
 }

 if(G.boss && G.boss.x >= camX && G.boss.y >= camY && G.boss.x < camX+vw && G.boss.y < camY+vh){
 drawMob(ctx, G.boss, (G.boss.x-camX)*ts + ts/2, (G.boss.y-camY)*ts + ts/2, ts);
 }

 const pSX = (G.px-camX)*ts, pSY = (G.py-camY)*ts;
 const pHurt = G.playerHit && Date.now() - G.playerHit < 150;
 let prx = 0, pry = 0;
 if(pHurt){
 const atk = nearestThreat(G.px, G.py);
 const dir = atk ? dirAway(G.px, G.py, atk.x, atk.y) : { x: 0, y: -1 };
 ensureRecoil("player", G.playerHit, dir.x, dir.y);
 const off = recoilOffset("player", ts);
 prx = off.x; pry = off.y;
 } else {
 recoils.delete("player");
 }
 drawPlayer(ctx, pSX+ts/2, pSY+ts/2, ts, pHurt, prx, pry);

 drawFloaters(ctx, camX, camY, ts);

 const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.8);
 vig.addColorStop(0, "rgba(0,0,0,0)");
 vig.addColorStop(1, "rgba(0,0,0,0.45)");
 ctx.fillStyle = vig;
 ctx.fillRect(0, 0, W, H);

 ctx.restore();

 if(G.msg && Date.now() < G.msgUntil){
 ctx.font = "700 16px system-ui, sans-serif";
 ctx.textAlign = "center";
 ctx.fillStyle = "rgba(0,0,0,0.6)";
 ctx.fillText(G.msg, W/2+1, H-45);
 ctx.fillStyle = "#eafff5";
 ctx.fillText(G.msg, W/2, H-46);
 }
 };

 // ── Decluttered floater spawn ────────────────────────────────
 Delve.addFloater = function(txt, x, y, col){
 while(floaters.length >= 60) floaters.shift();
 const key = Math.round(x) + "," + Math.round(y);
 const depth = floaterDepth.get(key) || 0;
 const jx = (Math.random() - 0.5) * 0.45;
 floaters.push({ txt, x: x + jx, y: y - depth*0.6, col, born: Date.now() });
 floaterDepth.set(key, depth + 1);
 setTimeout(function(){
 const d = floaterDepth.get(key) || 0;
 if(d > 1) floaterDepth.set(key, d - 1);
 else floaterDepth.delete(key);
 }, 520);
 };
 Delve.addShake = function(mag){
 shakeMag = Math.max(shakeMag, mag);
 shakeT = 6;
 };

 // ── Torch flicker — slow interval, redraw only during a run ─
 setInterval(function(){
 torchFrame = (torchFrame + 1) % 3;
 if(Delve.G && !Delve.G.dead) Delve.draw();
 }, 400);

})();
