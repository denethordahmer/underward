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
 dropBonus:0, speedBonus:0, extraEnergyPerKill:0, agi:0, tou:0, str:0,
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

 // ── Ability data + ranks ──────────────────────────────────────
 // Numbers live in content (con-traits.js `data` fields); rank deltas
 // (from abilityRank shard-tree nodes) are stored in save.abilityRanks.
 function abilityDef(id){
 const list = (Delve.CONFIG.TRAITS && Delve.CONFIG.TRAITS.abilities) || [];
 return list.find(a => a.id === id) || null;
 }
 function abilityRanks(id){
 return (Delve.save && Delve.save.abilityRanks && Delve.save.abilityRanks[id]) || 0;
 }
 function abilityData(id){
 const d = abilityDef(id);
 return (d && d.data) || {};
 }
 // Actual energy cost: base cost reduced by second_nature node (if owned)
 function abilityCost(a){
 const base = a.cost || 0;
 if(Delve.hasProgression && Delve.hasProgression("second_nature")) return Math.max(1, Math.round(base * 0.8));
 return base;
 }

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
 else if(Delve.logSystem) Delve.logSystem("Reached Level " + G.level + "!");
 Delve.showLevelUpChoices();
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
 Delve.showLevelUpChoices = function(){
 const G = Delve.G;
 const cfg = Delve.CONFIG.TRAITS;
 const passives = cfg.passives || [];
 const uniques = cfg.uniques || [];
 const abilities = cfg.abilities || [];

 // 3 different passives
 const pool = shuffle(passives).slice(0, 3);

 // Chance to swap one slot for an ability not already known — either
 // learned in-run (G.abilities) or purchased in the hub (save.abilities).
 const known = (G.abilities || []).map(a => a.id)
 .concat((Delve.save && Delve.save.abilities) || []);
 const abilitySlotsOpen = (G.abilities || []).length < Delve.CONFIG.levelMaxAbilities;
 const openAbilities = abilities.filter(a => known.indexOf(a.id) < 0);
 if(openAbilities.length && abilitySlotsOpen && Math.random() < 0.5){
 pool[Math.floor(Math.random() * pool.length)] =
 openAbilities[Math.floor(Math.random() * openAbilities.length)];
 }

 // Chance for a unique not yet taken
 const openUniques = uniques.filter(u => !(G.takenUniques || []).includes(u.id));
 if(openUniques.length && Math.random() < 0.25){
 pool[Math.floor(Math.random() * pool.length)] =
 openUniques[Math.floor(Math.random() * pool.length)] ; // guard below re-picks
 pool[Math.floor(Math.random() * pool.length)] =
 (function(){ const p = openUniques[Math.floor(Math.random() * openUniques.length)]; return p; })();
 }

 G.levelUpChoices = pool;
 if(Delve.renderLevelUpChoices) Delve.renderLevelUpChoices(pool);
 }

 function applyTrait(t){
 const G = Delve.G;
 if(!G || !t) return;
 if(t.unique){
 G.takenUniques = G.takenUniques || [];
 G.takenUniques.push(t.id);
 }
 // FIX #traitReq-chain: record taken traits so reqMet(traitReq) gates work.
 if(Delve.markRunTrait) Delve.markRunTrait(t.name, t.id);

 if(t.cost !== undefined){ Delve.addAbility(t); return; }

 G.traits = G.traits || [];
 G.traits.push(Object.assign({}, t));
 if(t.effects && t.effects.maxHp) G.hp += t.effects.maxHp;
 if(G.hp > Delve.maxHp()) G.hp = Delve.maxHp();
 Delve.flash(t.name + " acquired");
 if(Delve.sfx) Delve.sfx("trait");
 if(Delve.logTrait) Delve.logTrait(t.name, t.id);
 }

 // ── Abilities ───────────────────────────────────────────────
 Delve.addAbility = function(a){
 const G = Delve.G;
 if(!G) return;
 G.abilities = G.abilities || [];
 if(G.abilities.length >= Delve.CONFIG.levelMaxAbilities) G.abilities.shift(); // Tier 4 will surface this in UI
 G.abilities.push({ id:a.id, name:a.name, cost:a.cost, target:a.target, desc:a.desc });
 if(Delve.sfx) Delve.sfx("ability_learn");
 Delve.flash("Ability learned: " + a.name);
 };

 // ── Hub-purchased abilities: inject into every run at start ──
 // (Called by progression.js injectRunStart via this exported hook.)
 Delve.injectHubAbilities = function(){
 const G = Delve.G;
 const owned = (Delve.save && Delve.save.abilities) || [];
 owned.forEach(function(id){
 const d = abilityDef(id);
 if(!d) return;
 const known = (G.abilities || []).some(a => a.id === id);
 if(known) return;
 G.abilities = G.abilities || [];
 G.abilities.push({ id:d.id, name:d.name, cost:d.cost, target:d.target, desc:d.desc });
 });
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
 const cost = abilityCost(ability);
 if((G.energy || 0) < cost){ Delve.flash("Not enough Energy"); return false; }

 const d = abilityData(ability.id);
 const ranks = abilityRanks(ability.id);
 const dist = Delve.mdist(G.px, G.py, tx, ty);
 const mAt = monsterAt(tx, ty);
 const atk = Delve.atk();

 switch(ability.id){

 case "cleave": {
 if(!mAt || dist !== 1){ Delve.flash("Cleave: tap an adjacent enemy"); return false; }
 const bonus = (d.bonusAtk || 0) + (d.perRank || 0) * ranks;
 const hits = [mAt].concat(adjacentTo(tx, ty).filter(m => m !== mAt));
 hits.forEach(m => hurt(m, atk + bonus));
 break;
 }

 case "lunge": {
 const range = (d.range || 4) + (d.perRankRange || 0) * 0 ; // perRank adds damage, not range (rank nodes say "+4 damage")
 const dx = Math.sign(tx - G.px), dy = Math.sign(ty - G.py);
 if(!mAt || (dx !== 0 && dy !== 0) || dist < 1 || dist > (d.range || 4)){
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
 const bonus = (d.bonusAtk || 0) + (d.perRank || 0) * ranks;
 hurt(mAt, atk + bonus);
 break;
 }

 case "cinderbolt": {
 const range = (d.range || 5);
 if(!mAt || dist > range){ Delve.flash("Cinderbolt: enemy within 5 tiles"); return false; }
 const dmg = (d.dmg || 10) + (d.perRankDmg || 0) * ranks;
 hurt(mAt, dmg, "#f97316");
 if(mAt.hp > 0 && Delve.applyEffect){
 Delve.applyEffect(mAt, "burn");
 // perRankBurn would need per-status turn overrides — burn turns come from
 // CONFIG.STATUS_EFFECTS; ranks extend via re-apply (applyEffect refreshes).
 }
 break;
 }

 case "blink": {
 const range = (d.range || 4) + (d.perRankRange || 0) * ranks;
 const c = G.grid[ty] && G.grid[ty][tx];
 const shopHere = G.shop && G.shop.x === tx && G.shop.y === ty;
 if(dist < 1 || dist > range || (c !== T.FLOOR && c !== T.GOLD) || shopHere){
 Delve.flash("Blink: empty floor within " + range + " tiles"); return false;
 }
 if(G.inCombat) Delve.endCombat(false);
 G.px = tx; G.py = ty;
 if(Delve.collectGold) Delve.collectGold(tx, ty);
 const idx = G.items.findIndex(i => i.x === tx && i.y === ty);
 if(idx >= 0){ const it = G.items.splice(idx, 1)[0]; Delve.pickupItem(it); }
 break;
 }

 case "whirlwind": {
 const bonus = (d.bonusAtk || 0) + (d.perRank || 0) * ranks;
 const hits = adjacentTo(G.px, G.py);
 if(!hits.length){ Delve.flash("Whirlwind: no enemies adjacent"); return false; }
 hits.forEach(m => hurt(m, atk + bonus));
 break;
 }

 case "stone_skin":
 G.stoneSkin = (d.turns || 2) + (d.perRankTurns || 0) * ranks;
 Delve.flash("Stone Skin! -60% damage for " + G.stoneSkin + " turns");
 break;

 case "rally": {
 const pct = (d.healPct || 0.35) + (d.perRankHeal || 0) * ranks;
 const heal = Math.round(Delve.maxHp() * pct);
 G.hp = Math.min(Delve.maxHp(), G.hp + heal);
 G.effects = (G.effects || []).filter(e => e.id !== "bleed");
 Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
 Delve.flash("Rally! +" + heal + " HP");
 break;
 }

 default:
 return false;
 }

 G.energy -= cost;
 if(Delve.sfx) Delve.sfx("ability_" + ability.id);
 Delve.updateHUD();
 return true;
 };

})();
