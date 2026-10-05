window.Delve = window.Delve || {};
(function(){
  const KEY = "underward_save_v2";
  const LEGACY_KEY = "delve_save_v1";
  const ATTR_IDS = ["con","str","tou","luc","agi","eng"];

  function migrate(s){
    if(!s || typeof s !== "object") s = {};
    if(!s.lvls){
      s.lvls = {};
      for(const k of ATTR_IDS) s.lvls[k] = 0;
      // v1 -> v2: hpLvl feeds CON levels, atkLvl feeds STR levels
      if(typeof s.hpLvl === "number") s.lvls.con = s.hpLvl;
      if(typeof s.atkLvl === "number") s.lvls.str = s.atkLvl;
      delete s.hpLvl; delete s.atkLvl;
    }
    for(const k of ATTR_IDS){ if(typeof s.lvls[k] !== "number") s.lvls[k] = 0; }
    if(typeof s.shards !== "number") s.shards = 0;
    if(typeof s.bestFloor !== "number") s.bestFloor = 1;
    return s;
  }

  Delve.loadSave = function(){
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch(e){}
    if(!raw || typeof raw !== "object"){
      try {
        const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
        if(old && typeof old === "object") raw = old;
      } catch(e){}
    }
    const s = migrate(raw || {});
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){}
    return s;
  };

  Delve.persist = function(){
    try { localStorage.setItem(KEY, JSON.stringify(Delve.save)); } catch(e){}
  };

  Delve.save = Delve.loadSave();
})();
