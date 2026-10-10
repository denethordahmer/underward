window.Delve = window.Delve || {};
(function(){

 const sec = function(){ return Delve.CONFIG.secondaries; };

 // ── Attribute levels (persisted under save.lvls) ─────────────
 Delve.attrLevel = function(attr){
  return (Delve.save && Delve.save.lvls && Delve.save.lvls[attr]) || 0;
 };

 // ── Purchase cost: costBase × 1.28^level ─────────────────────
 Delve.attrCost = function(attr){
  const a = Delve.CONFIG.ATTRS[attr];
  if(!a) return 0;
  return Math.round(a.costBase * Math.pow(Delve.CONFIG.costGrowth, Delve.attrLevel(attr)));
 };

 // ── Current value (base + perLevel×level) ────────────────────
 Delve.attrValue = function(attr){
  const a = Delve.CONFIG.ATTRS[attr];
  if(!a) return 0;
  return a.base + a.perLevel * Delve.attrLevel(attr);
 };

 // ── Convenience accessors ────────────────────────────────────
 Delve.conPts = function(){ return Delve.attrValue("con"); };
 Delve.strPts = function(){ return Delve.attrValue("str"); };
 Delve.touPts = function(){ return Delve.attrValue("tou"); };
 Delve.luckPts = function(){
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return Delve.attrValue("luc") + (tb.luck || 0);
 };
 Delve.agiPts = function(){
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return Delve.attrValue("agi") + (tb.agi || 0);
 };

 // ── ATK ──────────────────────────────────────────────────────
 Delve.atk = function(){
  const G = Delve.G;
  let a = Delve.strPts();
  const buffs = (G && G.equip) ? Delve.itemBuffs() : { atk:0 };
  a += buffs.atk;
  if(G) a += (G.atkBuff || 0);
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  a += tb.atk || 0;
  return Math.max(1, Math.round(a));
 };

 // ── MAX HP (CON base = 30, +5/level) ─────────────────────────
 Delve.maxHp = function(){
  const G = Delve.G;
  let hp = Delve.attrValue("con");               // 30 + 5×level
  const buffs = (G && G.equip) ? Delve.itemBuffs() : { hp:0 };
  hp += buffs.hp;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  hp += tb.maxHp || 0;
  return Math.max(10, Math.round(hp));
 };

 // ── Damage reduction (TOU %, cap 50%) ────────────────────────
 Delve.dmgRed = function(){
  return Math.min(0.50, Delve.touPts());
 };
 Delve.flatRed = function(){
  const G = Delve.G;
  const buffs = (G && G.equip) ? Delve.itemBuffs() : { red:0 };
  let r = buffs.red;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  r += tb.flatRed || 0;
  return Math.round(r);
 };

 // ── Dodge ────────────────────────────────────────────────────
 Delve.dodge = function(){
  const d = Math.min(sec().dodgeCap || 0.40, Delve.agiPts() * sec().dodgePerAgi);
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return d + (tb.dodge || 0);
 };

 // ── Crit ─────────────────────────────────────────────────────
 Delve.crit = function(){
  let c = Math.min(sec().critCap || 0.50, Delve.luckPts() * sec().critPerLuck);
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  c += tb.crit || 0;
  return c;
 };

 // ── Gold multiplier ──────────────────────────────────────────
 Delve.goldMult = function(){
  let m = 1 + Delve.luckPts() * (Delve.CONFIG.economy ? Delve.CONFIG.economy.goldLuckMult : 0.05);
  const buffs = (Delve.G && Delve.G.equip) ? Delve.itemBuffs() : { goldBonus:0 };
  m += buffs.goldBonus;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  m += tb.goldMult || 0;
  return m;
 };

 // ── Drop chance ──────────────────────────────────────────────
 Delve.dropChance = function(){
  const cfg = Delve.CONFIG.loot;
  let c = Math.min(cfg.dropCap, cfg.baseDrop + Delve.luckPts() * cfg.luckDrop);
  const buffs = (Delve.G && Delve.G.equip) ? Delve.itemBuffs() : { dropBonus:0 };
  c += buffs.dropBonus;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  c += tb.dropBonus || 0;
  return c;
 };

 // ── Boss damage bonus ────────────────────────────────────────
 Delve.bossBonus = function(){
  const buffs = (Delve.G && Delve.G.equip) ? Delve.itemBuffs() : { bossAtk:0 };
  let v = buffs.bossAtk;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  v += tb.bossAtk || 0;
  return v;
 };

 // ── First Strike (AGI 3+) ────────────────────────────────────
 Delve.firstStrikeBonus = function(){
  const agi = Delve.agiPts();
  if(agi < (sec().firstStrikeUnlock || 3)) return 0;
  return Math.max(0, Math.round(agi / sec().firstStrikeDiv));
 };

 // ── Unlock checks ────────────────────────────────────────────
 Delve.hasSecondWind = function(){
  return Delve.attrLevel("con") >= (sec().secondWindUnlock || 3);
 };
 Delve.hasOverkill = function(){
  return Delve.attrLevel("str") >= (sec().overkillUnlock || 3);
 };
 Delve.hasBulwark = function(){
  return Math.floor(Delve.touPts() / 0.05) >= (sec().bulwarkTotal || 5);
 };
 Delve.hitCap = function(){
  return Delve.maxHp() * (sec().bulwarkHitCap || 0.60);
 };

 // ── Trait heal-per-floor ─────────────────────────────────────
 Delve.traitHealPerFloor = function(){
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return tb.healPerFloor || 0;
 };

})();
