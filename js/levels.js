window.Delve = window.Delve || {};
(function(){
 const T = function(){ return Delve.T; };
 const C = function(){ return Delve.CONFIG; };

 function geq(a,b){ return Math.max(a,b) === a; } // a >= b
 function leq(a,b){ return Math.min(a,b) === a; } // a <= b
 function prob(p){ var r = Math.random(); return Math.min(r,p) === r; } // r <= p

 // room placement: returns true on success, sets room.x/y to top-left
 function placeRoom(G, room){
  let attempts = 200;
  while(attempts !== 0){
   attempts = attempts - 1;
   const w = room.w, h = room.h;
   const x = Delve.rng(1, G.gridW - w - 2);
   const y = Delve.rng(1, G.gridH - h - 2);
   let ok = true;
   for(let yy = y-1; yy !== y+h+1; yy++){
    for(let xx = x-1; xx !== x+w+1; xx++){
     if(G.grid[yy] && G.grid[yy][xx] === T().FLOOR){ ok = false; break; }
    }
    if(!ok) break;
   }
   if(!ok) continue;
   room.x = x; room.y = y;
   for(let yy = y; yy !== y+h; yy++){
    for(let xx = x; xx !== x+w; xx++) G.grid[yy][xx] = T().FLOOR;
   }
   return true;
  }
  return false;
 }

 // ── Blackvein floor plan: rolled once per run ──
 // Picks 2-3 clustered loot floors and a random set of swarm floors from 11-19.
 function ensureBlackveinPlan(G){
  if(G._bvPlan) return G._bvPlan;
  const pool = [11,12,13,14,15,16,17,18,19];
  const clustered = [];
  const clusterCount = Delve.rng(2, 3);
  for(let i=0; i<clusterCount && pool.length; i++){
   const idx = Math.floor(Math.random() * pool.length);
   clustered.push(pool.splice(idx, 1)[0]);
  }
  const swarm = [];
  for(let i=0; i<pool.length; i++){
   if(Math.random() < 0.25) swarm.push(pool[i]);
  }
  G._bvPlan = { clustered: clustered, swarm: swarm };
  return G._bvPlan;
 }

 // Kind-specific spawner used by swarm/cluster floors. Skips the standard
 // safety-radius check so enemies can pack tightly around a chest.
 function spawnMonsterKind(G, x, y, kind){
  if(!G.grid[y] || G.grid[y][x] !== T().FLOOR) return null;
  const row = C().MONSTER_ROSTER[kind];
  if(!row) return null;
  const m = {
   id:"m"+Date.now()+"_"+Math.floor(Math.random()*99999),
   kind: row.kind, name: row.name,
   x:x, y:y,
   maxHp: row.hp + Math.floor((G.floor-1) * row.hpPerFloor),
   atk: row.atk + Math.floor(G.floor * row.atkPerFloor),
   speed: row.speed,
   xp: row.xp, shards: row.shards, gold: row.gold,
   effects: [], elite: false, hasActed: false
  };
  m.hp = m.maxHp;
  G.monsters.push(m);
  G.grid[y][x] = T().MONSTER;
  return m;
 }

 // Candidate rooms for a special floor: skip spawn room, stairs, shop.
 function specialRooms(G, rooms){
  return rooms.slice(1).filter(function(r){
   if(G.stairs && r.cx === G.stairs.x && r.cy === G.stairs.y) return false;
   if(G.shop && G.shop.x >= 0 && r.cx === G.shop.x && r.cy === G.shop.y) return false;
   return true;
  });
 }

 // Swarm floor: clear the spread-out spawns, fill one chamber with a tight
 // pack of one enemy kind, drop a high-value chest at its centre.
 function applySwarmFloor(G, rooms){
  const usable = specialRooms(G, rooms);
  if(!usable.length) return;

  G.monsters.forEach(function(m){
   if(G.grid[m.y] && G.grid[m.y][m.x] === T().MONSTER) G.grid[m.y][m.x] = T().FLOOR;
  });
  G.monsters = [];

  const room = usable[Math.floor(Math.random() * usable.length)];
  const kind = "spore_swarm";
  const count = Delve.rng(18, 26);
  let placed = 0, attempts = 400;
  while(placed < count && attempts-- > 0){
   const ox = room.x + Delve.rng(0, room.w - 1);
   const oy = room.y + Delve.rng(0, room.h - 1);
   if(spawnMonsterKind(G, ox, oy, kind)) placed++;
  }

  const cx = room.cx, cy = room.cy;
  if(G.grid[cy] && (G.grid[cy][cx] === T().FLOOR || G.grid[cy][cx] === T().MONSTER || G.grid[cy][cx] === T().CHEST)){
   G.monsters = G.monsters.filter(function(m){ return !(m.x === cx && m.y === cy); });
   G.chests = G.chests.filter(function(c){ return !(c.x === cx && c.y === cy); });
   G.grid[cy][cx] = T().CHEST;
   G.chests.push({ x:cx, y:cy, open:false, highValue:true, swarm:true });
  }

  G.floorType = "swarm";
  if(Delve.logSystem) Delve.logSystem("The air thickens — a swarm fills the chamber.");
 }

 // Clustered loot floor: 4-5 guards ring a high-value chest.
 function applyClusteredLootFloor(G, rooms){
  const usable = specialRooms(G, rooms);
  if(!usable.length) return;

  const room = usable[Math.floor(Math.random() * usable.length)];
  const cx = room.cx, cy = room.cy;
  if(!G.grid[cy]) return;
  if(G.grid[cy][cx] !== T().FLOOR && G.grid[cy][cx] !== T().MONSTER && G.grid[cy][cx] !== T().CHEST) return;

  G.monsters = G.monsters.filter(function(m){ return !(m.x === cx && m.y === cy); });
  G.chests = G.chests.filter(function(c){ return !(c.x === cx && c.y === cy); });
  G.grid[cy][cx] = T().CHEST;
  G.chests.push({ x:cx, y:cy, open:false, highValue:true, clustered:true });

  const band = Delve.getMonsterBand(G.floor);
  const guards = Delve.rng(4, 5);
  let placed = 0, attempts = 80;
  while(placed < guards && attempts-- > 0){
   const ox = cx + Delve.rng(-1, 1);
   const oy = cy + Delve.rng(-1, 1);
   if(ox === cx && oy === cy) continue;
   const kind = Delve.pickWeighted(band.weights);
   if(kind && spawnMonsterKind(G, ox, oy, kind)) placed++;
  }

  G.floorType = "clustered";
  if(Delve.logSystem) Delve.logSystem("A knot of vines guards a sealed chest.");
 }

 Delve.genFloor = function(){
  const G = Delve.G;
  if(!G) return;
  G.floorCleared = false;
  G.floorType = null;
  G.items = G.items || [];
  G.monsters = [];
  G.goldPiles = [];
  G.barrels = [];
  G.chests = [];
  G.boss = null;
  G.shop = { x:-1, y:-1 };
  G.stairs = null;
  const cfg = C();
  const ward = Delve.getWard(G.floor);

  const size = ward.dungeonSize || 34;
  G.gridW = size;
  G.gridH = size;
  G.grid = [];
  for(let y = 0; y !== G.gridH; y++){
   const row = [];
   for(let x = 0; x !== G.gridW; x++) row.push(T().WALL);
   G.grid.push(row);
  }

  // rooms: store both top-left and center for later use
  const roomCount = Delve.rng(ward.roomMin || 8, ward.roomMax || 11);
  const rooms = [];
  for(let i = 0; i !== roomCount; i++){
   const rw = Delve.rng(ward.roomWMin || 4, ward.roomWMax || 12);
   const rh = Delve.rng(ward.roomHMin || 4, ward.roomHMax || 12);
   const room = { w:rw, h:rh, x:0, y:0 };
   if(placeRoom(G, room)){
    rooms.push({
     x: room.x, y: room.y,
     cx: room.x + Math.floor(rw/2),
     cy: room.y + Math.floor(rh/2),
     w: rw, h: rh
    });
   }
  }
  if(rooms.length === 0){
   for(let y = 3; y !== 8; y++) for(let x = 3; x !== 10; x++) G.grid[y][x] = T().FLOOR;
   rooms.push({ x:3, y:3, cx:6, cy:5, w:7, h:5 });
  }

  // corridors: join each room center to the next
  for(let i = 0; i !== rooms.length-1; i++){
   const a = rooms[i], b = rooms[i+1];
   if(!a || !b) continue;
   let x = a.cx, y = a.cy;
   while(x !== b.cx){
    if(G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR;
    x = x + (geq(b.cx, x) ? 1 : -1);
   }
   while(y !== b.cy){
    if(G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR;
    y = y + (geq(b.cy, y) ? 1 : -1);
   }
  }

  // player spawn: center of first room
  G.px = rooms[0].cx; G.py = rooms[0].cy;
  G.lastDir = "right";

  // boss floors: arena, boss + guards, no shop or stairs
  if(G.floor % 10 === 0){
   const bossRoom = rooms[rooms.length-1];
   if(bossRoom){
    const bossDef = cfg.BOSS_DEFS[Math.ceil(G.floor/10)] || cfg.BOSS_DEFS[1] || {};
    G.boss = {
     id:"boss", isBoss:true, x:bossRoom.cx, y:bossRoom.cy,
     name:bossDef.name || "The Warden", kind:"boss",
     maxHp:bossDef.hp || cfg.bossHpBase, hp:bossDef.hp || cfg.bossHpBase,
     atk:bossDef.atk || cfg.bossAtkBase,
     speed:bossDef.speed || cfg.bossSpeed,
     chainHitEvery:bossDef.chainHitEvery || 3, chainHitCount:0,
     effects:[], elite:false, hasActed:false
    };
    G.grid[bossRoom.cy][bossRoom.cx] = T().BOSS;
   }
   const band = Delve.getMonsterBand(G.floor);
   const guards = band.countMin || 4;
   for(let i = 0; i !== guards; i++){
    const r = rooms[Delve.rng(0, Math.max(0, rooms.length-2))];
    if(!r) continue;
    spawnMonster(G, r.cx, r.cy, band);
   }
   if(Delve.showBossIntro) Delve.showBossIntro(G.floor);
   return;
  }

  // stairs: farthest room from the player
  let stairRoom = rooms[1] || rooms[0];
  let bestD = -1;
  for(let i = 1; i !== rooms.length; i++){
   const d = Delve.mdist(rooms[i].cx, rooms[i].cy, G.px, G.py);
   if(geq(d, bestD)){ bestD = d; stairRoom = rooms[i]; }
  }
  if(stairRoom){
   G.stairs = { x:stairRoom.cx, y:stairRoom.cy };
   G.grid[stairRoom.cy][stairRoom.cx] = T().STAIR;
  }

  // shop floors (5, 15, 25...): place the shopkeeper off spawn and off stairs
  if(Delve.isShopFloor && Delve.isShopFloor(G.floor)){
   for(let t = 0; t !== rooms.length; t++){
    const cand = rooms[Delve.rng(0, rooms.length-1)];
    if(!cand) continue;
    const d = Delve.mdist(cand.cx, cand.cy, G.px, G.py);
    const onStairs = G.stairs && cand.cx === G.stairs.x && cand.cy === G.stairs.y;
    if(G.grid[cand.cy][cand.cx] === T().FLOOR && !leq(d, 3) && !onStairs){
     G.shop = { x:cand.cx, y:cand.cy, stock:null };
     break;
    }
   }
  }

  // barrels: random scattered floor tiles away from spawn
  const barrelCount = Delve.rng(3, 7);
  const openTiles = [];
  for(let by = 1; by !== G.gridH-1; by++){
   for(let bx = 1; bx !== G.gridW-1; bx++){
    if(G.grid[by][bx] === T().FLOOR && !leq(Delve.mdist(bx,by,G.px,G.py), 4)) openTiles.push({x:bx,y:by});
   }
  }
  for(let i = 0; i !== barrelCount && openTiles.length !== 0; i++){
   const pick = openTiles.splice(Math.floor(Math.random()*openTiles.length), 1)[0];
   if(G.grid[pick.y][pick.x] !== T().FLOOR) continue;
   G.barrels.push({ x:pick.x, y:pick.y });
   G.grid[pick.y][pick.x] = T().BARREL;
  }

  // chests
  const chestChance = (Delve.hasProgression && Delve.hasProgression("sealed_cache")) ? 1
   : Math.min(ward.treasureChanceCap || 0.45, (ward.treasureChanceBase || 0.14) + (ward.treasureChanceLuck || 0.018) * Delve.luckPts());
  if(prob(chestChance) && openTiles.length !== 0){
   const s = openTiles.splice(Math.floor(Math.random()*openTiles.length), 1)[0];
   if(G.grid[s.y][s.x] === T().FLOOR){
    G.grid[s.y][s.x] = T().CHEST;
    G.chests.push({ x:s.x, y:s.y, open:false });
   }
  }

  // normal monsters: distribute across rooms (skip spawn room) for even density
  const band = Delve.getMonsterBand(G.floor);
  const count = Delve.rng(band.countMin || 10, band.countMax || 14);
  let placed = 0;
  const usable = rooms.slice(1);
  for(let ri = 0; ri !== usable.length && placed !== count; ri++){
   const room = usable[ri];
   const remaining = count - placed;
   const roomsLeft = usable.length - ri;
   const perHere = Math.ceil(remaining / roomsLeft);
   for(let k = 0; k !== perHere && placed !== count; k++){
    const ox = room.cx + Delve.rng(-2, 2);
    const oy = room.cy + Delve.rng(-2, 2);
    if(spawnMonster(G, ox, oy, band)) placed = placed + 1;
   }
  }

  // Blackvein special floors: swarm or clustered loot
  if(G.floor >= 11 && G.floor <= 19){
   const plan = ensureBlackveinPlan(G);
   if(plan.swarm.indexOf(G.floor) >= 0){
    applySwarmFloor(G, rooms);
   } else if(plan.clustered.indexOf(G.floor) >= 0){
    applyClusteredLootFloor(G, rooms);
   }
  }

  // elite: one elite per floor at the configured chance
  const minF = cfg.elite.minFloor || 3, maxF = cfg.elite.maxFloor || 9;
  if(geq(G.floor, minF) && leq(G.floor, maxF)){
   if(prob(cfg.elite.chance || 0.10)){
    const m = G.monsters.find(function(x){ return x && !x.elite; });
    if(m) Delve.makeElite(m);
   }
  }

  // secret room: fake wall plus hidden chest behind it
  const secretChance = Math.min(ward.secretRoomChanceCap || 0.70,
   (ward.secretRoomChanceBase || 0.20) + (ward.secretRoomChanceLuck || 0.04) * Delve.luckPts());
  if(prob(secretChance * 0.30)){
   const adjWalls = [];
   for(let y = 1; y !== G.gridH-1; y++){
    for(let x = 1; x !== G.gridW-1; x++){
     if(G.grid[y][x] === T().WALL){
      if(G.grid[y-1][x] === T().FLOOR || G.grid[y+1][x] === T().FLOOR ||
         G.grid[y][x-1] === T().FLOOR || G.grid[y][x+1] === T().FLOOR){
       adjWalls.push({x:x,y:y});
      }
     }
    }
   }
   if(adjWalls.length !== 0){
    const w = adjWalls[Math.floor(Math.random()*adjWalls.length)];
    for(let yy = w.y-1; yy !== w.y+2; yy++){
     for(let xx = w.x-1; xx !== w.x+2; xx++){
      if(G.grid[yy] && G.grid[yy][xx] === T().WALL) G.grid[yy][xx] = T().FLOOR;
     }
    }
    G.grid[w.y][w.x] = T().CHEST;
    G.chests.push({ x:w.x, y:w.y, open:false, secret:true });
    G.floorData = G.floorData || {};
    G.floorData.secretRoom = { falseWallX:w.x, falseWallY:w.y };
   }
  }
 };

 // monster spawn helper: respects safety radius and tile state
 function spawnMonster(G, x, y, band){
  if(leq(Delve.mdist(x,y,G.px,G.py), 2)) return null;
  if(G.grid[y][x] !== T().FLOOR) return null;
  const kind = Delve.pickWeighted(band.weights);
  if(!kind) return null;
  const row = C().MONSTER_ROSTER[kind] || C().MONSTER_ROSTER.goblin;
  const m = {
   id:"m"+Date.now()+"_"+Math.floor(Math.random()*99999),
   kind: row.kind, name: row.name,
   x:x, y:y,
   maxHp: row.hp + Math.floor((G.floor-1) * row.hpPerFloor),
   atk: row.atk + Math.floor(G.floor * row.atkPerFloor),
   speed: row.speed,
   xp: row.xp, shards: row.shards, gold: row.gold,
   effects: [], elite: false, hasActed: false
  };
  m.hp = m.maxHp;
  G.monsters.push(m);
  G.grid[y][x] = T().MONSTER;
  return m;
 }

 // opening a chest: item, potion, or gold, with provenance
 Delve.openChest = function(x, y){
  const G = Delve.G;
  const chest = G.chests.find(function(c){ return c.x===x && c.y===y; });
  if(!chest || chest.open) return;
  chest.open = true;
  G.grid[y][x] = T().FLOOR;
  if(Delve.logSystem) Delve.logSystem("You open a chest.");
  const source = chest.secret ? { kind:"secret" } : { kind:"chest" };

  // high-value chest (Blackvein cluster or swarm): guaranteed tier 3+ item,
  // tier 3 potion, and boosted gold
  if(chest.highValue){
   let tier = Math.max(3, Delve.rollTier(G.floor));
   if(Delve.hasProgression && Delve.hasProgression("lucky_find")) tier = Math.min(4, tier+1);
   const it = Delve.makeItem(tier);
   it.x = x; it.y = y;
   Delve.stampProvenance(it, source);
   G.items.push(it);
   Delve.dropPotion(x, y, 3, source);
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   const gold = Math.round((30 + Math.floor(Math.random()*20) + G.floor*3) * mult);
   G.gold += gold;
   Delve.recordStat("goldEarned", gold);
   Delve.addFloater("+" + gold + "g", x, y, "#ffd75e");
   Delve.updateHUD();
   Delve.draw();
   return;
  }

  if(prob(0.45)){
   let tier = Delve.rollTier(G.floor);
   if(Delve.hasProgression && Delve.hasProgression("lucky_find")) tier = Math.min(4, tier+1);
   const it = Delve.makeItem(tier);
   it.x = x; it.y = y;
   Delve.stampProvenance(it, source);
   G.items.push(it);
  } else if(prob(0.8)){
   Delve.dropPotion(x, y, 2, source);
  } else {
   const mult = Delve.goldMult ? Delve.goldMult() : 1;
   const gold = Math.round((15 + Math.floor(Math.random()*10) + G.floor*2) * mult);
   G.gold += gold;
   Delve.recordStat("goldEarned", gold);
   Delve.addFloater("+" + gold + "g", x, y, "#ffd75e");
   if(Delve.logSystem) Delve.logSystem("Chest contained " + gold + " gold.");
  }
  Delve.updateHUD();
  Delve.draw();
 };

})();
