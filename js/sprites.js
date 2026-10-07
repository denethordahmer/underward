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

  function buildShadow(){
    const c = mk(24,7), x = gx(c);
    x.globalAlpha = 0.35;
    x.fillStyle = "#000000";
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

    // body tunic + shading
    R(x,6,10,12,9,"#33507a");
    R(x,6,10,2,9,"#233a5c"); R(x,16,10,2,9,"#233a5c");

    // belt + buckle
    R(x,6,15,12,2,"#8a5a33");
    R(x,10,15,4,2,"#ffd75e");

    // shoulder pads
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

    // shield on left arm
    R(x,3,11,4,2,"#8d9aa8");
    R(x,2,13,6,2,"#8d9aa8");
    R(x,3,15,4,2,"#8d9aa8");
    R(x,4,13,2,2,"#ffd75e");

    return c;
  }

  function buildGoblin(){
    const c = mk(24,24), x = gx(c);

    // feet + arms
    R(x,9,20,2,3,"#4e8039"); R(x,13,20,2,3,"#4e8039");
    R(x,5,14,3,5,"#4e8039"); R(x,16,14,3,5,"#4e8039");

    // body
    R(x,8,14,8,7,"#5f8f45");

    // big head + ears
    R(x,9,2,6,1,"#6aa84f");
    R(x,7,3,10,11,"#6aa84f");
    R(x,2,7,4,4,"#4e8039"); R(x,18,7,4,4,"#4e8039");
    R(x,3,8,2,2,"#8fd06e"); R(x,19,8,2,2,"#8fd06e");

    // eyes + mouth + teeth
    R(x,8,7,2,2,"#ff5c5c"); R(x,14,7,2,2,"#ff5c5c");
    R(x,8,10,8,2,"#2c4a20");
    R(x,9,11,1,2,"#f5f0e8"); R(x,14,11,1,2,"#f5f0e8");

    return c;
  }

  function buildBrute(){
    const c = mk(24,24), x = gx(c);

    // legs + fists
    R(x,7,18,4,4,"#5d4334"); R(x,13,18,4,4,"#5d4334");
    R(x,1,15,3,3,"#5d4334"); R(x,20,15,3,3,"#5d4334");

    // wide torso
    R(x,3,10,18,10,"#8a6a52");
    R(x,3,10,18,3,"#704f3c");
    R(x,3,15,18,2,"#4a3628");

    // arms
    R(x,1,11,3,7,"#704f3c"); R(x,20,11,3,7,"#704f3c");

    // head, brow, eyes, tusks
    R(x,7,3,10,8,"#6d513d");
    R(x,8,5,2,2,"#ffcf4a"); R(x,14,5,2,2,"#ffcf4a");
    R(x,7,7,10,2,"#4a3628");
    R(x,7,8,10,2,"#7a5a43");
    R(x,6,9,2,3,"#e8e0d0"); R(x,16,9,2,3,"#e8e0d0");

    return c;
  }

  function buildWraith(){
    const c = mk(24,24), x = gx(c);

    // tattered robe, tapering
    R(x,6,13,12,2,"#4a3b66");
    R(x,7,15,10,2,"#4a3b66");
    R(x,8,17,8,2,"#4a3b66");
    R(x,9,19,6,2,"#4a3b66");
    R(x,10,21,4,2,"#4a3b66");

    // shoulders + body
    R(x,6,8,12,6,"#3a2d52");
    R(x,4,7,16,3,"#4a3b66");

    // hood + void + glowing eyes
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

    // horns top
    R(x,6,0,2,4,"#e8d9ff"); R(x,20,0,2,4,"#e8d9ff");
    R(x,4,0,3,1,"#e8d9ff"); R(x,21,0,3,1,"#e8d9ff");

    // sphere body
    R(x,11,3,6,1,"#8a44d6");
    R(x,9,4,10,1,"#8a44d6");
    R(x,7,5,14,3,"#8a44d6");
    R(x,6,8,16,4,"#8a44d6");
    R(x,7,12,14,4,"#8a44d6");
    R(x,9,16,10,3,"#8a44d6");
    R(x,11,19,6,2,"#8a44d6");

    // highlight + shade
    R(x,9,7,10,2,"#c98aff");
    R(x,7,16,14,3,"#6d2fb0");

    // three eyes
    R(x,8,10,3,2,"#f5f0e8"); R(x,12,10,3,2,"#f5f0e8"); R(x,16,10,3,2,"#f5f0e8");
    R(x,9,11,1,1,"#1a0f26"); R(x,13,11,1,1,"#1a0f26"); R(x,17,11,1,1,"#1a0f26");

    // mouth
    R(x,10,15,8,2,"#4a1f7a");

    return c;
  }

  function buildAll(){
    const shadow = buildShadow();
    const soldier = buildSoldier();
    const goblin  = buildGoblin();
    const brute   = buildBrute();
    const wraith  = buildWraith();
    const boss    = buildBoss();

    Delve.SPR = {
      shadow: shadow,
      soldier: { idle: soldier, hurt: tint(soldier,"#ff5c5c") },
      goblin:  { idle: goblin,  hurt: tint(goblin,"#ff5c5c") },
      brute:   { idle: brute,   hurt: tint(brute,"#ff5c5c") },
      wraith:  { idle: wraith,  hurt: tint(wraith,"#ff5c5c") },
      boss:    { idle: boss,    hurt: tint(boss,"#ff5c5c") }
    };
  }

  buildAll();
  Delve.rebuildSprites = buildAll;
})();
