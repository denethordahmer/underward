window.Delve = window.Delve || {};
(function(){

  const MAX = 80;          // max entries kept
  const FADE_AFTER = 5000; // ms before entry starts fading
  const FADE_DUR   = 3000; // ms to fade out

  let entries = []; // {html, born, id}
  let uid = 0;
  let el = null;    // the log container div, set on init

  function getEl(){
    if(!el) el = document.getElementById("combatLog");
    return el;
  }

  // Colour helpers
  const C = {
    player : "#7ee0ff",
    enemy  : "#ff9a9a",
    crit   : "#ff9d3d",
    heal   : "#7ee08a",
    dodge  : "#c2ff4d",
    gold   : "#ffd75e",
    shard  : "#7ee0ff",
    item   : "#c98aff",
    system : "#a9bccd",
    boss   : "#c98aff",
    death  : "#ff5c5c",
    xp     : "#b4e8ff",
    floor  : "#2ad0b0",
  };
  function span(txt, col){ return `<span style="color:${col}">${txt}</span>`; }

  // ── Public API ──────────────────────────────────────────────
  Delve.log = function(html){
    const div = getEl();
    if(!div) return;

    if(entries.length >= MAX) entries.shift();
    const id = "le" + (uid++);
    entries.push({ id, born: Date.now() });

    const row = document.createElement("div");
    row.id = id;
    row.className = "log-row";
    row.innerHTML = html;
    div.appendChild(row);

    // Auto-scroll
    requestAnimationFrame(function(){
      div.scrollTop = div.scrollHeight;
    });
  };

  // Pre-built log helpers called from game code
  Delve.logPlayerAtk = function(mName, dmg, crit){
    if(crit)
      Delve.log(span("You", C.player) + " " + span("CRIT", C.crit) + " " + span(mName, C.enemy) + " for " + span(dmg, C.crit) + " dmg");
    else
      Delve.log(span("You", C.player) + " hit " + span(mName, C.enemy) + " for " + span(dmg, C.player) + " dmg");
  };

  Delve.logEnemyAtk = function(mName, dmg){
    Delve.log(span(mName, C.enemy) + " hit " + span("you", C.player) + " for " + span(dmg, C.death) + " dmg");
  };

  Delve.logDodge = function(mName){
    Delve.log(span("You", C.player) + " " + span("dodged", C.dodge) + " " + span(mName, C.enemy) + "'s attack");
  };

  Delve.logKill = function(mName, gold, shards, isBoss){
    const tag = isBoss ? span("☠ BOSS SLAIN", C.boss) : span("☠", C.enemy);
    Delve.log(tag + " " + span(mName, C.enemy) + " defeated · " +
      span("+" + gold + "g", C.gold) + " " + span("+" + shards + "◇", C.shard));
  };

  Delve.logPickup = function(itemName, tier){
    const col = (Delve.TIERS && Delve.TIERS.colors && Delve.TIERS.colors[tier]) || C.item;
    Delve.log("📦 Picked up " + span(itemName, col));
  };

  Delve.logEquip = function(itemName, slot){
    const slots = {weapon:"⚔", armour:"🛡", trinket:"◆"};
    Delve.log((slots[slot]||"◆") + " Equipped " + span(itemName, C.item));
  };

  Delve.logConsumable = function(itemName, effect){
    Delve.log("🧪 Used " + span(itemName, C.item) + (effect ? " · " + effect : ""));
  };

  Delve.logHeal = function(amount, source){
    Delve.log(span("+" + amount + " HP", C.heal) + (source ? " from " + span(source, C.item) : ""));
  };

  Delve.logSecondWind = function(amount){
    Delve.log(span("⚡ Second Wind!", C.heal) + " +" + span(amount + " HP", C.heal));
  };

  Delve.logXP = function(amount, level){
    if(level) Delve.log(span("★ LEVEL UP!", C.xp) + " Now level " + span(level, C.xp));
    else Delve.log(span("+" + amount + " XP", C.xp));
  };

  Delve.logFloor = function(n){
    Delve.log(span("▼ Descended to floor " + n, C.floor));
  };

  Delve.logDeath = function(){
    Delve.log(span("💀 You have died.", C.death));
  };

  Delve.logSystem = function(msg){
    Delve.log(span(msg, C.system));
  };

  Delve.clearLog = function(){
    entries = [];
    const div = getEl();
    if(div) div.innerHTML = "";
  };

  // ── Fade loop ───────────────────────────────────────────────
  (function fadeLoop(){
    const now = Date.now();
    for(const e of entries){
      const age = now - e.born;
      if(age < FADE_AFTER) continue;
      const t = Math.min(1, (age - FADE_AFTER) / FADE_DUR);
      const row = document.getElementById(e.id);
      if(row) row.style.opacity = String(1 - t * 0.75); // fade to 25% not 0 — still readable
    }
    requestAnimationFrame(fadeLoop);
  })();

})();
