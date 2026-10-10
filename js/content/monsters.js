window.Delve = window.Delve || {};
(function(){
 const C = Delve.CONFIG;

 // ── content/monsters.js : monster roster, bands, bosses, elites, xp ──

 C.MONSTER_ROSTER = {
  rat: { name:"Rotten Rat", hp:8, hpPerFloor:1.2, atk:2, atkPerFloor:0.4, xp:1, gold:1, shards:1, kind:"rat", speed:1.5 },
  slime: { name:"Slime", hp:18, hpPerFloor:2.0, atk:2, atkPerFloor:0.3, xp:2, gold:2, shards:2, kind:"slime", speed:0.7 },
  goblin: { name:"Goblin", hp:12, hpPerFloor:2.5, atk:4, atkPerFloor:0.6, xp:3, gold:3, shards:2, kind:"goblin", speed:1.0 },
  brute: { name:"Brute", hp:18, hpPerFloor:4.0, atk:7, atkPerFloor:0.8, xp:5, gold:5, shards:3, kind:"brute", speed:0.75 },
  wraith: { name:"Wraith", hp:16, hpPerFloor:3.0, atk:4, atkPerFloor:0.7, xp:6, gold:6, shards:3, kind:"wraith", speed:1.2 }
 };

 C.MONSTER_BANDS = [
  { floors:[1,2], boss:false, countMin:10, countMax:14, weights:{ rat:60, slime:40 } },
  { floors:[3,4], boss:false, countMin:10, countMax:14, weights:{ rat:35, slime:35, goblin:30 } },
  { floors:[5,6], boss:false, countMin:10, countMax:14, weights:{ rat:15, slime:25, goblin:40, brute:20 } },
  { floors:[7,9], boss:false, countMin:10, countMax:14, weights:{ rat:8, slime:15, goblin:30, brute:25, wraith:22 } },
  { floors:[10,10], boss:true, countMin:4, countMax:4, weights:{ goblin:100 } },
  { floors:[11,999], boss:false, countMin:10, countMax:14, weights:{ rat:5, slime:12, goblin:28, brute:28, wraith:27 } }
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
   hp:100, atk:9, speed:0.65, chainHitEvery:3
  }
 };

 C.elite = {
  chance:0.10, minFloor:3, maxFloor:9,
  hpMult:1.6, atkMult:1.3, rewardMult:3,
  guaranteedPotion:true, glow:"#ffd75e"
 };

 C.xpKill = { rat:1, slime:2, goblin:3, brute:5, wraith:6, boss:30 };
})();
