window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T;
  const C = () => Delve.CONFIG;

  Delve.newRun = function(){
    Delve.G = {
      floor:1, runShards:0, hp:Delve.maxHp(), gold:0,
      grid:[], monsters:[], boss:null, stairs:{x:-1,y:-1},
      items:[], inventory:[], equip:{weapon:null, armour:null, trinkets:[]}, atkBuff:0,
      px:1, py:1, xp:0, level:1, abilities:[], msg:"", msgUntil:0,
      secondWindUsed:false, dead:false
    };
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.genFloor = function(){
    const G = Delve.G, cfg = C();
    const isBoss = (G.floor % cfg.bossEvery === 0);
    if(isBoss){
      buildBossFloor();
    } else {
      buildNormalFloor();
    }
  };

  // ============================================================
  // GRID HELPERS
  // ============================================================
  function blankGrid(size){
    const g = [];
    for(let y=0; y<size; y++){
      g[y] = [];
      for(let x=0; x<size; x++) g[y][x] = T().WALL;
    }
    return g;
  }

  function carveRect(g, x, y, w, h, tile){
    tile = (tile === undefined) ? T().FLOOR : tile;
    for(let yy=y; yy<y+h; yy++){
      for(let xx=x; xx<x+w; xx++){
        if(yy>=0 && xx>=0 && yy<g.length && xx<g[0].length){
          g[yy][xx] = tile;
        }
      }
    }
  }

  function centerOf(r){
    return { x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) };
  }

  // ============================================================
  // ROOM GENERATION
  // ============================================================
  function placeRooms(size){
    const G = Delve.G, ward = Delve.getWard(G.floor);
    const count = Delve.rng(ward.roomMin, ward.roomMax);
    const rooms = [];
    const dims = {};
    const margin = 1;

    for(let i=0; i<count; i++){
      let placed = false;

      for(let attempt=0; attempt<120 && !placed; attempt++){
        let w = Delve.rng(ward.roomWMin, ward.roomWMax);
        let h = Delve.rng(ward.roomHMin, ward.roomHMax);

        // no more than N rooms with identical width+height per floor
        const key = w+"x"+h;
        if((dims[key] || 0) >= ward.roomMaxDuplicateSize){
          w = (w === ward.roomWMax) ? ward.roomWMin : w + 1;
        }

        const x = Delve.rng(1, Math.max(1, size-2-w));
        const y = Delve.rng(1, Math.max(1, size-2-h));

        if(!overlaps(x, y, w, h, rooms, margin)){
          rooms.push({ id:i, x:x, y:y, w:w, h:h, type:"normal" });
          dims[key] = (dims[key] || 0) + 1;
          placed = true;
        }
      }

      if(!placed) return null;
    }

    return rooms;
  }

  function overlaps(x, y, w, h, rooms, margin){
    margin = margin || 0;
    for(const r of rooms){
      if(x < r.x + r.w + margin && x + w + margin > r.x &&
         y < r.y + r.h + margin && y + h + margin > r.y){
        return true;
      }
    }
    return false;
  }

  function carveRooms(g, rooms){
    for(const r of rooms){
      carveRect(g, r.x, r.y, r.w, r.h, T().FLOOR);
    }
  }

  // ============================================================
  // CORRIDORS (L-shaped, spanning tree + optional loops)
  // ============================================================
  function carveCorridors(g, rooms, corridors){
    // deterministic spanning order: sort by x+y so carving is clean
    const ordered = rooms.slice().sort((a,b) => (a.x+a.y)-(b.x+b.y));

    for(let i=1; i<ordered.length; i++){
      const a = centerOf(ordered[i-1]);
      const b = centerOf(ordered[i]);
      carveL(g, a, b);
      corridors.push({ from: ordered[i-1].id, to: ordered[i].id, a:a, b:b });
    }

    // extra loops for richer layouts
    const extra = (rooms.length >= 9) ? Delve.rng(1,2) : 0;
    for(let i=0; i<extra; i++){
      const a = rooms[Delve.rng(0, rooms.length-1)];
      const b = rooms[Delve.rng(0, rooms.length-1)];
      if(a.id !== b.id){
        carveL(g, centerOf(a), centerOf(b));
        corridors.push({ from:a.id, to:b.id, a:centerOf(a), b:centerOf(b), loop:true });
      }
    }
  }

  function carveL(g, a, b){
    let x = a.x, y = a.y;
    while(x !== b.x){
      if(g[y] && g[y][x] !== undefined) g[y][x] = T().FLOOR;
      x += (b.x > x) ? 1 : -1;
    }
    while(y !== b.y){
      if(g[y] && g[y][x] !== undefined) g[y][x] = T().FLOOR;
      y += (b.y > y) ? 1 : -1;
    }
    if(g[y] && g[y][x] !== undefined) g[y][x] = T().FLOOR;
  }

  // ============================================================
  // START / STAIRS / TREASURE SELECTION
  // ============================================================
  function edgeDistance(r, size){
    return Math.min(r.x, r.y, size-1-(r.x+r.w-1), size-1-(r.y+r.h-1));
  }

  function pickStartRoom(rooms, size){
    let best = rooms[0], bestD = Infinity;
    for(const r of rooms){
      const d = edgeDistance(r, size);
      if(d < bestD){ bestD = d; best = r; }
    }
    return best;
  }

  function pickStairRoom(rooms, startRoom){
    let best = null, bestD = -1;
    const sc = centerOf(startRoom);
    for(const r of rooms){
      if(r.id === startRoom.id) continue;
      if(r.type === "treasure") continue;
      const d = Delve.mdist(centerOf(r).x, centerOf(r).y, sc.x, sc.y);
      if(d > bestD){ bestD = d; best = r; }
    }
    return best;
  }

  function rollTreasureRoom(rooms, startRoom, stairRoom){
    const G = Delve.G, ward = Delve.getWard(G.floor);
    const chance = Math.min(ward.treasureChanceCap,
      ward.treasureChanceBase + Delve.luckPts() * ward.treasureChanceLuck);
    if(Math.random() >= chance) return null;

    const candidates = rooms.filter(r =>
      r.type === "normal" && r.id !== startRoom.id && (!stairRoom || r.id !== stairRoom.id));
    if(!candidates.length) return null;

    const pick = candidates[Delve.rng(0, candidates.length-1)];
    pick.type = "treasure";
    return pick;
  }

  // ============================================================
  // MONSTER SPAWN
  // ============================================================
  function spawnMonsters(g, rooms, startRoom, stairRoom, treasureRoom){
    const G = Delve.G;
    const band = Delve.getMonsterBand(G.floor);
    const count = Delve.rng(band.countMin, band.countMax);
    const monsters = [];
    const used = new Set();

    const candidates = rooms.filter(r =>
      r.type === "normal" && r.id !== startRoom.id);

    for(let i=0; i<count; i++){
      let placed = false;
      for(let attempt=0; attempt<200 && !placed; attempt++){
        const room = pickFarRoom(candidates, startRoom);
        if(!room) break;

        const x = Delve.rng(room.x+1, room.x+room.w-2);
        const y = Delve.rng(room.y+1, room.y+room.h-2);
        const key = x+","+y;

        if(g[y] && g[y][x] !== T().FLOOR) continue;
        if(used.has(key)) continue;
        if(Delve.mdist(x,y,G.px,G.py) < C().spawnSafetyRadius) continue;
        if(g[y][x] === T().STAIR) continue;

        const type = Delve.pickWeighted(band.weights);
        const m = makeMonster(type, x, y);
        monsters.push(m);
        g[y][x] = T().MONSTER;
        used.add(key);
        placed = true;
      }
    }
    return monsters;
  }

  function pickFarRoom(rooms, startRoom){
    const sc = centerOf(startRoom);
    let total = 0;
    const weights = rooms.map(r => {
      const d = Delve.mdist(centerOf(r).x, centerOf(r).y, sc.x, sc.y) + 1;
      total += d;
      return d;
    });
    let roll = Math.random() * total;
    for(let i=0; i<rooms.length; i++){
      roll -= weights[i];
      if(roll <= 0) return rooms[i];
    }
    return rooms[rooms.length-1];
  }

  function makeMonster(type, x, y){
    const cfg = C(), f = Delve.G.floor;
    const row = cfg.MONSTER_ROSTER[type] || cfg.MONSTER_ROSTER.goblin;
    return {
      x: x, y: y,
      isBoss: false,
      kind: row.kind,
      name: row.name,
      hp: Math.round(row.hp + row.hpPerFloor * (f - 1)),
      atk: Math.max(1, Math.round(row.atk + row.atkPerFloor * f)),
      xp: row.xp,
      shards: row.shards + Math.floor(f * 0.5),
      gold: row.gold + Math.floor(f * 0.5),
      hasActed: false,
      skipNext: false
    };
  }

  // ============================================================
  // TREASURE CONTENTS
  // ============================================================
  function populateTreasureRoom(g, room){
    const G = Delve.G;
    const tries = 3 + Delve.rng(0,1);
    for(let i=0; i<tries; i++){
      const x = Delve.rng(room.x+1, room.x+room.w-2);
      const y = Delve.rng(room.y+1, room.y+room.h-2);
      if(g[y] && g[y][x] === T().FLOOR){
        const tier = Math.max(2, Delve.rollTier(G.floor));
        const item = Delve.makeItem(tier);
        item.x = x;
        item.y = y;
        item.fromCache = true;
        G.items.push(item);
      }
    }
  }

  // ============================================================
  // NORMAL FLOOR
  // ============================================================
  function buildNormalFloor(){
    const G = Delve.G, ward = Delve.getWard(G.floor);
    const size = ward.dungeonSize;
    const stair = {x:-1, y:-1};
    const corridors = [];

    for(let attempt=0; attempt<80; attempt++){
      const g = blankGrid(size);
      const rooms = placeRooms(size);
      if(!rooms) continue;

      const startRoom = pickStartRoom(rooms, size);
      const stairRoom = pickStairRoom(rooms, startRoom);
      if(!stairRoom) continue;

      const treasureRoom = rollTreasureRoom(rooms, startRoom, stairRoom);

      carveRooms(g, rooms);
      carveCorridors(g, rooms, corridors);

      const sc = centerOf(startRoom);
      const stc = centerOf(stairRoom);

      G.px = sc.x;
      G.py = sc.y;
      G.stairs = { x: stc.x, y: stc.y };
      g[stc.y][stc.x] = T().STAIR;

      G.monsters = spawnMonsters(g, rooms, startRoom, stairRoom, treasureRoom);
      G.boss = null;
      G.items = [];
      if(treasureRoom) populateTreasureRoom(g, treasureRoom);

      G.grid = g;
      G.floorData = {
        size: size,
        rooms: rooms,
        corridors: corridors,
        startRoom: startRoom,
        stairRoom: stairRoom,
        treasureRoom: treasureRoom,
        bossFloor: false
      };
      return;
    }

    // fail-safe: simple open room (can't softlock)
    const g = blankGrid(size);
    carveRect(g, 1, 1, size-2, size-2, T().FLOOR);
    G.px = Math.floor(size/2);
    G.py = Math.floor(size/2);
    G.stairs = { x: 2, y: 2 };
    g[2][2] = T().STAIR;
    G.monsters = [];
    G.boss = null;
    G.grid = g;
    G.floorData = { size:size, rooms:[], corridors:[], startRoom:null, stairRoom:null, treasureRoom:null, bossFloor:false };
  }

  // ============================================================
  // BOSS FLOOR
  // ============================================================
  function buildBossFloor(){
    const G = Delve.G, cfg = C(), ward = Delve.getWard(G.floor);
    const size = ward.dungeonSize;
    const pad = ward.bossArenaPadding || 2;
    const g = blankGrid(size);
    carveRect(g, pad, pad, size-pad*2, size-pad*2, T().FLOOR);

    const cx = Math.floor(size/2), cy = Math.floor(size/2);
    G.px = pad+2;
    G.py = pad+2;
    G.stairs = { x:-1, y:-1 };

    const room = { id:0, x:pad, y:pad, w:size-pad*2, h:size-pad*2, type:"arena" };
    G.floorData = {
      size:size, rooms:[room], corridors:[], startRoom:room, stairRoom:null, treasureRoom:null, bossFloor:true
    };

    // guards
    const guards = [];
    const guardSpots = [
      [pad+1, pad+1], [pad+1, size-pad-2],
      [size-pad-2, pad+1], [size-pad-2, size-pad-2]
    ];
    for(const [gx, gy] of guardSpots){
      const m = makeMonster("goblin", gx, gy);
      guards.push(m);
      g[gy][gx] = T().MONSTER;
    }

    // boss in the centre
    G.boss = {
      x: cx, y: cy, isBoss:true, kind:"boss", name:"Ward Boss",
      hp: Delve.bossHp(), atk: Delve.bossAtk(),
      xp: 25, shards: cfg.bossShardBase + cfg.bossShardPerFloor*G.floor,
      gold: cfg.goldBossBase,
      hasActed:false, skipNext:false
    };
    g[cy][cx] = T().BOSS;
    G.monsters = guards;
    G.items = [];
    G.grid = g;
  }

  // ---- legacy boss stat helpers (used by combat/render) ----
  Delve.bossHp  = function(){ const c=C(); return c.bossHpBase + c.bossHpPerFloor*Delve.G.floor; };
  Delve.bossAtk = function(){ const c=C(); return Math.round(c.bossAtkBase + c.bossAtkPerFloor*Delve.G.floor); };
})();
