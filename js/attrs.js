window.Delve = window.Delve || {};
(function(){
  const C  = () => Delve.CONFIG;
  const bought = id => Delve.save.lvls[id] || 0;

  Delve.baseMaxHp  = function(){ const a=C().ATTRS.con; return a.base + a.perLevel*bought("con"); };
  Delve.maxHp      = function(){ let m=Delve.baseMaxHp(); if(Delve.G&&Delve.G.equip) m+=Delve.itemBuffs().hp; return m; };

  Delve.baseAtk    = function(){ const a=C().ATTRS.str; return a.base + a.perLevel*bought("str"); };
  Delve.atk        = function(){
    let a=Delve.baseAtk();
    if(Delve.G){ a+=(Delve.G.atkBuff||0); if(Delve.G.equip) a+=Delve.itemBuffs().atk; }
    return a;
  };

  Delve.baseLuck   = function(){ return C().ATTRS.luc.base + bought("luc"); };
  Delve.luckPts    = function(){
    let l=Delve.baseLuck();
    if(Delve.G&&Delve.G.equip) l+=Delve.itemBuffs().luck;
    return l;
  };

  Delve.agiPts     = function(){ return C().ATTRS.agi.base + bought("agi"); };
  Delve.touPts     = function(){ return C().ATTRS.tou.base + bought("tou"); };

  Delve.dmgRed     = function(){ const a=C().ATTRS.tou; return Math.min(a.cap, Delve.touPts()*a.perLevel); };
  Delve.flatRed    = function(){ if(Delve.G&&Delve.G.equip) return Delve.itemBuffs().red; return 0; };

  Delve.dodge      = function(){ const s=C().secondaries; return Math.min(s.dodgeCap, Delve.agiPts()*s.dodgePerAgi); };
  Delve.crit       = function(){ const s=C().secondaries; return Math.min(s.critCap,  Delve.luckPts()*s.critPerLuck); };

  // Attack speed: base weapon speed + AGI bonus + item bonuses
  Delve.effectiveSpeed = function(){
    if(Delve.playerSpeed) return Delve.playerSpeed();
    // fallback if items.js not yet loaded
    const sec=C().secondaries;
    return 1.0 + Delve.agiPts()*sec.speedPerAgi;
  };

  Delve.hasSecondWind  = function(){ return bought("con") >= C().secondaries.secondWindUnlock; };
  Delve.hasOverkill    = function(){ return bought("str") >= C().secondaries.overkillUnlock; };
  Delve.hasBulwark     = function(){ return Delve.touPts() >= C().secondaries.bulwarkTotal; };
  Delve.firstStrikeBonus = function(){
    const s=C().secondaries;
    if(bought("agi")<s.firstStrikeUnlock) return 0;
    return Math.floor(Delve.agiPts()/s.firstStrikeDiv);
  };
  Delve.hitCap         = function(){ return Math.floor(Delve.maxHp()*C().secondaries.bulwarkHitCap); };

  Delve.attrCost       = function(id){ const a=C().ATTRS[id]; return Math.round(a.costBase*Math.pow(C().costGrowth,bought(id))); };
  Delve.attrLvl        = function(id){ return bought(id); };
})();
