window.Delve = window.Delve || {};
(function(){

 const sec = function(){ return Delve.CONFIG.secondaries; };

 // ── Base attribute VALUES (persisted upgrades + trait mods) ──
 Delve.attrValue = function(attr){
  const cfg = Delve.CONFIG.ATTRS;
  const def = cfg[attr];
  const level = (Delve.save && Delve.save.attr && Delve.save.attr[attr]) || 0;
  let val = (def && def.base) || 0;
  val += def.perLevel * level;
  // trait-modified attributes
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  if(attr === "agi") val += tb.agi || 0;
  if(attr === "tou") val += tb.tou || 0;
  return val;
 };

 Delve.conPts = function(){ return Math.floor(Delve.attrValue("con")); };
 Delve.strPts = function(){ return Math.floor(Delve.attrValue("str")); };
 Delve.touPts = function(){ return Delve.attrValue("tou"); };
 Delve.luckPts = function(){ const tb = Delve.traitBuffs ? Delve.traitBuffs() : {}; return Delve.attrValue("luc") + (tb.luck||0); };
 Delve.agiPts = function(){ return Delve.attrValue("agi"); };

 // ── ATK ──────────────────────────────────────────────────────
 Delve.atk = function(){
  const G = Delve.G;
  let a = Delve.strPts();
  const buffs = G && G.equip ? Delve.itemBuffs() : { atk:0 };
  a += buffs.atk;
  if(G) a += (G.atkBuff || 0);
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  a += tb.atk || 0;
  return Math.max(1, Math.round(a));
 };

 // ── MAX HP ───────────────────────────────────────────────────
 Delve.maxHp = function(){
  const G = Delve.G;
  let hp = Delve.conPts();
  // CON level 3+ = +5 extra per level beyond 2
  const conLvl = (Delve.save && Delve.save.attr && Delve.save.attr.con) || 0;
  hp += Delve.conPts(); // con as HP base via perLevel
  const buffs = G && G.equip ? Delve.itemBuffs() : { hp:0 };
  hp += buffs.hp;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  hp += tb.maxHp || 0;
  return Math.max(10, Math.round(hp));
 };

 // ── Damage reduction (TOU → %; cap 50%) ─────────────────────
 Delve.dmgRed = function(){
  const v = Math.min(sec().touCap || 0.50, Delve.touPts());
  return v;
 };
 Delve.flatRed = function(){
  const G = Delve.G;
  const buffs = G && G.equip ? Delve.itemBuffs() : { red:0 };
  let r = buffs.red;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  r += tb.flatRed || 0;
  return Math.round(r);
 };

 // ── Dodge ────────────────────────────────────────────────────
 Delve.dodge = function(){
  const d = Math.min(sec().dodgeCap || 0.40, Delve.agiPts() * sec().dodgePerAgi);
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return d + (tb.dodge||0);
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
  const buffs = Delve.G && Delve.G.equip ? Delve.itemBuffs() : { goldBonus:0 };
  m += buffs.goldBonus;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  m += tb.goldMult || 0;
  return m;
 };

 // ── Drop chance bonus ────────────────────────────────────────
 Delve.dropChance = function(){
  const cfg = Delve.CONFIG.loot;
  let c = Math.min(cfg.dropCap, cfg.baseDrop + Delve.luckPts() * cfg.luckDrop);
  const buffs = Delve.G && Delve.G.equip ? Delve.itemBuffs() : { dropBonus:0 };
  c += buffs.dropBonus;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  c += tb.dropBonus || 0;
  return c;
 };

 // ── Boss damage ──────────────────────────────────────────────
 Delve.bossBonus = function(){
  const buffs = Delve.G && Delve.G.equip ? Delve.itemBuffs() : { bossAtk:0 };
  let v = buffs.bossAtk;
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  v += tb.bossAtk || 0;
  return v;
 };

 // ── First Strike (AGI 3+) ────────────────────────────────────
 Delve.firstStrikeBonus = function(){
  const agi = Delve.agiPts();
  const unlock = sec().firstStrikeUnlock || 3;
  if(agi < unlock) return 0;
  return Math.max(0, Math.round(agi / sec().firstStrikeDiv));
 };

 // ── Second Wind / Overkill / Bulwark checks ──────────────────
 Delve.hasSecondWind = function(){
  return (Delve.save && Delve.save.attr && Delve.save.attr.con || 0) >= (sec().secondWindUnlock||3);
 };
 Delve.hasOverkill = function(){
  return (Delve.save && Delve.save.attr && Delve.save.attr.str || 0) >= (sec().overkillUnlock||3);
 };
 Delve.hasBulwark = function(){
  return Math.floor(Delve.touPts()) >= (sec().bulwarkTotal||5);
 };
 Delve.hitCap = function(){
  return Delve.maxHp() * (sec().bulwarkHitCap||0.60);
 };

 // ── Heal-per-floor (Field Dressing trait) ───────────────────
 Delve.traitHealPerFloor = function(){
  const tb = Delve.traitBuffs ? Delve.traitBuffs() : {};
  return tb.healPerFloor || 0;
 };

})();
