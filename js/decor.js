window.Delve = window.Delve || {};
(function(){
 const U = Delve._drawUtils;
 if(!U) return; // render.js must load first
 const hash3 = U.hash3, uhash = U.uhash, tileAt = U.tileAt, blendHex = U.blendHex, lightPool = U.lightPool;

 // ═══════════════════════════════════════════════════════════
 // js/decor.js : world dressing — floor props, wall dressing,
 // drifting dust, and the wall ambient-occlusion shadows.
 // Extracted out of render.js so that file stays about the core
 // (tiles, sprites, entities, camera, highlights).
 // ⚠ Load-order constraint: must load AFTER js/render.js — it
 // consumes Delve._drawUtils, exactly the way con-bosssprites.js
 // consumes Delve._spriteUtils from sprites.js.
 // ═══════════════════════════════════════════════════════════

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
  const cap=blendHex(b.moss,"#ffffff",0.32);
  for(let i=0;i<3;i++){
   const a=hash3(i+2,13,311);
   const dx=(a*2-1)*ts*0.16, h=ts*(0.14+hash3(i+2,15,312)*0.12), r=ts*(0.055+hash3(i+2,17,313)*0.045);
   const x=cx+dx, y=cy+ts*0.06;
   ctx.strokeStyle="#cdc6b2"; ctx.lineWidth=Math.max(1,ts*0.035); ctx.lineCap="round";
   ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-h); ctx.stroke();
   ctx.fillStyle=cap;
   ctx.beginPath(); ctx.ellipse(x,y-h,r,r*0.72,0,Math.PI,0); ctx.fill();
   ctx.fillStyle="rgba(0,0,0,0.18)";
   ctx.beginPath(); ctx.ellipse(x,y-h,r*0.98,r*0.70,0,Math.PI,0); ctx.fill();
   ctx.fillStyle=cap;
   ctx.beginPath(); ctx.ellipse(x,y-h,r*0.82,r*0.58,0,Math.PI,0); ctx.fill();
   ctx.fillStyle="rgba(255,255,255,0.16)";
   ctx.beginPath(); ctx.ellipse(x-r*0.3,y-h-r*0.14,r*0.22,r*0.13,0,0,Math.PI*2); ctx.fill();
   ctx.globalAlpha=0.16; ctx.fillStyle=b.torch;
   ctx.beginPath(); ctx.arc(x,y-h,r*0.5,0,Math.PI*2); ctx.fill();
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
  // chipped top — a shallow broken rim, not a spire
  const topY=cy-h;
  ctx.fillStyle=blendHex(b.wall,"#ffffff",0.13);
  ctx.beginPath();
  ctx.moveTo(cx-w/2, topY+ts*0.10);
  ctx.lineTo(cx-w*0.28, topY+ts*0.02);
  ctx.lineTo(cx-w*0.05, topY+ts*0.07);
  ctx.lineTo(cx+w*0.16, topY-ts*0.01);
  ctx.lineTo(cx+w*0.36, topY+ts*0.05);
  ctx.lineTo(cx+w/2, topY+ts*0.00);
  ctx.lineTo(cx+w/2, topY+ts*0.15);
  ctx.lineTo(cx-w/2, topY+ts*0.15);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=blendHex(b.wall,"#000000",0.18);
  ctx.fillRect(cx-w/2, topY+ts*0.10, w, Math.max(1,ts*0.02));
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

 // A rare large inlaid mosaic spanning a 3x3 patch of open floor — gives big
 // empty chambers one deliberate focal point instead of only scattered litter.
 function drawPropMedallion(ctx,cx,cy,ts,b){
  const pulse=0.5+0.5*Math.sin(Date.now()*0.0015+cx*0.3);
  const R=ts*1.45;
  ctx.save();
  ctx.globalAlpha=0.28; ctx.strokeStyle=blendHex(b.floor,"#000000",0.55);
  ctx.lineWidth=ts*0.34; ctx.beginPath(); ctx.arc(cx,cy,R*0.94,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.5; ctx.strokeStyle=blendHex(b.floor,"#ffffff",0.16);
  ctx.lineWidth=Math.max(1,ts*0.06);
  ctx.beginPath(); ctx.arc(cx,cy,R*0.86,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,R*0.62,0,Math.PI*2); ctx.stroke();
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   ctx.beginPath();
   ctx.moveTo(cx+Math.cos(a)*R*0.62, cy+Math.sin(a)*R*0.62);
   ctx.lineTo(cx+Math.cos(a)*R*0.86, cy+Math.sin(a)*R*0.86);
   ctx.stroke();
  }
  ctx.globalAlpha=1;
  lightPool(ctx,cx,cy,ts*0.95,"rgba(126,224,255,"+(0.05+0.05*pulse).toFixed(3)+")","rgba(90,180,255,0.02)");
  ctx.globalAlpha=0.55; ctx.fillStyle=blendHex(b.floor,"#ffffff",0.24);
  ctx.beginPath(); ctx.arc(cx,cy,ts*0.30,0,Math.PI*2); ctx.fill();
  ctx.restore();
 }

 function drawProps(ctx, camX, camY, vw, vh, ts, b){
  const T=Delve.T, G=Delve.G;
  // medallions first, so litter can sit on top of them
  for(let y=1;y<vh;y++) for(let x=1;x<vw;x++){
   const gx=camX+x, gy=camY+y;
   if(tileAt(gx,gy)!==T.FLOOR) continue;
   if(uhash(gx,gy,601) >= 0.004) continue;
   let clear=true;
   for(let dy=-1;dy<=1&&clear;dy++) for(let dx=-1;dx<=1;dx++){
    if(tileAt(gx+dx,gy+dy)!==T.FLOOR){ clear=false; break; }
   }
   if(!clear) continue;
   drawPropMedallion(ctx, x*ts+ts*0.5, y*ts+ts*0.5, ts, b);
  }
  const list=[];
  for(let y=0;y<vh+1;y++) for(let x=0;x<vw+1;x++){
   const gx=camX+x, gy=camY+y;
   if(tileAt(gx,gy)!==T.FLOOR) continue;
   if(G && G.shop && G.shop.x===gx && G.shop.y===gy) continue;
   // uhash is uniform, so these thresholds are the actual densities
   if(uhash(gx,gy,401) < 0.040) list.push({ x:gx, y:gy, sx:x*ts, sy:y*ts, k:uhash(gx,gy,402) });
   if(uhash(gx,gy,405) < 0.040 && tileAt(gx,gy-1)===T.WALL) list.push({ x:gx, y:gy, sx:x*ts, sy:y*ts, web:true });
  }
  list.sort(function(a,b){ return a.y-b.y; });
  for(let i=0;i<list.length;i++){
   const it=list[i], cx=it.sx+ts*0.5, cy=it.sy+ts*0.5;
   if(it.web){ drawPropCobweb(ctx,cx,cy,ts,b); continue; }
   const k=it.k;
   if(k<0.10) drawPropRubble(ctx,cx,cy,ts,b);
   else if(k<0.20) drawPropBones(ctx,cx,cy,ts,b);
   else if(k<0.32) drawPropMushrooms(ctx,cx,cy,ts,b);
   else if(k<0.44) drawPropRune(ctx,cx,cy,ts,b);
   else if(k<0.60) drawPropCrate(ctx,cx,cy,ts,b);
   else if(k<0.82){ if(tileAt(it.x,it.y-1)===T.FLOOR) drawPropPillar(ctx,cx,cy,ts,b); else drawPropRubble(ctx,cx,cy,ts,b); }
   else drawPropBrazier(ctx,cx,cy,ts,b);
  }
 }


 // ── WALL DRESSING ────────────────────────────────────────────
 // Wall faces are the biggest blank surfaces on screen, so they get their own
 // deterministic detail pass: moss creeping down, cracks, hanging chains,
 // banners and corner webs. Drawn inside drawWallTile so it rides the tile
 // cache for free.
 function drawWallDecor(ctx, sx, sy, ts, gx, gy, b){
  if(ts < 20) return;
  const wr = uhash(gx,gy,501);
  if(wr >= 0.40) return;
  ctx.save();
  if(wr < 0.14){
   // moss creeping down from the top of the face
   const mh = ts*(0.20+uhash(gx,gy,502)*0.45);
   const mg = ctx.createLinearGradient(sx,sy,sx,sy+mh);
   mg.addColorStop(0,b.moss); mg.addColorStop(1,"rgba(0,0,0,0)");
   ctx.globalAlpha=0.30; ctx.fillStyle=mg;
   ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+ts,sy); ctx.lineTo(sx+ts,sy+mh*0.5);
   for(let i=5;i>=0;i--){
    ctx.lineTo(sx+ts*(i/5), sy+mh*(0.45+uhash(gx*7+i,gy,503)*0.55));
   }
   ctx.closePath(); ctx.fill();
  } else if(wr < 0.24){
   // a crack running down the face
   ctx.globalAlpha=0.34; ctx.strokeStyle="#000";
   ctx.lineWidth=Math.max(1,ts*0.035); ctx.lineCap="round";
   let cxx = sx+ts*(0.25+uhash(gx,gy,504)*0.5);
   ctx.beginPath(); ctx.moveTo(cxx, sy+ts*0.05);
   for(let i=1;i<=4;i++){
    cxx += (uhash(gx+i,gy,505)*2-1)*ts*0.12;
    ctx.lineTo(cxx, sy+ts*(0.05+0.9*(i/4)));
   }
   ctx.stroke();
  } else if(wr < 0.30){
   // a rusted chain hanging into frame
   const chx = sx+ts*(0.3+uhash(gx,gy,506)*0.4);
   const chh = ts*(0.25+uhash(gx,gy,507)*0.5);
   ctx.globalAlpha=0.5; ctx.strokeStyle="#6a7078"; ctx.lineWidth=Math.max(1,ts*0.03);
   ctx.beginPath(); ctx.moveTo(chx,sy); ctx.lineTo(chx,sy+chh); ctx.stroke();
   for(let i=0;i<3;i++){
    ctx.beginPath(); ctx.ellipse(chx, sy+chh*(0.2+i*0.3), ts*0.045, ts*0.06, 0, 0, Math.PI*2); ctx.stroke();
   }
  } else if(wr < 0.335){
   // a banner
   const bw=ts*0.44, bx=sx+ts*0.5-bw/2, bh=ts*0.62, by=sy+ts*0.08;
   ctx.globalAlpha=0.75; ctx.fillStyle="#4a3a28";
   ctx.fillRect(bx-ts*0.05, by, bw+ts*0.1, Math.max(1,ts*0.05));
   const bg=ctx.createLinearGradient(bx,by,bx,by+bh);
   bg.addColorStop(0,"#7a2f2f"); bg.addColorStop(1,"#431a1a");
   ctx.globalAlpha=0.88; ctx.fillStyle=bg;
   ctx.beginPath();
   ctx.moveTo(bx,by+ts*0.05); ctx.lineTo(bx+bw,by+ts*0.05);
   ctx.lineTo(bx+bw,by+bh); ctx.lineTo(bx+bw/2,by+bh-ts*0.1); ctx.lineTo(bx,by+bh);
   ctx.closePath(); ctx.fill();
   ctx.globalAlpha=0.45; ctx.fillStyle="#e0b140";
   ctx.beginPath(); ctx.arc(bx+bw/2, by+bh*0.45, ts*0.06, 0, Math.PI*2); ctx.fill();
  } else {
   drawPropCobweb(ctx, sx+ts*0.5, sy+ts*0.5, ts, b);
  }
  ctx.restore();
 }

 // ── PUBLIC SURFACE ───────────────────────────────────────────
 // Called by render.js: Delve.draw (shadows, props, dust) and
 // drawWallTile (wall dressing).
 Delve.decor = {
  drawWallShadows: drawWallShadows,
  drawMotes: drawMotes,
  drawProps: drawProps,
  drawWallDecor: drawWallDecor
 };
})();
