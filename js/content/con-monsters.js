window.Delve = window.Delve || {};
(function(){
 const C = Delve.CONFIG;

 // ── content/con-monsters.js : monster roster, bands, bosses, elites, xp ──

 C.MONSTER_ROSTER = {
  rat: { name:"Rotten Rat", hp:8, hpPerFloor:1.2, atk:2, atkPerFloor:0.4, xp:1, gold:1, shards:1, kind:"rat", speed:1.5 },
  slime: { name:"Slime", hp:18, hpPerFloor:2.0, atk:2, atkPerFloor:0.3, xp:2, gold:2, shards:2, kind:"slime", speed:0.7 },
  goblin: { name:"Goblin", hp:12, hpPerFloor:2.5, atk:4, atkPerFloor:0.6, xp:3, gold:3, shards:2, kind:"goblin", speed:1.0 },
  brute: { name:"Brute", hp:18, hpPerFloor:4.0, atk:7, atkPerFloor:0.8, xp:5, gold:5, shards:3, kind:"brute", speed:0.75 },
  wraith: { name:"Wraith", hp:16, hpPerFloor:3.0, atk:4, atkPerFloor:0.7, xp:6, gold:6, shards:3, kind:"wraith", speed:1.2 },

  thornling:    { name:"Thornling",          hp:24, hpPerFloor:3.2, atk:5, atkPerFloor:0.80, xp:7, gold:7, shards:3, kind:"thornling",    speed:1.35, onHitEffect:"bleed"  },
  treant:       { name:"Corrupted Treant",   hp:48, hpPerFloor:5.5, atk:9, atkPerFloor:1.00, xp:9, gold:9, shards:4, kind:"treant",       speed:0.55, onHitEffect:"weaken" },
  vine_stalker: { name:"Vine Stalker",       hp:28, hpPerFloor:3.8, atk:7, atkPerFloor:0.85, xp:8, gold:8, shards:3, kind:"vine_stalker", speed:1.15, onHitEffect:"poison" },
  spore_swarm:  { name:"Spore Swarm",        hp:14, hpPerFloor:2.2, atk:4, atkPerFloor:0.60, xp:4, gold:4, shards:2, kind:"spore_swarm",  speed:1.40 }
 };

 C.MONSTER_BANDS = [
  { floors:[1,2], boss:false, countMin:10, countMax:14, weights:{ rat:60, slime:40 } },
  { floors:[3,4], boss:false, countMin:10, countMax:14, weights:{ rat:35, slime:35, goblin:30 } },
  { floors:[5,6], boss:false, countMin:10, countMax:14, weights:{ rat:15, slime:25, goblin:40, brute:20 } },
  { floors:[7,9], boss:false, countMin:10, countMax:14, weights:{ rat:8, slime:15, goblin:30, brute:25, wraith:22 } },
  { floors:[10,10], boss:true, countMin:4, countMax:4, weights:{ goblin:100 } },

  { floors:[11,11], boss:false, countMin:10, countMax:14, weights:{ goblin:15, brute:20, wraith:25, thornling:15, vine_stalker:15, spore_swarm:10 } },
  { floors:[12,12], boss:false, countMin:10, countMax:14, weights:{ brute:10, wraith:15, thornling:25, vine_stalker:25, spore_swarm:15, treant:10 } },
  { floors:[13,19], boss:false, countMin:10, countMax:14, weights:{ thornling:30, vine_stalker:25, treant:25, spore_swarm:20 } },
  { floors:[20,20], boss:true, countMin:4, countMax:4, weights:{ spore_swarm:100 } },
  { floors:[21,999], boss:false, countMin:10, countMax:14, weights:{ thornling:25, vine_stalker:25, treant:30, spore_swarm:20 } }
 ];

 C.spawnSafetyRadius = 4;

 C.monsterHpBase = 5; C.monsterHpPerFloor = 1.5;
 C.monsterAtkBase = 1; C.monsterAtkPerFloor = 0.5;
 C.bossHpBase = 100; C.bossHpPerFloor = 0;
 C.bossAtkBase = 9; C.bossAtkPerFloor = 0;
 C.bossSpeed = 0.65;

 C.BOSS_DEFS = {
  1: {
   name:"The Warden",
   title:"Guardian of the Undercroft",
   flavour:"He has watched these stones since before your grandfather was born.\nHe will not step aside.",
   hp:100, atk:9, speed:0.65, chainHitEvery:3,
   shardBonusPct:0.10
  },
  2: {
   name:"The Thorn Sovereign",
   title:"Heart of the Blackvein",
   flavour:"It was ancient before the corruption found it.\nNow it walks, and it has been waiting.",
   hp:160, atk:14, speed:0.70, chainHitEvery:2,
   shardBonusPct:0.15
  }
 };

 C.elite = {
  chance:0.10, minFloor:3, maxFloor:99999,
  hpMult:1.6, atkMult:1.3, rewardMult:3,
  guaranteedPotion:true, glow:"#ffd75e"
 };

 C.xpKill = { rat:1, slime:2, goblin:3, brute:5, wraith:6, thornling:7, vine_stalker:8, treant:9, spore_swarm:4, boss:30 };
})();
