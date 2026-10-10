window.Delve = window.Delve || {};
Delve.T = { FLOOR:0, WALL:1, STAIR:2, MONSTER:3, BOSS:4, CHEST:5, GOLD:6, ITEM:7, POTION:8, BARREL:9 };
Delve.G = null;

Delve.rng = function(min, max){ return Math.floor(Math.random()*(max-min+1))+min; };
Delve.rngF = function(){ return Math.random(); };
Delve.clamp = function(v,a,b){ return Math.max(a,Math.min(b,v)); };

Delve.flash = function(t){
 if(Delve.G){ Delve.G.msg = t; Delve.G.msgUntil = Date.now()+1400; }
};

Delve.mdist = function(x1,y1,x2,y2){ return Math.abs(x1-x2)+Math.abs(y1-y2); };

Delve.getWard = function(floor){
 const wards = Delve.CONFIG.WARDS || [];
 for(const w of wards){
  if(floor >= w.floors[0] && floor <= w.floors[1]) return w;
 }
 return wards[0] || { id:1, name:"Upper Ruins", floors:[1,10], biome:0 };
};

Delve.getMonsterBand = function(floor){
 const bands = Delve.CONFIG.MONSTER_BANDS || [];
 for(const b of bands){
  if(floor >= b.floors[0] && floor <= b.floors[1]) return b;
 }
 return bands[bands.length-1] || { weights:{goblin:100}, countMin:10, countMax:14, boss:false };
};

Delve.pickWeighted = function(weights){
 let total = 0;
 for(const k in weights) total += weights[k]||0;
 if(total<=0) return Object.keys(weights)[0]||null;
 let roll = Delve.rngF()*total;
 for(const k in weights){ roll -= weights[k]||0; if(roll<=0) return k; }
 return Object.keys(weights)[0];
};

// ── Shop floor helper ─────────────────────────────────────────
Delve.isShopFloor = function(floor){
 const s = Delve.CONFIG.shop;
 return floor > 0 && (floor % 10 === s.offset);
};

// ── Shop heal cost ────────────────────────────────────────────
Delve.healCost = function(floor){
 const e = Delve.CONFIG.economy;
 return Math.round(e.healCostA + e.healCostB * Math.log(floor + 1));
};

// ── Run-stat recorder ─────────────────────────────────────────
Delve.recordStat = function(key, amount){
 const G = Delve.G;
 if(!G) return;
 G.runStats = G.runStats || {};
 G.runStats[key] = (G.runStats[key] || 0) + amount;
};
