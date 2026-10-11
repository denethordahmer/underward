window.Delve = window.Delve || {};
(function(){
 const $ = function(id){ return document.getElementById(id); };

 // Tree + node data moved to js/content/con-progression.js (content).
 const TREES = Delve.CONFIG.PROGRESSION.TREES;
 const NODES = Delve.CONFIG.PROGRESSION.NODES;

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

 // ── Tree display state (owned here, not overriding refreshHub) ──
 let activeTree = "attrs";

 function renderTabs(){
  const tabs = $("hubTabs");
  if(!tabs) return;
  tabs.innerHTML = "";
  TREES.forEach(function(t){
   const b = document.createElement("button");
   b.className = "hub-tab" + (t.id === activeTree ? " active" : "");
   b.textContent = t.name;
   b.addEventListener("click", function(){
    activeTree = t.id;
    renderTabs();
    renderPanels();
   });
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
      Delve.save.shards -= n.cost;
      Delve.save.shards = Math.max(0, Delve.save.shards);
      afterBuy(n);
      Delve.flash(n.name + " — unlocked");
      renderTabs();
      renderPanels();
     });
    }
    wrap.appendChild(card);
   });
   panel.appendChild(wrap);
  }
 }

 function renderPanels(){
  const shop = $("shop");
  const tree = $("treePanel");
  if(activeTree === "attrs"){
   if(tree) tree.style.display = "none";
   if(shop) shop.style.display = "flex";
  } else {
   if(shop) shop.style.display = "none";
   if(tree){
    renderTree(activeTree);
    tree.style.display = "flex";
   }
  }
 }

 // ── Run-start injection (registered as a hook, not an override) ──
 function injectRunStart(){
  const s = Delve.save;
  s.nodes = s.nodes || {};
  s.unlocks = s.unlocks || {};
  s.inventoryCap = s.inventoryCap || 16;
  s.abilities = s.abilities || [];
  s.abilityRanks = s.abilityRanks || {};

  if(s.nodes && s.nodes.veteran) Delve.G.level = 2;

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
   Delve.G.gold = (Delve.G.gold || 0) + 25; // Master Provisioner: +25g (desc said so, was missing)
  }

  // Hub-purchased abilities enter every run.
  if(Delve.injectHubAbilities) Delve.injectHubAbilities();
 }

 // ── Public helpers (additions, named clearly, no overrides) ──
 Delve.hasProgression = function(id){ return !!owned(id); };
 Delve.markRunTrait = function(name, id){
  const s = Delve.save;
  s.runTraits = s.runTraits || [];
  s.runTraitsSeen = s.runTraitsSeen || [];
  if(id && s.runTraitsSeen.indexOf(id) < 0) s.runTraitsSeen.push(id);
  if(name && s.runTraits.indexOf(name) < 0) s.runTraits.push(name);
 };

 // ── Register hooks (core files call these; nothing is overwritten) ──
 Delve._hooks = Delve._hooks || {};
 Delve._hooks.hubLoaded = Delve._hooks.hubLoaded || [];
 Delve._hooks.runStart = Delve._hooks.runStart || [];

 Delve._hooks.hubLoaded.push(function(){
  renderTabs();
  renderPanels();
 });
 Delve._hooks.runStart.push(injectRunStart);

 // Re-render the hub now that this module's hooks are registered
 Delve.refreshHub();

})();
