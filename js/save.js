window.Delve = window.Delve || {};
(function(){
  const SAVE_KEY = "underward_save_v3";
  const LEGACY_KEYS = ["delve_save_v1", "underward_save_v2", "underward_save"];
  const ATTR_IDS = ["con", "str", "tou", "luc", "agi", "eng"];

  function makeDefaultLevels(){
    const lvls = {};
    for(const key of ATTR_IDS) lvls[key] = 0;
    return lvls;
  }

  function makeDefaultSave(){
    return {
      version: 3,
      shards: 0,
      bestFloor: 1,
      lvls: makeDefaultLevels(),
      unlocks: {},
      lastUpdated: Date.now()
    };
  }

  function sanitizeNumber(value, fallback){
    if(typeof value === "number" && Number.isFinite(value)) return value;
    return fallback;
  }

  function sanitizeLevels(raw){
    const levels = makeDefaultLevels();
    const src = raw && typeof raw === "object" ? raw : {};
    for(const key of ATTR_IDS){
      levels[key] = sanitizeNumber(src[key], 0);
    }
    return levels;
  }

  function sanitizeUnlocks(raw){
    const unlocked = {};
    const src = raw && typeof raw === "object" ? raw : {};
    for(const key in src){
      if(src[key] === true || src[key] === 1){ unlocked[key] = true; }
    }
    return unlocked;
  }

  function migrateSave(raw){
    const base = makeDefaultSave();
    const src = raw && typeof raw === "object" ? raw : {};

    base.version = sanitizeNumber(src.version, 3);
    base.shards = sanitizeNumber(src.shards, 0);
    base.bestFloor = sanitizeNumber(src.bestFloor, 1);
    base.lastUpdated = sanitizeNumber(src.lastUpdated, Date.now());

    if(src.lvls && typeof src.lvls === "object"){
      base.lvls = sanitizeLevels(src.lvls);
    } else {
      const legacy = makeDefaultLevels();
      if(typeof src.hpLvl === "number") legacy.con = src.hpLvl;
      if(typeof src.atkLvl === "number") legacy.str = src.atkLvl;
      base.lvls = legacy;
    }

    if(src.unlocks && typeof src.unlocks === "object"){
      base.unlocks = sanitizeUnlocks(src.unlocks);
    }

    return base;
  }

  function safelyParseJSON(value){
    if(typeof value !== "string" || value.trim() === "") return null;
    try { return JSON.parse(value); }
    catch(_err) { return null; }
  }

  function readSaveFromStorage(storageKey){
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = safelyParseJSON(raw);
      if(parsed && typeof parsed === "object") return migrateSave(parsed);
    } catch(_err) {}
    return null;
  }

  function writeSaveToStorage(storageKey, saveData){
    try {
      const safeSave = {
        version: 3,
        shards: sanitizeNumber(saveData.shards, 0),
        bestFloor: sanitizeNumber(saveData.bestFloor, 1),
        lvls: sanitizeLevels(saveData.lvls),
        unlocks: sanitizeUnlocks(saveData.unlocks),
        lastUpdated: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(safeSave));
      return safeSave;
    } catch(_err) {
      return null;
    }
  }

  Delve.createDefaultSave = function(){
    return makeDefaultSave();
  };

  Delve.resetSave = function(options){
    const silent = !!(options && options.silent);
    const next = makeDefaultSave();
    Delve.save = next;
    writeSaveToStorage(SAVE_KEY, next);
    if(!silent && Delve.flash){ Delve.flash("Saved progress reset"); }
    return next;
  };

  Delve.loadSave = function(){
    let loaded = readSaveFromStorage(SAVE_KEY);

    if(!loaded){
      for(const key of LEGACY_KEYS){
        loaded = readSaveFromStorage(key);
        if(loaded) break;
      }
    }

    if(!loaded){
      loaded = makeDefaultSave();
      writeSaveToStorage(SAVE_KEY, loaded);
    } else {
      writeSaveToStorage(SAVE_KEY, loaded);
    }

    Delve.save = loaded;
    return Delve.save;
  };

  Delve.persist = function(){
    if(!Delve.save || typeof Delve.save !== "object"){
      Delve.save = makeDefaultSave();
    }
    Delve.save.version = 3;
    Delve.save.lastUpdated = Date.now();
    const saved = writeSaveToStorage(SAVE_KEY, Delve.save);
    if(saved) Delve.save = saved;
  };

  Delve.save = Delve.loadSave();
})();
