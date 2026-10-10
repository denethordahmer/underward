window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T;
  const C = () => Delve.CONFIG;

  Delve.newRun = function(){
    Delve.G = {
      floor:1, runShards:0, hp:Delve.maxHp(), gold:0,
      grid:[], monsters:[], boss:null, stairs:{x:-1,y:-1},
      items:[], inventory:[], equip:{weapon:null,armour:null,trinkets:[]},
      atkBuff:0, speedBuff:0,
      px:1, py:1, xp:0, level:1, abilities:[], energy:10,
      msg:"", msgUntil:0,
      secondWindUsed:false, dead:false,
      // auto-combat
      combatTarget:null, combatTimer:null,
      // rest
      restCount:0,
      // pathfinding
      _path:null, _pathTimer:null
    };
    if(Delve.clearLog) Delve.clearLog();
    const lp = document.getElementById("logPanel");
    if(lp) lp.classList.add("active");
    if(Delve.logSystem) Delve.logSystem("Run started — Floor 1");
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.genFloor = function(){
    const G = Delve.G, cfg = C();
    // reset per-floor state
    G.restCount = 0;
    G.combatTarget = null;
    if(G.combatTimer){ clearInterval(G.combatTimer); G.combatTimer = null; }
    G._path = null;
    if(G._pathTimer){ clearInterval(G._pathTimer); G._pathTimer = null; }

    const isBoss = (G.floor % cfg.bossEvery === 0);
    if(isBoss) buildBossFloor();
    else       buildNormalFloor();
  };

  // ── Grid helpers ─────────────────────────────────────────────
  function blankGrid(size){
    const g = [];
    for(let y=0;y<size;y++){
      g[y]=[];
      for(let x=0;x<size;x++) g[y][x]=T().WALL;
    }
    return g;
  }
  function carveRect(g,x,y,w,h,tile){
    tile = (tile===undefined)?T().FLOOR:tile;
    for(let yy=y;yy<y+h;yy++)
      for(let xx=x;xx<x+w;xx++)
        if(yy>=0&&xx>=0&&yy<g.length&&xx<g[0].length) g[yy][xx]=tile;
  }
  function centerOf(r){ return {x:r.x+Math.floor(r.w/2), y:r.y+Math.floor(r.h/2)}; }

  // ── Room placement ───────────────────────────────────────────
  function placeRooms(size){
    const G=Delve.G, ward=Delve.getWard(G.floor);
    const count=Delve.rng(ward.roomMin,ward.roomMax);
    const rooms=[], dims={}, margin=1;
    for(let i=0;i<count;i++){
      let placed=false;
      for(let attempt=0;attempt<120&&!placed;attempt++){
        let w=Delve.rng(ward.roomWMin,ward.roomWMax);
        let h=Delve.rng(ward.roomHMin,ward.roomHMax);
        const key=w+"x"+h;
        if((dims[key]||0)>=ward.roomMaxDuplicateSize)
          w=(w===ward.roomWMax)?ward.roomWMin:w+1;
        const x=Delve.rng(1,Math.max(1,size-2-w));
        const y=Delve.rng(1,Math.max(1,size-2-h));
        if(!overlaps(x,y,w,h,rooms,margin)){
          rooms.push({id:i,x,y,w,h,type:"normal"});
          dims[key]=(dims[key]||0)+1;
          placed=true;
        }
      }
      if(!placed) return null;
    }
    return rooms;
  }
  function overlaps(x,y,w,h,rooms,margin){
    margin=margin||0;
    for(const r of rooms)
      if(x<r.x+r.w+margin&&x+w+margin>r.x&&y<r.y+r.h+margin&&y+h+margin>r.y) return true;
    return false;
  }
  function carveRooms(g,rooms){
    for(const r of rooms) carveRect(g,r.x,r.y,r.w,r.h,T().FLOOR);
  }

  // ── Corridors ────────────────────────────────────────────────
  function carveCorridors(g,rooms,corridors){
    const ordered=rooms.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    for(let i=1;i<ordered.length;i++){
      const a=centerOf(ordered[i-1]), b=centerOf(ordered[i]);
      carveL(g,a,b);
      corridors.push({from:ordered[i-1].id,to:ordered[i].id,a,b});
    }
    const extra=(rooms.length>=9)?Delve.rng(1,2):0;
    for(let i=0;i<extra;i++){
      const a=rooms[Delve.rng(0,rooms.length-1)];
      const b=rooms[Delve.rng(0,rooms.length-1)];
      if(a.id!==b.id){
        carveL(g,centerOf(a),centerOf(b));
        corridors.push({from:a.id,to:b.id,a:centerOf(a),b:centerOf(b),loop:true});
      }
    }
  }
  function carveL(g,a,b){
    let x=a.x,y=a.y;
    while(x!==b.x){ if(g[y]&&g[y][x]!==undefined) g[y][x]=T().FLOOR; x+=(b.x>x)?1:-1; }
    while(y!==b.y){ if(g[y]&&g[y][x]!==undefined) g[y][x]=T().FLOOR; y+=(b.y>y)?1:-1; }
    if(g[y]&&g[y][x]!==undefined) g[y][x]=T().FLOOR;
  }

  // ── Room selection helpers ───────────────────────────────────
  function edgeDistance(r,size){
    return Math.min(r.x,r.y,size-1-(r.x+r.w-1),size-1-(r.y+r.h-1));
  }
  function pickStartRoom(rooms,size){
    let best=rooms[0],bestD=Infinity;
    for(const r of rooms){ const d=edgeDistance(r,size); if(d<bestD){bestD=d;best=r;} }
    return best;
  }
  function pickStairRoom(rooms,startRoom){
    let best=null,bestD=-1;
    const sc=centerOf(startRoom);
    for(const r of rooms){
      if(r.id===startRoom.id||r.type==="treasure") continue;
      const d=Delve.mdist(centerOf(r).x,centerOf(r).y,sc.x,sc.y);
      if(d>bestD){bestD=d;best=r;}
    }
    return best;
  }
  function rollTreasureRoom(rooms,startRoom,stairRoom){
    const G=Delve.G, ward=Delve.getWard(G.floor);
    const chance=Math.min(ward.treasureChanceCap,
      ward.treasureChanceBase+Delve.luckPts()*ward.treasureChanceLuck);
    if(Math.random()>=chance) return null;
    const candidates=rooms.filter(r=>
      r.type==="normal"&&r.id!==startRoom.id&&(!stairRoom||r.id!==stairRoom.id));
    if(!candidates.length) return null;
    const pick=candidates[Delve.rng(0,candidates.length-1)];
    pick.type="treasure";
    return pick;
  }

  // ── Secret room ──────────────────────────────────────────────
  // Every ~3-4 floors (luck-influenced) a secret room is placed.
  // One wall tile adjacent to a room is marked as a false wall.
  // The false wall slowly pulses in render.js to hint its presence.
  function rollSecretRoom(g, rooms, size){
    const G=Delve.G, ward=Delve.getWard(G.floor);
    const chance=Math.min(ward.secretRoomChanceCap,
      ward.secretRoomChanceBase + Delve.luckPts()*ward.secretRoomChanceLuck);
    // ~1 in 3-4 floors on average
    if(Math.random() > chance * 0.30) return null;

    // pick a random normal room to attach the secret room to
    const normal=rooms.filter(r=>r.type==="normal");
    if(normal.length<2) return null;
    const host=normal[Delve.rng(0,normal.length-1)];

    // try all four sides of the host room for a wall to break through
    const sides=[
      {dx:0,  dy:-1, rx:host.x,        ry:host.y-4,      rw:host.w,   rh:3},
      {dx:0,  dy:1,  rx:host.x,        ry:host.y+host.h+1,rw:host.w,   rh:3},
      {dx:-1, dy:0,  rx:host.x-4,      ry:host.y,         rw:3,        rh:host.h},
      {dx:1,  dy:0,  rx:host.x+host.w+1,ry:host.y,        rw:3,        rh:host.h}
    ];
    for(const s of sides.sort(()=>Math.random()-0.5)){
      // false wall position: middle of that side
      const fwx = (s.dx===0) ? host.x+Math.floor(host.w/2) : (s.dx<0 ? host.x-1 : host.x+host.w);
      const fwy = (s.dy===0) ? host.y+Math.floor(host.h/2) : (s.dy<0 ? host.y-1 : host.y+host.h);
      if(fwx<=0||fwy<=0||fwx>=size-1||fwy>=size-1) continue;
      if(g[fwy][fwx]!==T().WALL) continue;

      // carve the small secret room beyond
      if(s.rx<1||s.ry<1||s.rx+s.rw>=size-1||s.ry+s.rh>=size-1) continue;
      carveRect(g,s.rx,s.ry,s.rw,s.rh,T().FLOOR);

      // mark the false wall in floorData for render (twinkle)
      return { falseWallX:fwx, falseWallY:fwy,
               roomX:s.rx, roomY:s.ry, roomW:s.rw, roomH:s.rh };
    }
    return null;
  }

  function populateSecretRoom(g, secret){
    if(!secret) return;
    const G=Delve.G;
    const cx=secret.roomX+Math.floor(secret.roomW/2);
    const cy=secret.roomY+Math.floor(secret.roomH/2);

    // always: one chest + maybe a potion
    placeChest(g, cx, cy, true);
    if(secret.roomW>2&&secret.roomH>2){
      const px=secret.roomX+1, py=secret.roomY+1;
      if(g[py][px]===T().FLOOR) placeChest(g,px,py,false);
    }
  }

  // ── Chests ───────────────────────────────────────────────────
  function placeChest(g, x, y, guaranteed){
    if(!g[y]||g[y][x]!==T().FLOOR) return;
    const G=Delve.G;
    G.chests = G.chests || [];
    G.chests.push({ x, y, open:false, guaranteed:!!guaranteed });
    g[y][x]=T().CHEST;
  }

  Delve.openChest = function(x, y){
    const G=Delve.G;
    G.chests = G.chests||[];
    const chest=G.chests.find(c=>c.x===x&&c.y===y);
    if(!chest||chest.open) return;
    chest.open=true;
    G.grid[y][x]=T().FLOOR;

    // Roll 2-3 items, min tier 2 for guaranteed, tier 1+ otherwise
    const count=Delve.rng(2,3);
    for(let i=0;i<count;i++){
      const tier=Delve.rollTier(G.floor);
      const item=Delve.makeItem(chest.guaranteed ? Math.max(2,tier) : tier);
      item.x=x; item.y=y+i; // spread items out
      if(G.grid[y+i]&&G.grid[y+i][x]===T().FLOOR)
        G.items.push(item);
      else
        G.items.push(Object.assign({},item,{x,y}));
    }
    Delve.flash("Chest opened!");
    if(Delve.logSystem) Delve.logSystem("Opened a chest.");
    Delve.updateHUD();
    Delve.draw();
  };

  // ── Monster spawn ────────────────────────────────────────────
  function spawnMonsters(g,rooms,startRoom){
    const G=Delve.G;
    const band=Delve.getMonsterBand(G.floor);
    const count=Delve.rng(band.countMin,band.countMax);
    const monsters=[];
    const used=new Set();
    const candidates=rooms.filter(r=>r.type==="normal"&&r.id!==startRoom.id);

    for(let i=0;i<count;i++){
      let placed=false;
      for(let attempt=0;attempt<200&&!placed;attempt++){
        const room=pickFarRoom(candidates,startRoom);
        if(!room) break;
        const x=Delve.rng(room.x+1,room.x+room.w-2);
        const y=Delve.rng(room.y+1,room.y+room.h-2);
        const key=x+","+y;
        if(!g[y]||g[y][x]!==T().FLOOR) continue;
        if(used.has(key)) continue;
        if(Delve.mdist(x,y,G.px,G.py)<C().spawnSafetyRadius) continue;
        const type=Delve.pickWeighted(band.weights);
        const m=makeMonster(type,x,y);
        monsters.push(m);
        g[y][x]=T().MONSTER;
        used.add(key);
        placed=true;
      }
    }
    return monsters;
  }
  function pickFarRoom(rooms,startRoom){
    const sc=centerOf(startRoom);
    let total=0;
    const weights=rooms.map(r=>{ const d=Delve.mdist(centerOf(r).x,centerOf(r).y,sc.x,sc.y)+1; total+=d; return d; });
    let roll=Math.random()*total;
    for(let i=0;i<rooms.length;i++){ roll-=weights[i]; if(roll<=0) return rooms[i]; }
    return rooms[rooms.length-1];
  }
  function makeMonster(type,x,y){
    const cfg=C(), f=Delve.G.floor;
    const row=cfg.MONSTER_ROSTER[type]||cfg.MONSTER_ROSTER.goblin;
    return {
      x,y, isBoss:false, kind:row.kind, name:row.name,
      hp:   Math.round(row.hp   + row.hpPerFloor  * (f-1)),
      maxHp:Math.round(row.hp   + row.hpPerFloor  * (f-1)),
      atk:  Math.max(1,Math.round(row.atk + row.atkPerFloor * f)),
      speed:row.speed||1.0,
      xp:row.xp, shards:row.shards+Math.floor(f*0.5), gold:row.gold+Math.floor(f*0.5),
      hasActed:false, skipNext:false
    };
  }

  // ── Treasure room contents ───────────────────────────────────
  function populateTreasureRoom(g,room){
    const G=Delve.G;
    // Place 2 chests in treasure rooms instead of loose items
    const positions=[
      {x:room.x+Math.floor(room.w*0.3), y:room.y+Math.floor(room.h/2)},
      {x:room.x+Math.floor(room.w*0.7), y:room.y+Math.floor(room.h/2)}
    ];
    for(const p of positions){
      if(g[p.y]&&g[p.y][p.x]===T().FLOOR) placeChest(g,p.x,p.y,false);
    }
  }

  // ── Normal floor builder ─────────────────────────────────────
  function buildNormalFloor(){
    const G=Delve.G, ward=Delve.getWard(G.floor);
    const size=ward.dungeonSize;
    const corridors=[];

    for(let attempt=0;attempt<80;attempt++){
      const g=blankGrid(size);
      const rooms=placeRooms(size);
      if(!rooms) continue;

      const startRoom=pickStartRoom(rooms,size);
      const stairRoom=pickStairRoom(rooms,startRoom);
      if(!stairRoom) continue;

      const treasureRoom=rollTreasureRoom(rooms,startRoom,stairRoom);
      carveRooms(g,rooms);
      carveCorridors(g,rooms,corridors);

      const sc=centerOf(startRoom);
      const stc=centerOf(stairRoom);
      G.px=sc.x; G.py=sc.y;
      G.stairs={x:stc.x,y:stc.y};
      g[stc.y][stc.x]=T().STAIR;

      G.chests=[];
      G.monsters=spawnMonsters(g,rooms,startRoom);
      G.boss=null;
      G.items=[];

      if(treasureRoom) populateTreasureRoom(g,treasureRoom);

      // Secret room
      const secret=rollSecretRoom(g,rooms,size);
      if(secret) populateSecretRoom(g,secret);

      G.grid=g;
      G.floorData={
        size, rooms, corridors, startRoom, stairRoom,
        treasureRoom, bossFloor:false, secretRoom:secret||null
      };
      return;
    }
    // Fail-safe
    const g=blankGrid(size);
    carveRect(g,1,1,size-2,size-2,T().FLOOR);
    G.px=Math.floor(size/2); G.py=Math.floor(size/2);
    G.stairs={x:2,y:2}; g[2][2]=T().STAIR;
    G.chests=[]; G.monsters=[]; G.boss=null; G.items=[];
    G.grid=g;
    G.floorData={size,rooms:[],corridors:[],startRoom:null,stairRoom:null,treasureRoom:null,bossFloor:false,secretRoom:null};
  }

  // ── Boss floor builder ───────────────────────────────────────
  function buildBossFloor(){
    const G=Delve.G, cfg=C(), ward=Delve.getWard(G.floor);
    const size=ward.dungeonSize;
    const pad=ward.bossArenaPadding||2;
    const g=blankGrid(size);
    carveRect(g,pad,pad,size-pad*2,size-pad*2,T().FLOOR);
    const cx=Math.floor(size/2), cy=Math.floor(size/2);
    G.px=pad+2; G.py=pad+2;
    G.stairs={x:-1,y:-1};
    const room={id:0,x:pad,y:pad,w:size-pad*2,h:size-pad*2,type:"arena"};
    G.floorData={size,rooms:[room],corridors:[],startRoom:room,stairRoom:null,treasureRoom:null,bossFloor:true,secretRoom:null};

    // Guards
    const guards=[];
    [[pad+1,pad+1],[pad+1,size-pad-2],[size-pad-2,pad+1],[size-pad-2,size-pad-2]].forEach(([gx,gy])=>{
      const m=makeMonster("goblin",gx,gy);
      guards.push(m); g[gy][gx]=T().MONSTER;
    });

    // The Warden
    const bossDef=cfg.BOSS_DEFS[1]||{};
    G.boss={
      x:cx, y:cy, isBoss:true, kind:"boss",
      name:bossDef.name||"The Warden",
      hp:bossDef.hp||120, maxHp:bossDef.hp||120,
      atk:bossDef.atk||14, speed:bossDef.speed||0.65,
      chainHitEvery:bossDef.chainHitEvery||3, chainHitCount:0,
      xp:30, shards:cfg.bossShardBase+cfg.bossShardPerFloor*G.floor,
      gold:cfg.goldBossBase, hasActed:false, skipNext:false
    };
    g[cy][cx]=T().BOSS;
    G.chests=[]; G.monsters=guards; G.items=[]; G.grid=g;
  }

  Delve.bossHp  = function(){ const c=C(),G=Delve.G; return G.boss?G.boss.maxHp:c.bossHpBase; };
  Delve.bossAtk = function(){ const c=C(),G=Delve.G; return G.boss?G.boss.atk:c.bossAtkBase; };
})();
