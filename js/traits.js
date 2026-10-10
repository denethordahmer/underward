window.Delve = window.Delve || {};
(function(){

 // ── Chosen traits live in G.traits as an ARRAY of objects ───
 // Legacy code treated it as a map; delved now uses helpers.

 Delve.traits = function(){
  const G = Delve.G;
  if(!G.traits) G.traits = [];
  return G.traits;
 };

 // ── Sum all passive trait effects into stat modifiers ────────
 Delve.traitBuffs = function(){
  const b = {
   atk:0, maxHp:0, dodge:0, luck:0, goldMult:0, crit:0,
   bossAtk:0, flatRed:0, healPerFloor:0, healOnKill:0,
   dropBonus:0, speedBonus:0, extraEnergyPerKill:0, agi:0, tou:0,
   vampiric:false, unbroken:false, secondWindHealOverride:0
  };
  const traits = Delve.traits();
  traits.forEach(t => {
   const ef = t.effects || {};
   for(const k in ef){
    if(k in b){
     if(typeof b[k] === "boolean") b[k] = true;
     else b[k] += ef[k];
    }
   }
  });
  return b;
 };

 // ── Individual trait-state checks used by combat ─────────────
 Delve.hasUnbroken = function(){ return Delve.traitBuffs().unbroken; };
 Delve.secondWindHealOverride = function(){ return Delve.traitBuffs().secondWindHealOverride; };

 // ── Add XP, trigger level-up when threshold crossed ──────────
 Delve.addXP = function(amount){
  const G = Delve.G;
  G.xp = (G.xp||0) + amount;
  const curve = Delve.CONFIG.XP_CURVE;
  const need = curve[Math.min(G.level-1, curve.length-1)];
  if(G.xp >= need && G.abilities.length < 3){
   G.xp -= need;
   Delve.triggerLevelUp();
  }
 };

 // ── Level-up screen ──────────────────────────────────────────
 Delve.triggerLevelUp = function(){
  const G = Delve.G;
  if(G.runEnded) return;
  const choices = pickChoices();
  if(!choices.length) return;
  G.pendingChoices = choices;
  if(Delve.showLevelUp) Delve.showLevelUp(choices);
 };

 function pickChoices(){
  const cfg = Delve.CONFIG.TRAITS;
  const all = (cfg.passives||[]).concat((cfg.uniques||[]).map(u => Object.assign({}, u, {once:true})));
  const chosen = Delve.traits().map(t => t.id);
  const unseen = all.filter(t => !chosen.includes(t.id));
  const pool = unseen.length ? unseen : cfg.passives;
  return shuffle(pool).slice(0, 3);
 }
 function shuffle(a){
  const arr = a.slice();
  for(let i=arr.length-1;i>0;i--){
   const j = Math.floor(Math.random()*(i+1));
   [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
 }

 // ── Choose a trait from the level-up screen ──────────────────
 Delve.chooseTrait = function(id){
  const cfg = Delve.CONFIG.TRAITS;
  const all = (cfg.passives||[]).concat((cfg.uniques||[]));
  const t = all.find(x => x.id === id);
  if(!t) return;
  const traits = Delve.traits();
  traits.push(Object.assign({}, t));
  G = Delve.G;
  G.level = (G.level||1) + 1;
  Delve.flash("Learned: " + t.name);
  if(Delve.logTrait) Delve.logTrait(t.name, t.id);
  Delve.updateHUD();
  Delve.draw();
 };

})();
