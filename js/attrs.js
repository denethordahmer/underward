window.Delve = window.Delve || {};
(function(){
 const C = () => Delve.CONFIG;
 const bought = id => (Delve.save && Delve.save.lvls && Delve.save.lvls[id]) || 0;
 const tb = () => (Delve.traitBuffs ? Delve.traitBuffs() : {});
 const ib = () => (Delve.G && Delve.G.equip && Delve.itemBuffs) ? Delve.itemBuffs() : { atk:0,red:0,hp:0,luck:0,dropBonus:0,goldBonus:0,shardBonus:0,bossAtk:0,speedBonus:0,healOnKill:0,crit:0,dodge:0 };
 const n = v => v || 0;

 // ── HP ─────────────────────────────────────────────────────────
 Delve.baseMaxHp = function(){ const a = C().ATTRS.con; return a.base + a.perLevel * bought("con"); };
 Delve.maxHp = function(){
  return Math.max(1, Math.round(Delve.baseMaxHp() + n(ib().hp) + n(tb().maxHp)));
 };

 // ── Attack ─────────────────────────────────────────────────────
 Delve.baseAtk = function(){ const a = C().ATTRS.str; return a.base + a.perLevel * bought("str"); };
 Delve.atk = function(){
  let a = Delve.baseAtk();
  if(Delve.G) a += n(Delve.G.atkBuff);
  a += n(ib().atk) + n(tb().atk);
  return Math.max(1, Math.round(a));
 };

 // ── Luck / Agility / Toughness ─────────────────────────────────
 Delve.baseLuck = function(){ return C().ATTRS.luc.base + bought("luc"); };
 Delve.luckPts = function(){ 
  let v = Delve.baseLuck() + n(ib().luck) + n(tb().luck);
  if(Delve.G) v += n(Delve.G.luckBuff);
  return v;
 };
 Delve.agiPts = function(){ return C().ATTRS.agi.base + bought("agi") + n(tb().agi); };
 Delve.touPts = function(){ return C().ATTRS.tou.base + bought("tou") + n(tb().tou); };

 // ── Damage reduction (TOU % + flat from items + temp buff) ────
 Delve.dmgRed = function(){
  const a = C().ATTRS.tou;
  return Math.min(a.cap || 0.50, Delve.touPts() * a.perLevel);
 };
 Delve.flatRed = function(){
  let r = n(ib().red) + n(tb().flatRed);
  if(Delve.G) r += n(Delve.G.redBuff);
  return Math.round(r);
 };

 // ── Dodge / Crit (add item + trait bonuses) ───────────────────
 Delve.dodge = function(){
  const s = C().secondaries;
  const itemDodge = n(ib().dodge) + n(ib().weightDodge);
  return Math.min(0.60, Math.min(s.dodgeCap, Delve.agiPts() * s.dodgePerAgi) + itemDodge + n(tb().dodge));
 };
 Delve.crit = function(){
  const s = C().secondaries;
  return Math.min(0.80, Math.min(s.critCap, Delve.luckPts() * s.critPerLuck) + n(ib().crit) + n(tb().crit));
 };

 // ── Unlocks ────────────────────────────────────────────────────
 Delve.hasSecondWind = function(){ return bought("con") >= C().secondaries.secondWindUnlock; };
 Delve.hasOverkill   = function(){ return bought("str") >= C().secondaries.overkillUnlock; };
 Delve.hasBulwark    = function(){ return Delve.touPts() >= C().secondaries.bulwarkTotal; };
 Delve.firstStrikeBonus = function(){
  const s = C().secondaries;
  if(bought("agi") < s.firstStrikeUnlock) return 0;
  return Math.floor(Delve.agiPts() / s.firstStrikeDiv);
 };
 Delve.hitCap = function(){ return Math.floor(Delve.maxHp() * C().secondaries.bulwarkHitCap); };

 // ── Economy multipliers ────────────────────────────────────────
 Delve.goldMult = function(){
  const eco = C().economy || {};
  return 1 + Delve.luckPts() * (eco.goldLuckMult || 0.05) + n(ib().goldBonus) + n(tb().goldMult);
 };
 Delve.dropChance = function(){
  const L = C().loot;
  return Math.min(L.dropCap, L.baseDrop + Delve.luckPts() * L.luckDrop) + n(ib().dropBonus) + n(tb().dropBonus);
 };
 Delve.bossBonus = function(){ return n(ib().bossAtk) + n(tb().bossAtk); };
 Delve.traitHealPerFloor = function(){ return n(tb().healPerFloor); };

 // ── Skill: Luck discount for merchant ─────────────────────────
 Delve.luckDiscount = function(){
  const e = C().economy || {};
  return Math.min(e.maxLuckDiscount || 0.20, Delve.luckPts() * (e.luckDiscountPerPoint || 0.02));
 };

 // ── Shard shop helpers ─────────────────────────────────────────
 Delve.attrCost = function(id){
  const a = C().ATTRS[id];
  return Math.round(a.costBase * Math.pow(C().costGrowth, bought(id)));
 };
 Delve.attrLvl = function(id){ return bought(id); };
 Delve.attrLevel = Delve.attrLvl;
 Delve.attrValue = function(id){ const a = C().ATTRS[id]; return a.base + a.perLevel * bought(id); };
 Delve.attrCost = function(id){
  const a = C().ATTRS[id];
  return Math.round(a.costBase * Math.pow(C().costGrowth, bought(id)));
 };

})();
