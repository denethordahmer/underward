window.Delve = window.Delve || {};
(function(){
  const KEY = "delve_save_v1";

  Delve.loadSave = function(){
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if(s && typeof s === "object") return s;
    } catch(e){}
    return { hpLvl:0, atkLvl:0, shards:0, bestFloor:1 };
  };
  Delve.persist = function(){ localStorage.setItem(KEY, JSON.stringify(Delve.save)); };
  Delve.save = Delve.loadSave();

  const C = () => Delve.CONFIG;
  Delve.maxHp  = function(){ return C().baseMaxHp  + C().hpPerLevel  * Delve.save.hpLvl; };
  Delve.atk    = function(){ return C().baseAtk    + C().atkPerLevel * Delve.save.atkLvl; };
  Delve.hpCost = function(){ return Math.round(C().hpBaseCost  * Math.pow(C().costGrowth, Delve.save.hpLvl)); };
  Delve.atkCost= function(){ return Math.round(C().atkBaseCost * Math.pow(C().costGrowth, Delve.save.atkLvl)); };
})();
