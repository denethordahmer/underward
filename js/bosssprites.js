window.Delve = window.Delve || {};
(function(){
 const U = Delve._spriteUtils;
 if(!U) return; // sprites.js must load first
 const mk = U.mk, gx = U.gx, R = U.R;

 // ═══════════════════════════════════════════════════════════
 // ONE BUILDER PER BOSS. Add new ones below; sprites.js never
 // needs editing again. BOSS_DEFS[n].sprite names the key.
 // ═══════════════════════════════════════════════════════════

 function buildBossWarden(){
  const c=mk(28,28),x=gx(c);
  R(x,2,7,6,6,"#343a43");R(x,19,7,6,6,"#343a43");R(x,3,7,4,2,"#4a525e");R(x,21,7,4,2,"#4a525e");R(x,2,12,2,1,"#4a525e");R(x,24,12,2,1,"#4a525e");
  R(x,10,2,8,3,"#2c313a");R(x,9,5,10,5,"#23262d");R(x,12,5,1,5,"#14161b");R(x,15,5,1,3,"#14161b");R(x,11,8,3,1,"#14161b");R(x,11,7,2,1,"#ff4a3d");R(x,15,7,2,1,"#ff4a3d");
  x.globalAlpha=0.6;R(x,11,7,2,1,"#ff6a5a");R(x,15,7,2,1,"#ff6a5a");x.globalAlpha=0.25;R(x,10,6,4,3,"#ff4a3d");R(x,14,6,4,3,"#ff4a3d");x.globalAlpha=1;
  R(x,8,11,12,10,"#1f2329");R(x,8,11,12,2,"#2c313a");R(x,8,11,2,10,"#2c313a");R(x,18,11,2,10,"#2c313a");R(x,13,14,2,4,"#14161b");R(x,12,15,4,1,"#343a43");R(x,5,13,3,7,"#23262d");R(x,20,13,3,7,"#23262d");
  R(x,6,20,1,1,"#5a616c");R(x,6,21,1,1,"#575d68");R(x,7,22,1,1,"#4d525c");R(x,7,23,1,1,"#575d68");R(x,6,24,1,1,"#4d525c");R(x,21,20,1,1,"#5a616c");R(x,21,21,1,1,"#575d68");R(x,20,22,1,1,"#4d525c");R(x,20,23,1,1,"#575d68");R(x,21,24,1,1,"#4d525c");
  R(x,10,21,3,6,"#171a20");R(x,16,21,3,6,"#171a20");R(x,10,26,3,1,"#2c313a");R(x,16,26,3,1,"#2c313a");
  return c;
 }

 function buildBossThorn(){
  const c=mk(28,28),x=gx(c);
  // root legs
  R(x,4,24,6,2,"#2a1a0e");
  R(x,18,24,6,2,"#2a1a0e");
  R(x,8,26,12,1,"#1a0e08");
  R(x,2,25,3,2,"#2a1a0e");
  R(x,23,25,3,2,"#2a1a0e");
  // trunk
  R(x,10,9,8,16,"#3a2418");
  R(x,10,9,2,16,"#5a3a24");
  R(x,16,9,2,16,"#20140a");
  // bark grooves
  R(x,12,12,1,12,"#20140a");
  R(x,14,11,1,13,"#20140a");
  R(x,13,17,1,7,"#20140a");
  // chest knot
  R(x,11,19,6,2,"#2a1a0e");
  R(x,13,19,2,2,"#1a0e08");
  // hollow eye cavity
  R(x,9,4,10,7,"#0a0604");
  R(x,9,4,10,1,"#1a0e08");
  // glowing eyes
  R(x,11,6,2,3,"#a8e84a");
  R(x,15,6,2,3,"#a8e84a");
  R(x,11,7,1,1,"#eaffa8");
  R(x,15,7,1,1,"#eaffa8");
  // eye bloom
  x.globalAlpha=0.35;
  R(x,10,5,4,5,"#a8e84a");
  R(x,14,5,4,5,"#a8e84a");
  x.globalAlpha=1;
  // bark-crack mouth
  R(x,13,9,2,1,"#a8e84a");
  // left branch-arm
  R(x,2,14,8,2,"#3a2418");
  R(x,1,10,2,6,"#2a1a0e");
  R(x,0,8,2,3,"#20140a");
  R(x,5,12,3,1,"#c8d84a");
  R(x,3,16,3,1,"#1a0e08");
  // right branch-arm
  R(x,18,14,8,2,"#3a2418");
  R(x,25,10,2,6,"#2a1a0e");
  R(x,26,8,2,3,"#20140a");
  R(x,20,12,3,1,"#c8d84a");
  R(x,22,16,3,1,"#1a0e08");
  // crown
  R(x,10,0,8,4,"#2a1a0e");
  R(x,10,0,8,1,"#3a2418");
  R(x,12,0,4,2,"#1a0e08");
  R(x,9,2,1,3,"#2a1a0e");
  R(x,18,2,1,3,"#2a1a0e");
  return c;
 }

 // ── Registery every builder under the key named in BOSS_DEFS ──
 Delve.registerBossSprite("boss_warden", buildBossWarden);
 Delve.registerBossSprite("boss_thorn",  buildBossThorn);

 // sprites.js already ran buildAll() once without these; rebuild now.
 Delve.rebuildSprites();
})();
