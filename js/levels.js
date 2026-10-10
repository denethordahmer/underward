window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;
 const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

 // ── Place random room on open floor ──────────────────────────
 function placeRoom(G, room){
  let attempts = 200;
  while(attempts-- > 0){
   const w = room.w, h = room.h;
   const x = Delve.rng(1, G.gridW - w - 2);
   const y = Delve.rng(1, G.gridH - h - 2);
   let ok = true;
   for(let yy=y-1; yy<=y+h; yy++){
    for(let xx=x-1; xx<=x+w; xx++){
     if(G.grid[yy] && G.grid[yy][xx] === T().FLOOR) ok = false;
     if(!ok) break;
    }
    if(!ok) break;
   }
   if(!ok) continue;
   room.x = x; room.y = y;
   for(let yy=y; yy<y+h; yy++){
    for(let xx=x; xx<x+w; xx++){
     G.grid[yy][xx] = T().FLOOR;
    }
   }
   // clear walls around edges for a crisp room border
   for(let yy=y-1; yy<=y+h; yy++){
    for(let xx=x-1; xx<=x+w; xx++){
     if((G.grid[yy] && G.grid[yy][xx] === T().WALL) && G.grid[yy] && (xx===x-1 || xx===x+w || yy===y-1 || yy===y+h)) {
      // keep wall; this is just a visual boundary
     }
    }
   }
   return true;
  }
  return false;
 }

 // ── Generate Floor ───────────────────────────────────────────
 Delve.genFloor = function(){
  const G = Delve.G;
  G.floorCleared = false;
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
  const b = cfg.BIOMES[(ward && ward.biome !== undefined) ? ward.biome : 0] || cfg.BIOMES[0] || {};

  const size = ward.dungeonSize || 34;
  G.gridW = size;
  G.gridH = size;
  G.grid = [];
  for(let y=0; y<G.gridH; y++){
   const row = [];
   for(let x=0; x<G.gridW; x++) row.push(T().WALL);
   G.grid.push(row);
  }

  // rooms
  const roomCount = Delve.rng(ward.roomMin || 8, ward.roomMax || 11);
  const rooms = [];
  for(let i=0; i<roomCount; i++){
   const rw = Delve.rng(ward.roomWMin || 4, ward.roomWMax || 12);
   const rh = Delve.rng(ward.roomHMin || 4, ward.roomHMax || 12);
   const room = { w:rw, h:rh, x:0, y:0 };
   if(placeRoom(G, room)) rooms.push({ x:room.x+Math.floor(room.w/2), y:room.y+Math.floor(room.h/2), __room:room });
  }
  // fallback starter room so player never spawns in wall
  if(!rooms.length){
   for(let y=3; y<8; y++) for(let x=3; x<10; x++) G.grid[y][x] = T().FLOOR;
   rooms.push({ x:6, y:5 });
  }

  // corridors
  const centers = rooms.slice();
  for(let i=0; i<centers.length-1; i++){
   const a = centers[i], bNext = centers[i+1];
   if(!a || !bNext) continue;
   let x = a.x, y = a.y;
   while(x !== bNext.x){
    if(G.grid[y] && G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR;
    x += (bNext.x > x) ? 1 : -1;
   }
   while(y !== bNext.y){
    if(G.grid[y] && G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR;
    y += (bNext.y > y) ? 1 : -1;
   }
  }

  // spawn player
  const start = rooms[0];
  G.px = start.x; G.py = start.y;
  G.lastDir = "right";

  // chests
  const chestChanceBase = ward.treasureChanceBase || 0.14;
  const chestChanceLuck = ward.treasureChanceLuck || 0.018;
  const chestChanceCap = ward.treasureChanceCap || 0.45;
  const chestsWanted = (Delve.hasProgression && Delve.hasProgression("sealed_cache")) ? 1 : (Math.random() < Math.min(chestChanceCap, chestChanceBase + chestChanceLuck * Delve.luckPts()) ? 1 : 0);
  for(let c=0; c<chestsWanted; c++){
   const idx = Delve.rng(1, rooms.length-1);
   const spot = rooms[idx];
   if(spot){
    G.grid[spot.y][spot.x] = T().CHEST;
    G.chests.push({ x:spot.x, y:spot.y, open:false });
   }
  }

  // barrels
  const barrelCount = Delve.rng(3, 7);
  const openTiles = [];
  for(let y=1; y<G.gridH-1; y++){
   for(let x=1; x<G.gridW-1; x++){
    if(G.grid[y][x] === T().FLOOR && Delve.mdist(x,y,G.px,G.py) > 4) openTiles.push({x,y});
   }
  }
  for(let i=0; i<barrelCount && openTiles.length; i++){
   const pick = openTiles.splice(Math.floor(Math.random()*openTiles.length),1)[0];
   G.barrels.push({ x:pick.x, y:pick.y });
   G.grid[pick.y][pick.x] = T().BARREL;
  }

  // secret room (false wall)
  const secretChanceBase = ward.secretRoomChanceBase || 0.20;
  const secretChanceLuck = ward.secretRoomChanceLuck || 0.04;
  const secretChanceCap = ward.secretRoomChanceCap || 0.70;
  if(Math.random() < Math.min(secretChanceCap, secretChanceBase + secretChanceLuck * Delve.luckPts())){
   // find an interior wall adjacent to floor
   const adj = [];
   for(let y=1; y<G.gridH-1; y++){
    for(let x=1; x<G.gridW-1; x++){
     if(G.grid[y][x] === T().WALL){
      const f = (G.grid[y-1][x] === T().FLOOR) || (G.grid[y+1][x] === T().FLOOR) || (G.grid[y][x-1] === T().FLOOR) || (G.grid[y][x+1] === T().FLOOR);
      if(f) adj.push({x,y});
     }
    }
   }
   if(adj.length){
    const w = adj[Math.floor(Math.random()*adj.length)];
    G.grid[w.y][w.x] = T().WALL; // stays wall; visible fake seam
    G.floorData = G.floorData || {};
    G.floorData.secretRoom = { falseWallX:w.x, falseWallY:w.y };
    // carve a mini room behind it
    for(let yy=w.y-2; yy<=w.y+2; yy++){
     for(let xx=w.x-2; xx<=w.x+2; xx++){
      if(G.grid[yy] && G.grid[yy][xx] === T().WALL) G.grid[yy][xx] = T().FLOOR;
     }
    }
    // hidden chest in the secret room
    G.grid[w.y][w.x] = T().CHEST;
    G.chests.push({ x:w.x, y:w.y, open:false });
   }
  }

  // boss floor
  if(G.floor % 10 === 0){
   G.shop = { x:-1, y:-1 };
   const bossRoom = rooms[rooms.length-1];
   if(bossRoom){
    G.boss = {
     id:"boss", isBoss:true, x:bossRoom.x, y:bossRoom.y, maxHp:cfg.BOSS_DEFS && cfg.BOSS_DEFS[Math.ceil(G.floor/10)] ? cfg.BOSS_DEFS[Math.ceil(G.floor/10)].hp : cfg.bossHpBase,
     hp:cfg.BOSS_DEFS && cfg.BOSS_DEFS[Math.ceil(G.floor/10)] ? cfg.BOSS_DEFS[Math.ceil(G.floor/10)].hp : cfg.bossHpBase,
     atk:cfg.BOSS_DEFS && cfg.BOSS_DEFS[Math.ceil(G.floor/10)] ? cfg.BOSS_DEFS[Math.ceil(G.floor/10)].atk : cfg.bossAtkBase,
     speed:cfg.BOSS_DEFS && cfg.BOSS_DEFS[Math.ceil(G.floor/10)] ? cfg.BOSS_DEFS[Math.ceil(G.floor/10)].speed : cfg.bossSpeed,
     kind:"boss", name:"The Warden", effects:[], hasActed:false
    };
    G.grid[bossRoom.y][bossRoom.x] = T().BOSS;
   }
   // boss guards
   const band = Delve.getMonsterBand(G.floor);
   for(let i=0; i<(band.countMin||4); i++){
    const r = rooms[Delve.rng(1, rooms.length-2)];
    if(!r) continue;
    spawnMonster(G, r.x, r.y, band);
   }
   return;
  }

  // shop floor
  if(Delve.isShopFloor(G.floor)){
   const idx = Delve.rng(1, rooms.length-1);
   const spot = rooms[idx];
   if(spot){
    G.shop = { x:spot.x, y:spot.y, visited:false, stock:null };
    G.grid[spot.y][spot.x] = T().FLOOR; // shopkeeper sits on floor
   }
  }

  // normal monsters
  const band = Delve.getMonsterBand(G.floor);
  const count = Delve.rng(band.countMin || 10, band.countMax || 14);
  for(let i=0; i<count; i++){
   const r = rooms[Delve.rng(0, rooms.length-1)];
   if(!r) continue;
   if(Delve.mdist(r.x, r.y, G.px, G.py) < (cfg.spawnSafetyRadius||4)) continue;
   spawnMonster(G, r.x, r.y, band);
  }
  // elite
  if(G.floor >= (cfg.elite.minFloor||3) && G.floor <= (cfg.elite.maxFloor||9)){
   if(Math.random() < (cfg.elite.chance||0.10)){
    const r = rooms[Delve.rng(1, rooms.length-1)];
    if(r){
     const m = G.monsters.find(m => m.x===r.x && m.y===r.y);
     if(m) Delve.makeElite(m);
    }
   }
  }
 };

 function spawnMonster(G, x, y, band){
  // don't spawn on player/start or occupied
  if(Delve.mdist(x,y,G.px,G.py) < 3) return;
  if(G.grid[y][x] !== T().FLOOR && G.grid[y][x] !== T().GOLD) return;
  const kind = Delve.pickWeighted(band.weights);
  if(!kind) return;
  const row = C().MONSTER_ROSTER[kind] || C().MONSTER_ROSTER.goblin;
  const m = {
   id:"m"+Date.now()+"_"+Math.floor(Math.random()*99999),
   kind: row.kind,
   name: row.name,
   x:x, y:y,
   maxHp: row.hp + Math.floor((G.floor-1) * row.hpPerFloor),
   atk: row.atk + Math.floor(G.floor * row.atkPerFloor),
   speed: row.speed,
   xp: row.xp,
   shards: row.shards,
   gold: row.gold,
   effects: [],
   elite: false,
   hasActed: false
  };
  m.hp = m.maxHp;
  G.monsters.push(m);
  G.grid[y][x] = T().MONSTER;
 }

 Delve.openChest = function(x, y){
  const G = Delve.G;
  const chest = G.chests.find(c => c.x===x && c.y===y);
  if(!chest || chest.open) return;
  chest.open = true;
  G.grid[y][x] = T().FLOOR;
  G.grid[y][x] = T().FLOOR;
  if(Delve.logSystem) Delve.logSystem("You open a chest.");
  const source = chest.secret ? { kind:"secret" } : { kind:"chest" };
  // chest always gives something
  const roll = Math.random();
  if(roll < 0.45){
   const tier = (Delve.hasProgression && Delve.hasProgression("lucky_find")) ? Math.min(4, Delve.rollTier(G.floor)+1) : Delve.rollTier(G.floor);
   const it = Delve.makeItem(tier);
   it.x = x; it.y = y;
   Delve.stampProvenance(it, source);
   G.items.push(it);
  } else if(roll < 0.8){
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

 // ── Boss intro helper (called by genFloor on boss floors) ───
 Delve.genFloor() === undefined;
})();
