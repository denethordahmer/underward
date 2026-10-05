window.Delve = window.Delve || {};
Delve.T = { FLOOR:0, WALL:1, STAIR:2, MONSTER:3, BOSS:4 };
Delve.G = null;      // active run object

Delve.rng = function(min,max){ return Math.floor(Math.random()*(max-min+1))+min; };
Delve.clamp = function(v,a,b){ return Math.max(a, Math.min(b, v)); };

Delve.flash = function(t){ Delve.G.msg = t; Delve.G.msgUntil = Date.now()+1400; };
