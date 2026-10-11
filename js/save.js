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
      nodes: {},            // progression tree purchases (v3.1)
      inventoryCap: 16,     // bag capacity from Field Pack / Deep Pack
      abilities: [],        // hub-purchased ability ids
      abilityRanks: {},     // ability id -> rank count
      runTraits: [],        // run-observed trait names (for traitReq gating)
      runTraitsSeen: [],    // run-observed trait ids
      seenTutorial: false,
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

  function sanitizeBoolMap(raw){
    const out = {};
    const src = raw && typeof raw === "object" ? raw : {};
    for(const key in src){
      if(src[key] === true || src[key] === 1) out[key] = true;
    }
    return out;
  }

  function sanitizeStringArray(raw){
    if(!Array.isArray(raw)) return [];
    return raw.filter(function(s){ return typeof s === "string"; });
  }

  function sanitizeAbilityRanks(raw){
    const out = {};
    const src = raw && typeof raw === "object" ? raw : {};
    for(const key in src){
      const v = src[key];
      if(typeof v === "number" && Number.isFinite(v)) out[key] = Math.max(0, Math.round(v));
    }
    return out;
  }

  function migrateSave(raw){
    const base = makeDefaultSave();
    const src = raw && typeof raw === "object" ? raw : {};

    base.version = sanitizeNumber(src.version, 3);
    base.shards = sanitizeNumber(src.shards, 0);
    base.bestFloor = sanitizeNumber(src.bestFloor, 1);
    base.lastUpdated = sanitizeNumber(src.lastUpdated, Date.now());
    base.seenTutorial = !!src.seenTutorial;

    if(src.lvls && typeof src.lvls === "object"){
      base.lvls = sanitizeLevels(src.lvls);
    } else {
      // pre-v3 flat fields
      if(typeof src.hpLvl === "number") base.lvls.con = src.hpLvl;
      if(typeof src.atkLvl === "number") base.lvls.str = src.atkLvl;
    }

    if(src.unlocks && typeof src.unlocks === "object"){
      base.unlocks = sanitizeBoolMap(src.unlocks);
    }

    // ── progression fields (added v3.1; previously dropped by whitelist) ──
    if(src.nodes && typeof src.nodes === "object"){
      base.nodes = sanitizeBoolMap(src.nodes);
    }
    if(typeof src.inventoryCap === "number" && Number.isFinite(src.inventoryCap)){
      base.inventoryCap = Math.max(1, Math.round(src.inventoryCap));
    }
    if(Array.isArray(src.abilities)){
      base.abilities = sanitizeStringArray(src.abilities);
    }
    if(src.abilityRanks && typeof src.abilityRanks === "object"){
      base.abilityRanks = sanitizeAbilityRanks(src.abilityRanks);
    }
    if(Array.isArray(src.runTraits)){
      base.runTraits = sanitizeStringArray(src.runTraits);
    }
    if(Array.isArray(src.runTraitsSeen)){
      base.runTraitsSeen = sanitizeStringArray(src.runTraitsSeen);
    }

    return base;
  }

  function safelyParseJSON(value){
    if(typeof value !== "string" || value.trim() === "") return null;
    try { return JSON.parse(value); }
    catch(_err){ return null; }
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
      // IMPORTANT: this whitelist must mirror makeDefaultSave()/migrateSave().
      // Any new persisted field must be added in all three places.
      const safeSave = {
        version: 3,
        shards: sanitizeNumber(saveData.shards, 0),
        bestFloor: sanitizeNumber(saveData.bestFloor, 1),
        lvls: sanitizeLevels(saveData.lvls),
        unlocks: sanitizeBoolMap(saveData.unlocks),
        nodes: sanitizeBoolMap(saveData.nodes),
        inventoryCap: sanitizeNumber(saveData.inventoryCap, 16),
        abilities: sanitizeStringArray(saveData.abilities),
        abilityRanks: sanitizeAbilityRanks(saveData.abilityRanks),
        runTraits: sanitizeStringArray(saveData.runTraits),
        runTraitsSeen: sanitizeStringArray(saveData.runTraitsSeen),
        seenTutorial: !!saveData.seenTutorial,
        lastUpdated: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(safeSave));
      return safeSave;
    } catch(_err){
      return null;
    }
  }

  Delve.createDefaultSave = function(){ return makeDefaultSave(); };

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
    }

    writeSaveToStorage(SAVE_KEY, loaded);
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
