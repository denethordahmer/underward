window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T;

  Delve.tryAct = function(tx,ty){
    const G=Delve.G, g=G.grid;
    if(!g[ty] || g[ty][tx]===undefined) return;
    const manh = Math.abs(tx-G.px)+Math.abs(ty-G.py);
    if(manh!==1){ Delve.flash("Tap a square next to you"); return; }
    const cell=g[ty][tx];
    if(cell===T().MONSTER){
      const m=G.monsters.find(m=>m.x===tx&&m.y===ty);
      if(m) Delve.attackMonster(m);
    } else if(cell===T().BOSS){
      if(G.boss && G.boss.x===tx && G.boss.y===ty) Delve.attackMonster(G.boss);
    } else if(cell===T().WALL){
      return;
    } else {
      G.px=tx; G.py=ty;
      if(cell===T().STAIR){
        Delve.enemiesTurn();
        if(G.hp>0) Delve.descend();
        return;
      }
      Delve.enemiesTurn();
    }
    Delve.updateHUD();
  };

  Delve.attackMonster = function(m){
    m.hp -= Delve.atk();
    if(m.hp<=0) killMonster(m);
    Delve.enemiesTurn();
  };

  function killMonster(m){
    const G=Delve.G, g=G.grid;
    g[m.y][m.x]=T().FLOOR;
    if(m.isBoss){
      G.boss=null;
      G.stairs={x:m.x,y:m.y};
      g[m.y][m.x]=T().STAIR;
      Delve.flash("BOSS DOWN!");
    } else {
      G.monsters=G.monsters.filter(x=>x!==m);
    }
    earn(m.shards);
  }

  function earn(n){
    Delve.save.shards+=n; Delve.G.runShards+=n; Delve.persist();
  }

  Delve.enemiesTurn = function(){
    const G=Delve.G;
    if(G.boss) actMob(G.boss);
    for(const m of G.monsters) actMob(m);
  };

  function actMob(m){
    const G=Delve.G, g=G.grid;
    const dx=G.px-m.x, dy=G.py-m.y, manh=Math.abs(dx)+Math.abs(dy);
    if(manh===1){ G.hp-=m.atk; if(G.hp<=0){ Delve.die(); } return; }
    let nx=m.x, ny=m.y;
    if(Math.abs(dx)>=Math.abs(dy)){
      nx=m.x+(dx>0?1:-1);
      if(walkable(g,nx,m.y)){ m.x=nx; return; }
      ny=m.y+(dy>0?1:-1);
      if(walkable(g,m.x,ny)){ m.y=ny; return; }
    } else {
      ny=m.y+(dy>0?1:-1);
      if(walkable(g,m.x,ny)){ m.y=ny; return; }
      nx=m.x+(dx>0?1:-1);
      if(walkable(g,nx,m.y)){ m.x=nx; return; }
    }
  }
  function walkable(g,x,y){ return g[y] && g[y][x]!==undefined && g[y][x]===T().FLOOR; }

  Delve.descend = function(){
    const G=Delve.G;
    G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp()*Delve.CONFIG.healOnDescendPct));
    G.floor++;
    if(G.floor>Delve.save.bestFloor){ Delve.save.bestFloor=G.floor; Delve.persist(); }
    Delve.flash("Floor "+G.floor);
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.die = function(){
    document.getElementById("deathInfo").textContent = "You reached floor "+Delve.G.floor+" — best "+Delve.save.bestFloor;
    document.getElementById("deathShards").textContent = "+"+Delve.G.runShards+" shards this run (total "+Delve.save.shards+")";
    document.getElementById("deathScreen").style.display="flex";
  };
})();
