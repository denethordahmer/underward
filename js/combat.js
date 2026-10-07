window.Delve = window.Delve || {};
(function(){
  const T = () => Delve.T;
  const C = () => Delve.CONFIG;

  function applyHurt(hit){
    const G = Delve.G, sec = C().secondaries;
    if(G.hp <= 0 || G.dead) return;
    G.hp -= hit;
    G.playerHit = Date.now();
    Delve.addFloater("-" + hit, G.px, G.py, "#ff5c5c");
    Delve.addShake(1);
    if(G.hp <= 0){ Delve.die(); return; }

    if(Delve.hasSecondWind() && !G.secondWindUsed &&
       G.hp <= Math.floor(Delve.maxHp() * sec.secondWindTrigger)){
      const heal = Math.round(Delve.maxHp() * sec.secondWindHeal);
      G.hp = Math.min(Delve.maxHp(), G.hp + heal);
      G.secondWindUsed = true;
      Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
      Delve.flash("Second Wind! +" + heal);
    }
  }

  Delve.tryAct = function(tx,ty){
    const G = Delve.G, g = G.grid;
    if(!G || G.dead) return;

    // if targeting an ability, resolve it instead of move/attack
    if(G.targetingAbility){
      const okCast = Delve.castAbility(G.targetingAbility, tx, ty);
      G.targetingAbility = null;
      if(okCast !== false){
        Delve.enemiesTurn();
        Delve.updateHUD();
        return;
      }
    }

    if(!g[ty] || g[ty][tx] === undefined) return;

    const manh = Math.abs(tx - G.px) + Math.abs(ty - G.py);
    if(manh !== 1){
      Delve.flash("Too far — move closer to engage");
      return;
    }

    if(tx > G.px) G.lastDir = "right";
    else if(tx < G.px) G.lastDir = "left";
    else if(ty > G.py) G.lastDir = "down";
    else G.lastDir = "up";

    const cell = g[ty][tx];

    if(cell === T().MONSTER){
      const m = G.monsters.find(function(m){ return m.x === tx && m.y === ty; });
      if(m) Delve.attackMonster(m);
    } else if(cell === T().BOSS){
      if(G.boss && G.boss.x === tx && G.boss.y === ty) Delve.attackMonster(G.boss);
    } else if(cell === T().WALL){
      return;
    } else {
      G.px = tx; G.py = ty;

      const idx = G.items.findIndex(function(i){ return i.x === tx && i.y === ty; });
      if(idx >= 0){
        const it = G.items[idx];
        G.items.splice(idx, 1);
        Delve.pickupItem(it);
      }

      Delve.enemiesTurn();
      if(G.hp > 0 && !G.dead && cell === T().STAIR) Delve.descend();
    }
    Delve.updateHUD();
  };

  Delve.attackMonster = function(m){
    const G = Delve.G, sec = C().secondaries;
    if(G.dead) return;

    G.swing = Date.now();
    m.hitFlash = Date.now();

    let dmg = Delve.atk();
    if(m.isBoss) dmg += Delve.itemBuffs().bossAtk;

    const fs = Delve.firstStrikeBonus();
    if(fs && !m.hasActed) dmg += fs;

    if(Math.random() < Delve.crit()){
      dmg = Math.round(dmg * sec.critMult);
      Delve.addFloater("CRIT " + dmg, m.x, m.y, "#ff9d3d");
    } else {
      Delve.addFloater("-" + dmg, m.x, m.y, "#ffd75e");
    }

    m.hp -= dmg;

    if(m.hp <= 0){
      if(Delve.hasOverkill()){
        const excess = -m.hp;
        const heal = Math.round(excess * sec.overkillHealPct);
        if(heal > 0){
          G.hp = Math.min(Delve.maxHp(), G.hp + heal);
          Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
        }
      }
      Delve.killMonster(m);
    }

    Delve.enemiesTurn();
  };

  Delve.killMonster = function(m){
    const G = Delve.G, g = G.grid;
    const buffs = Delve.itemBuffs();

    g[m.y][m.x] = T().FLOOR;

    if(m.isBoss){
      G.boss = null;
      G.stairs = {x:m.x, y:m.y};
      g[m.y][m.x] = T().STAIR;
      Delve.flash("BOSS DOWN!");
      Delve.addShake(5);
    } else {
      G.monsters = G.monsters.filter(function(x){ return x !== m; });
      Delve.addShake(2);
    }

    const rewards = Delve.killRewards(m);
    Delve.save.shards += rewards.shards;
    G.runShards += rewards.shards;
    Delve.persist();

    G.gold += rewards.gold;
    Delve.addFloater("+" + rewards.shards + " \u25C7", m.x, m.y, "#7ee0ff");
    Delve.addFloater("+" + rewards.gold + " g", m.x, m.y, "#ffd75e");

    // XP on kill + energy regen
    if(Delve.addXP) Delve.addXP(rewards.xp);
    G.energy = Math.min(Delve.maxEnergy ? Delve.maxEnergy() : 100, (G.energy||0) + C().energyPerKill);
  };

  Delve.enemiesTurn = function(){
    const G = Delve.G;
    if(G.hp <= 0 || G.dead) return;
    if(G.boss) actMob(G.boss);
    for(const m of G.monsters){
      if(G.hp <= 0 || G.dead) break;
      actMob(m);
    }
    // tick stone skin
    if(G.stoneSkin > 0) G.stoneSkin--;
  };

  function actMob(m){
    const G = Delve.G;
    if(m.skipNext){ m.skipNext = false; return; }

    const manh = Math.abs(G.px - m.x) + Math.abs(G.py - m.y);
    if(manh !== 1) return;

    m.hasActed = true;

    if(Math.random() < Delve.dodge()){
      Delve.addFloater("dodged", G.px, G.py, "#c2ff4d");
      return;
    }

    let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())) - Delve.flatRed());
    if(G.stoneSkin > 0) hit = Math.round(hit * 0.4);
    if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());
    applyHurt(hit);
  }

  Delve.descend = function(){
    const G = Delve.G;
    G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp()*C().healOnDescendPct));
    G.floor++;
    if(G.floor > Delve.save.bestFloor){ Delve.save.bestFloor = G.floor; Delve.persist(); }
    G.secondWindUsed = false;
    Delve.flash("Floor " + G.floor);
    Delve.genFloor();
    Delve.updateHUD();
  };

  Delve.die = function(){
    const G = Delve.G;
    if(G.dead) return;
    G.dead = true;
    document.getElementById("deathInfo").textContent =
      "You reached floor " + G.floor + " — best " + Delve.save.bestFloor;
    document.getElementById("deathShards").textContent =
      "+" + G.runShards + " shards this run";
    document.getElementById("deathScreen").style.display = "flex";
  };
})();
