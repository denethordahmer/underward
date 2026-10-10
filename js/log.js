window.Delve = window.Delve || {};
(function(){

 let entries = [];
 const MAX = 100;

 function buildRow(txt, cls){
  const d = document.createElement("div");
  d.className = "log-row " + (cls || "");
  d.textContent = txt;
  return d;
 }

 function appendToStrip(txt, cls){
  const logEl = document.getElementById("combatLog");
  if(!logEl) return;
  const row = buildRow(txt, cls);
  logEl.appendChild(row);
  while(logEl.children.length > MAX) logEl.removeChild(logEl.firstChild);
  entries.push({ txt, cls });
  if(entries.length > MAX) entries.shift();
 }

 // ── Public logging API ────────────────────────────────────────
 Delve.log = function(txt, cls){ appendToStrip(txt, cls); };
 Delve.clearLog = function(){
  entries = [];
  const el = document.getElementById("combatLog");
  if(el) el.innerHTML = "";
 };
 Delve.flushLogWindow = function(){
  const w = document.getElementById("logWindowContent");
  if(!w) return;
  w.innerHTML = "";
  entries.forEach(e => w.appendChild(buildRow(e.txt, e.cls)));
  w.scrollTop = w.scrollHeight;
 };

 // ── Game event shorthands ────────────────────────────────────
 Delve.logSystem     = function(msg){ appendToStrip(msg, ""); };
 Delve.logKill        = function(name, gold, shards, isBoss){
  const kind = isBoss ? "BOSS DEFEATED" : "slain";
  appendToStrip((isBoss ? "💀 " : "⚔ ") + name + " " + kind + (gold ? " (+"+gold+"g" : "") + (shards ? ", +"+shards+"◇" : ""), isBoss ? "boss" : "");
 };
 Delve.logPlayerAtk  = function(name, dmg, crit){
  appendToStrip("You " + (crit ? "CRIT " : "hit ") + name + " for " + dmg, crit ? "crit" : "");
 };
 Delve.logEnemyAtk   = function(name, dmg){
  appendToStrip(name + " hits you for " + dmg, "enemy");
 };
 Delve.logDodge      = function(name){ appendToStrip("You dodge " + name + "!", "good"); };
 Delve.logHeal       = function(heal, source){ appendToStrip(source + " heals +" + heal + " HP", "good"); };
 Delve.logSecondWind = function(heal){ appendToStrip("Second Wind! +" + heal + " HP", "good"); };
 Delve.logPickup     = function(name, tier){ appendToStrip("Picked up " + name + " (T" + tier + ")", "good"); };
 Delve.logEquip      = function(name, slot){ appendToStrip("Equipped " + name + " (" + slot + ")", ""); };
 Delve.logConsumable = function(name, msg){ appendToStrip("Used " + name + " — " + msg, ""); };
 Delve.logTrait      = function(name, id){ appendToStrip("Learned trait: " + name, "good"); };
 Delve.logFloor      = function(floor){ appendToStrip("── Descended to Floor " + floor + " ──", "floor"); };
 Delve.logDeath      = function(){ appendToStrip("☠ You have died.", "death"); };

})();
