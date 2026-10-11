window.Delve = window.Delve || {};
(function(){

 // ── ui.js ────────────────────────────────────────────────────
 // Owns: HUD updates, inventory/item-card screens, shop screen UI, the
 //       level-up screen markup, screen orchestration (hub/run/end), and ALL
 //       DOM event wiring.
 // Does NOT own canvas drawing. The paper doll and minimap moved to
 // render.js; shop stock/pricing moved to items.js; the ?debug=1 panel moved
 // to debug.js; the level-up CHOICE logic stays in traits.js.
 // Call sites below reach them via Delve.drawPaperDoll / Delve.makeShopStock /
 // Delve.shopHealCost / Delve.showLevelUpChoices.

 // Safe element lookup: if an id is missing from index.html, return an inert
 // stand-in instead of null. One missing element can no longer crash the rest
 // of this file. Missing ids are logged and listed in Delve.missingEls.
 const _warned = {};
 function nullEl(id){
  const noop = function(){};
  return {
   id: id, style: {}, dataset: {}, children: [],
   textContent: "", innerHTML: "", value: "", disabled: false,
   classList: { add: noop, remove: noop, toggle: noop, contains: function(){ return false; } },
   addEventListener: noop, appendChild: noop, removeChild: noop,
   querySelector: function(){ return nullEl(id + ">?"); },
   getContext: function(){ return null; }
  };
 }
 const $ = function(id){
  const el = document.getElementById(id);
  if(el) return el;
  if(!_warned[id]){
   _warned[id] = 1;
   (Delve.missingEls = Delve.missingEls || []).push(id);
   try { console.warn("ui.js: missing element #" + id); } catch(_e){}
  }
  return nullEl(id);
 };

 const DEATH_QUOTES = [
  "The Undercroft claims another.",
  "The stones drink you in silence.",
  "Down here, the only way out is through. You went down.",
  "The Warden was not the only thing watching.",
  "Your torch gutters. The dark does not wait."
 ];

 function hideAll(){
  ["hubScreen","deathScreen","inventoryScreen","shopScreen","victoryScreen",
   "stairsPrompt","bossIntroOverlay","itemCardOverlay","logWindow","pauseMenu"].forEach(function(id){
   const el = $(id); if(el) el.style.display = "none";
  });
 }

 // ── Slot unlock state ────────────────────────────────────────
 Delve.isSlotUnlocked = function(slotKey){
  const def = Delve.CONFIG.SLOTS && Delve.CONFIG.SLOTS[slotKey];
  if(!def) return true;
  if(def.unlock === 0) return true;
  if(Delve.save && Delve.save.unlocks && Delve.save.unlocks[slotKey]) return true;
  return false;
 };

 Delve.equipSlots = function(){
  const G = Delve.G;
  if(!G.equip) G.equip = {};
  return G.equip;
 };

 // ── HUD update ────────────────────────────────────────────────
 Delve.updateHUD = function(){
  const G = Delve.G; if(!G) return;
  $("hudHp").textContent = G.hp + "/" + Delve.maxHp();
  $("hudAtk").textContent = Delve.atk();
  $("hudTou").textContent = Math.round(Delve.dmgRed()*100) + "%";
  $("hudAgi").textContent = Math.round(Delve.dodge()*100) + "%";
  $("hudLuc").textContent = Math.round(Delve.luckPts());
  $("hudFloor").textContent = G.floor;
  const en = $("hudEnergy"); if(en) en.textContent = Math.floor(G.energy || 0);
  $("hudGold").textContent = G.gold;
  $("hudShards").textContent = Delve.save.shards;

  const rd = $("restDots");
  if(rd){
   const max = Delve.CONFIG.restPerFloor, used = G.restCount || 0;
   rd.innerHTML = "";
   for(let i=0;i<max;i++){
    const d = document.createElement("span");
    d.className = "rest-dot" + (i<used ? " used" : "");
    rd.appendChild(d);
   }
  }
  Delve.renderAbilityBar();
  Delve.renderMinimap();     // render.js
 };

 // ── INVENTORY ────────────────────────────────────────────────
 Delve.openInventory = function(){
  const G = Delve.G;
  if(!G) return;
  const eq = Delve.equipSlots();
  Delve.drawPaperDoll();     // render.js

  // Build equipment slot grid
  const rack = $("equipRack");
  rack.innerHTML = "";
  Delve.CONFIG.SLOT_ORDER.forEach(function(key){
   const def = Delve.CONFIG.SLOTS[key];
   const unlocked = Delve.isSlotUnlocked(key);
   const item = eq[key];
   const slot = document.createElement("div");
   slot.className = "equip-cell";
   if(!unlocked) slot.classList.add("locked");
   const lbl = document.createElement("div");
   lbl.className = "equip-cell-label";
   lbl.textContent = def.icon + " " + def.label;
   const val = document.createElement("div");
   val.className = "equip-cell-val";
   if(!unlocked){
    val.textContent = "🔒 " + def.unlock + "◇";
    val.style.color = "#5a4a34";
   } else if(item){
    val.textContent = item.name;
    val.style.color = Delve.TIERS.colors[item.tier] || "#cfd8e0";
   } else {
    val.textContent = "empty";
    val.style.color = "#3a4d5c";
   }
   slot.appendChild(lbl); slot.appendChild(val);
   if(unlocked && item){
    slot.addEventListener("click", function(){ Delve.showItemCard(item, "inventory"); });
   }
   rack.appendChild(slot);
  });

  // Carried items grid
  const grid = $("invCarriedGrid");
  grid.innerHTML = "";
  const inv = G.inventory || [];
  const cap = Delve.inventoryCap ? Delve.inventoryCap() : (Delve.CONFIG.inventorySlots || 16);
  if(!inv.length){
   const empty = document.createElement("div");
   empty.style.cssText = "color:#3a4d5c;font-size:13px;padding:8px;";
   empty.textContent = "Nothing carried. (" + inv.length + "/" + cap + ")";
   grid.appendChild(empty);
  } else {
   const count = document.createElement("div");
   count.style.cssText = "width:100%;color:#7f94a8;font-size:11px;font-weight:700;";
   count.textContent = inv.length + " / " + cap + " carried";
   grid.appendChild(count);
   inv.forEach(function(it){
    const col = Delve.TIERS.colors[it.tier] || "#cfd8e0";
    const btn = document.createElement("button");
    btn.className = "inv-item-btn";
    btn.style.borderColor = col + "66";
    const n = document.createElement("span");
    n.textContent = it.name; n.style.color = col; n.style.fontWeight = "800";
    const t = document.createElement("span");
    t.textContent = Delve.TIERS.names[it.tier] || ""; t.style.color = "#7f94a8";
    btn.appendChild(n); btn.appendChild(t);
    btn.addEventListener("click", function(){ Delve.showItemCard(it, "inventory"); });
    grid.appendChild(btn);
   });
  }

  $("inventoryScreen").style.display = "flex";
 };
 $("invBtn").addEventListener("click", Delve.openInventory);
 $("invCloseBtn2").addEventListener("click", function(){ $("inventoryScreen").style.display = "none"; });

 // ── ITEM STAT CARD ───────────────────────────────────────────
 let pendingItemAction = null;
 function closeItemCard(){ $("itemCardOverlay").style.display = "none"; }

 Delve.showItemCard = function(item, source){
  pendingItemAction = { item: item, source: source };
  const overlay = $("itemCardOverlay");
  const tierCol = Delve.TIERS.colors[item.tier] || "#cfd8e0";
  const tierName = Delve.TIERS.names[item.tier] || "";

  $("icName").textContent = item.name;
  $("icName").style.color = tierCol;
  $("icTier").textContent = tierName;
  $("icTier").style.color = tierCol;
  $("icFlavour").textContent = item.lore || item.flavour || "";

  const body = $("icStats");
  body.innerHTML = "";
  Delve.itemStatLines(item).forEach(function(l){
   const row = document.createElement("div");
   row.className = "ic-stat-row";
   const lbl = document.createElement("span");
   lbl.className = "ic-stat-label"; lbl.textContent = l.label;
   const val = document.createElement("span");
   val.className = "ic-stat-value"; val.textContent = l.value;
   if(l.delta > 0){ val.textContent += "  +" + l.delta; val.style.color = "#7ee08a"; }
   else if(l.delta < 0){ val.textContent += "  " + l.delta; val.style.color = "#ff9a9a"; }
   row.appendChild(lbl); row.appendChild(val);
   body.appendChild(row);
  });
  if(item.provenance){
   const prov = document.createElement("div");
   prov.style.cssText = "font-size:11px;color:#7f94a8;font-style:italic;margin-top:6px;";
   prov.textContent = item.provenance;
   body.appendChild(prov);
  }

  const primary = $("icPrimaryBtn");
  const secondary = $("icSecondaryBtn");

  if(source === "floor"){
   const full = Delve.G.inventory.length >= (Delve.inventoryCap ? Delve.inventoryCap() : Delve.CONFIG.inventorySlots);
   primary.textContent = full ? "No Room" : "Pick Up";
   primary.disabled = full;
   secondary.textContent = "Leave";
   secondary.onclick = closeItemCard;
   primary.onclick = function(){
    if(full) return;
    const it = Object.assign({}, pendingItemAction.item);
    const x = it.x, y = it.y; delete it.x; delete it.y;
    Delve.G.items = Delve.G.items.filter(function(i){ return !(i.x === x && i.y === y); });
    Delve.G.inventory.push(it);
    if(Delve.logPickup) Delve.logPickup(it.name, it.tier);
    Delve.flash("Picked up " + it.name);
    Delve.updateHUD(); Delve.draw(); closeItemCard();
   };
  } else {
   if(item.slot === "consumable"){
    primary.textContent = "Use";
    primary.disabled = false;
    primary.onclick = function(){
     closeItemCard();
     $("inventoryScreen").style.display = "none";
     Delve.useConsumable(item);
     Delve.updateHUD(); Delve.draw();
    };
    secondary.textContent = "Discard";
    secondary.onclick = function(){
     const i = Delve.G.inventory.indexOf(item);
     if(i >= 0) Delve.G.inventory.splice(i, 1);
     Delve.flash("Discarded " + item.name);
     Delve.updateHUD(); Delve.draw(); closeItemCard(); Delve.openInventory();
    };
   } else {
    const equipped = isEquipped(item);
    primary.textContent = equipped ? "Unequip" : "Equip";
    primary.disabled = equipped && Delve.G.inventory.length >= (Delve.inventoryCap ? Delve.inventoryCap() : Delve.CONFIG.inventorySlots);
    primary.onclick = function(){
     if(equipped){ Delve.unequipItem(item); }
     else { Delve.equipItem(item); }
     Delve.updateHUD(); Delve.draw(); closeItemCard(); Delve.openInventory();
    };
    secondary.textContent = equipped ? "Close" : "Discard";
    secondary.onclick = function(){
     if(!equipped){
      const i = Delve.G.inventory.indexOf(item);
      if(i >= 0) Delve.G.inventory.splice(i, 1);
      Delve.flash("Discarded " + item.name);
     }
     Delve.updateHUD(); Delve.draw(); closeItemCard(); Delve.openInventory();
    };
   }
  }
  overlay.style.display = "flex";
 };

 function isEquipped(item){
  const eq = Delve.equipSlots();
  for(const k of Delve.CONFIG.SLOT_ORDER){
   if(eq[k] === item) return true;
  }
  return false;
 }
 $("icCloseBtn").addEventListener("click", closeItemCard);

 // ── LOG WINDOW ───────────────────────────────────────────────
 $("logExpandBtn").addEventListener("click", function(){
  if(Delve.flushLogWindow) Delve.flushLogWindow();
  $("logWindow").style.display = "flex";
 });
 $("logWindowClose").addEventListener("click", function(){ $("logWindow").style.display = "none"; });

 // ── STAIRS / FLOOR CARD / BOSS INTRO ─────────────────────────
 Delve.showStairsPrompt = function(){ $("stairsPrompt").style.display = "flex"; };
 $("stairsYes").addEventListener("click", function(){ $("stairsPrompt").style.display = "none"; Delve.descend(); });
 $("stairsNo").addEventListener("click", function(){ $("stairsPrompt").style.display = "none"; });

 Delve.showFloorCard = function(floor){
  const ward = Delve.getWard(floor);
  const wname = (ward && ward.name) || "The Undercroft";
  if(Delve.sfx) Delve.sfx("floor_enter", { ward: ward ? ward.id : 1 });
  $("floorCardNum").textContent = "Floor " + floor;
  $("floorCardName").textContent =
   Delve.isShopFloor(floor) ? "Trading Post — " + wname :
   (floor % 10 === 0) ? wname + " — Boss Arena" : wname;
  const card = $("floorCard");
  card.style.display = "flex";
  clearTimeout(Delve._floorCardT);
  Delve._floorCardT = setTimeout(function(){ card.style.display = "none"; }, 1500);
 };

 Delve.showBossIntro = function(floor){
  const f = floor || (Delve.G && Delve.G.floor) || 10;
  const cfg = Delve.CONFIG;
  const bossDef = cfg.BOSS_DEFS[Math.ceil(f/10)] || cfg.BOSS_DEFS[1] || {};
  const accent = bossDef.accent || "#c98aff";
  $("bossIntroName").textContent = bossDef.name || "The Warden";
  $("bossIntroTitle").textContent = bossDef.title || "";
  $("bossIntroFlavour").textContent = bossDef.flavour || "";
  const warnEl = $("bossIntroWarning");
  const titleEl = $("bossIntroTitle");
  const cardEl = $("bossIntroCard");
  if(warnEl) warnEl.style.color = accent;
  if(titleEl) titleEl.style.color = accent;
  if(cardEl) cardEl.style.borderColor = accent + "66";
  const ov = $("bossIntroOverlay");
  if(Delve.sfx) Delve.sfx("boss_intro", { ward: Math.ceil(f/10) });
  ov.style.display = "flex";
  clearTimeout(Delve._bossIntroT);
  Delve._bossIntroT = setTimeout(function(){ ov.style.display = "none"; }, 3000);
 };

 // ── HUB ──────────────────────────────────────────────────────
 Delve.refreshHub = function(){
  $("hubShards").textContent = Delve.save.shards;
  const shop = $("shop"); shop.innerHTML = "";
  Delve.CONFIG.ATTR_ORDER.forEach(function(id){
   const a = Delve.CONFIG.ATTRS[id];
   if(a.kind === "dormant") return;
   const lvl = Delve.save.lvls[id] || 0;
   const cost = Delve.attrCost(id);
   const capped = (a.kind === "pct" && a.cap && Delve.dmgRed() >= a.cap);
   const row = document.createElement("div"); row.className = "upgrade";
   const info = document.createElement("div");
   const name = document.createElement("div"); name.className = "name";
   name.textContent = a.name;
   const lv = document.createElement("span"); lv.className = "lvl"; lv.textContent = " Lv " + lvl;
   name.appendChild(lv);
   const desc = document.createElement("div"); desc.className = "desc"; desc.textContent = a.desc;
   info.appendChild(name); info.appendChild(desc);
   if(!capped && Delve.save.shards < cost){
    const need = document.createElement("div");
    need.className = "desc"; need.style.color = "#c9971f";
    need.textContent = "Need " + (cost - Delve.save.shards) + " more ◇";
    info.appendChild(need);
   }
   const btn = document.createElement("button"); btn.className = "btn";
   btn.textContent = capped ? "MAX" : String(cost);
   btn.disabled = capped || Delve.save.shards < cost;
   btn.addEventListener("click", function(){
    const c = Delve.attrCost(id);
    if(Delve.save.shards < c) return;
    Delve.save.shards -= c; Delve.save.lvls[id] = (Delve.save.lvls[id] || 0) + 1;
    Delve.persist(); Delve.refreshHub();
   });
   row.appendChild(info); row.appendChild(btn);
   shop.appendChild(row);
  });

  (Delve._hooks && Delve._hooks.hubLoaded || []).forEach(function(fn){ fn(); });
 };
 Delve.buildHub = Delve.refreshHub;

 Delve.showHub = function(){
  hideAll();
  if(Delve.sfxStopAmbience) Delve.sfxStopAmbience();
  $("levelupScreen").style.display = "none";
  $("hubScreen").style.display = "flex";
  $("hud").style.display = "none";
  $("abilityBar").style.display = "none";
  $("minimapWrap").style.display = "none";
  const lp = $("logPanel"); if(lp) lp.classList.remove("active");
  const vg = $("combatVignette"); if(vg) vg.classList.remove("active");
  Delve.refreshHub();
 };
 Delve.hideHub = function(){
  $("hubScreen").style.display = "none";
  $("hud").style.display = "flex";
  $("levelupScreen").style.display = "none";
 };

 Delve.startRun = function(){
  hideAll();
  $("hud").style.display = "flex";
  Delve.newRun();
  if(Delve.sfxStartAmbience) Delve.sfxStartAmbience();
  if(Delve.resize) Delve.resize();
  Delve.draw();
  Delve.showFloorCard(Delve.G.floor);
 };

 // ── ABILITY BAR ──────────────────────────────────────────────
 Delve.renderAbilityBar = function(){
  const bar = $("abilityBar"); if(!bar) return;
  const G = Delve.G;
  bar.innerHTML = "";
  if(!G || !G.abilities || !G.abilities.length){ bar.style.display = "none"; return; }
  bar.style.display = "flex";
  G.abilities.forEach(function(ab){
   const btn = document.createElement("button");
   btn.className = "ability-btn";
   const afford = (G.energy || 0) >= displayCost(ab);
   btn.disabled = !afford;
   if(G.targetingAbility && G.targetingAbility.id === ab.id){
    btn.style.borderColor = "#ffd75e";
    btn.style.background = "#2a2a14";
   }
   const n = document.createElement("span");
   n.className = "ability-name"; n.textContent = ab.name;
   const c = document.createElement("span");
   c.className = "ability-cost";
   c.textContent = "⚡ " + displayCost(ab);
   btn.appendChild(n); btn.appendChild(c);
   btn.addEventListener("click", function(){ activateAbility(ab); });
   bar.appendChild(btn);
  });
 };

 function displayCost(ab){
  return (Delve.hasProgression && Delve.hasProgression("second_nature"))
   ? Math.max(1, Math.round((ab.cost || 0) * 0.8)) : ab.cost;
 }

 function activateAbility(ab){
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  if((G.energy || 0) < displayCost(ab)){ Delve.flash("Not enough Energy"); return; }
  if(ab.target === "self"){
   G.targetingAbility = null;
   if(Delve.castAbility(ab, G.px, G.py) !== false){
    Delve.enemiesTurn();
   }
  } else if(G.targetingAbility && G.targetingAbility.id === ab.id){
   G.targetingAbility = null;
   Delve.flash("Cancelled");
  } else {
   G.targetingAbility = ab;
   Delve.flash(ab.name + " — tap a target");
  }
  Delve.updateHUD();
  Delve.draw();
 }

 // ── SHOP (screen only) ───────────────────────────────────────
 // Stock generation and pricing live in items.js
 // (Delve.makeShopStock / Delve.shopHealCost).
 Delve.openShop = function(){
  const G = Delve.G; if(!G) return;
  hideAll();
  if(!G.shop) G.shop = { x:-1, y:-1 };
  if(!G.shop.stock) G.shop.stock = Delve.makeShopStock(G);
  if(Delve.sfx) Delve.sfx("shop_open");
  $("shopScreen").style.display = "flex";
  Delve.buildShop();
 };

 Delve.buildShop = function(){
  const G = Delve.G;
  $("shopGold").textContent = G.gold;
  $("shopGreeting").textContent = Delve.luckDiscount() > 0
   ? "\"Lucky one, aren't you? Here's " + Math.round(Delve.luckDiscount()*100) + "% off.\""
   : "\"Take a look. Everything's honestly priced.\"";
  const healCost = Delve.shopHealCost(G);
  const hb = $("shopHealBtn");
  hb.textContent = "❤️ Restore 50% HP — " + healCost + "g";
  hb.disabled = G.gold < healCost || G.hp >= Delve.maxHp();
  const wrap = $("shopStock");
  wrap.innerHTML = "";
  G.shop.stock.forEach(function(entry){
   const item = entry.item;
   const price = Delve.itemPrice(item);
   const row = document.createElement("div"); row.className = "shop-item";
   const info = document.createElement("div");
   const nm = document.createElement("div"); nm.className="si-name";
   nm.style.color = Delve.TIERS.colors[item.tier]||"#fff"; nm.textContent = item.name;
   const ds = document.createElement("div"); ds.className="si-desc"; ds.textContent = item.lore||item.flavour||"";
   info.appendChild(nm); info.appendChild(ds);
   const buy = document.createElement("button"); buy.className="btn shop-buy";
   buy.textContent = entry.sold?"Sold":price+"g";
   buy.disabled = entry.sold || G.gold < price;
   buy.addEventListener("click", function(){
    if(entry.sold || G.gold<price) return;
    if(G.inventory.length >= (Delve.inventoryCap?Delve.inventoryCap():Delve.CONFIG.inventorySlots)){ Delve.flash("Bag is full!"); if(Delve.sfx) Delve.sfx("deny"); return; }
    G.gold -= price;
    entry.sold = true;
    Delve.recordStat("goldSpentShop", price);
    if(Delve.sfx) Delve.sfx("buy");
    const bought = Object.assign({}, item);
    Delve.stampProvenance(bought, { kind:"shop" });
    Delve.pickupItem(bought);
    Delve.updateHUD();
    Delve.buildShop();
   });
   row.appendChild(info); row.appendChild(buy);
   wrap.appendChild(row);
  });
 };

 function closeShop(){
  $("shopScreen").style.display = "none";
  $("hud").style.display = "flex";
  Delve.updateHUD();
  Delve.draw();
 }
 function doShopHeal(){
  const G = Delve.G;
  const cost = Delve.shopHealCost(G);
  if(G.gold < cost || G.hp >= Delve.maxHp()) return;
  G.gold -= cost;
  const heal = Math.round(Delve.maxHp()*Delve.CONFIG.shop.healPct);
  G.hp = Math.min(Delve.maxHp(), G.hp+heal);
  Delve.recordStat("goldSpentShop", cost);
  if(Delve.sfx) Delve.sfx("potion");
  Delve.flash("+" + heal + " HP");
  Delve.updateHUD();
  Delve.buildShop();
 }

 // ── VICTORY / END SCREENS ────────────────────────────────────
 function summaryRows(){
  const s = (Delve.G && Delve.G.runStats) || {};
  const rows = [
   ["Floors reached", Delve.G ? Delve.G.floor : 0],
   ["Kills", s.kills || 0],
   ["Elites slain", s.elitesKilled || 0],
   ["Gold earned", s.goldEarned || 0],
   ["Gold spent", s.goldSpentShop || 0],
   ["Barrels smashed", s.barrelsSmashed || 0],
   ["Consumables used", s.consumablesUsed || 0],
   ["Shards this run", Delve.G ? Delve.G.runShards : 0]
  ];
  return rows.map(function(r){
   return '<div class="death-row"><span class="dr-label">'+r[0]+'</span><span class="dr-value">'+r[1]+'</span></div>';
  }).join("");
 }

 Delve.showVictory = function(shards, canContinue){
  hideAll();
  $("victoryShards").textContent = shards || 0;
  $("victorySummary").innerHTML = summaryRows().replace(/death-row/g,"victory-row").replace(/dr-label/g,"vr-label").replace(/dr-value/g,"vr-value");
  const contBtn = $("victoryContinue");
  if(contBtn) contBtn.style.display = (canContinue === false) ? "none" : "";
  $("victoryScreen").style.display = "flex";
 };

 Delve.showEndScreen = function(kind, extra){
  hideAll();
  $("levelupScreen").style.display = "none";
  const title = $("deathScreen").querySelector("h1");
  if(kind === "victory"){ Delve.showVictory((extra&&extra.shards)||0, (extra&&extra.canContinue!==false)); return; }
  if(kind === "retreat"){
   title.textContent = "ESCAPED";
   $("deathInfo").textContent = "You climbed back to the surface.";
   $("deathQuote").textContent = "Some runs are measured in what you carry out.";
   $("deathShards").textContent = "+" + ((extra&&extra.shards)||0) + " shards from gold";
  } else {
   title.textContent = "YOU DIED";
   $("deathInfo").textContent = "You reached floor " + Delve.G.floor + " — best " + Delve.save.bestFloor;
   $("deathQuote").textContent = DEATH_QUOTES[Math.floor(Math.random()*DEATH_QUOTES.length)];
   $("deathShards").textContent = "+" + Delve.G.runShards + " shards this run";
  }
  $("deathSummary").innerHTML = summaryRows();
  $("deathScreen").style.display = "flex";
 };

 // ── WIRING ───────────────────────────────────────────────────
 $("startBtn").addEventListener("click", Delve.startRun);
 $("deathBtn").addEventListener("click", Delve.showHub);

 $("minimapBtn").addEventListener("click", function(){
  const w = $("minimapWrap");
  w.style.display = (getComputedStyle(w).display === "none") ? "block" : "none";
  Delve.renderMinimap();     // render.js
 });

 $("gearBtn").addEventListener("click", function(){
  if(Delve.G && !Delve.G.runEnded) $("pauseMenu").style.display = "flex";
 });
 $("pauseCloseBtn").addEventListener("click", function(){ $("pauseMenu").style.display = "none"; });
 $("pauseRetreatBtn").addEventListener("click", function(){
  $("pauseMenu").style.display = "none";
  Delve.retreat();
 });
 $("muteBtn").addEventListener("click", function(){
  const muted = Delve.sfxToggleMute ? Delve.sfxToggleMute() : false;
  $("muteBtn").textContent = muted ? "🔇" : "🔊";
 });
 $("volumeSlider").addEventListener("input", function(){
  if(Delve.sfxSetVolume) Delve.sfxSetVolume(parseFloat(this.value));
 });
 $("musicSlider").addEventListener("input", function(){
  if(Delve.musicSetVolume) Delve.musicSetVolume(parseFloat(this.value));
 });
 $("hapticsBtn").addEventListener("click", function(){
  const on = Delve.sfxGetHaptics ? !Delve.sfxGetHaptics() : false;
  if(Delve.sfxSetHaptics) Delve.sfxSetHaptics(on);
  $("hapticsBtn").textContent = on ? "ON" : "OFF";
 });
 // Sync controls to persisted audio prefs on load.
 if(Delve.sfxGetVolume) $("volumeSlider").value = Delve.sfxGetVolume();
 if(Delve.musicGetVolume) $("musicSlider").value = Delve.musicGetVolume();
 if(Delve.sfxGetHaptics) $("hapticsBtn").textContent = Delve.sfxGetHaptics() ? "ON" : "OFF";
 if(Delve.sfxMuted) $("muteBtn").textContent = Delve.sfxMuted() ? "🔇" : "🔊";

 $("shopHealBtn").addEventListener("click", doShopHeal);
 $("shopLeaveBtn").addEventListener("click", closeShop);

 $("victoryContinue").addEventListener("click", function(){
  hideAll();
  $("hud").style.display = "flex";
  const G = Delve.G;
  G.victoryDone = false;
  G.secondWindUsed = false;
  Delve.descend();
  Delve.updateHUD();
  Delve.draw();
  Delve.showFloorCard(G.floor);
 });
 $("victoryHub").addEventListener("click", function(){
  if(Delve.G) Delve.G.runEnded = true;
  Delve.showHub();
 });

 if(/[?&]debug=1/.test(location.search)) Delve.initDebug();

 Delve.showHub();

  // ── LEVEL-UP CHOICES ─────────────────────────────────────────
 // MOVED here from traits.js: traits.js decides WHICH options to offer
 // (Delve.showLevelUpChoices), this file draws them. DOM belongs with DOM.
 Delve.renderLevelUpChoices = function(choices){
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
 const cost = isAbility ? abilityCost(t) : 0;
 const title = document.createElement("div");
 title.style.cssText = "font-weight:800;font-size:19px;margin-bottom:4px;";
 title.textContent = (isAbility ? "⚡ " : "") + t.name + (isAbility ? " (" + cost + " energy)" : "");
 const desc = document.createElement("div");
 desc.style.cssText = "font-size:14px;color:#a9bccd;white-space:normal;";
 desc.textContent = t.desc;
 card.appendChild(title);
 card.appendChild(desc);

 card.addEventListener("click", function(){
 Delve.applyTrait(t);
 overlay.style.display = "none";
 G.pendingLevelUps = (G.pendingLevelUps || 1) - 1;
 if(G.pendingLevelUps > 0){
 G.levelUpOpen = true;
 Delve.showLevelUpChoices();
 } else {
 G.levelUpOpen = false;
 }
 Delve.updateHUD();
 Delve.draw();
 });
 slot.appendChild(card);
 });
 }
})();
