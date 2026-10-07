window.Delve = window.Delve || {};
(function(){

  function mk(w,h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }
  function gx(c){ return c.getContext("2d"); }
  function R(x,cx,cy,w,h,col){
    if(!col) return;
    x.fillStyle = col;
    x.fillRect(cx, cy, w, h);
  }
  function tint(base,col){
    const c = mk(base.width, base.height);
    const x = gx(c);
    x.drawImage(base,0,0);
    x.globalAlpha = 0.40;
    x.fillStyle = col;
    x.fillRect(0,0,base.width,base.height);
    x.globalAlpha = 1;
    return c;
  }

  // ==================================================
  // CHARACTERS
  // ==================================================
  function buildShadow(){
    const c = mk(24,7), x = gx(c);
    x.globalAlpha = 0.35; x.fillStyle = "#000";
    R(x,8,0,8,1); R(x,6,1,12,1); R(x,4,2,16,1);
    R(x,3,3,18,1); R(x,2,4,20,1); R(x,2,5,20,1); R(x,2,6,20,1);
    x.globalAlpha = 1;
    return c;
  }

  function buildSoldier(){
    const c = mk(24,24), x = gx(c);
    // legs + boots
    R(x,8,17,3,4,"#4d3622"); R(x,13,17,3,4,"#4d3622");
    R(x,7,20,6,2,"#2b2118"); R(x,12,20,6,2,"#2b2118");
    // tunic
    R(x,6,10,12,9,"#33507a");
    R(x,6,10,2,9,"#233a5c"); R(x,16,10,2,9,"#233a5c");
    // belt
    R(x,6,15,12,2,"#8a5a33"); R(x,10,15,4,2,"#ffd75e");
    // shoulders
    R(x,3,9,5,3,"#56636f"); R(x,16,9,5,3,"#56636f");
    // arms + hands
    R(x,4,12,3,6,"#33507a"); R(x,17,12,3,6,"#33507a");
    R(x,4,18,3,2,"#e8c39a"); R(x,17,18,3,2,"#e8c39a");
    // helmet
    R(x,8,1,8,1,"#c3ccd6");
    R(x,7,2,10,7,"#8d9aa8");
    R(x,8,2,8,1,"#c3ccd6");
    R(x,8,6,8,2,"#1d232b");
    R(x,10,6,1,2,"#9fd8ff"); R(x,13,6,1,2,"#9fd8ff");
    R(x,9,9,6,1,"#56636f");
    // shield
    R(x,3,11,4,2,"#8d9aa8");
    R(x,2,13,6,2,"#8d9aa8");
    R(x,3,15,4,2,"#8d9aa8");
    R(x,4,13,2,2,"#ffd75e");
    return c;
  }

  function buildGoblin(){
    const c = mk(24,24), x = gx(c);
    R(x,9,20,2,3,"#4e8039"); R(x,13,20,2,3,"#4e8039");
    R(x,5,14,3,5,"#4e8039"); R(x,16,14,3,5,"#4e8039");
    R(x,8,14,8,7,"#5f8f45");
    R(x,9,2,6,1,"#6aa84f");
    R(x,7,3,10,11,"#6aa84f");
    R(x,2,7,4,4,"#4e8039"); R(x,18,7,4,4,"#4e8039");
    R(x,3,8,2,2,"#8fd06e"); R(x,19,8,2,2,"#8fd06e");
    R(x,8,7,2,2,"#ff5c5c"); R(x,14,7,2,2,"#ff5c5c");
    R(x,8,10,8,2,"#2c4a20");
    R(x,9,11,1,2,"#f5f0e8"); R(x,14,11,1,2,"#f5f0e8");
    return c;
  }

  function buildBrute(){
    const c = mk(24,24), x = gx(c);
    R(x,7,18,4,4,"#5d4334"); R(x,13,18,4,4,"#5d4334");
    R(x,1,15,3,3,"#5d4334"); R(x,20,15,3,3,"#5d4334");
    R(x,3,10,18,10,"#8a6a52");
    R(x,3,10,18,3,"#704f3c");
    R(x,3,15,18,2,"#4a3628");
    R(x,1,11,3,7,"#704f3c"); R(x,20,11,3,7,"#704f3c");
    R(x,7,3,10,8,"#6d513d");
    R(x,8,5,2,2,"#ffcf4a"); R(x,14,5,2,2,"#ffcf4a");
    R(x,7,7,10,2,"#4a3628");
    R(x,7,8,10,2,"#7a5a43");
    R(x,6,9,2,3,"#e8e0d0"); R(x,16,9,2,3,"#e8e0d0");
    return c;
  }

  function buildWraith(){
    const c = mk(24,24), x = gx(c);
    R(x,6,13,12,2,"#4a3b66");
    R(x,7,15,10,2,"#4a3b66");
    R(x,8,17,8,2,"#4a3b66");
    R(x,9,19,6,2,"#4a3b66");
    R(x,10,21,4,2,"#4a3b66");
    R(x,6,8,12,6,"#3a2d52");
    R(x,4,7,16,3,"#4a3b66");
    R(x,8,1,8,7,"#4a3b66");
    R(x,9,0,6,1,"#5c4a80");
    R(x,9,4,6,6,"#120e1e");
    R(x,10,6,2,2,"#7ee0ff"); R(x,13,6,2,2,"#7ee0ff");
    x.globalAlpha = 0.22;
    R(x,9,5,8,4,"#7ee0ff");
    x.globalAlpha = 1;
    return c;
  }

  function buildBoss(){
    const c = mk(28,28), x = gx(c);
    R(x,6,0,2,4,"#e8d9ff"); R(x,20,0,2,4,"#e8d9ff");
    R(x,4,0,3,1,"#e8d9ff"); R(x,21,0,3,1,"#e8d9ff");
    R(x,11,3,6,1,"#8a44d6");
    R(x,9,4,10,1,"#8a44d6");
    R(x,7,5,14,3,"#8a44d6");
    R(x,6,8,16,4,"#8a44d6");
    R(x,7,12,14,4,"#8a44d6");
    R(x,9,16,10,3,"#8a44d6");
    R(x,11,19,6,2,"#8a44d6");
    R(x,9,7,10,2,"#c98aff");
    R(x,7,16,14,3,"#6d2fb0");
    R(x,8,10,3,2,"#f5f0e8"); R(x,12,10,3,2,"#f5f0e8"); R(x,16,10,3,2,"#f5f0e8");
    R(x,9,11,1,1,"#1a0f26"); R(x,13,11,1,1,"#1a0f26"); R(x,17,11,1,1,"#1a0f26");
    R(x,10,15,8,2,"#4a1f7a");
    return c;
  }

  function buildRat(){
    const c = mk(24,24), x = gx(c);
    // tail
    R(x,2,12,4,1,"#7a5b45"); R(x,1,13,3,1,"#7a5b45");
    // body
    R(x,8,15,8,6,"#9b7b61");
    R(x,8,15,8,2,"#7a5b45");
    // head + ears
    R(x,12,7,8,8,"#9b7b61");
    R(x,12,7,8,2,"#7a5b45");
    R(x,11,3,3,3,"#7a5b45"); R(x,17,3,3,3,"#7a5b45");
    R(x,12,4,2,2,"#c99"); R(x,18,4,2,2,"#c99");
    // eyes + snout + teeth
    R(x,16,10,2,2,"#ff5c5c"); R(x,20,10,2,2,"#ff5c5c");
    R(x,18,13,3,2,"#5b4437");
    R(x,18,15,1,2,"#f5f0e8"); R(x,20,15,1,2,"#f5f0e8");
    // legs
    R(x,9,21,2,2,"#7a5b45"); R(x,13,21,2,2,"#7a5b45");
    return c;
  }

  function buildSlime(){
    const c = mk(24,24), x = gx(c);
    // body blob
    R(x,7,6,10,1,"#67d65f");
    R(x,5,7,14,1,"#67d65f");
    R(x,4,8,16,12,"#67d65f");
    R(x,5,20,14,3,"#67d65f");
    R(x,8,23,8,1,"#67d65f");
    // highlight + core
    R(x,8,10,3,6,"#b8f5a8");
    R(x,14,16,3,3,"#b8f5a8");
    R(x,11,14,2,2,"#2c4a20");
    R(x,15,14,2,2,"#2c4a20");
    return c;
  }

  // ==================================================
  // FLOOR ART / TREASURE
  // ==================================================
  function buildGoldPile(){
    const c = mk(24,24), x = gx(c);
    R(x,8,11,6,3,"#d9a11f");
    R(x,7,12,10,3,"#f0c14d");
    R(x,6,15,12,3,"#d9a11f");
    R(x,9,18,6,2,"#b8860b");
    // highlights
    R(x,9,12,2,1,"#fff2a8");
    R(x,14,14,1,2,"#fff2a8");
    R(x,12,16,2,1,"#fff2a8");
    return c;
  }

  function buildItemPile(){
    const c = mk(24,24), x = gx(c);
    // cloth wrapped bundle
    R(x,7,14,10,6,"#6d5b45");
    R(x,7,14,10,1,"#88725c");
    R(x,9,15,1,4,"#4f3f30");
    R(x,15,15,1,4,"#4f3f30");
    // glint
    R(x,12,17,2,2,"#9ad9ff");
    return c;
  }

  function buildPotionPile(){
    const c = mk(24,24), x = gx(c);
    // bottle
    R(x,10,13,4,7,"#b8e2f5");
    R(x,9,12,6,1,"#b8e2f5");
    R(x,10,8,1,4,"#8a5a33");
    R(x,13,8,1,4,"#8a5a33");
    // liquid
    R(x,11,15,2,4,"#ff5c5c");
    R(x,13,15,2,4,"#7ee0a0");
    // glow
    R(x,12,16,2,0,""); // no-op
    return c;
  }

  function buildChest(open){
    const c = mk(24,24), x = gx(c);
    if(!open){
      // lid closed
      R(x,5,13,14,2,"#8a5a33");
      R(x,4,15,16,6,"#6d3f22");
      R(x,5,15,15,1,"#a86735");
      R(x,7,18,10,2,"#5d3320");
      // lock
      R(x,11,15,2,4,"#ffd75e");
      R(x,12,16,1,1,"#000");
    } else {
      // lid flipped back
      R(x,5,9,14,2,"#8a5a33");
      R(x,4,11,16,5,"#6d3f22");
      R(x,5,11,15,1,"#a86735");
      // open mouth
      R(x,6,16,12,2,"#2a1a10");
      // contents sparkle
      R(x,9,14,2,2,"#ffd75e"); R(x,13,14,2,2,"#7ee0a0");
    }
    return c;
  }

  function buildAll(){
    const shadow = buildShadow();
    const soldier = buildSoldier();
    const goblin  = buildGoblin();
    const brute   = buildBrute();
    const wraith  = buildWraith();
    const boss    = buildBoss();
    const rat     = buildRat();
    const slime   = buildSlime();

    Delve.SPR = {
      shadow: shadow,
      soldier: { idle: soldier, hurt: tint(soldier,"#ff5c5c") },
      goblin:  { idle: goblin,  hurt: tint(goblin,"#ff5c5c") },
      brute:   { idle: brute,   hurt: tint(brute,"#ff5c5c") },
      wraith:  { idle: wraith,  hurt: tint(wraith,"#ff5c5c") },
      boss:    { idle: boss,    hurt: tint(boss,"#ff5c5c") },
      rat:     { idle: rat,     hurt: tint(rat,"#ff5c5c") },
      slime:   { idle: slime,   hurt: tint(slime,"#ff5c5c") },

      world: {
        goldPile: buildGoldPile(),
        itemPile: buildItemPile(),
        potionPile: buildPotionPile(),
        chestClosed: buildChest(false),
        chestOpen: buildChest(true)
      }
    };
  }

  buildAll();
  Delve.rebuildSprites = buildAll;
})();
