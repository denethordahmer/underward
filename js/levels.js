window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T, C = () => Delve.CONFIG;

  Delve.newRun = function(){
    Delve.G = {
      floor:1, runShards:0, hp:Delve.maxHp(), gold:0,
      grid:[], monsters:[], boss:null, stairs:{x:-1,y:-1},
      items:[], inventory:[], equip:{weapon:null, armour:null, trinkets:[]}, atkBuff:0,
      px:1, py:1, msg:"", msgUntil:0,
      secondWindUsed:false, dead:false
    };
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.genFloor = function(){
    const G = Delve.G, cfg = C();
    const size = Math.min(21, 11 + G.floor*2);

    for(let attempt=0; attempt<60; attempt++){
      const g = buildGrid(size);
      if(hasPath(g, 1, 1, size-2, size-2)){
        G.grid = g;
        return;
      }
    }
    G.grid = buildGrid(size, true);
  };

  function buildGrid(size, noPillars){
    const G = Delve.G, cfg = C();
    G.items = [];

    const g = [];
    for(let y=0;y<size;y++){
      g[y]=[];
      for(let x=0;x<size;x++) g[y][x]=T().FLOOR;
    }
    for(let x=0;x<size;x++){ g[0][x]=T().WALL; g[size-1][x]=T().WALL; }
    for(let y=0;y<size;y++){ g[y][0]=T().WALL; g[y][size-1]=T().WALL; }

    const sx=1, sy=1;
    const tx=size-2, ty=size-2;

    if(!noPillars){
      let placed=0, guard=0;
      while(placed<Math.floor(size*size*0.04) && guard++<800){
        const x=Delve.rng(2,size-3), y=Delve.rng(2,size-3);
        if(g[y][x]!==T().FLOOR) continue;
        if(Math.abs(x-sx)+Math.abs(y-sy)<=2 || Math.abs(x-tx)+Math.abs(y-ty)<=2) continue;
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
      G.boss = {
        x, y, isBoss:true, hasActed:false, kind:"boss",
        hp: Delve.bossHp(), atk: Delve.bossAtk(),
        shards: cfg.bossShardBase + cfg.bossShardPerFloor*G.floor,
        gold: cfg.goldBossBase
      };
      G.stairs = {x:-1,y:-1};
    }

    const cacheChance = cfg.loot.cacheBase + Delve.luckPts() * cfg.loot.cacheLuck;
    if(Math.random() < cacheChance){
      let found=false, tries=0;
      while(!found && tries++<200){
        const cx=Delve.rng(2,size-3), cy=Delve.rng(2,size-3);
        if(g[cy][cx]===T().FLOOR && Math.abs(cx-sx)+Math.abs(cy-sy)>3){
          const tier = Math.max(2, Delve.rollTier(G.floor));
          const item = Delve.makeItem(tier);
          item.x=cx; item.y=cy; item.fromCache=true;
          G.items.push(item);
          found=true;
        }
      }
    }

    return g;
  }

  function hasPath(g, fx, fy, tx, ty){
    const seen = [];
    for(let y=0;y<g.length;y++) seen[y]=[];
    const q = [[fx,fy]];
    seen[fy][fx]=true;
    while(q.length){
      const c = q.shift();
      const x=c[0], y=c[1];
      if(x===tx && y===ty) return true;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for(let i=0;i<dirs.length;i++){
        const nx=x+dirs[i][0], ny=y+dirs[i][1];
        if(g[ny] && g[ny][nx]!==undefined && !seen[ny][nx]){
          seen[ny][nx]=true;
          if(g[ny][nx]!==T().WALL) q.push([nx,ny]);
        }
      }
    }
    return false;
  }

  function makeMonster(x,y){
    const cfg=C(), f=Delve.G.floor;

    let kind = "goblin";
    if(f >= 8) kind = (Math.random() < 0.5) ? "wraith" : "brute";
    else if(f >= 4) kind = (Math.random() < 0.4) ? "brute" : "goblin";

    return {
      x, y, isBoss:false, hasActed:false, kind:kind,
      hp: cfg.monsterHpBase + cfg.monsterHpPerFloor*(f-1),
      atk: Math.round(cfg.monsterAtkBase + cfg.monsterAtkPerFloor*f),
      shards: cfg.monsterShardBase + cfg.monsterShardPerFloor*f,
      gold: Math.round(cfg.goldKillBase + cfg.goldKillPerFloor*f)
    };
  }

  Delve.bossHp  = function(){ const c=C(); return c.bossHpBase + c.bossHpPerFloor*Delve.G.floor; };
  Delve.bossAtk = function(){ const c=C(); return Math.round(c.bossAtkBase + c.bossAtkPerFloor*Delve.G.floor); };
})();
