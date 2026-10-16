window.Delve = window.Delve || {};
(function(){

 function mk(w,h){ const c=document.createElement("canvas"); c.width=w; c.height=h; return c; }
 function gx(c){ return c.getContext("2d"); }
 function R(x,cx,cy,w,h,col){ if(!col) return; x.fillStyle=col; x.fillRect(cx,cy,w,h); }
 function tint(base,col){
  const c=mk(base.width,base.height), x=gx(c);
  x.drawImage(base,0,0); x.globalAlpha=0.40; x.fillStyle=col; x.fillRect(0,0,base.width,base.height); x.globalAlpha=1; return c;
 }

 // ── Shared helpers exposed for satellite sprite files (bosssprites.js) ──
 Delve._spriteUtils = { mk: mk, gx: gx, R: R, tint: tint, atkFrom: atkFrom };

 // ── Boss sprite registry ──
 // Satellite files call Delve.registerBossSprite(key, builderFn). buildAll()
 // consumes this registry after laying down the base sprites. Adding a new
 // boss sprite never requires editing this file.
 // Attack frames are registered separately (registerBossAttackSprite); that
 // builder receives the idle canvas so it can layer a strike over it.
 Delve._bossSpriteBuilders = Delve._bossSpriteBuilders || {};
 Delve._bossAttackBuilders = Delve._bossAttackBuilders || {};
 Delve.registerBossSprite = function(key, builderFn){
  Delve._bossSpriteBuilders[key] = builderFn;
 };
 Delve.registerBossAttackSprite = function(key, builderFn){
  Delve._bossAttackBuilders[key] = builderFn;
 };

 // ============================ CHARACTERS ============================
 function buildShadow(){ const c=mk(24,7),x=gx(c); x.globalAlpha=0.35;x.fillStyle="#000"; R(x,8,0,8,1);R(x,6,1,12,1);R(x,4,2,16,1);R(x,3,3,18,1);R(x,2,4,20,1);R(x,2,5,20,1);R(x,2,6,20,1); x.globalAlpha=1; return c; }

 function buildSoldier(){
  const c=mk(24,24),x=gx(c);
  R(x,8,17,3,4,"#4d3622");R(x,13,17,3,4,"#4d3622");
  R(x,7,20,6,2,"#2b2118");R(x,12,20,6,2,"#2b2118");
  R(x,6,10,12,9,"#33507a");R(x,6,10,2,9,"#233a5c");R(x,16,10,2,9,"#233a5c");
  R(x,6,15,12,2,"#8a5a33");R(x,10,15,4,2,"#ffd75e");
  R(x,3,9,5,3,"#56636f");R(x,16,9,5,3,"#56636f");
  R(x,4,12,3,6,"#33507a");R(x,17,12,3,6,"#33507a");
  R(x,4,18,3,2,"#e8c39a");R(x,17,18,3,2,"#e8c39a");
  R(x,8,1,8,1,"#c3ccd6");R(x,7,2,10,7,"#8d9aa8");R(x,8,2,8,1,"#c3ccd6");
  R(x,8,6,8,2,"#1d232b");R(x,10,6,1,2,"#9fd8ff");R(x,13,6,1,2,"#9fd8ff");
  R(x,9,9,6,1,"#56636f");R(x,3,11,4,2,"#8d9aa8");R(x,2,13,6,2,"#8d9aa8");R(x,3,15,4,2,"#8d9aa8");R(x,4,13,2,2,"#ffd75e");
  return c;
 }

 function buildGoblin(){
  const c=mk(24,24),x=gx(c);
  R(x,9,20,2,3,"#4e8039");R(x,13,20,2,3,"#4e8039");R(x,5,14,3,5,"#4e8039");R(x,16,14,3,5,"#4e8039");
  R(x,8,14,8,7,"#5f8f45");R(x,9,2,6,1,"#6aa84f");R(x,7,3,10,11,"#6aa84f");
  R(x,2,7,4,4,"#4e8039");R(x,18,7,4,4,"#4e8039");R(x,3,8,2,2,"#8fd06e");R(x,19,8,2,2,"#8fd06e");
  R(x,8,7,2,2,"#ff5c5c");R(x,14,7,2,2,"#ff5c5c");R(x,8,10,8,2,"#2c4a20");R(x,9,11,1,2,"#f5f0e8");R(x,14,11,1,2,"#f5f0e8");
  return c;
 }
 function buildBrute(){
  const c=mk(24,24),x=gx(c);
  R(x,7,18,4,4,"#5d4334");R(x,13,18,4,4,"#5d4334");R(x,1,15,3,3,"#5d4334");R(x,20,15,3,3,"#5d4334");
  R(x,3,10,18,10,"#8a6a52");R(x,3,10,18,3,"#704f3c");R(x,3,15,18,2,"#4a3628");R(x,1,11,3,7,"#704f3c");R(x,20,11,3,7,"#704f3c");
  R(x,7,3,10,8,"#6d513d");R(x,8,5,2,2,"#ffcf4a");R(x,14,5,2,2,"#ffcf4a");R(x,7,7,10,2,"#4a3628");R(x,7,8,10,2,"#7a5a43");R(x,6,9,2,3,"#e8e0d0");R(x,16,9,2,3,"#e8e0d0");
  return c;
 }
 function buildWraith(){
  const c=mk(24,24),x=gx(c);
  R(x,6,13,12,2,"#4a3b66");R(x,7,15,10,2,"#4a3b66");R(x,8,17,8,2,"#4a3b66");R(x,9,19,6,2,"#4a3b66");R(x,10,21,4,2,"#4a3b66");
  R(x,6,8,12,6,"#3a2d52");R(x,4,7,16,3,"#4a3b66");R(x,8,1,8,7,"#4a3b66");R(x,9,0,6,1,"#5c4a80");R(x,9,4,6,6,"#120e1e");R(x,10,6,2,2,"#7ee0ff");R(x,13,6,2,2,"#7ee0ff");
  x.globalAlpha=0.22;R(x,9,5,8,4,"#7ee0ff");x.globalAlpha=1;
  return c;
 }
 function buildRat(){
  const c=mk(24,24),x=gx(c);
  R(x,2,12,4,1,"#7a5b45");R(x,1,13,3,1,"#7a5b45");R(x,8,15,8,6,"#9b7b61");R(x,8,15,8,2,"#7a5b45");R(x,12,7,8,8,"#9b7b61");R(x,12,7,8,2,"#7a5b45");
  R(x,11,3,3,3,"#7a5b45");R(x,17,3,3,3,"#7a5b45");R(x,12,4,2,2,"#c99");R(x,18,4,2,2,"#c99");R(x,16,10,2,2,"#ff5c5c");R(x,20,10,2,2,"#ff5c5c");R(x,18,13,3,2,"#5b4437");R(x,18,15,1,2,"#f5f0e8");R(x,20,15,1,2,"#f5f0e8");R(x,9,21,2,2,"#7a5b45");R(x,13,21,2,2,"#7a5b45");
  return c;
 }
 function buildSlime(){
  const c=mk(24,24),x=gx(c);
  R(x,7,6,10,1,"#67d65f");R(x,5,7,14,1,"#67d65f");R(x,4,8,16,12,"#67d65f");R(x,5,20,14,3,"#67d65f");R(x,8,23,8,1,"#67d65f");R(x,8,10,3,6,"#b8f5a8");R(x,14,16,3,3,"#b8f5a8");R(x,11,14,2,2,"#2c4a20");R(x,15,14,2,2,"#2c4a20");
  return c;
 }
 function buildMerchant(){
  const c=mk(26,26),x=gx(c);
  R(x,8,2,10,8,"#3f3a50");R(x,7,9,12,12,"#332f42");R(x,8,2,10,2,"#2a2636");R(x,9,0,8,2,"#2a2636");R(x,12,5,4,4,"#17131f");R(x,13,6,1,1,"#e8c39a");R(x,15,6,1,1,"#e8c39a");R(x,6,15,4,4,"#b28a5a");R(x,16,15,4,4,"#b28a5a");R(x,9,18,8,2,"#4a3920");R(x,11,19,4,3,"#8a6a2a");
  return c;
 }

 // ============================ BLACKVEIN ENEMIES ============================
 function buildBarkling(){
  const c=mk(24,24),x=gx(c);
  R(x,7,19,2,4,"#3a2a18");R(x,10,20,2,3,"#3a2a18");
  R(x,12,20,2,3,"#3a2a18");R(x,15,19,2,4,"#3a2a18");
  R(x,7,11,10,9,"#5a3a20");
  R(x,7,11,10,2,"#7a5a30");
  R(x,7,18,10,2,"#3a2a18");
  R(x,9,13,1,6,"#3a2014");
  R(x,11,13,1,6,"#3a2014");
  R(x,14,13,1,6,"#3a2014");
  R(x,8,8,2,3,"#5a3a20");
  R(x,14,8,2,3,"#5a3a20");
  R(x,9,14,2,2,"#c8d84a");
  R(x,13,14,2,2,"#c8d84a");
  R(x,9,14,1,1,"#eaffa8");
  R(x,13,14,1,1,"#eaffa8");
  R(x,10,17,4,1,"#1c1008");
  return c;
 }

 function buildThornling(){
  const c=mk(24,24),x=gx(c);
  R(x,8,19,2,4,"#2a3524");R(x,14,19,2,4,"#2a3524");
  R(x,7,12,10,8,"#3a4a20");
  R(x,7,12,10,2,"#4a5c28");
  R(x,7,18,10,2,"#1c2414");
  R(x,4,13,3,1,"#c8d84a");R(x,17,13,3,1,"#c8d84a");
  R(x,5,15,2,1,"#a8b83a");R(x,17,15,2,1,"#a8b83a");
  R(x,8,8,8,5,"#3a4a20");
  R(x,8,8,8,1,"#4a5c28");
  R(x,9,10,2,2,"#ff4a3d");R(x,13,10,2,2,"#ff4a3d");
  R(x,10,11,1,1,"#ffaa5a");R(x,14,11,1,1,"#ffaa5a");
  R(x,9,4,1,4,"#c8d84a");R(x,14,4,1,4,"#c8d84a");
  R(x,8,3,3,1,"#c8d84a");R(x,13,3,3,1,"#c8d84a");
  R(x,10,12,4,1,"#141c10");
  return c;
 }

 function buildTreant(){
  const c=mk(24,24),x=gx(c);
  R(x,7,20,10,3,"#3d2e1c");
  R(x,6,22,12,2,"#2a1f12");
  R(x,8,8,8,14,"#5a3a24");
  R(x,8,8,1,14,"#7a5a3a");
  R(x,15,8,1,14,"#3a2014");
  R(x,9,8,6,1,"#7a5a3a");
  R(x,10,10,1,10,"#3a2014");
  R(x,13,10,1,10,"#3a2014");
  R(x,11,12,2,1,"#2a1f12");
  R(x,11,16,2,1,"#2a1f12");
  R(x,7,11,3,2,"#5a7a2a");
  R(x,14,14,3,2,"#5a7a2a");
  R(x,3,12,5,2,"#5a3a24");R(x,2,10,2,3,"#5a3a24");
  R(x,16,12,5,2,"#5a3a24");R(x,20,10,2,3,"#5a3a24");
  R(x,8,4,8,5,"#5a3a24");
  R(x,8,4,8,1,"#7a5a3a");
  R(x,9,6,2,2,"#a855f7");R(x,13,6,2,2,"#a855f7");
  R(x,9,6,1,1,"#e0a8ff");R(x,13,6,1,1,"#e0a8ff");
  R(x,10,8,4,1,"#1a0f08");
  return c;
 }

 function buildVineStalker(){
  const c=mk(24,24),x=gx(c);
  R(x,9,20,2,3,"#3a2048");R(x,13,20,2,3,"#3a2048");
  R(x,8,10,8,10,"#4a3a20");
  R(x,7,14,10,4,"#3a2a18");
  R(x,8,10,8,1,"#5a4a28");
  R(x,3,12,5,1,"#4a3058");
  R(x,3,13,4,1,"#4a3058");
  R(x,16,12,5,1,"#4a3058");
  R(x,17,13,4,1,"#4a3058");
  R(x,8,6,8,5,"#4a3a20");
  R(x,9,8,2,2,"#c8d84a");R(x,13,8,2,2,"#c8d84a");
  R(x,10,9,1,1,"#eaffa8");R(x,14,9,1,1,"#eaffa8");
  R(x,11,20,1,2,"#a855f7");R(x,13,21,1,1,"#a855f7");
  return c;
 }

 function buildDryad(){
  const c=mk(24,24),x=gx(c);
  R(x,9,20,2,4,"#3a2014");
  R(x,13,20,2,4,"#3a2014");
  R(x,9,9,6,12,"#4a3020");
  R(x,9,9,1,12,"#6a4a30");
  R(x,14,9,1,12,"#2a1a0a");
  R(x,9,13,6,2,"#3a2014");
  R(x,9,17,6,2,"#3a2014");
  R(x,8,4,8,6,"#4a3020");
  R(x,8,4,8,1,"#6a4a30");
  R(x,9,6,2,2,"#a855f7");
  R(x,13,6,2,2,"#a855f7");
  R(x,9,6,1,1,"#e0a8ff");
  R(x,13,6,1,1,"#e0a8ff");
  R(x,10,9,4,1,"#1a0a08");
  R(x,3,10,6,2,"#4a3020");
  R(x,2,12,2,4,"#5a4a28");
  R(x,4,13,1,3,"#5a4a28");
  R(x,15,10,6,2,"#4a3020");
  R(x,20,12,2,4,"#5a4a28");
  R(x,18,13,1,3,"#5a4a28");
  return c;
 }

 function buildSporeSwarm(){
  const c=mk(24,24),x=gx(c);
  R(x,10,9,4,8,"#e0d8b8");
  R(x,7,5,10,4,"#4a6a2a");
  R(x,7,5,10,1,"#6a8a3a");
  R(x,9,4,6,1,"#4a6a2a");
  R(x,9,6,2,1,"#c8d84a");R(x,14,6,2,1,"#c8d84a");
  R(x,3,14,2,6,"#e0d8b8");
  R(x,1,11,6,3,"#4a6a2a");
  R(x,2,12,1,1,"#c8d84a");R(x,5,12,1,1,"#c8d84a");
  R(x,19,15,2,5,"#e0d8b8");
  R(x,17,12,6,3,"#4a6a2a");
  R(x,18,13,1,1,"#c8d84a");R(x,21,13,1,1,"#c8d84a");
  R(x,6,2,1,1,"#a855f7");
  R(x,17,3,1,1,"#a855f7");
  R(x,11,1,1,1,"#a855f7");
  return c;
 }

 // ============================ FLOOR ART ============================
 function buildGoldPile(){ const c=mk(24,24),x=gx(c); R(x,8,11,8,3,"#d9a11f");R(x,7,12,10,3,"#f0c14d");R(x,6,15,12,3,"#d9a11f");R(x,7,18,10,2,"#b8860b");R(x,8,12,2,1,"#fff2a8");R(x,14,14,1,2,"#fff2a8");R(x,12,16,2,1,"#fff2a8"); return c; }
 function buildItemPile(){ const c=mk(24,24),x=gx(c); R(x,7,14,10,6,"#6d5b45");R(x,7,14,10,1,"#88725c");R(x,9,15,1,4,"#4f3f30");R(x,15,15,1,4,"#4f3f30");R(x,12,17,2,2,"#9ad9ff"); return c; }
 function buildPotionPile(){ const c=mk(24,24),x=gx(c); R(x,10,13,4,7,"#b8e2f5");R(x,9,12,6,1,"#b8e2f5");R(x,10,8,1,4,"#8a5a33");R(x,13,8,1,4,"#8a5a33");R(x,11,15,2,4,"#ff5c5c");R(x,13,15,2,4,"#7ee0a0"); return c; }
 function buildChest(open){
  const c=mk(24,24),x=gx(c);
  if(!open){
   R(x,5,9,14,4,"#a52b2b");R(x,5,9,14,1,"#e0b140");R(x,5,9,2,4,"#c9971f");R(x,17,9,2,4,"#c9971f");R(x,4,14,16,5,"#8c2323");R(x,4,14,2,5,"#c9971f");R(x,18,14,2,5,"#c9971f");R(x,4,19,16,1,"#e0b140");R(x,4,13,16,1,"#3f0c0c");R(x,11,12,2,3,"#e0b140");R(x,12,13,1,1,"#2a1505");
  } else {
   R(x,5,6,14,3,"#a52b2b");R(x,5,6,14,1,"#e0b140");R(x,5,6,2,3,"#c9971f");R(x,17,6,2,3,"#c9971f");R(x,4,11,16,8,"#8c2323");R(x,4,11,2,8,"#c9971f");R(x,18,11,2,8,"#c9971f");R(x,4,19,16,1,"#e0b140");R(x,6,9,12,3,"#1d0e08");R(x,6,10,12,1,"#c9971f");
  }
  return c;
 }
 function buildBarrel(){ const c=mk(24,24),x=gx(c); R(x,6,7,12,12,"#6d4a2f");R(x,6,7,2,12,"#5a3c24");R(x,16,7,2,12,"#5a3c24");R(x,8,8,1,10,"#8a5f3d");R(x,12,8,1,10,"#8a5f3d");R(x,15,8,1,10,"#8a5f3d");R(x,5,6,14,2,"#3f3f45");R(x,5,18,14,2,"#3f3f45");R(x,5,12,14,2,"#3f3f45");R(x,8,7,1,11,"#9a7048"); return c; }

 // ======================= ARENA PROPS ===============================
 // Decoration for boss arenas (Batch 8). These are drawn from G.decor, never as
 // tiles, so they cannot block movement, be tapped, or show on the minimap.
 // Floor props are one tile (24x24, art sitting on the bottom of the canvas);
 // hanging props are 24x36 and are drawn from the top of a wall tile, so they
 // spill down into the tile below — that's what makes them read as "hanging".
 function buildPropPillar(){
  const c=mk(24,24),x=gx(c);
  R(x,6,20,12,4,"#4a525e");R(x,6,20,12,1,"#5a616c");
  R(x,8,6,8,15,"#56636f");R(x,8,6,2,15,"#6d7a88");R(x,14,6,2,15,"#3a4248");
  R(x,7,3,10,3,"#4a525e");R(x,7,3,10,1,"#6d7a88");
  R(x,10,1,4,2,"#56636f");
  R(x,9,11,6,1,"#3a4248");R(x,11,15,4,1,"#3a4248");
  R(x,3,21,5,3,"#4a525e");R(x,17,22,4,2,"#3a4248");
  return c;
 }
 // Bespoke banners: NOT one shape recoloured — each boss's standard has its own
 // silhouette and carries that boss's own colours. The Warden's is military, the
 // Sovereign's is a living canopy, the Tempest's is iced stiff.
 function buildBannerWarden(){
  const c=mk(24,36),x=gx(c);
  R(x,2,0,20,2,"#5a4a34");R(x,2,0,20,1,"#7a654a");             // brass rod
  R(x,4,2,16,24,"#23262d");                                    // steel cloth
  R(x,4,2,3,24,"#343a43");R(x,17,2,3,24,"#151920");            // folds
  R(x,4,26,16,3,"#343a43");                                    // hem
  R(x,6,6,12,2,"#4a525e");R(x,10,8,4,7,"#4a525e");R(x,8,13,8,2,"#4a525e");  // hammer crest
  R(x,10,9,4,1,"#7ee0ff");R(x,8,14,8,1,"#7ee0ff");             // his pale-blue eyes
  R(x,7,20,10,1,"rgba(255,74,61,0.35)");                       // a hint of his red gaze
  R(x,6,29,5,4,"#23262d");R(x,13,29,6,3,"#343a43");            // torn tails
  return c;
 }
 function buildBannerThorn(){
  const c=mk(24,36),x=gx(c);
  R(x,3,0,18,3,"#2a1a0e");R(x,3,0,18,1,"#3a2418");             // thick branch
  R(x,5,3,4,20,"#3d5a22");R(x,11,3,4,26,"#4a6a28");R(x,16,3,3,17,"#3d5a22");  // hanging vines
  R(x,4,7,5,4,"#5a7a2a");R(x,10,9,5,4,"#7a9a3a");R(x,15,6,5,4,"#5a7a2a");     // leaf clusters
  R(x,5,8,2,2,"#a8e84a");R(x,12,10,2,2,"#c8d84a");R(x,16,7,2,2,"#a8e84a");   // glowing veins
  R(x,6,25,5,6,"#4a6a28");R(x,12,30,5,4,"#5a7a2a");            // leaves low down
  R(x,7,27,2,2,"#c8d84a");R(x,13,31,2,2,"#a8e84a");
  return c;
 }
 function buildBannerFrost(){
  const c=mk(24,36),x=gx(c);
  R(x,2,0,20,2,"#6a86a8");R(x,2,0,20,1,"#a8e8ff");             // frosted rod
  R(x,4,2,16,20,"#2a4a6a");                                    // cloth, washed pale
  R(x,4,2,3,20,"#3a6a8a");R(x,17,2,3,20,"#1a2436");            // folds
  R(x,4,22,16,2,"#7ec8e0");                                    // frozen hem
  R(x,6,24,4,7,"#a8e8ff");R(x,11,24,3,9,"#eaffff");R(x,16,24,4,6,"#a8e8ff"); // icicle fringe
  R(x,8,6,8,9,"#a8e8ff");R(x,10,8,4,4,"#eaffff");              // the storm's own pale core
  return c;
 }
 function buildPropChain(){
  const c=mk(24,36),x=gx(c);
  R(x,10,0,4,2,"#5a616c");
  for(let i=0;i<5;i++){ const y=2+i*6; R(x,9,y,6,2,"#57616d"); R(x,10,y+1,4,3,"#3a4248"); }
  R(x,8,32,8,2,"#4a525e");
  return c;
 }
 function buildPropRootHang(){
  const c=mk(24,36),x=gx(c);
  R(x,4,0,16,3,"#2a1a0e");R(x,4,0,16,1,"#3a2418");
  const roots=[[6,14],[10,20],[14,16],[18,11]];
  for(let i=0;i<roots.length;i++){
   const bx=roots[i][0], hh=roots[i][1];
   R(x,bx,3,3,hh,"#3a2418");R(x,bx,3,1,hh,"#5a3a24");R(x,bx,3+hh,3,2,"#7a9a3a");
  }
  return c;
 }
 function buildPropIcicle(){
  const c=mk(24,36),x=gx(c);
  R(x,2,0,20,2,"#7ec8e0");R(x,2,0,20,1,"#eaffff");
  const shards=[[4,16],[9,26],[14,20],[19,12]];
  for(let i=0;i<shards.length;i++){
   const bx=shards[i][0], hh=shards[i][1];
   R(x,bx,2,3,hh,"#a8e8ff");R(x,bx,2,1,hh,"#eaffff");R(x,bx,2+hh-2,3,2,"#7ec8e0");
  }
  return c;
 }
 function buildPropRubble(){
  const c=mk(24,24),x=gx(c);
  R(x,4,18,6,4,"#4a525e");R(x,4,18,6,1,"#6d7a88");
  R(x,10,16,7,6,"#56636f");R(x,10,16,7,1,"#6d7a88");R(x,10,20,7,2,"#3a4248");
  R(x,17,19,4,3,"#4a525e");R(x,7,15,4,3,"#3a4248");R(x,13,13,3,3,"#4a525e");
  return c;
 }
 function buildPropBones(){
  const c=mk(24,24),x=gx(c);
  R(x,9,16,6,6,"#c9c2b0");
  R(x,10,18,1,2,"#2b2118");R(x,13,18,1,2,"#2b2118");R(x,11,21,2,1,"#2b2118");
  R(x,3,21,12,2,"#c9c2b0");R(x,3,20,3,4,"#a8a292");R(x,13,20,3,4,"#a8a292");
  R(x,17,17,1,6,"#c9c2b0");R(x,19,16,1,7,"#c9c2b0");R(x,17,17,3,1,"#c9c2b0");R(x,17,20,3,1,"#c9c2b0");
  return c;
 }
 function buildPropThorns(){
  const c=mk(24,24),x=gx(c);
  R(x,4,20,16,4,"#2a1a0e");R(x,4,20,16,1,"#3a2418");
  const sp=[[6,6],[10,12],[15,9],[19,5]];
  for(let i=0;i<sp.length;i++){
   const bx=sp[i][0], hh=sp[i][1];
   R(x,bx,20-hh,2,hh,"#4a3a1e");R(x,bx,20-hh-2,2,2,"#c8d84a");
  }
  R(x,12,14,3,1,"#c8d84a");
  return c;
 }
 // The Blackvein's arena furniture: petrified, thorned, moss-lit.
 function buildPillarThorn(){
  const c=mk(24,24),x=gx(c);
  R(x,5,21,14,3,"#2a1a0e");R(x,5,21,14,1,"#3a2418");           // root base
  R(x,8,6,8,16,"#3a2418");R(x,8,6,2,16,"#5a3a24");R(x,14,6,2,16,"#20140a");
  R(x,6,3,12,3,"#2a1a0e");R(x,6,3,12,1,"#3a2418");             // splayed crown
  R(x,7,12,2,3,"#4a3a1e");R(x,15,9,2,3,"#4a3a1e");             // thorn nubs
  R(x,10,4,1,15,"#20140a");                                    // a deep groove
  R(x,9,18,6,1,"#a8e84a");R(x,12,10,3,1,"#c8d84a");            // seam-glow, his colour
  R(x,2,22,5,2,"#2a1a0e");R(x,17,21,5,2,"#2a1a0e");
  return c;
 }
 function buildRubbleThorn(){
  const c=mk(24,24),x=gx(c);
  R(x,4,18,8,5,"#3a2418");R(x,4,18,8,1,"#5a3a24");
  R(x,11,16,8,6,"#2a1a0e");R(x,11,16,8,1,"#4a3a1e");R(x,11,20,8,2,"#20140a");
  R(x,16,19,5,3,"#3a2418");R(x,7,14,4,4,"#3a2418");
  R(x,5,19,3,2,"#7a9a3a");R(x,13,17,3,2,"#7a9a3a");            // moss over the bark
  R(x,18,17,2,2,"#a8e84a");                                    // a spore, still glowing
  return c;
 }
 // The Blackvein's answer to bones: a hollow husk still gripped by its roots.
 function buildHuskThorn(){
  const c=mk(24,24),x=gx(c);
  R(x,8,15,8,7,"#3d5a22");R(x,9,16,6,1,"#5a7a2a");             // pod
  R(x,10,15,1,7,"#2a1a0e");R(x,14,15,1,7,"#2a1a0e");           // ribs
  R(x,11,18,2,3,"#20140a");                                    // hollow gash
  R(x,4,21,16,2,"#2a1a0e");R(x,5,20,3,2,"#3a2418");R(x,16,20,4,2,"#3a2418"); // roots gripping
  R(x,12,14,4,2,"#7a9a3a");R(x,13,14,2,1,"#eaffa8");           // glow where an eye was
  return c;
 }
 // The Frosted Vault: everything sheathed in ice.
 function buildPillarIce(){
  const c=mk(24,24),x=gx(c);
  R(x,5,21,14,3,"#3a4a5e");R(x,5,21,14,1,"#5a7a8a");
  R(x,8,6,8,16,"#4a5a6e");R(x,8,6,2,16,"#a8e8ff");R(x,14,6,2,16,"#22303f");
  R(x,6,3,12,3,"#3a4a5e");R(x,6,3,12,1,"#7ec8e0");
  R(x,6,10,3,7,"#7ec8e0");R(x,15,8,3,8,"#a8e8ff");             // sheathing
  R(x,10,16,5,4,"#7ec8e0");R(x,11,17,3,2,"#eaffff");           // ice across the base
  R(x,3,22,5,2,"#4a5a6e");R(x,17,21,4,2,"#3a4a5e");
  return c;
 }
 function buildRubbleIce(){
  const c=mk(24,24),x=gx(c);
  R(x,4,18,7,5,"#3a4a5e");R(x,4,18,7,1,"#7ec8e0");
  R(x,11,16,8,6,"#4a5a6e");R(x,11,16,8,1,"#a8e8ff");R(x,11,20,8,2,"#22303f");
  R(x,17,19,4,3,"#3a4a5e");
  R(x,6,14,4,4,"#7ec8e0");R(x,7,15,2,2,"#eaffff");             // shards standing in it
  R(x,13,12,3,4,"#a8e8ff");
  return c;
 }
 function buildBonesIce(){
  const c=mk(24,24),x=gx(c);
  R(x,4,19,16,3,"#7ec8e0");R(x,4,19,16,1,"#eaffff");           // a slab of ice
  R(x,9,14,6,5,"#c9c2b0");                                     // skull, half sunk
  R(x,10,16,1,2,"#22303f");R(x,13,16,1,2,"#22303f");
  R(x,3,18,10,2,"#c9c2b0");R(x,17,15,1,6,"#c9c2b0");
  R(x,6,20,4,2,"#a8e8ff");R(x,14,12,3,3,"#a8e8ff");            // frost creeping over it
  return c;
 }
 // The Undercroft echoes its guardian: a toppled stone knight at the door, one
 // ember still lit in its visor.
 function buildStatueWarden(){
  const c=mk(24,24),x=gx(c);
  R(x,3,19,18,4,"#4a525e");R(x,3,19,18,1,"#6d7a88");           // fallen slab
  R(x,5,12,7,8,"#56636f");R(x,5,12,7,1,"#6d7a88");             // torso
  R(x,13,14,6,6,"#4a525e");                                    // helm, resting
  R(x,15,17,3,1,"#ff4a3d");                                    // a dull ember of an eye
  R(x,3,9,5,4,"#4a525e");R(x,8,8,4,4,"#3a4248");               // shield and gauntlet
  R(x,17,20,4,3,"#3a4248");R(x,2,21,4,2,"#3a4248");
  return c;
 }

 function buildPropCrystals(){
  const c=mk(24,24),x=gx(c);
  R(x,3,20,18,4,"#5a7a8a");R(x,3,20,18,1,"#8fb6c8");
  const cr=[[5,9],[9,15],[13,11],[17,7]];
  for(let i=0;i<cr.length;i++){
   const bx=cr[i][0], hh=cr[i][1];
   R(x,bx-1,20-hh,3,hh,"#7ec8e0");R(x,bx-1,20-hh,1,hh,"#eaffff");R(x,bx+1,20-hh,1,hh-2,"#5aa8c8");R(x,bx-1,20-hh-1,3,1,"#eaffff");
  }
  R(x,7,14,2,2,"#eaffff");
  return c;
 }

// ======================= THE FROSTED VAULT =========================
// Ward 3. Icy blues, silver, frost-green accents — see BIOMES[2].

 function buildFrostling(){
  const c=mk(24,24),x=gx(c);
  R(x,8,19,3,4,"#22303f");R(x,13,19,3,4,"#22303f");
  R(x,7,22,5,2,"#1a2436");R(x,12,22,5,2,"#1a2436");
  R(x,7,12,10,8,"#3a4a5e");R(x,7,12,2,8,"#4d6a8a");R(x,15,12,2,8,"#22303f");
  R(x,9,16,6,2,"#22303f");
  R(x,4,13,3,5,"#3a4a5e");R(x,17,13,3,5,"#3a4a5e");
  R(x,4,17,3,2,"#a8e8ff");R(x,17,17,3,2,"#a8e8ff");
  R(x,8,5,8,7,"#4d6a8a");R(x,8,5,8,1,"#6a86a8");
  R(x,7,2,2,4,"#a8e8ff");R(x,15,2,2,4,"#a8e8ff");
  R(x,6,4,2,2,"#7ec8e0");R(x,16,4,2,2,"#7ec8e0");
  R(x,10,8,2,2,"#a8e8ff");R(x,13,8,2,2,"#a8e8ff");
  return c;
 }

 function buildIceboundSwarm(){
  const c=mk(24,24),x=gx(c);
  R(x,9,10,6,8,"#3a4a5e");R(x,9,10,6,1,"#6a86a8");
  R(x,10,17,2,2,"#22303f");R(x,13,17,2,2,"#22303f");
  R(x,3,12,5,5,"#2a3644");R(x,3,12,5,1,"#4d6a8a");
  R(x,2,14,1,2,"#a8e8ff");R(x,7,11,1,2,"#a8e8ff");
  R(x,16,12,5,5,"#2a3644");R(x,16,12,5,1,"#4d6a8a");
  R(x,21,14,1,2,"#a8e8ff");R(x,16,11,1,2,"#a8e8ff");
  R(x,8,5,3,5,"#4d6a8a");R(x,8,5,3,1,"#a8e8ff");
  R(x,13,4,3,6,"#4d6a8a");R(x,13,4,3,1,"#a8e8ff");
  R(x,11,6,2,4,"#6a86a8");
  R(x,10,12,2,2,"#a8e8ff");R(x,13,12,2,2,"#a8e8ff");
  R(x,6,2,1,1,"#7ec8e0");R(x,18,3,1,1,"#7ec8e0");
  return c;
 }

 function buildShatterling(){
  const c=mk(24,24),x=gx(c);
  R(x,7,19,3,3,"#1a2436");R(x,14,19,3,3,"#1a2436");
  R(x,9,4,6,3,"#6a86a8");
  R(x,7,7,10,4,"#4d6a8a");
  R(x,6,11,12,5,"#3a4a5e");
  R(x,8,16,8,3,"#22303f");
  R(x,11,7,2,12,"#6a86a8");
  R(x,6,13,3,2,"#6a86a8");R(x,15,13,3,2,"#6a86a8");
  R(x,10,5,1,14,"#0a1018");
  R(x,14,8,1,10,"#0a1018");
  R(x,8,12,3,1,"#0a1018");R(x,13,16,4,1,"#0a1018");
  R(x,11,11,3,3,"#a8e8ff");
  R(x,12,12,1,1,"#eaffff");
  R(x,3,8,2,2,"#7ec8e0");R(x,19,10,2,2,"#7ec8e0");R(x,4,17,2,2,"#7ec8e0");
  return c;
 }

 function buildGlacialStalker(){
  const c=mk(24,24),x=gx(c);
  R(x,6,18,2,5,"#22303f");R(x,9,19,2,4,"#22303f");R(x,13,19,2,4,"#22303f");R(x,17,18,2,5,"#22303f");
  R(x,5,22,4,2,"#1a2436");R(x,16,22,4,2,"#1a2436");
  R(x,7,11,10,8,"#2a3644");R(x,7,11,10,1,"#4d6a8a");
  R(x,9,14,6,3,"#22303f");
  R(x,8,8,2,3,"#6a86a8");R(x,11,7,2,4,"#6a86a8");R(x,14,8,2,3,"#6a86a8");
  R(x,4,10,7,6,"#3a4a5e");R(x,4,10,7,1,"#4d6a8a");
  R(x,5,12,2,1,"#a8e8ff");R(x,7,12,2,1,"#a8e8ff");
  R(x,4,14,5,1,"#0a1018");R(x,5,14,1,1,"#eaffff");R(x,7,14,1,1,"#eaffff");
  R(x,16,13,4,2,"#2a3644");R(x,19,15,2,4,"#2a3644");
  R(x,19,19,3,1,"#a8e8ff");R(x,19,18,1,3,"#a8e8ff");
  return c;
 }

 function buildRimecaster(){
  const c=mk(24,24),x=gx(c);
  R(x,7,9,10,14,"#2a3644");R(x,7,9,10,1,"#4d6a8a");
  R(x,6,21,12,2,"#1a2436");
  R(x,11,12,2,10,"#22303f");
  R(x,8,4,8,7,"#3a4a5e");R(x,8,4,8,1,"#4d6a8a");
  R(x,10,6,4,4,"#0a1018");
  R(x,11,7,1,1,"#a8e8ff");R(x,13,7,1,1,"#a8e8ff");
  R(x,3,6,2,17,"#22303f");
  R(x,3,6,2,1,"#4d6a8a");
  R(x,2,2,4,4,"#7ec8e0");R(x,3,3,2,2,"#eaffff");
  R(x,1,0,1,1,"#a8e8ff");R(x,6,1,1,1,"#a8e8ff");
  R(x,4,13,4,3,"#3a4a5e");
  return c;
 }

 function buildFrostbound(){
  const c=mk(24,24),x=gx(c);
  R(x,7,19,4,4,"#22303f");R(x,13,19,4,4,"#22303f");
  R(x,6,22,5,2,"#1a2436");R(x,13,22,5,2,"#1a2436");
  R(x,6,9,12,11,"#3a4a5e");R(x,6,9,12,2,"#4d6a8a");
  R(x,6,14,12,2,"#22303f");
  R(x,11,9,2,11,"#22303f");
  R(x,3,8,4,4,"#4d6a8a");R(x,17,8,4,4,"#4d6a8a");
  R(x,3,8,4,1,"#6a86a8");R(x,17,8,4,1,"#6a86a8");
  R(x,8,3,8,6,"#3a4a5e");R(x,8,3,8,1,"#6a86a8");
  R(x,8,6,8,1,"#22303f");
  R(x,10,5,1,1,"#a8e8ff");R(x,13,5,1,1,"#a8e8ff");
  R(x,11,0,2,3,"#a8e8ff");
  R(x,1,10,4,10,"#4d6a8a");R(x,1,10,4,1,"#6a86a8");
  R(x,2,13,2,2,"#a8e8ff");
  return c;
 }

 // ── Attack frames ────────────────────────────────────────────
 // An attack pose is the idle sprite plus a few "strike" rects: the limb, claw or
 // weapon extended and the eyes flared. The lunge motion (render.js) does the
 // rest, so the pose only has to read as "this creature is swinging".
 function atkFrom(idle, rects){
  const c=mk(idle.width,idle.height), x=gx(c);
  x.drawImage(idle,0,0);
  (rects||[]).forEach(function(r){ R(x, r[0], r[1], r[2], r[3], r[4]); });
  return c;
 }

 // ── Assemble everything into Delve.SPR ─────────────────────
 function buildAll(){
  const shadow=buildShadow(), soldier=buildSoldier(), goblin=buildGoblin(), brute=buildBrute(), wraith=buildWraith(), rat=buildRat(), slime=buildSlime(), merchant=buildMerchant();
  const barkling=buildBarkling(), thornling=buildThornling(), treant=buildTreant(), vineStalker=buildVineStalker(), dryad=buildDryad(), sporeSwarm=buildSporeSwarm();
  const frostling=buildFrostling(), iceboundSwarm=buildIceboundSwarm(), shatterling=buildShatterling(), glacialStalker=buildGlacialStalker(), rimecaster=buildRimecaster(), frostbound=buildFrostbound();
  const goblinGold=tint(goblin,"#ffd75e"), bruteGold=tint(brute,"#ffd75e"), ratGold=tint(rat,"#ffd75e"), slimeGold=tint(slime,"#ffd75e"), wraithGold=tint(wraith,"#ffd75e");
  const barklingGold=tint(barkling,"#ffd75e"), thornlingGold=tint(thornling,"#ffd75e"), treantGold=tint(treant,"#ffd75e"), vineStalkerGold=tint(vineStalker,"#ffd75e"), dryadGold=tint(dryad,"#ffd75e"), sporeSwarmGold=tint(sporeSwarm,"#ffd75e");
  const frostlingGold=tint(frostling,"#ffd75e"), iceboundSwarmGold=tint(iceboundSwarm,"#ffd75e"), shatterlingGold=tint(shatterling,"#ffd75e"), glacialStalkerGold=tint(glacialStalker,"#ffd75e"), rimecasterGold=tint(rimecaster,"#ffd75e"), frostboundGold=tint(frostbound,"#ffd75e");

  // ── Attack poses (idle sprite + strike overdraw) ──
  const soldierAtk  = atkFrom(soldier,  [[18,3,3,9,"#8d9aa8"],[18,3,3,1,"#e8f0f8"],[17,12,3,3,"#e8c39a"],[10,6,1,2,"#eaffff"],[13,6,1,2,"#eaffff"]]);
  const goblinAtk   = atkFrom(goblin,   [[2,3,4,5,"#4e8039"],[2,2,4,1,"#8fd06e"],[18,9,4,3,"#4e8039"],[8,7,2,2,"#ffb0b0"],[14,7,2,2,"#ffb0b0"],[9,10,1,3,"#f5f0e8"],[14,10,1,3,"#f5f0e8"]]);
  const bruteAtk    = atkFrom(brute,    [[1,5,4,6,"#8a6a52"],[19,5,4,6,"#8a6a52"],[1,4,4,1,"#a8825f"],[19,4,4,1,"#a8825f"],[8,5,2,2,"#ffe08a"],[14,5,2,2,"#ffe08a"]]);
  const wraithAtk   = atkFrom(wraith,   [[1,7,3,2,"#5c4a80"],[20,7,3,2,"#5c4a80"],[0,7,1,1,"#c9f5ff"],[23,7,1,1,"#c9f5ff"],[10,6,2,2,"#c9f5ff"],[13,6,2,2,"#c9f5ff"]]);
  const ratAtk      = atkFrom(rat,      [[17,13,4,2,"#2a1a12"],[17,15,1,3,"#f5f0e8"],[20,15,1,3,"#f5f0e8"],[16,10,2,2,"#ffb0b0"],[20,10,2,2,"#ffb0b0"],[16,21,3,2,"#9b7b61"]]);
  const slimeAtk    = atkFrom(slime,    [[6,4,12,4,"#67d65f"],[11,17,4,2,"#2c4a20"],[11,14,1,1,"#eaffff"],[15,14,1,1,"#eaffff"]]);
  const barklingAtk = atkFrom(barkling, [[6,6,3,4,"#5a3a20"],[15,6,3,4,"#5a3a20"],[5,5,2,2,"#7a5a30"],[17,5,2,2,"#7a5a30"],[9,14,2,2,"#eaffa8"],[13,14,2,2,"#eaffa8"],[10,16,4,2,"#1c1008"]]);
  const thornlingAtk= atkFrom(thornling,[[2,13,5,1,"#c8d84a"],[17,13,5,1,"#c8d84a"],[1,12,2,2,"#eaffa8"],[21,12,2,2,"#eaffa8"],[9,2,1,6,"#c8d84a"],[14,2,1,6,"#c8d84a"],[9,10,2,2,"#ffaa5a"],[13,10,2,2,"#ffaa5a"]]);
  const treantAtk   = atkFrom(treant,   [[1,12,7,2,"#5a3a24"],[16,12,7,2,"#5a3a24"],[0,10,2,3,"#7a5a3a"],[22,10,2,3,"#7a5a3a"],[9,6,2,2,"#e0a8ff"],[13,6,2,2,"#e0a8ff"]]);
  const vineStalkerAtk=atkFrom(vineStalker,[[0,12,8,1,"#4a3058"],[16,12,8,1,"#4a3058"],[0,11,2,2,"#6a4a80"],[22,11,2,2,"#6a4a80"],[9,8,2,2,"#eaffa8"],[13,8,2,2,"#eaffa8"]]);
  const dryadAtk    = atkFrom(dryad,    [[0,12,3,4,"#5a4a28"],[21,12,3,4,"#5a4a28"],[0,11,2,2,"#7a6a3a"],[22,11,2,2,"#7a6a3a"],[9,6,2,2,"#e0a8ff"],[13,6,2,2,"#e0a8ff"]]);
  const sporeSwarmAtk=atkFrom(sporeSwarm,[[0,11,7,3,"#4a6a2a"],[17,11,7,3,"#4a6a2a"],[0,9,1,1,"#c8d84a"],[23,9,1,1,"#c8d84a"],[9,6,2,1,"#eaffa8"],[14,6,2,1,"#eaffa8"]]);
  const frostlingAtk= atkFrom(frostling,[[3,16,4,4,"#4d6a8a"],[17,16,4,4,"#4d6a8a"],[3,19,4,2,"#eaffff"],[17,19,4,2,"#eaffff"],[10,8,2,2,"#eaffff"],[13,8,2,2,"#eaffff"],[6,0,4,2,"#eaffff"],[14,0,4,2,"#eaffff"]]);
  const iceboundSwarmAtk=atkFrom(iceboundSwarm,[[1,11,7,6,"#3a4a5e"],[16,11,7,6,"#3a4a5e"],[0,12,2,3,"#a8e8ff"],[22,12,2,3,"#a8e8ff"],[8,2,3,7,"#6a86a8"],[13,1,3,8,"#6a86a8"],[10,12,2,2,"#eaffff"],[13,12,2,2,"#eaffff"]]);
  const shatterlingAtk=atkFrom(shatterling,[[10,10,5,5,"#a8e8ff"],[12,12,2,2,"#eaffff"],[10,5,1,14,"#7ec8e0"],[14,8,1,10,"#7ec8e0"],[3,8,2,2,"#eaffff"],[19,10,2,2,"#eaffff"],[4,17,2,2,"#eaffff"]]);
  const glacialStalkerAtk=atkFrom(glacialStalker,[[17,12,6,3,"#2a3644"],[21,17,3,1,"#eaffff"],[21,15,1,4,"#eaffff"],[5,12,2,1,"#eaffff"],[7,12,2,1,"#eaffff"]]);
  const rimecasterAtk=atkFrom(rimecaster,[[1,1,6,6,"#7ec8e0"],[2,2,4,4,"#eaffff"],[0,0,1,1,"#a8e8ff"],[7,0,1,1,"#a8e8ff"],[11,7,1,2,"#eaffff"],[13,7,1,2,"#eaffff"]]);
  const frostboundAtk=atkFrom(frostbound,[[0,9,5,12,"#4d6a8a"],[0,9,5,1,"#6a86a8"],[1,13,3,3,"#eaffff"],[10,5,1,2,"#eaffff"],[13,5,1,2,"#eaffff"]]);

  Delve.SPR = {
   shadow: shadow,
   soldier: { idle: soldier, hurt: tint(soldier,"#ff5c5c"), attack: soldierAtk },
   goblin: { idle: goblin, hurt: tint(goblin,"#ff5c5c"), elite: goblinGold, attack: goblinAtk },
   brute: { idle: brute, hurt: tint(brute,"#ff5c5c"), elite: bruteGold, attack: bruteAtk },
   wraith: { idle: wraith, hurt: tint(wraith,"#ff5c5c"), elite: wraithGold, attack: wraithAtk },
   rat: { idle: rat, hurt: tint(rat,"#ff5c5c"), elite: ratGold, attack: ratAtk },
   slime: { idle: slime, hurt: tint(slime,"#ff5c5c"), elite: slimeGold, attack: slimeAtk },
   barkling: { idle: barkling, hurt: tint(barkling,"#ff5c5c"), elite: barklingGold, attack: barklingAtk },
   thornling: { idle: thornling, hurt: tint(thornling,"#ff5c5c"), elite: thornlingGold, attack: thornlingAtk },
   treant: { idle: treant, hurt: tint(treant,"#ff5c5c"), elite: treantGold, attack: treantAtk },
   vine_stalker: { idle: vineStalker, hurt: tint(vineStalker,"#ff5c5c"), elite: vineStalkerGold, attack: vineStalkerAtk },
   dryad: { idle: dryad, hurt: tint(dryad,"#ff5c5c"), elite: dryadGold, attack: dryadAtk },
   spore_swarm: { idle: sporeSwarm, hurt: tint(sporeSwarm,"#ff5c5c"), elite: sporeSwarmGold, attack: sporeSwarmAtk },
   frostling: { idle: frostling, hurt: tint(frostling,"#ff5c5c"), elite: frostlingGold, attack: frostlingAtk },
   icebound_swarm: { idle: iceboundSwarm, hurt: tint(iceboundSwarm,"#ff5c5c"), elite: iceboundSwarmGold, attack: iceboundSwarmAtk },
   shatterling: { idle: shatterling, hurt: tint(shatterling,"#ff5c5c"), elite: shatterlingGold, attack: shatterlingAtk },
   glacial_stalker: { idle: glacialStalker, hurt: tint(glacialStalker,"#ff5c5c"), elite: glacialStalkerGold, attack: glacialStalkerAtk },
   rimecaster: { idle: rimecaster, hurt: tint(rimecaster,"#ff5c5c"), elite: rimecasterGold, attack: rimecasterAtk },
   frostbound: { idle: frostbound, hurt: tint(frostbound,"#ff5c5c"), elite: frostboundGold, attack: frostboundAtk },
   world: {
    goldPile: buildGoldPile(),
    itemPile: buildItemPile(),
    potionPile: buildPotionPile(),
    chestClosed: buildChest(false),
    chestOpen: buildChest(true),
    barrel: buildBarrel(),
    // Arena props (Batch 9). Every boss gets its OWN set: bespoke silhouettes in that
    // boss's own colours, rather than one shape recoloured three ways.
    // Which ward uses which is CONFIG.DRESSING (con-biomes.js); where they go is
    // levels.js dressBossArena; how they are drawn is render.js drawDecor.
    // The Warden — Upper Ruins: military, steel, pale-blue crest, red gaze.
    prop_pillarWarden: buildPropPillar(),
    prop_bannerWarden: buildBannerWarden(),
    prop_chainWarden: buildPropChain(),
    prop_rubbleWarden: buildPropRubble(),
    prop_bonesWarden: buildPropBones(),
    prop_statueWarden: buildStatueWarden(),
    // The Thorn Sovereign — Blackvein: petrified root, living canopy, acid-green glow.
    prop_pillarThorn: buildPillarThorn(),
    prop_bannerThorn: buildBannerThorn(),
    prop_rootThorn: buildPropRootHang(),
    prop_rubbleThorn: buildRubbleThorn(),
    prop_huskThorn: buildHuskThorn(),
    prop_clusterThorn: buildPropThorns(),
    // The Pale Tempest — Frosted Vault: everything sheathed in ice or frosted stiff.
    prop_pillarFrost: buildPillarIce(),
    prop_bannerFrost: buildBannerFrost(),
    prop_icicleFrost: buildPropIcicle(),
    prop_rubbleFrost: buildRubbleIce(),
    prop_bonesFrost: buildBonesIce(),
    prop_clusterFrost: buildPropCrystals(),
    shopkeeper: merchant
   }
  };

  // Boss sprites — one per registry entry (idle + hurt, plus an attack frame if
  // the boss registered one). Boss canvases are 24px per tile: a 2x2 boss = 48x48.
  for(const key in Delve._bossSpriteBuilders){
   const build = Delve._bossSpriteBuilders[key];
   const idle = build();
   const entry = { idle: idle, hurt: tint(idle, "#ff5c5c") };
   const atkBuild = Delve._bossAttackBuilders[key];
   if(atkBuild) entry.attack = atkBuild(idle);
   Delve.SPR[key] = entry;
  }

  // Backwards-compat: old levels.js may still set kind:"boss" before the
  // next patch. Alias so bosses don't render as pink placeholder circles.
  if(!Delve.SPR.boss && Delve.SPR.boss_warden) Delve.SPR.boss = Delve.SPR.boss_warden;
 }

 buildAll();
 Delve.rebuildSprites = buildAll;
})();
