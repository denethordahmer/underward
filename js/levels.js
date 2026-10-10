window.Delve = window.Delve || {};
(function(){
 const T = () => Delve.T;
 const C = () => Delve.CONFIG;

 // ── Room placement ───────────────────────────────────────────
 function placeRoom(G, room){
  let attempts = 200;
  while(attempts-- > 0){
   const w = room.w, h = room.h;
   const x = Delve.rng(1, G.gridW - w - 2);
   const y = Delve.rng(1, G.gridH - h - 2);
   let ok = true;
   for(let yy=y-1; yy<=y+h && ok; yy++){
    for(let xx=x-1; xx<=x+w && ok; xx++){
     if(G.grid[yy] && G.grid[yy][xx] === T().FLOOR) ok = false;
    }
   }
   if(!ok) continue;
   room.x = x; room.y = y;
   for(let yy=y; yy<y+h; yy++){
    for(let xx=x; xx<x+w; xx++) G.grid[yy][xx] = T().FLOOR;
   }
   return true;
  }
  return false;
 }

 // ── Generate Floor ───────────────────────────────────────────
 Delve.genFloor = function(){
  const G = Delve.G;
  if(!G) return;
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
  if(!rooms.length){
   for(let y=3; y<8; y++) for(let x=3; x<10; x++) G.grid[y][x] = T().FLOOR;
   rooms.push({ x:6, y:5 });
  }

  // corridors (connect each room to the next)
  const centers = rooms.slice();
  for(let i=0; i<centers.length-1; i++){
   const a = centers[i], bNext = centers[i+1];
   if(!a || !bNext) continue;
   let x = a.x, y = a.y;
   while(x !== bNext.x){ if(G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR; x += (bNext.x > x) ? 1 : -1; }
   while(y !== bNext.y){ if(G.grid[y][x] === T().WALL) G.grid[y][x] = T().FLOOR; y += (bNext.y > y) ? 1 : -1; }
  }

  // player spawn
  const start = rooms[0];
  G.px = start.x; G.py = start.y;
  G.lastDir = "right";

  // ── boss floor: arena-style, no shop, boss + guards ──────────
  if(G.floor % 10 === 0){
   const bossRoom = rooms[rooms.length-1];
   if(bossRoom){
    const bossDef = cfg.BOSS_DEFS[Math.ceil(G.floor/10)] || cfg.BOSS_DEFS[1] || {};
    G.boss = {
     id:"boss", isBoss:true, x:bossRoom.x, y:bossRoom.y,
     name:bossDef.name || "The Warden", kind:"boss",
     maxHp:bossDef.hp || cfg.bossHpBase, hp:bossDef.hp || cfg.bossHpBase,
     atk:bossDef.atk || cfg.bossAtkBase,
     speed:bossDef.speed || cfg.bossSpeed,
     chainHitEvery:bossDef.chainHitEvery || 3, chainHitCount:0,
     effects:[], elite:false, hasActed:false
    };
    G.grid[bossRoom.y][bossRoom.x] = T().BOSS;
   }
   // guards
   const band = Delve.getMonsterBand(G.floor);
   for(let i=0; i<(band.countMin||4); i++){
    const r = rooms[Delve.rng(0, Math.max(0, rooms.length-2))];
    if(!r) continue;
    spawnMonster(G, r.x, r.y, band);
   }
   if(Delve.showBossIntro) Delve.showBossIntro(G.floor);
   return;
  }

  // ── normal floor ─────────────────────────────────────────────

  // stairs (in the room farthest from the player)
  let stairRoom = rooms[1];
  let bestD = -1;
  for(let i=1; i<rooms.length; i++){
   const d = Delve.mdist(rooms[i].x, rooms[i].y, G.px, G.py);
   if(d > bestD){ bestD = d; stairRoom = rooms[i]; }
  }
  if(stairRoom){
   G.stairs = { x:stairRoom.x, y:stairRoom.y };
   G.grid[stairRoom.y][stairRoom.x] = T().STAIR;
  }

  // shop (floor 5, 15, 25...) — placed away from stairs and spawn
  if(Delve.isShopFloor(G.floor)){
   for(let t=0; t<rooms.length; t++){
    const cand = rooms[Delve.rng(0, rooms.length-1)];
    if(G.grid[cand.y][cand.x] === T().FLOOR &&
       Delve.mdist(cand.x, cand.y, G.px, G.py) > 3 &&
       !(G.stairs && cand.x === G.stairs.x && cand.y === G.stairs.y)){
     G.shop = { x:cand.x, y:cand.y, stock:null };
     break;
    }
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
   const pick = openTiles.splice(Math.floor(Math.random()*openTiles.length), 1)[0];
   if(G.grid[pick.y][pick.x] !== T().FLOOR) continue;
   G.barrels.push({ x:pick.x, y:pick.y });
   G.grid[pick.y][pick.x] = T().BARREL;
  }

  // chests
  const ward2 = ward;
  const chestChance = Delve.hasProgression && Delve.hasProgression("sealed_cache") ? 1
   : Math.min(ward2.treasureChanceCap || 0.45, (ward2.treasureChanceBase || 0.14) + (ward2.treasureChanceLuck || 0.018) * Delve.luckPts());
  let chestsWanted = (Math.random() < chestChance) ? 1 : 0;
  const spots = openTiles.length ? openTiles : [];
  for(let c=0; c<chestsWanted && spots.length; c++){
   const s = spots.splice(Math.floor(Math.random()*spots.length), 1)[0];
   if(G.grid[s.y][s.x] !== T().FLOOR) continue;
   G.grid[s.y][s.x] = T().CHEST;
   G.chests.push({ x:s.x, y:s.y, open:false });
  }

  // normal monsters
  const band = Delve.getMonsterBand(G.floor);
  const count = Delve.rng(band.countMin || 10, band.countMax || 14);
  let spawned = 0;
  for(let i=0; i<count && spots.length; i++){
   const s = spots.splice(Math.floor(Math.random()*spots.length), 1)[0];
   if(G.grid[s.y][s.x] !== T().FLOOR) continue;
   if(spawnMonster(G, s.x, s.y, band)) spawned++;
  }

  // elite
  if(G.floor >= (cfg.elite.minFloor||3) && G.floor <= (cfg.elite.maxFloor||9)){
   if(Math.random() < (cfg.elite.chance||0.10)){
    const m = G.monsters.find(function(x){ return x && !x.elite; });
    if(m) Delve.makeElite(m);
   }
  }

  // secret room (false wall + hidden chest behind)
  const secretChance = Math.min(ward2.secretRoomChanceCap || 0.70,
   (ward2.secretRoomChanceBase || 0.20) + (ward2.secretRoomChanceLuck || 0.04) * Delve.luckPts());
  if(Math.random() < secretChance * 0.30){
   const adjWalls = [];
   for(let y=1; y<G.gridH-1; y++){
    for(let x=1; x<G.gridW-1; x++){
     if(G.grid[y][x] === T().WALL){
      if(G.grid[y-1][x] === T().FLOOR || G.grid[y+1][x] === T().FLOOR ||
         G.grid[y][x-1] === T().FLOOR || G.grid[y][x+1] === T().FLOOR){
       adjWalls.push({x,y});
      }
     }
    }
   }
   if(adjWalls.length){
    const w = adjWalls[Math.floor(Math.random()*adjWalls.length)];
    for(let yy=w.y-1; yy<=w.y+1; yy++){
     for(let xx=w.x-1; xx<=w.x+1; xx++){
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

 // ── Monster spawn helper ─────────────────────────────────────
 function spawnMonster(G, x, y, band){
  if(Delve.mdist(x,y,G.px,G.py) < 3) return null;
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

 // ── Chest loot ───────────────────────────────────────────────
 Delve.openChest = function(x, y){
  const G = Delve.G;
  const chest = G.chests.find(function(c){ return c.x===x && c.y===y; });
  if(!chest || chest.open) return;
  chest.open = true;
  G.grid[y][x] = T().FLOOR;
  if(Delve.logSystem) Delve.logSystem("You open a chest.");
  const source = chest.secret ? { kind:"secret" } : { kind:"chest" };
  const roll = Math.random();
  if(roll < 0.45){
   let tier = Delve.rollTier(G.floor);
   if(Delve.hasProgression && Delve.hasProgression("lucky_find")) tier = Math.min(4, tier+1);
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

})();  // markRunTrait hook stays inside progression.js; traits.js calls it as-is
