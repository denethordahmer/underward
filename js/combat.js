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
    const G = Delve.G, g = G.grid;
    if(!G || G.dead) return;
    if(!g[ty] || g[ty][tx] === undefined) return;

    const manh = Math.abs(tx - G.px) + Math.abs(ty - G.py);
    if(manh !== 1){
      // tapping a far monster = "that's too far" — no free attacks at range
      Delve.flash("Too far — move closer to engage");
      return;
    }

    // face the direction of the action
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
      // move onto the open tile
      G.px = tx; G.py = ty;

      // walk-over pickup
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

    let dmg = Delve.atk();
    if(m.isBoss) dmg += Delve.itemBuffs().bossAtk;

    // First Strike: monsters that have never swung at you take extra
    const fs = Delve.firstStrikeBonus();
    if(fs && !m.hasActed) dmg += fs;

    if(Math.random() < Delve.crit()){
      dmg = Math.round(dmg * sec.critMult);
      Delve.flash("Critical! -" + dmg);
    } else {
      Delve.flash("You hit " + m.name + " for " + dmg);
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
      Delve.killMonster(m);
    }

    // the monster (and any others adjacent) get their retaliation/action now
    Delve.enemiesTurn();
  };

  Delve.killMonster = function(m){
    const G = Delve.G, g = G.grid;
    const buffs = Delve.itemBuffs();

    g[m.y][m.x] = T().FLOOR;

    if(m.isBoss){
      G.boss = null;
      G.stairs = {x: m.x, y: m.y};
      g[m.y][m.x] = T().STAIR;
      Delve.flash("BOSS DOWN!");
    } else {
      G.monsters = G.monsters.filter(function(x){ return x !== m; });
    }

    Delve.save.shards += m.shards + buffs.shardBonus;
    G.runShards += m.shards + buffs.shardBonus;
    Delve.persist();

    const gMult = 1 + Delve.luckPts() * C().goldLuckMult + buffs.goldBonus;
    G.gold += Math.round(m.gold * gMult);

    Delve.rollKillDrop(m.x, m.y, { guaranteed: !!m.isBoss, minTier: m.isBoss ? 2 : 1 });
  };

  Delve.enemiesTurn = function(){
    const G = Delve.G;
    if(G.hp <= 0 || G.dead) return;
    if(G.boss) actMob(G.boss);
    for(const m of G.monsters){
      if(G.hp <= 0 || G.dead) break;
      actMob(m);
    }
  };

  // SENTRIES: attack ONLY if the player is in an adjacent square.
  // They do not move. Ever. The player chooses when to engage.
  function actMob(m){
    const G = Delve.G;

    if(m.skipNext){ m.skipNext = false; return; }

    const manh = Math.abs(G.px - m.x) + Math.abs(G.py - m.y);
    if(manh !== 1) return;      // not adjacent — sentry holds position

    m.hasActed = true;          // has now attacked you — First Strike gone for this one

    if(Math.random() < Delve.dodge()){
      Delve.flash("Dodged");
      return;
    }

    let hit = Math.max(1, Math.round(m.atk * (1 - Delve.dmgRed())) - Delve.flatRed());
    if(Delve.hasBulwark()) hit = Math.min(hit, Delve.hitCap());
    applyHurt(hit);
  }

  Delve.descend = function(){
    const G = Delve.G;
    G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp() * C().healOnDescendPct));
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
