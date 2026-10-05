window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T;
  const C = () => Delve.CONFIG;

  function applyHurt(hit){
    const G = Delve.G, sec = C().secondaries;
    if(G.hp <= 0 || G.dead) return;
    G.hp -= hit;
    if(G.hp <= 0){ Delve.die(); return; }
    if(Delve.hasSecondWind() && !G.secondWindUsed &&
       G.hp <= Math.floor(Delve.maxHp() * sec.secondWindTrigger)){
      const heal = Math.round(Delve.maxHp() * sec.secondWindHeal);
      G.hp = Math.min(Delve.maxHp(), G.hp + heal);
      G.secondWindUsed = true;
      Delve.flash("Second Wind! +" + heal);
    }
  }

  Delve.tryAct = function(tx,ty){
    const G=Delve.G, g=G.grid;
    if(!G || G.dead) return;
    if(!g[ty] || g[ty][tx]===undefined) return;
    const manh = Math.abs(tx-G.px)+Math.abs(ty-G.py);
    if(manh !== 1){ Delve.flash("Tap a square next to you"); return; }
    const cell = g[ty][tx];

    if(cell === T().MONSTER){
      const m = G.monsters.find(m=>m.x===tx&&m.y===ty);
      if(m) Delve.attackMonster(m);
    } else if(cell === T().BOSS){
      if(G.boss && G.boss.x===tx && G.boss.y===ty) Delve.attackMonster(G.boss);
    } else if(cell === T().WALL){
      return;
    } else {
      G.px=tx; G.py=ty;
      Delve.enemiesTurn();
      if(G.hp>0 && !G.dead && cell===T().STAIR) Delve.descend();
    }
    Delve.updateHUD();
  };

  Delve.attackMonster = function(m){
    const G=Delve.G, sec=C().secondaries;
    if(G.dead) return;

    let dmg = Delve.atk();
    const fs = Delve.firstStrikeBonus();
    if(fs && !m.hasActed) dmg += fs;
    if(Math.random() < Delve.crit()){
      dmg = Math.round(dmg * sec.critMult);
      Delve.flash("Critical!");
    }
    m.hp -= dmg;

    if(m.hp <= 0){
      if(Delve.hasOverkill()){
        const excess = -m.hp;
        const heal = Math.round(excess * sec.overkillHealPct);
        if(heal > 0){
          G.hp = Math.min(Delve.maxHp(), G.hp + heal);
          Delve.flash("Overkill +" + heal + " HP");
        }
      }
      killMonster(m);
    }
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
    Delve.save.shards += m.shards;
    G.runShards += m.shards;
    Delve.persist();
  }

  Delve.enemiesTurn = function(){
    const G=Delve.G;
    if(G.hp<=0 || G.dead) return;
    if(G.boss) actMob(G.boss);
    for(const m of G.monsters){
      if(G.hp<=0 || G.dead) break;
      actMob(m);
    }
  };

  function actMob(m){
    const G=Delve.G, g=G.grid;
    m.hasActed = true;
    const dx=G.px-m.x, dy=G.py-m.y, manh=Math.abs(dx)+Math.abs(dy);

    if(manh===1){
      if(Math.random() < Delve.dodge()){ Delve.flash("Dodged"); return; }
      let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())));
      if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());
      applyHurt(hit);
      return;
    }

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
    G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp()*C().healOnDescendPct));
    G.floor++;
    if(G.floor > Delve.save.bestFloor){ Delve.save.bestFloor = G.floor; Delve.persist(); }
    G.secondWindUsed = false;
    Delve.flash("Floor " + G.floor);
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.die = function(){
    const G=Delve.G;
    if(G.dead) return;
    G.dead = true;
    document.getElementById("deathInfo").textContent =
      "You reached floor " + G.floor + " — best " + Delve.save.bestFloor;
    document.getElementById("deathShards").textContent =
      "+" + G.runShards + " shards this run";
    document.getElementById("deathScreen").style.display = "flex";
  };
})();
