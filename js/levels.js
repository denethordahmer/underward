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

 // ── Ward floor plan: rolled once per ward per run ──
 // Driven by the ward's own `special` block (con-biomes.js): how many
 // clustered-loot floors, and the per-floor chance of a swarm chamber. The
 // offsets in that block are ward-relative (1 = the ward's first floor).
 function ensureWardPlan(G, ward){
  G._wardPlans = G._wardPlans || {};
  const key = ward.id || 1;
  if(G._wardPlans[key]) return G._wardPlans[key];
  const plan = { clustered: [], swarm: [] };
  const s = ward.special;
  if(s && s.floors){
   const pool = [];
   for(let f = s.floors[0]; f <= s.floors[1]; f++) pool.push(ward.floors[0] + f - 1);
   const range = s.clustered || [2, 3];
   const clusterCount = Delve.rng(range[0], range[1]);
   for(let i=0; i<clusterCount && pool.length; i++){
    const idx = Math.floor(Math.random() * pool.length);
    plan.clustered.push(pool.splice(idx, 1)[0]);
   }
   for(let i=0; i<pool.length; i++){
    if(Math.random() < (s.swarmChance || 0)) plan.swarm.push(pool[i]);
   }
  }
  G._wardPlans[key] = plan;
  return plan;
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
 function applySwarmFloor(G, rooms, special){
  const usable = specialRooms(G, rooms);
  if(!usable.length) return;

  G.monsters.forEach(function(m){
   if(G.grid[m.y] && G.grid[m.y][m.x] === T().MONSTER) G.grid[m.y][m.x] = T().FLOOR;
  });
  G.monsters = [];

  const room = usable[Math.floor(Math.random() * usable.length)];
  const kind = (special && special.swarmKind) || "spore_swarm";
  const count = Delve.rng((special && special.swarmMin) || 18, (special && special.swarmMax) || 26);
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

 // ── Boss floor: bespoke arena layout ─────────────────────────
 // A vertical three-part structure: a small entry chamber at the bottom where
 // the player spawns, a short narrow corridor leading north, and a large arena
 // chamber holding the boss. No monsters, no barrels, no chests, no stairs —
 // defeating the boss is the only exit, handled by the victory screen.
 //
 // Geometry is driven by the ward so future wards can vary it. Add an optional
 // `bossArena` block to a WARDS entry in con-biomes.js to override any of:
 //   { bossW, bossH, entryW, entryH, corridorW, pad }
 // Defaults scale with the ward's dungeonSize, so they work unmodified.
 // ── ARENA DRESSING ───────────────────────────────────────────
 // Decoration only. Props live in G.decor and are DRAWN, never written into the
 // grid, so they cannot block movement, be tapped, or show on the minimap.
 // Positions are derived from G.bossArena, so the engine owns *where* and a ward
 // only chooses *what* (CONFIG.DRESSING: which art fills each role). Placement is
 // position-based, never random, so the same floor always dresses identically.
 function dressBossArena(G, ward, boss, A){
  const T = Delve.T;
  const recipe = (C().DRESSING && C().DRESSING[ward && ward.id]) || null;
  if(!recipe || !A) return [];
  const out = [], used = {};
  const floorAt = function(x, y){ const g = G.grid; return !!(g[y] && g[y][x] === T.FLOOR); };
  const wallAt  = function(x, y){ const g = G.grid; return !!(g[y] && g[y][x] === T.WALL); };

  // Never dress the tiles the fight needs: the boss's art footprint, and the
  // tile the player arrives on.
  const blocked = {};
  const bw = (boss && boss.size && boss.size.w) || 1;
  const bh = (boss && boss.size && boss.size.h) || 1;
  if(boss){
   for(let y = boss.y - bh + 1; y <= boss.y; y++)
    for(let x = boss.x; x < boss.x + bw; x++) blocked[x + "," + y] = 1;
  }
  blocked[G.px + "," + G.py] = 1;

  const put = function(x, y, key, layer){
   if(!key) return;
   const k = x + "," + y;
   if(used[k]) return;
   if(blocked[k]) return;
   if(x <= 0 || y <= 0 || x >= G.gridW - 1 || y >= G.gridH - 1) return;
   if(layer === "wall"){ if(!wallAt(x, y)) return; }
   else if(!floorAt(x, y)) return;
   used[k] = 1;
   out.push({ x:x, y:y, key:key, layer:layer });
  };

  // pillars at the chamber's four inner corners
  [A.bossX + 1, A.bossX + A.bossW - 2].forEach(function(px){
   [A.bossY + 1, A.bossY + A.bossH - 2].forEach(function(py){
    put(px, py, recipe.pillar, "floor");
   });
  });

  // banners and a hanging piece across the chamber's back wall. The columns are
  // chosen to fall BETWEEN the braziers render.js derives (arenaTorches), so a
  // prop never covers a torch.
  put(A.bossX + Math.floor(A.bossW * 0.25), A.bossY - 1, recipe.banner, "wall");
  put(A.bossX + Math.floor(A.bossW * 0.75), A.bossY - 1, recipe.banner, "wall");
  put(A.bossX + Math.floor(A.bossW * 0.40), A.bossY - 1, recipe.wallBit, "wall");

  // hanging pieces on both side walls (rows well clear of the brazier rows),
  // and one on each wall of the approach corridor
  put(A.bossX - 1, A.bossY + 1, recipe.wallBit, "wall");
  put(A.bossX + A.bossW, A.bossY + A.bossH - 3, recipe.wallBit, "wall");
  const corrMid = A.corrTop + Math.floor(A.corrH * 0.5);
  put(A.corrX - 1, corrMid, recipe.wallBit, "wall");
  put(A.corrX + A.corrW, corrMid, recipe.wallBit, "wall");

  // debris and remains along the chamber walls: every third tile, alternating
  // rubble and bones, skipping anything the guards above refuse
  const lastRow = A.bossY + A.bossH - 2;
  for(let x = A.bossX + 1; x < A.bossX + A.bossW - 1; x += 3){
   put(x, lastRow, ((x - A.bossX) % 6 === 1) ? recipe.bone : recipe.rubble, "floor");
   put(x, A.bossY + 1, ((x - A.bossX) % 6 === 1) ? recipe.rubble : recipe.bone, "floor");
  }
  const lastCol = A.bossX + A.bossW - 2;
  for(let y = A.bossY + 3; y < lastRow; y += 3){
   put(A.bossX + 1, y, ((y - A.bossY) % 6 === 0) ? recipe.bone : recipe.rubble, "floor");
   put(lastCol, y, ((y - A.bossY) % 6 === 0) ? recipe.rubble : recipe.bone, "floor");
  }

  // a feature either side of the way in, so the entrance frames itself
  put(A.corrX - 1, A.bossY + A.bossH - 1, recipe.cluster, "floor");
  put(A.corrX + A.corrW, A.bossY + A.bossH - 1, recipe.cluster, "floor");

  // and something in the entry chamber, so arriving isn't bare
  put(A.entryX + 1, A.entryY + 1, recipe.bone, "floor");
  put(A.entryX + A.entryW - 2, A.entryY + 1, recipe.rubble, "floor");

  return out;
 }

 Delve.genBossFloor = function(G, ward){
  const t = Delve.T;
  const cfg = C();
  const w = G.gridW, h = G.gridH;
  const tune = (ward && ward.bossArena) || {};

  const carve = function(x, y, cw, ch){
   for(let yy = y; yy < y + ch; yy++){
    if(yy < 1 || yy > h - 2) continue;
    for(let xx = x; xx < x + cw; xx++){
     if(xx < 1 || xx > w - 2) continue;
     G.grid[yy][xx] = t.FLOOR;
    }
   }
  };
  const centred = function(span, used){ return Math.round((span - used) / 2); };

  const pad = tune.pad || 2;
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;

  const bossW  = Math.min(maxW, tune.bossW  || Math.floor(w * 0.62));
  const bossH  = Math.min(maxH, tune.bossH  || Math.floor(h * 0.40));
  const entryW = Math.min(maxW, tune.entryW || Math.floor(w * 0.34));
  const entryH = Math.min(maxH, tune.entryH || Math.floor(h * 0.22));
  const corrW  = Math.min(maxW, tune.corridorW || 3);

  const bossX  = centred(w, bossW);
  const bossY  = pad;
  const entryX = centred(w, entryW);
  const entryY = h - pad - entryH;
  const corrX  = centred(w, corrW);
  const corrTop = bossY + bossH;
  const corrH  = Math.max(1, entryY - corrTop);

  // carve south→north so the three pieces meet without gaps
  carve(entryX, entryY, entryW, entryH);
  carve(corrX,  corrTop, corrW, corrH);
  carve(bossX,  bossY,  bossW,  bossH);

  // player spawns in the entry chamber, facing the corridor
  G.px = entryX + Math.floor(entryW / 2);
  G.py = entryY + Math.floor(entryH / 2);
  G.lastDir = "up";

  // boss holds the centre of the arena
  const bx = bossX + Math.floor(bossW / 2);
  const by = bossY + Math.floor(bossH / 2);
  const bossDef = cfg.BOSS_DEFS[Math.ceil(G.floor / 10)] || cfg.BOSS_DEFS[1] || {};
  G.boss = {
   id:"boss", isBoss:true, x:bx, y:by,
   name:bossDef.name || "The Warden", kind:bossDef.sprite || "boss_warden",
   maxHp:bossDef.hp || cfg.bossHpBase, hp:bossDef.hp || cfg.bossHpBase,
   atk:bossDef.atk || cfg.bossAtkBase,
   speed:bossDef.speed || cfg.bossSpeed,
   chainHitEvery:bossDef.chainHitEvery || 3, chainHitCount:0,
   size:bossDef.size || { w:1, h:1 },   // tiles its art covers (own tile = bottom-left)
   effects:[], elite:false, hasActed:false
  };
  G.grid[by][bx] = t.BOSS;

  G.stairs = null;
  G.shop = { x:-1, y:-1 };
  G.floorType = "boss";
  // Exposed so dressing can place props relative to the arena without re-deriving
  // the geometry: render.js derives its braziers from this, and dressBossArena above
  // derives every arena prop position from it.
  G.bossArena = {
   bossX:bossX, bossY:bossY, bossW:bossW, bossH:bossH,
   entryX:entryX, entryY:entryY, entryW:entryW, entryH:entryH,
   corrX:corrX, corrTop:corrTop, corrW:corrW, corrH:corrH, bossCx:bx, bossCy:by
  };
  // Dress the arena (Batch 8). Read-only with respect to the grid.
  G.decor = dressBossArena(G, ward, G.boss, G.bossArena);
 };

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
  G.bossArena = null;
  G.decor = [];   // arena props (Batch 8): decoration only, never tiles
  G.shop = { x:-1, y:-1 };
  G.stairs = null;
  // FIX: floorData used to persist across floors, so a secret room found on
  // floor 9 could leave a phantom false-wall pulse on floor 10.
  G.floorData = {};
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

  // ── Boss floors: bespoke arena, then bail out ──
  // Handled before room generation so the arena is the whole floor, with no
  // stray rooms, corridors, monsters, barrels or chests left over.
  if(G.floor % 10 === 0){
   Delve.genBossFloor(G, ward);
   if(Delve.showBossIntro) Delve.showBossIntro(G.floor);
   return;
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

  // Ward special floors: a swarm chamber or a clustered-loot room. The plan is
  // per ward and comes from its `special` block in con-biomes.js.
  if(ward.special){
   const plan = ensureWardPlan(G, ward);
   if(plan.swarm.indexOf(G.floor) >= 0){
    applySwarmFloor(G, rooms, ward.special);
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
  if(!G) return;
  const chest = G.chests.find(function(c){ return c.x===x && c.y===y; });
  if(!chest || chest.open) return;
  chest.open = true;
  G.grid[y][x] = T().FLOOR;
  if(Delve.sfx) Delve.sfx("chest");
  if(Delve.logSystem) Delve.logSystem("You open a chest.");
  const source = chest.secret ? { kind:"secret" } : { kind:"chest" };

  // high-value chest (Blackvein cluster or swarm): guaranteed tier 3+ item,
  // tier 3 potion, and boosted gold
  if(chest.highValue){
   let tier = Math.max(3, Delve.rollTier(G.floor, (Delve.CONFIG.loot.sourceRarityMult || {}).treasure || 1));
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
   let tier = Delve.rollTier(G.floor, (Delve.CONFIG.loot.sourceRarityMult || {}).chest || 1);
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
