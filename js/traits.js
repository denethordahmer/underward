window.Delve = window.Delve || {};
(function(){

  // ---- XP & level-up state ----
  Delve.XP_CURVE = function(floor){
    const cfg = Delve.CONFIG;
    const step = cfg.xpWardStep || 2;
    const ward = Delve.getWard(floor);
    const wardIdx = Math.max(0, (Delve.CONFIG.WARDS.indexOf(ward) || 0));
    return cfg.XP_CURVE.map(v => v + wardIdx * step);
  };

  Delve.addXP = function(amount){
    const G = Delve.G;
    if(!G || G.dead) return;
    G.xp = (G.xp || 0) + (amount || 0);

    // process multiple level-ups sequentially
    while(checkLevelUp()){ /* loop */ }
    Delve.updateHUD();
  };

  function checkLevelUp(){
    const G = Delve.G;
    const curve = Delve.XP_CURVE(G.floor);
    const next = curve[G.level - 1];
    if(next !== undefined && G.xp >= next){
      G.xp -= next;
      G.level++;
      G.pendingLevelUps = (G.pendingLevelUps || 0) + 1;
      if(!G.levelUpOpen){
        G.levelUpOpen = true;
        showLevelUpChoices();
      }
      return true;
    }
    return false;
  }

  // ---- level-up choice generation ----
  function showLevelUpChoices(){
    const G = Delve.G;
    const cfg = Delve.CONFIG.TRAITS;

    const pool = [];
    const passives = cfg.passives || [];
    const uniques = cfg.uniques || [];
    const abilities = cfg.abilities || [];

    // always offer some passives
    for(let i=0; i<3; i++){
      const pick = passives[Math.floor(Math.random()*passives.length)];
      pool.push(pick);
    }
    // chance for an ability (if under cap)
    if(G.abilities.length < Delve.CONFIG.levelMaxAbilities && Math.random() < 0.5){
      pool[Math.floor(Math.random()*pool.length)] =
        abilities[Math.floor(Math.random()*abilities.length)];
    }
    // unique slot if any remain untaken
    const openUniques = uniques.filter(u => !(G.takenUniques || []).includes(u.id));
    if(openUniques.length && Math.random() < 0.25){
      const pick = openUniques[Math.floor(Math.random()*openUniques.length)];
      pool[Math.floor(Math.random()*pool.length)] = pick;
    }

    G.levelUpChoices = pool;
    renderLevelUpChoices(pool);
  }

  function renderLevelUpChoices(choices){
    const G = Delve.G;
    if(!G) return;

    const overlay = document.getElementById("levelupScreen");
    if(!overlay) return;

    overlay.style.display = "flex";
    const slot = document.getElementById("levelupChoices");
    slot.innerHTML = "";

    choices.forEach(function(t){
      const card = document.createElement("button");
      card.className = "btn";
      card.style.cssText = "width:100%; padding:14px; text-align:left; font-size:17px; min-height:82px; background:#1a2a3a; box-shadow:0 3px 0 #0b141c; overflow:hidden;";

      const title = document.createElement("div");
      title.style.cssText = "font-weight:800; font-size:19px; margin-bottom:4px;";
      title.textContent = t.name;
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:14px; color:#a9bccd; white-space:normal;";
      desc.textContent = t.desc;

      card.appendChild(title);
      card.appendChild(desc);

      card.addEventListener("click", function(){
        applyTrait(t);
        overlay.style.display = "none";

        const pending = G.pendingLevelUps || 0;
        G.pendingLevelUps = pending - 1;
        if(G.pendingLevelUps > 0){
          G.levelUpOpen = true;
          showLevelUpChoices();
        } else {
          G.levelUpOpen = false;
        }
        Delve.updateHUD();
        Delve.draw();
      });

      slot.appendChild(card);
    });
  }

  function applyTrait(t){
    const G = Delve.G;
    if(!G || !t) return;

    // mark uniques as taken
    if(t.unique){
      G.takenUniques = G.takenUniques || [];
      G.takenUniques.push(t.id);
    }

    // abilities have their own slot system
    if(t.cost !== undefined){
      Delve.addAbility(t);
      return;
    }

    // passives are stackable, stored as a list of effects
    G.traits = G.traits || [];
    G.traits.push(Object.assign({}, t));

    // some effects are immediate + permanent per run
    if(t.effects){
      if(t.effects.maxHp) G.hp += t.effects.maxHp;
      if(t.effects.atk) G.hp += 0; // no direct HP change for ATK
      Delve.flash(t.name + " acquired");
    }
  }

  // ---- abilities ----
  Delve.addAbility = function(a){
    const G = Delve.G;
    if(!G) return;
    G.abilities = G.abilities || [];
    if(G.abilities.length >= Delve.CONFIG.levelMaxAbilities){
      // replace oldest (or stand-in if later UI allows choice)
      G.abilities.shift();
    }
    // strip to plain ability ID + instance
    G.abilities.push({
      id: a.id,
      name: a.name,
      cost: a.cost,
      target: a.target,
      desc: a.desc
    });
    Delve.flash("Ability learned: " + a.name);
  };

  // ---- ability resolution helper (called by combat when target chosen) ----
  Delve.castAbility = function(ability, tx, ty){
    const G = Delve.G;
    if(!G || !ability) return false;

    const energy = Delve.currentEnergy ? Delve.currentEnergy() : G.energy;
    if(energy < ability.cost){
      Delve.flash("Not enough Energy");
      return false;
    }

    // spend energy
    G.energy -= ability.cost;

    const T = Delve.T;
    const targetMonster = G.monsters.find(function(m){ return m.x===tx && m.y===ty; }) || G.boss;

    switch(ability.id){
      case "cleave":
        // hit target + all adjacent enemies
        const adjacent = allMonstersAdjacentTo(tx, ty);
        adjacent.forEach(function(m){
          m.hp -= Delve.atk();
          if(m.hp <= 0) Delve.killMonster(m);
        });
        break;

      case "lunge":
        // move to target and attack
        G.px = tx; G.py = ty;
        if(targetMonster){
          targetMonster.hp -= Delve.atk() + 4;
          if(targetMonster.hp <= 0) Delve.killMonster(targetMonster);
        }
        break;

      case "stone_skin":
        G.stoneSkin = 2; // 2 turns of 60% reduction
        Delve.flash("Stone Skin! -60% damage for 2 turns");
        break;

      case "cinderbolt":
        if(targetMonster){
          targetMonster.hp -= 10;
          if(targetMonster.hp <= 0) Delve.killMonster(targetMonster);
        }
        break;

      case "rally":
        G.hp = Math.min(Delve.maxHp(), G.hp + Math.round(Delve.maxHp()*0.35));
        Delve.flash("Rally! +35% HP");
        break;

      case "blink":
        if(!G.grid[ty] || G.grid[ty][tx] === undefined || G.grid[ty][tx] !== T.FLOOR){
          Delve.flash("Teleport failed — not an empty tile");
          return false;
        }
        G.px = tx; G.py = ty;
        break;

      case "whirlwind":
        allAdjacentEnemies().forEach(function(m){
          m.hp -= Delve.atk();
          if(m.hp <= 0) Delve.killMonster(m);
        });
        break;

      default:
        return false;
    }

    Delve.updateHUD();
    return true;
  };

  function allMonstersAdjacentTo(x,y){
    return (Delve.G.monsters || []).filter(function(m){
      return Math.abs(m.x-x)+Math.abs(m.y-y) === 1;
    });
  }
  function allAdjacentEnemies(){
    return allMonstersAdjacentTo(Delve.G.px, Delve.G.py);
  }
})();
