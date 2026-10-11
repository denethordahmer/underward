window.Delve = window.Delve || {};
(function(){

 // ── debug.js ─────────────────────────────────────────────────
 // Owns: the ?debug=1 developer panel — floor jump, gold/shards, status
 //       effects, elite, XP, shop, victory, death, re-render, dump stats,
 //       reset save. Extracted out of ui.js: it is dev tooling, not game UI,
 //       and it only ever runs behind ?debug=1.
 // Loads AFTER ui.js so it can reuse the same guarded-$ convention.
 // Never owns game logic — every button calls into the normal game API.

 // Safe element lookup, same contract as ui.js's $: a missing id yields an
 // inert stand-in and is recorded in Delve.missingEls rather than throwing.
 const _warned = {};
 function nullEl(id){
  const noop = function(){};
  return {
   id: id, style: {}, dataset: {}, children: [],
   textContent: "", innerHTML: "", value: "", disabled: false,
   classList: { add: noop, remove: noop, toggle: noop, contains: function(){ return false; } },
   addEventListener: noop, appendChild: noop, removeChild: noop,
   querySelector: function(){ return nullEl(id + ">?"); },
   getContext: function(){ return null; }
  };
 }
 const $ = function(id){
  const el = document.getElementById(id);
  if(el) return el;
  if(!_warned[id]){
   _warned[id] = 1;
   (Delve.missingEls = Delve.missingEls || []).push(id);
   try { console.warn("debug.js: missing element #" + id); } catch(_e){}
  }
  return nullEl(id);
 };

 // ── DEBUG PANEL ──────────────────────────────────────────────
  function applyDebugEffect(id){
  return function(){
   const G = Delve.G; if(!G) return;
   let t = null;
   if(G.boss && Delve.mdist(G.boss.x,G.boss.y,G.px,G.py)<=1) t = G.boss;
   else t = G.monsters.find(function(m){ return Delve.mdist(m.x,m.y,G.px,G.py)<=1; }) || G.monsters[0];
   if(t && Delve.applyEffect){ Delve.applyEffect(t, id); if(Delve.flash) Delve.flash(id + " applied"); }
   else if(Delve.flash) Delve.flash("No target");
   Delve.updateHUD(); Delve.draw();
  };
 }

 Delve.initDebug = function(){
  const p = $("debugPanel"); if(!p) return;
  p.style.display = "flex";
  const need = function(){ return Delve.G && !Delve.G.runEnded; };

  (function fillFloorSelect(){
   const sel = $("dbgFloor"); if(!sel) return;
   sel.innerHTML = "";
   (Delve.CONFIG.WARDS || []).forEach(function(w){
    const lo = w.floors[0], hi = w.floors[1];
    for(let f = lo; f <= hi; f++){
     const o = document.createElement("option");
     o.value = f;
     let label = "Floor " + f;
     if(f % 10 === 0) label += " (boss — " + w.name + ")";
     else if(Delve.isShopFloor && Delve.isShopFloor(f)) label += " (shop)";
     if(f >= 11 && f <= 19) label += " (swarm/cluster pool)";
     o.textContent = label;
     sel.appendChild(o);
    }
   });
   sel.value = (Delve.G && Delve.G.floor) || 1;
  })();

  $("dbgGo").addEventListener("click", function(){
   if(!need()) return;
   Delve.G.floor = parseInt($("dbgFloor").value,10);
   Delve.genFloor(); Delve.updateHUD(); Delve.draw();
   Delve.showFloorCard(Delve.G.floor);
  });

  $("dbgGold").addEventListener("click", function(){ if(!need()) return; Delve.G.gold += 25; Delve.updateHUD(); });
  $("dbgShards").addEventListener("click", function(){ Delve.save.shards += 5; Delve.persist(); Delve.updateHUD(); });
  $("dbgHeal").addEventListener("click", function(){ if(!need()) return; Delve.G.hp = Delve.maxHp(); Delve.updateHUD(); });
  $("dbgLowHp").addEventListener("click", function(){ if(!need()) return; Delve.G.hp = 5; Delve.updateHUD(); });

  $("dbgPoison").addEventListener("click", applyDebugEffect("poison"));
  $("dbgBleed").addEventListener("click", applyDebugEffect("bleed"));
  $("dbgBurn").addEventListener("click", applyDebugEffect("burn"));
  $("dbgWeaken").addEventListener("click", function(){ if(!need()) return; if(Delve.applyPlayerEffect) Delve.applyPlayerEffect("weaken"); if(Delve.flash) Delve.flash("Weaken applied (you)"); });

  $("dbgElite").addEventListener("click", function(){
   if(!need()) return;
   const m = Delve.G.monsters.find(function(x){ return !x.elite; });
   if(m){ Delve.makeElite(m); Delve.draw(); if(Delve.flash) Delve.flash("Elite created"); }
   else if(Delve.flash) Delve.flash("No monster to promote");
  });

  $("dbgXP").addEventListener("click", function(){ if(!need()) return; Delve.addXP(20); });
  $("dbgShop").addEventListener("click", function(){ if(!need()) return; Delve.openShop(); });
  $("dbgVictory").addEventListener("click", function(){
   if(!need()) return;
   Delve.triggerVictory(Math.ceil(Delve.G.floor / 10));
  });
  $("dbgDeath").addEventListener("click", function(){ if(!need()) return; Delve.die(); });

  $("dbgRender").addEventListener("click", function(){
   if(!Delve.G) return;
   Delve.genFloor(); Delve.updateHUD(); Delve.draw();
   Delve.showFloorCard(Delve.G.floor);
  });
  $("dbgDump").addEventListener("click", function(){
   console.log("RUN STATS", Delve.G && Delve.G.runStats);
   console.log("SAVE", Delve.save);
   if(Delve.flash) Delve.flash("Dumped to console");
  });
  $("dbgReset").addEventListener("click", function(){
   Object.keys(localStorage).forEach(function(k){ if(/underward|delve/i.test(k)) localStorage.removeItem(k); });
   location.reload();
  });
 };
})();
