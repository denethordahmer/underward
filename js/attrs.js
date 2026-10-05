window.Delve = window.Delve || {};
(function(){
  const C = () => Delve.CONFIG;
  const bought = id => Delve.save.lvls[id] || 0;

  // ---- derived player stats ----
  Delve.maxHp  = function(){ const a=C().ATTRS.con; return a.base + a.perLevel*bought("con"); };
  Delve.atk    = function(){ const a=C().ATTRS.str; return a.base + a.perLevel*bought("str"); };
  Delve.luckPts= function(){ return C().ATTRS.luc.base + bought("luc"); };
  Delve.agiPts = function(){ return C().ATTRS.agi.base + bought("agi"); };
  Delve.touPts = function(){ return C().ATTRS.tou.base + bought("tou"); };

  Delve.dmgRed = function(){
    const a = C().ATTRS.tou;
    return Math.min(a.cap, Delve.touPts() * a.perLevel);
  };
  Delve.dodge  = function(){
    const s = C().secondaries;
    return Math.min(s.dodgeCap, Delve.agiPts() * s.dodgePerAgi);
  };
  Delve.crit   = function(){
    const s = C().secondaries;
    return Math.min(s.critCap, Delve.luckPts() * s.critPerLuck);
  };

  // ---- secondary effects ----
  Delve.hasSecondWind = function(){ return bought("con") >= C().secondaries.secondWindUnlock; };
  Delve.hasOverkill   = function(){ return bought("str") >= C().secondaries.overkillUnlock; };
  Delve.hasBulwark    = function(){ return Delve.touPts() >= C().secondaries.bulwarkTotal; };
  Delve.firstStrikeBonus = function(){
    const s = C().secondaries;
    if(bought("agi") < s.firstStrikeUnlock) return 0;
    return Math.floor(Delve.agiPts() / s.firstStrikeDiv);
  };
  Delve.hitCap = function(){ return Math.floor(Delve.maxHp() * C().secondaries.bulwarkHitCap); };

  // ---- hub cost for next level ----
  Delve.attrCost = function(id){
    const a = C().ATTRS[id];
    return Math.round(a.costBase * Math.pow(C().costGrowth, bought(id)));
  };
  Delve.attrLvl = function(id){ return bought(id); };
})();
