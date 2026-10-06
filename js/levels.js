window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T, C = () => Delve.CONFIG;

  Delve.newRun = function(){
    Delve.G = {
      floor:1, runShards:0, hp:Delve.maxHp(),
      grid:[], monsters:[], boss:null, stairs:{x:-1,y:-1},
      px:1, py:1, msg:"", msgUntil:0,
      secondWindUsed:false, dead:false
    };
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.genFloor = function(){
    const G = Delve.G, cfg = C();
    const size = Math.min(21, 11 + G.floor*2);

    // Attempt generation up to 60 times — guarantees an open path spawn→stairs.
    for(let attempt=0; attempt<60; attempt++){
      const g = buildGrid(size);
      if(hasPath(g, 1, 1, size-2, size-2)){
        G.grid = g;
        return;
      }
    }
    // Never happens in practice; fallback = open field with just border walls.
    G.grid = buildGrid(size, true);
  };

  function buildGrid(size, noPillars){
    const G = Delve.G, cfg = C();
    const g = [];
    for(let y=0;y<size;y++){
      g[y]=[];
      for(let x=0;x<size;x++) g[y][x]=T().FLOOR;
    }
    for(let x=0;x<size;x++){ g[0][x]=T().WALL; g[size-1][x]=T().WALL; }
    for(let y=0;y<size;y++){ g[y][0]=T().WALL; g[y][size-1]=T().WALL; }

    const sx=1, sy=1;                    // spawn
    const tx=size-2, ty=size-2;          // stairs

    if(!noPillars){
      const pillars = Math.floor(size*size*0.04);
      let placed=0, guard=0;
      while(placed<pillars && guard++<800){
        const x=Delve.rng(2,size-3), y=Delve.rng(2,size-3);
        if(g[y][x]!==T().FLOOR) continue;
        // Clear zones: never beside spawn or stairs
        const dSpawn = Math.abs(x-sx)+Math.abs(y-sy);
        const dStair = Math.abs(x-tx)+Math.abs(y-ty);
        if(dSpawn<=2 || dStair<=2) continue;
        g[y][x]=T().WALL; placed++;
      }
    }

    const isBoss = (G.floor % cfg.bossEvery === 0);
    G.px=sx; G.py=sy;
    G.stairs = { x:tx, y:ty };
    g[ty][tx] = T().STAIR;

    G.monsters=[]; G.boss=null;

    const count = isBoss
      ? Math.min(6, 2 + Math.floor(G.floor/2))
      : Delve.rng(3,5) + Math.min(4, Math.floor(G.floor/2));

    let placed=0, guard=0;
    while(placed<count && guard++<1000){
      const x=Delve.rng(2,size-3), y=Delve.rng(2,size-3);
      const d = Math.abs(x-sx)+Math.abs(y-sy);
      if(g[y][x]===T().FLOOR && d>3){ G.monsters.push(makeMonster(x,y)); g[y][x]=T().MONSTER; placed++; }
    }

    if(isBoss){
      const x=tx, y=ty;
      g[y][x]=T().BOSS;
      G.boss = { x, y, isBoss:true, hasActed:false,
        hp: Delve.bossHp(), atk: Delve.bossAtk(),
        shards: cfg.bossShardBase + cfg.bossShardPerFloor*G.floor };
      G.stairs = {x:-1,y:-1};
    }
    return g;
  }

  // Flood fill: can the player walk from (fx,fy) to (tx,ty)?
  function hasPath(g, fx, fy, tx, ty){
    const seen = [];
    for(let y=0;y<g.length;y++) seen[y]=[];
    const q = [[fx,fy]];
    seen[fy][fx]=true;
    while(q.length){
      const [x,y] = q.shift();
      if(x===tx && y===ty) return true;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of dirs){
        const nx=x+dx, ny=y+dy;
        if(g[ny] && g[ny][nx]!==undefined && !seen[ny][nx]){
          seen[ny][nx]=true;
          // Walls block; monsters/stairs are passable
          if(g[ny][nx]!==T().WALL) q.push([nx,ny]);
        }
      }
    }
    return false;
  }

  function makeMonster(x,y){
    const cfg=C(), f=Delve.G.floor;
    return { x, y, isBoss:false, hasActed:false,
      hp: cfg.monsterHpBase + cfg.monsterHpPerFloor*(f-1),
      atk: Math.round(cfg.monsterAtkBase + cfg.monsterAtkPerFloor*f),
      shards: cfg.monsterShardBase + cfg.monsterShardPerFloor*f };
  }

  Delve.bossHp  = function(){ const c=C(); return c.bossHpBase + c.bossHpPerFloor*Delve.G.floor; };
  Delve.bossAtk = function(){ const c=C(); return Math.round(c.bossAtkBase + c.bossAtkPerFloor*Delve.G.floor); };
})();
