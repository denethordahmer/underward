window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T, C = () => Delve.CONFIG;

  Delve.newRun = function(){
    const mhp = Delve.maxHp();
    Delve.G = { floor:1, runShards:0, hp:mhp, grid:[], monsters:[], boss:null, stairs:{x:-1,y:-1}, px:1, py:1, msg:"", msgUntil:0 };
    Delve.genFloor();
  };

  Delve.genFloor = function(){
    const G = Delve.G, cfg = C();
    const size = Math.min(21, 11 + G.floor*2);
    const g = [];
    for(let y=0;y<size;y++){ g[y]=[]; for(let x=0;x<size;x++) g[y][x]=T().FLOOR; }
    for(let x=0;x<size;x++){ g[0][x]=T().WALL; g[size-1][x]=T().WALL; }
    for(let y=0;y<size;y++){ g[y][0]=T().WALL; g[y][size-1]=T().WALL; }

    // pillars
    const pillars = Math.floor(size*size*0.06);
    let placed=0, guard=0;
    while(placed<pillars && guard++<500){
      const x=Delve.rng(2,size-3), y=Delve.rng(2,size-3);
      if(g[y][x]===T().FLOOR && !(x===1&&y===1) && !(x===size-2&&y===size-2)){ g[y][x]=T().WALL; placed++; }
    }

    const isBoss = (G.floor % cfg.bossEvery === 0);
    G.px=1; G.py=1;
    G.stairs = { x:size-2, y:size-2 };
    g[G.stairs.y][G.stairs.x] = T().STAIR;

    G.monsters=[]; G.boss=null;
    const count = isBoss ? Math.min(6, 2+G.floor) : Delve.rng(3,5)+Math.min(8,G.floor);
    placed=0; guard=0;
    while(placed<count && guard++<1000){
      const x=Delve.rng(2,size-3), y=Delve.rng(2,size-3);
      const d = Math.abs(x-G.px)+Math.abs(y-G.py);
      if(g[y][x]===T().FLOOR && d>3){ G.monsters.push(makeMonster(x,y)); g[y][x]=T().MONSTER; placed++; }
    }

    if(isBoss){
      const x=G.stairs.x, y=G.stairs.y;
      g[y][x]=T().BOSS;
      G.boss = { x, y, isBoss:true, hp:bossHp(), atk:bossAtk(), shards:cfg.bossShardBase+cfg.bossShardPerFloor*G.floor };
      G.stairs = {x:-1,y:-1};
    }
    G.grid = g;
  };

  function makeMonster(x,y){
    const cfg=C(), f=Delve.G.floor;
    return { x, y, isBoss:false,
      hp: cfg.monsterHpBase+cfg.monsterHpPerFloor*(f-1),
      atk: Math.round(cfg.monsterAtkBase+cfg.monsterAtkPerFloor*f),
      shards: cfg.monsterShardBase+cfg.monsterShardPerFloor*f };
  }
  Delve.bossHp  = function(){ const c=C(); return c.bossHpBase  + c.bossHpPerFloor*Delve.G.floor; };
  Delve.bossAtk = function(){ const c=C(); return Math.round(c.bossAtkBase + c.bossAtkPerFloor*Delve.G.floor); };
})();
