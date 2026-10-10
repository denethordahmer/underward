window.Delve = window.Delve || {};
(function(){

 // ── Chosen passives live in G.traits (an ARRAY) ─────────────
 Delve.traits = function(){
  const G = Delve.G;
  return (G && G.traits) ? G.traits : [];
 };

 // Sum every chosen passive's effects (safe when no run exists yet)
 Delve.traitBuffs = function(){
  const b = {
   atk:0, maxHp:0, dodge:0, luck:0, goldMult:0, crit:0,
   bossAtk:0, flatRed:0, healPerFloor:0, healOnKill:0,
   dropBonus:0, speedBonus:0, extraEnergyPerKill:0, agi:0, tou:0,
   vampiric:false, unbroken:false, secondWindHealOverride:0
  };
  Delve.traits().forEach(t => {
   const ef = t.effects || {};
   for(const k in ef){
    if(!(k in b)) continue;
    if(typeof b[k] === "boolean") b[k] = !!ef[k];
    else if(k === "secondWindHealOverride") b[k] = Math.max(b[k], ef[k]);
    else b[k] += ef[k];
   }
  });
  return b;
 };
 Delve.hasUnbroken = function(){ return Delve.traitBuffs().unbroken; };
 Delve.secondWindHealOverride = function(){ return Delve.traitBuffs().secondWindHealOverride; };

 // ── XP curve (rises per ward) ───────────────────────────────
 Delve.XP_CURVE = function(floor){
  const cfg = Delve.CONFIG;
  const step = cfg.xpWardStep || 2;
  const ward = Delve.getWard(floor);
  const wardIdx = Math.max(0, ((ward && ward.id) || 1) - 1);
  return cfg.XP_CURVE.map(v => v + wardIdx * step);
 };

 Delve.addXP = function(amount){
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  G.xp = (G.xp || 0) + (amount || 0);
  while(checkLevelUp()){ /* process stacked level-ups */ }
  Delve.updateHUD();
 };

 function xpNeeded(G){
  const curve = Delve.XP_CURVE(G.floor);
  const next = curve[G.level - 1];
  if(next !== undefined) return next;
  // past the end of the table: keep growing
  const last = curve[curve.length - 1];
  return last + (G.level - curve.length) * 12;
 }

 function checkLevelUp(){
  const G = Delve.G;
  const next = xpNeeded(G);
  if(G.xp >= next){
   G.xp -= next;
   G.level++;
   G.pendingLevelUps = (G.pendingLevelUps || 0) + 1;
   if(!G.levelUpOpen){
    G.levelUpOpen = true;
    if(Delve.sfx) Delve.sfx("levelup");
    if(Delve.logXP) Delve.logXP(0, G.level);
    showLevelUpChoices();
   }
   return true;
  }
  return false;
 }

 function shuffle(a){
  const arr = a.slice();
  for(let i = arr.length - 1; i > 0; i--){
   const j = Math.floor(Math.random() * (i + 1));
   const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
 }

 // ── Level-up choices ────────────────────────────────────────
 function showLevelUpChoices(){
  const G = Delve.G;
  const cfg = Delve.CONFIG.TRAITS;
  const passives = cfg.passives || [];
  const uniques = cfg.uniques || [];
  const abilities = cfg.abilities || [];

  // 3 different passives
  const pool = shuffle(passives).slice(0, 3);

  // chance to swap one slot for an ability not already known
  const known = (G.abilities || []).map(a => a.id);
  const openAbilities = abilities.filter(a => known.indexOf(a.id) < 0);
  if(openAbilities.length && (G.abilities || []).length < Delve.CONFIG.levelMaxAbilities && Math.random() < 0.5){
   pool[Math.floor(Math.random() * pool.length)] =
    openAbilities[Math.floor(Math.random() * openAbilities.length)];
  }

  // chance for a unique not yet taken
  const openUniques = uniques.filter(u => !(G.takenUniques || []).includes(u.id));
  if(openUniques.length && Math.random() < 0.25){
   pool[Math.floor(Math.random() * pool.length)] =
    openUniques[Math.floor(Math.random() * openUniques.length)];
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
   card.style.cssText = "width:100%;padding:14px;text-align:left;font-size:17px;min-height:82px;background:#1a2a3a;box-shadow:0 3px 0 #0b141c;overflow:hidden;";
   const isAbility = t.cost !== undefined;
   const title = document.createElement("div");
   title.style.cssText = "font-weight:800;font-size:19px;margin-bottom:4px;";
   title.textContent = (isAbility ? "⚡ " : "") + t.name + (isAbility ? "  (" + t.cost + " energy)" : "");
   const desc = document.createElement("div");
   desc.style.cssText = "font-size:14px;color:#a9bccd;white-space:normal;";
   desc.textContent = t.desc;
   card.appendChild(title);
   card.appendChild(desc);

   card.addEventListener("click", function(){
    applyTrait(t);
    overlay.style.display = "none";
    G.pendingLevelUps = (G.pendingLevelUps || 1) - 1;
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
  if(t.unique){
   G.takenUniques = G.takenUniques || [];
   G.takenUniques.push(t.id);
  }
  if(t.cost !== undefined){ Delve.addAbility(t); return; }

  G.traits = G.traits || [];
  G.traits.push(Object.assign({}, t));
  if(t.effects && t.effects.maxHp) G.hp += t.effects.maxHp;
  if(G.hp > Delve.maxHp()) G.hp = Delve.maxHp();
  Delve.flash(t.name + " acquired");
  if(Delve.logTrait) Delve.logTrait(t.name, t.id);
 }

 // ── Abilities ───────────────────────────────────────────────
 Delve.addAbility = function(a){
  const G = Delve.G;
  if(!G) return;
  G.abilities = G.abilities || [];
  if(G.abilities.length >= Delve.CONFIG.levelMaxAbilities) G.abilities.shift();
  G.abilities.push({ id:a.id, name:a.name, cost:a.cost, target:a.target, desc:a.desc });
  Delve.flash("Ability learned: " + a.name);
 };

 function monsterAt(x, y){
  const G = Delve.G;
  if(G.boss && G.boss.x === x && G.boss.y === y) return G.boss;
  return G.monsters.find(m => m.x === x && m.y === y) || null;
 }
 function adjacentTo(x, y){
  const G = Delve.G, out = [];
  G.monsters.forEach(m => { if(Delve.mdist(m.x, m.y, x, y) === 1) out.push(m); });
  if(G.boss && Delve.mdist(G.boss.x, G.boss.y, x, y) === 1) out.push(G.boss);
  return out;
 }
 function hurt(m, dmg, col){
  const G = Delve.G;
  m.hp -= dmg;
  m.hitFlash = Date.now();
  Delve.addFloater("-" + dmg, m.x, m.y, col || "#ffd75e");
  if(m.hp <= 0){
   const wasTarget = (G.combatTarget === m);
   Delve.killMonster(m);
   if(wasTarget) Delve.endCombat(false);
  }
 }

 // Returns true on success, false on a rejected cast (no energy spent)
 Delve.castAbility = function(ability, tx, ty){
  const G = Delve.G, T = Delve.T;
  if(!G || !ability) return false;
  if((G.energy || 0) < ability.cost){ Delve.flash("Not enough Energy"); return false; }

  const dist = Delve.mdist(G.px, G.py, tx, ty);
  const mAt = monsterAt(tx, ty);
  const atk = Delve.atk();

  switch(ability.id){

   case "cleave": {
    if(!mAt || dist !== 1){ Delve.flash("Cleave: tap an adjacent enemy"); return false; }
    const hits = [mAt].concat(adjacentTo(tx, ty).filter(m => m !== mAt));
    hits.forEach(m => hurt(m, atk));
    break;
   }

   case "lunge": {
    const dx = Math.sign(tx - G.px), dy = Math.sign(ty - G.py);
    if(!mAt || (dx !== 0 && dy !== 0) || dist < 1 || dist > 4){
     Delve.flash("Lunge: enemy in a straight line, 4 tiles"); return false;
    }
    let x = G.px, y = G.py;
    for(let i = 1; i < dist; i++){
     x += dx; y += dy;
     const c = G.grid[y] && G.grid[y][x];
     if(c !== T.FLOOR && c !== T.GOLD){ Delve.flash("Path blocked"); return false; }
    }
    if(G.inCombat && G.combatTarget !== mAt) Delve.endCombat(false);
    G.px = x; G.py = y;
    if(Delve.collectGold) Delve.collectGold(x, y);
    hurt(mAt, atk + 4);
    break;
   }

   case "cinderbolt": {
    if(!mAt || dist > 5){ Delve.flash("Cinderbolt: enemy within 5 tiles"); return false; }
    hurt(mAt, 10, "#f97316");
    if(mAt.hp > 0 && Delve.applyEffect) Delve.applyEffect(mAt, "burn");
    break;
   }

   case "blink": {
    const c = G.grid[ty] && G.grid[ty][tx];
    const shopHere = G.shop && G.shop.x === tx && G.shop.y === ty;
    if(dist < 1 || dist > 4 || (c !== T.FLOOR && c !== T.GOLD) || shopHere){
     Delve.flash("Blink: empty floor within 4 tiles"); return false;
    }
    if(G.inCombat) Delve.endCombat(false);
    G.px = tx; G.py = ty;
    if(Delve.collectGold) Delve.collectGold(tx, ty);
    const idx = G.items.findIndex(i => i.x === tx && i.y === ty);
    if(idx >= 0){ const it = G.items.splice(idx, 1)[0]; Delve.pickupItem(it); }
    break;
   }

   case "whirlwind": {
    const hits = adjacentTo(G.px, G.py);
    if(!hits.length){ Delve.flash("Whirlwind: no enemies adjacent"); return false; }
    hits.forEach(m => hurt(m, atk));
    break;
   }

   case "stone_skin":
    G.stoneSkin = 2;
    Delve.flash("Stone Skin! -60% damage for 2 turns");
    break;

   case "rally": {
    const heal = Math.round(Delve.maxHp() * 0.35);
    G.hp = Math.min(Delve.maxHp(), G.hp + heal);
    G.effects = (G.effects || []).filter(e => e.id !== "bleed");
    Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
    Delve.flash("Rally! +" + heal + " HP");
    break;
   }

   default:
    return false;
  }

  G.energy -= ability.cost;
  Delve.updateHUD();
  return true;
 };

})();
