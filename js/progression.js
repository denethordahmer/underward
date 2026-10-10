window.Delve = window.Delve || {};
(function(){
 const $ = id => document.getElementById(id);

 const TREES = [
  { id:"attrs", name:"Attributes" },
  { id:"kit", name:"Kit" },
  { id:"martial", name:"Martial" },
  { id:"instinct", name:"Instinct" },
  { id:"survival", name:"Survival" },
  { id:"fortune", name:"Fortune" }
 ];

 const NODES = {
  kit: [
   { id:"offhand", tier:1, name:"Off-hand Training", desc:"Unlock the Off-hand equipment slot.", cost:80, type:"slotUnlock", slot:"offhand" },
   { id:"field_pack", tier:1, name:"Field Pack", desc:"Increase bag capacity to 20.", cost:50, type:"inventory", cap:20 },
   { id:"quartermaster", tier:1, name:"Quartermaster", desc:"Start every run with one random Common armour.", cost:60, type:"startItem" },
   { id:"second_ring", tier:2, name:"Second Ring", desc:"Unlock the second Ring slot.", cost:120, type:"slotUnlock", slot:"ring2" },
   { id:"deep_pack", tier:2, name:"Deep Pack", desc:"Increase bag capacity to 24. Requires Field Pack.", cost:130, type:"inventory", cap:24, req:"field_pack" },
   { id:"provisioner", tier:2, name:"Provisioner", desc:"Start every run with one random consumable.", cost:100, type:"startConsumable" },
   { id:"field_kit", tier:3, name:"Field Kit", desc:"Consumables heal 15% more while you have this.", cost:110, type:"consumableHeal" },
   { id:"alchemist", tier:3, name:"Alchemist", desc:"Cures also restore 15% Health.", cost:90, type:"cureHeal" },
   { id:"sealed_cache", tier:3, name:"Sealed Cache", desc:"Every floor contains one guaranteed chest.", cost:180, type:"chestGuarantee" },
   { id:"master_provisioner", tier:4, name:"Master Provisioner", desc:"Start with two consumables and 25 gold.", cost:200, type:"startKit", req:"provisioner" }
  ],
  martial: [
   { id:"weapon_drill_1", tier:1, name:"Weapon Drill I", desc:"+1 permanent Attack Power.", cost:25, type:"flatAtk", atk:1 },
   { id:"footwork", tier:1, name:"Footwork", desc:"+2% permanent Dodge.", cost:25, type:"flatDodge", dodge:0.02 },
   { id:"cleave", tier:1, name:"Cleave", desc:"Learn the Cleave ability.", cost:50, type:"ability", ability:"cleave" },
   { id:"weapon_drill_2", tier:2, name:"Weapon Drill II", desc:"+2 permanent Attack Power. Requires Weapon Drill I.", cost:60, type:"flatAtk", atk:2, req:"weapon_drill_1" },
   { id:"lunge", tier:2, name:"Lunge", desc:"Learn the Lunge ability.", cost:45, type:"ability", ability:"lunge" },
   { id:"cleave_ii", tier:2, name:"Cleave II", desc:"Cleave deals +4 damage. Requires Cleave.", cost:110, type:"abilityRank", ability:"cleave", req:"cleave" },
   { id:"overkill_mastery", tier:2, name:"Overkill Mastery", desc:"Overkill heals 75% of excess damage instead of 50%.", cost:120, type:"overkillPct" },
   { id:"wardens_bane", tier:3, name:"Warden's Bane", desc:"+10% damage against Ward bosses.", cost:140, type:"bossDamage", bossAtkPct:0.10 },
   { id:"lunge_ii", tier:3, name:"Lunge II", desc:"Lunge deals +4 damage. Requires Lunge.", cost:130, type:"abilityRank", ability:"lunge", req:"lunge" },
   { id:"cleave_iii", tier:3, name:"Cleave III", desc:"Cleave deals +4 more damage. Requires Cleave II and Bloodthirst.", cost:200, type:"abilityRank", ability:"cleave", req:"cleave_ii", traitReq:"bloodthirst" },
   { id:"executioner", tier:4, name:"Executioner", desc:"All weapon status chances +5%.", cost:220, type:"statusUp" }
  ],
  instinct: [
   { id:"energy_well", tier:1, name:"Energy Well", desc:"+10 starting Energy.", cost:40, type:"startEnergy" },
   { id:"stone_skin", tier:1, name:"Stone Skin", desc:"Learn the Stone Skin ability.", cost:45, type:"ability", ability:"stone_skin" },
   { id:"rally", tier:1, name:"Rally", desc:"Learn the Rally ability.", cost:55, type:"ability", ability:"rally" },
   { id:"blink", tier:2, name:"Blink", desc:"Learn the Blink ability.", cost:50, type:"ability", ability:"blink" },
   { id:"cinderbolt", tier:2, name:"Cinderbolt", desc:"Learn the Cinderbolt ability.", cost:60, type:"ability", ability:"cinderbolt" },
   { id:"stone_skin_ii", tier:2, name:"Stone Skin II", desc:"Stone Skin lasts 3 turns. Requires Stone Skin.", cost:110, type:"abilityRank", ability:"stone_skin", req:"stone_skin" },
   { id:"rally_ii", tier:2, name:"Rally II", desc:"Rally heals 45% instead of 35%. Requires Rally.", cost:120, type:"abilityRank", ability:"rally", req:"rally" },
   { id:"emberblood", tier:3, name:"Emberblood", desc:"+1 Energy per kill.", cost:80, type:"killEnergy" },
   { id:"blink_ii", tier:3, name:"Blink II", desc:"Blink range increases to 5. Requires Blink.", cost:130, type:"abilityRank", ability:"blink", req:"blink" },
   { id:"cinderbolt_ii", tier:3, name:"Cinderbolt II", desc:"Cinderbolt deals 14 damage and Burns 3 turns. Requires Cinderbolt.", cost:130, type:"abilityRank", ability:"cinderbolt", req:"cinderbolt" },
   { id:"second_nature", tier:4, name:"Second Nature", desc:"All abilities cost 20% less Energy.", cost:240, type:"energyCostPct" }
  ],
  survival: [
   { id:"tough_hide", tier:1, name:"Tough Hide", desc:"+6 permanent Maximum Health.", cost:35, type:"flatHp", hp:6 },
   { id:"hardened_bones", tier:1, name:"Hardened Bones", desc:"+1 permanent Toughness.", cost:50, type:"flatStat", stat:"tou", amount:1 },
   { id:"salve_lore", tier:1, name:"Salve Lore", desc:"All healing +10%.", cost:40, type:"healPct" },
   { id:"warding_charm", tier:2, name:"Warding Charm", desc:"+1 permanent flat Damage Reduction.", cost:80, type:"flatRed" },
   { id:"deep_lungs", tier:2, name:"Deep Lungs", desc:"+1 rest per floor.", cost:110, type:"restPlus" },
   { id:"second_wind_upgrade", tier:2, name:"Second Wind Upgrade", desc:"Second Wind heals 40% instead of 30%.", cost:130, type:"secondWindPct" },
   { id:"iron_will", tier:3, name:"Iron Will", desc:"Survive one killing blow at 1 HP, once per run.", cost:150, type:"ironWill" },
   { id:"veteran", tier:3, name:"Veteran", desc:"Start every run at Level 2 (one free trait).", cost:160, type:"startLevel" },
   { id:"wardens_oath", tier:4, name:"Warden's Oath", desc:"Second Wind heals 50%. Requires Second Wind Upgrade.", cost:220, type:"secondWindPctMax", req:"second_wind_upgrade" }
  ],
  fortune: [
   { id:"coinpurse", tier:1, name:"Coinpurse", desc:"Start every run with 25 gold.", cost:40, type:"startGold" },
   { id:"haggler", tier:1, name:"Haggler", desc:"+5% merchant discount.", cost:60, type:"discount" },
   { id:"scavenger", tier:2, name:"Scavenger", desc:"+5% item drop chance.", cost:70, type:"dropPlus" },
   { id:"coin_chest", tier:2, name:"Coin Chest", desc:"Start with 50 gold.", cost:90, type:"startGold", req:"coinpurse" },
   { id:"fortunes_favour", tier:2, name:"Fortune's Favour", desc:"+1 permanent Luck.", cost:90, type:"flatStat", stat:"luc", amount:1 },
   { id:"gilded_eye", tier:3, name:"Gilded Eye", desc:"+15% gold from all sources.", cost:100, type:"goldPlus" },
   { id:"silver_tongue", tier:3, name:"Silver Tongue", desc:"+10% merchant discount. Requires Haggler.", cost:140, type:"discount", req:"haggler" },
   { id:"lucky_find", tier:4, name:"Lucky Find", desc:"Chests roll one rarity tier higher.", cost:160, type:"chestTierUp" }
  ]
 };

 function owned(id){ return !!(Delve.save.nodes && Delve.save.nodes[id]); }

 function reqMet(node){
  if(node.req && !owned(node.req)) return false;
  if(node.traitReq){
   const has = (Delve.save.runTraits && Delve.save.runTraits.indexOf(node.traitReq) >= 0);
   const seen = (Delve.save.runTraitsSeen && Delve.save.runTraitsSeen.indexOf(node.traitReq) >= 0);
   if(!has && !seen) return false;
  }
  return true;
 }
 function tierUnlocked(treeId, tier){
  if(tier === 1) return true;
  const nodes = NODES[treeId] || [];
  const ownedLower = nodes.filter(function(n){ return n.tier < tier && owned(n.id); }).length;
  return ownedLower >= 2;
 }

 function afterBuy(node){
  const s = Delve.save;
  s.nodes = s.nodes || {};
  s.nodes[node.id] = 1;
  if(node.type === "slotUnlock"){
   s.unlocks = s.unlocks || {};
   s.unlocks[node.slot] = true;
  }
  if(node.type === "inventory"){
   s.inventoryCap = node.cap;
  }
  if(node.type === "ability"){
   s.abilities = s.abilities || [];
   if(s.abilities.indexOf(node.ability) < 0) s.abilities.push(node.ability);
  }
  if(node.type === "abilityRank"){
   s.abilityRanks = s.abilityRanks || {};
   s.abilityRanks[node.ability] = (s.abilityRanks[node.ability] || 0) + 1;
  }
  Delve.persist();
 }

 let activeTree = "attrs";

 function renderTabs(){
  const tabs = $("hubTabs");
  if(!tabs) return;
  tabs.innerHTML = "";
  TREES.forEach(function(t){
   const b = document.createElement("button");
   b.className = "hub-tab" + (t.id === activeTree ? " active" : "");
   b.textContent = t.name;
   b.addEventListener("click", function(){ activeTree = t.id; renderTabs(); renderHub(); });
   tabs.appendChild(b);
  });
 }

 function renderTree(treeId){
  const panel = $("treePanel");
  if(!panel) return;
  panel.innerHTML = "";
  const nodes = NODES[treeId] || [];
  const tiers = {};
  nodes.forEach(function(n){ (tiers[n.tier] = tiers[n.tier] || []).push(n); });
  for(let t = 1; t !== 5; t++){
   const tier = tiers[t] || [];
   if(!tier.length) continue;
   const label = document.createElement("div");
   label.className = "tree-tier-label";
   label.textContent = "TIER " + t;
   const wrap = document.createElement("div");
   wrap.className = "tree-tier";
   wrap.appendChild(label);
   tier.forEach(function(n){
    const card = document.createElement("div");
    card.className = "node-card";
    if(owned(n.id)) card.classList.add("owned");
    else if(!tierUnlocked(treeId, t) || !reqMet(n)) card.classList.add("locked");
    else card.classList.add("available");

    const info = document.createElement("div");
    const nm = document.createElement("div");
    nm.style.cssText = "font-weight:800;font-size:14px;text-align:left;";
    nm.textContent = n.name;
    const dsc = document.createElement("div");
    dsc.style.cssText = "font-size:12px;color:#9fb3c5;text-align:left;margin-top:3px;line-height:1.4;";
    dsc.textContent = n.desc;
    info.appendChild(nm); info.appendChild(dsc);
    card.appendChild(info);

    const cost = document.createElement("div");
    cost.className = "node-cost";
    if(owned(n.id)){
     cost.textContent = "⭐";
    } else {
     cost.textContent = n.cost + "◇";
     if(Delve.save.shards < n.cost) cost.classList.add("cant");
    }
    card.appendChild(cost);

    if(!owned(n.id) && tierUnlocked(treeId, t) && reqMet(n) && Delve.save.shards >= n.cost){
     card.addEventListener("click", function(){
      if(owned(n.id)) return;
      if(Delve.save.shards < n.cost) return;
      Delve.save.shards -= n.cost; Delve.save.shards = Math.max(0, Delve.save.shards);
      afterBuy(n);
      Delve.flash(n.name + " — unlocked");
      renderTabs(); renderHub();
     });
    }
    wrap.appendChild(card);
   });
   panel.appendChild(wrap);
  }
 }

 const originalRefreshHub = Delve.refreshHub;
 function renderHub(){
  const shop = $("shop");
  const tree = $("treePanel");
  if(activeTree === "attrs"){
   if(tree) tree.style.display = "none";
   if(typeof originalRefreshHub === "function") originalRefreshHub();
   if(shop) shop.style.display = "flex";
   return;
  }
  if(shop) shop.style.display = "none";
  if(tree) tree.innerHTML = "";
  renderTree(activeTree);
  if(tree) tree.style.display = "flex";
 }
 Delve.refreshHub = function(){
  renderTabs();
  renderHub();
 };
 Delve.showTreePanel = renderTree;

 const originalNewRun = Delve.newRun;
 Delve.newRun = function(){
  if(typeof originalNewRun === "function") originalNewRun();
  const s = Delve.save;
  s.nodes = s.nodes || {};
  s.unlocks = s.unlocks || {};
  s.inventoryCap = s.inventoryCap || 16;
  s.abilities = s.abilities || [];
  s.abilityRanks = s.abilityRanks || {};
  const startLevel = (s.nodes && s.nodes.veteran) ? 2 : 1;
  Delve.G.level = startLevel;
  if(s.nodes && s.nodes.coinpurse) Delve.G.gold = (Delve.G.gold || 0) + 25;
  if(s.nodes && s.nodes.coin_chest) Delve.G.gold = (Delve.G.gold || 0) + 50;
  if(s.nodes && s.nodes.quartermaster){
   const possible = Object.keys(Delve.itemDefs).filter(function(k){
    const d = Delve.itemDefs[k];
    return d.slot && d.slot !== "consumable" && d.tier === 1;
   }).map(function(k){ return Delve.itemDefs[k]; });
   if(possible.length){
    const it = Object.assign({}, possible[Math.floor(Math.random()*possible.length)]);
    delete it.x; delete it.y;
    Delve.G.inventory.push(it);
    Delve.flash("Quartermaster: " + it.name);
   }
  }
  if(s.nodes && s.nodes.provisioner){
   let pot = Delve.potionDefs ? Delve.potionDefs[Math.floor(Math.random()*Delve.potionDefs.length)] : null;
   if(pot){ const stored = Object.assign({}, pot); delete stored.x; delete stored.y; Delve.G.inventory.push(stored); Delve.flash("Provisioner: " + stored.name); }
  }
  if(s.nodes && s.nodes.master_provisioner){
   let pot = Delve.potionDefs ? Delve.potionDefs[Math.floor(Math.random()*Delve.potionDefs.length)] : null;
   if(pot){ const stored = Object.assign({}, pot); delete stored.x; delete stored.y; Delve.G.inventory.push(stored); Delve.flash("Master Provisioner: " + stored.name); }
  }
  Delve.updateHUD();
 };

 Delve.hasProgression = function(id){ return !!owned(id); };
 Delve.inventoryCapacityProgression = function(){
  const s = Delve.save;
  return s.inventoryCap || 16;
 };
 Delve.inventoryCap = function(){
  const s = Delve.save;
  return Math.min(Delve.CONFIG.inventoryMax || 24, s.inventoryCap || Delve.CONFIG.inventorySlots || 16);
 };

 Delve.markRunTrait = function(name, id){
  const s = Delve.save;
  s.runTraits = s.runTraits || [];
  s.runTraitsSeen = s.runTraitsSeen || [];
  if(id && s.runTraitsSeen.indexOf(id) < 0) s.runTraitsSeen.push(id);
  if(name && s.runTraits.indexOf(name) < 0) s.runTraits.push(name);
 };

 // ── BOOT: always draw the hub, tabs included ─────────────────
 Delve.refreshHub();

})();
