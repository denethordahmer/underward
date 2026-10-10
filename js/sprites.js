window.Delve = window.Delve || {};
(function(){

 function mk(w,h){ const c=document.createElement("canvas"); c.width=w; c.height=h; return c; }
 function gx(c){ return c.getContext("2d"); }
 function R(x,cx,cy,w,h,col){ if(!col) return; x.fillStyle=col; x.fillRect(cx,cy,w,h); }
 function tint(base,col){
  const c=mk(base.width,base.height), x=gx(c);
  x.drawImage(base,0,0); x.globalAlpha=0.40; x.fillStyle=col; x.fillRect(0,0,base.width,base.height); x.globalAlpha=1; return c;
 }

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
 function buildBoss(){
  const c=mk(28,28),x=gx(c);
  R(x,2,7,6,6,"#343a43");R(x,19,7,6,6,"#343a43");R(x,3,7,4,2,"#4a525e");R(x,21,7,4,2,"#4a525e");R(x,2,12,2,1,"#4a525e");R(x,24,12,2,1,"#4a525e");
  R(x,10,2,8,3,"#2c313a");R(x,9,5,10,5,"#23262d");R(x,12,5,1,5,"#14161b");R(x,15,5,1,3,"#14161b");R(x,11,8,3,1,"#14161b");R(x,11,7,2,1,"#ff4a3d");R(x,15,7,2,1,"#ff4a3d");
  x.globalAlpha=0.6;R(x,11,7,2,1,"#ff6a5a");R(x,15,7,2,1,"#ff6a5a");x.globalAlpha=0.25;R(x,10,6,4,3,"#ff4a3d");R(x,14,6,4,3,"#ff4a3d");x.globalAlpha=1;
  R(x,8,11,12,10,"#1f2329");R(x,8,11,12,2,"#2c313a");R(x,8,11,2,10,"#2c313a");R(x,18,11,2,10,"#2c313a");R(x,13,14,2,4,"#14161b");R(x,12,15,4,1,"#343a43");R(x,5,13,3,7,"#23262d");R(x,20,13,3,7,"#23262d");
  R(x,6,20,1,1,"#5a616c");R(x,6,21,1,1,"#575d68");R(x,7,22,1,1,"#4d525c");R(x,7,23,1,1,"#575d68");R(x,6,24,1,1,"#4d525c");R(x,21,20,1,1,"#5a616c");R(x,21,21,1,1,"#575d68");R(x,20,22,1,1,"#4d525c");R(x,20,23,1,1,"#575d68");R(x,21,24,1,1,"#4d525c");
  R(x,10,21,3,6,"#171a20");R(x,16,21,3,6,"#171a20");R(x,10,26,3,1,"#2c313a");R(x,16,26,3,1,"#2c313a");
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

 function buildAll(){
  const shadow=buildShadow(), soldier=buildSoldier(), goblin=buildGoblin(), brute=buildBrute(), wraith=buildWraith(), boss=buildBoss(), rat=buildRat(), slime=buildSlime(), merchant=buildMerchant();
  const goblinGold=tint(goblin,"#ffd75e"), bruteGold=tint(brute,"#ffd75e"), ratGold=tint(rat,"#ffd75e"), slimeGold=tint(slime,"#ffd75e"), wraithGold=tint(wraith,"#ffd75e");
  Delve.SPR = {
   shadow: shadow,
   soldier: { idle: soldier, hurt: tint(soldier,"#ff5c5c") },
   goblin: { idle: goblin, hurt: tint(goblin,"#ff5c5c"), elite: goblinGold },
   brute: { idle: brute, hurt: tint(brute,"#ff5c5c"), elite: bruteGold },
   wraith: { idle: wraith, hurt: tint(wraith,"#ff5c5c"), elite: wraithGold },
   boss: { idle: boss, hurt: tint(boss,"#ff5c5c") },
   rat: { idle: rat, hurt: tint(rat,"#ff5c5c"), elite: ratGold },
   slime: { idle: slime, hurt: tint(slime,"#ff5c5c"), elite: slimeGold },
   world: {
    goldPile: buildGoldPile(),
    itemPile: buildItemPile(),
    potionPile: buildPotionPile(),
    chestClosed: buildChest(false),
    chestOpen: buildChest(true),
    barrel: buildBarrel(),
    shopkeeper: merchant
   }
  };
 }

 buildAll();
 Delve.rebuildSprites = buildAll;
})();
