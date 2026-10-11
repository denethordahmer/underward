window.Delve = window.Delve || {};
(function(){

 const $ = id => document.getElementById(id);

 const DEATH_QUOTES = [
  "The Undercroft claims another.",
  "The stones drink you in silence.",
  "Down here, the only way out is through. You went down.",
  "The Warden was not the only thing watching.",
  "Your torch gutters. The dark does not wait."
 ];

 function hideAll(){
  ["hubScreen","deathScreen","inventoryScreen","shopScreen","victoryScreen",
   "stairsPrompt","bossIntroOverlay","retreatMenu","itemCardOverlay","logWindow"].forEach(function(id){
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

 // ── HUD update ───────────────────────────────────────────────
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
  Delve.renderMinimap();
 };

 // ── PAPER DOLL ───────────────────────────────────────────────
 function drawPaperDoll(){
  const cv = $("charCanvas");
  if(!cv) return;
  const W = cv.width, H = cv.height;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0,0,W,H);

  const eq = Delve.equipSlots();
  const cx = W/2;

  // backdrop shadow
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath(); ctx.ellipse(cx, H-24, 46, 10, 0, 0, Math.PI*2); ctx.fill();

  // palettes
  const skin = "#e8c39a", hair = "#5a3d2c", bodyBase = "#33507a", bodyDark = "#233a5c";
  const tier = function(item){
   return item ? (Delve.TIERS.colors[item.tier] || "#cfd8e0") : "#1a2532";
  };

  // ── draw order: back pieces, body, front pieces ──

  // cloak (behind everything)
  if(eq.cloak){
   ctx.fillStyle = tier(eq.cloak);
   ctx.beginPath();
   ctx.moveTo(cx-16, H-120);
   ctx.lineTo(cx-42, H-36);
   ctx.lineTo(cx+42, H-36);
   ctx.lineTo(cx+16, H-120);
   ctx.closePath();
   ctx.fill();
  }

  // legs
  ctx.fillStyle = "#4d3622";
  ctx.fillRect(cx-15, H-80, 12, 52);
  ctx.fillRect(cx+3, H-80, 12, 52);
  // feet
  if(eq.feet){ drawSwatch(ctx, cx-17, H-32, 16, 8, tier(eq.feet)); drawSwatch(ctx, cx+1, H-32, 16, 8, tier(eq.feet)); }
  else { ctx.fillStyle = "#2b2118"; ctx.fillRect(cx-17, H-34, 16, 8); ctx.fillRect(cx+1, H-34, 16, 8); }

  // torso
  const bodyCol = eq.body ? tier(eq.body) : bodyBase;
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.roundRect(cx-22, H-132, 44, 58, 8);
  ctx.fill();
  ctx.fillStyle = eq.body ? bodyCol : bodyDark;
  ctx.fillRect(cx-22, H-132, 5, 58);
  ctx.fillRect(cx+17, H-132, 5, 58);

  // arms
  ctx.fillStyle = skin;
  ctx.fillRect(cx-36, H-128, 9, 40);
  ctx.fillRect(cx+27, H-128, 9, 40);
  // hands
  if(eq.hands){ drawSwatch(ctx, cx-37, H-90, 11, 8, tier(eq.hands)); drawSwatch(ctx, cx+26, H-90, 11, 8, tier(eq.hands)); }
  else { ctx.fillStyle = skin; ctx.fillRect(cx-37, H-90, 11, 7); ctx.fillRect(cx+26, H-90, 11, 7); }

  // neck + head
  ctx.fillStyle = skin;
  ctx.fillRect(cx-5, H-140, 10, 8);
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx, H-152, 20, 0, Math.PI*2); ctx.fill();
  // hair
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(cx, H-158, 20, Math.PI, 0); ctx.fill();
  // face
  ctx.fillStyle = "#1d232b";
  ctx.fillRect(cx-8, H-156, 3, 3); ctx.fillRect(cx+5, H-156, 3, 3);
  // head equipment
  if(eq.head){
   ctx.fillStyle = tier(eq.head);
   ctx.beginPath(); ctx.arc(cx, H-156, 21, Math.PI, Math.PI*2); ctx.fill();
   ctx.fillRect(cx-22, H-158, 44, 7);
  }

  // weapon (right hand side)
  if(eq.weapon){
   ctx.save();
   ctx.translate(cx+30, H-98);
   ctx.rotate(-0.6);
   ctx.fillStyle = tier(eq.weapon);
   ctx.fillRect(-3, -34, 6, 34);  // blade
   ctx.fillStyle = "#8a5a33"; ctx.fillRect(-8, -4, 16, 5); // hilt
   ctx.restore();
  }
  // offhand
  if(eq.offhand){
   ctx.fillStyle = tier(eq.offhand);
   ctx.beginPath(); ctx.arc(cx-40, H-106, 13, 0, Math.PI*2); ctx.fill();
   ctx.fillStyle = "rgba(0,0,0,0.2)";
   ctx.beginPath(); ctx.arc(cx-40, H-106, 13, 0, Math.PI*2); ctx.stroke();
  }

  // amulet (chest)
  if(eq.amulet){
   ctx.fillStyle = tier(eq.amulet);
   ctx.beginPath(); ctx.arc(cx, H-112, 5, 0, Math.PI*2); ctx.fill();
  }

  function drawSwatch(ctx2, x, y, w, h, col){
   ctx2.fillStyle = col; ctx2.fillRect(x, y, w, h);
   ctx2.fillStyle = "rgba(255,255,255,0.12)"; ctx2.fillRect(x, y, w, 2);
  }
 }

 // ── INVENTORY ────────────────────────────────────────────────
 Delve.openInventory = function(){
  const G = Delve.G; if(!G) return;
  dibb1();
 };

 function dibb1(){ /* placeholder to keep structure if drawn later */ }

 Delve.openInventory = function(){
  const G = Delve.G;
  if(!G) return;
  const eq = Delve.equipSlots();
  drawPaperDoll();

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
   } else if(unlocked){
    // tapping empty unlocked slot does nothing for now
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
     if(equipped){
      Delve.unequipItem(item);
     } else {
      Delve.equipItem(item);
     }
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
  $("bossIntroName").textContent = bossDef.name || "The Warden";
  $("bossIntroTitle").textContent = bossDef.title || "";
  $("bossIntroFlavour").textContent = bossDef.flavour || "";
  const ov = $("bossIntroOverlay");
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
   const afford = (G.energy || 0) >= (ab.cost || 0);
   btn.disabled = !afford;
   if(G.targetingAbility && G.targetingAbility.id === ab.id){
    btn.style.borderColor = "#ffd75e";
    btn.style.background = "#2a2a14";
   }
   const n = document.createElement("span");
   n.className = "ability-name"; n.textContent = ab.name;
   const c = document.createElement("span");
   c.className = "ability-cost"; c.textContent = "⚡ " + ab.cost;
   btn.appendChild(n); btn.appendChild(c);
   btn.addEventListener("click", function(){ activateAbility(ab); });
   bar.appendChild(btn);
  });
 };

 function activateAbility(ab){
  const G = Delve.G;
  if(!G || G.dead || G.runEnded) return;
  if((G.energy || 0) < ab.cost){ Delve.flash("Not enough Energy"); return; }
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

 // ── MINIMAP ──────────────────────────────────────────────────
 Delve.markVisited = function(x, y){
  const G = Delve.G; if(!G || !G.grid || !G.grid.length) return;
  if(G._visitedFloor !== G.floor){ G.visited = []; G._visitedFloor = G.floor; }
  if(!G.visited) G.visited = [];
  const h = G.grid.length, w = G.grid[0].length, R = 5;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
   if(Math.abs(dx)+Math.abs(dy) > R) continue;
   const ux=x+dx, uy=y+dy;
   if(ux<0||uy<0||ux>=w||uy>=h) continue;
   if(!G.visited[uy]) G.visited[uy] = [];
   G.visited[uy][ux] = 1;
  }
 };

 Delve.renderMinimap = function(){
  const wrap = $("minimapWrap");
  if(!wrap || getComputedStyle(wrap).display === "none") return;
  const cv = $("minimap"); if(!cv) return;
  const ctx = cv.getContext("2d");
  const G = Delve.G;
  ctx.fillStyle = "#070a0e";
  ctx.fillRect(0,0,cv.width,cv.height);
  if(!G || !G.grid || !G.grid.length) return;
  const gw = G.grid[0].length, gh = G.grid.length;
  const s = Math.min(cv.width/gw, cv.height/gh);
  const ox = (cv.width-gw*s)/2, oy = (cv.height-gh*s)/2;
  const vis = G.visited || [];
  const T = Delve.T;
  const seen = function(x,y){ return vis[y] && vis[y][x]; };
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++){
   const t = G.grid[y][x];
   if(t === T.WALL || !seen(x,y)) continue;
   let col = "#2a333d";
   if(t === T.STAIR) col = "#2ad0b0";
   else if(t === T.GOLD) col = "#d9a11f";
   else if(t === T.CHEST) col = "#c9971f";
   else if(t === T.BARREL) col = "#7a5c3a";
   ctx.fillStyle = col;
   ctx.fillRect(ox+x*s, oy+y*s, s+0.5, s+0.5);
  }
  if(G.shop && G.shop.x >= 0 && seen(G.shop.x, G.shop.y)){
   ctx.fillStyle = "#ffd75e";
   ctx.fillRect(ox+G.shop.x*s, oy+G.shop.y*s, s+1, s+1);
  }
  const dot = function(x,y,col,r){
   ctx.fillStyle = col;
   ctx.beginPath();
   ctx.arc(ox+x*s+s/2, oy+y*s+s/2, s*r, 0, Math.PI*2);
   ctx.fill();
  };
  (G.monsters||[]).forEach(function(m){ if(seen(m.x,m.y)) dot(m.x,m.y,m.elite?"#c98aff":"#e05a6a",0.45); });
  if(G.boss && seen(G.boss.x,G.boss.y)) dot(G.boss.x,G.boss.y,"#ff4a3d",0.6);
  dot(G.px,G.py,"#ffffff",0.4);
 };

 // ── SHOP ─────────────────────────────────────────────────────
 function shopItemPool(type){
  return Object.keys(Delve.itemDefs).map(function(k){ return Delve.itemDefs[k]; })
   .filter(function(d){ return type === "consumable" ? d.slot === "consumable" : d.slot !== "consumable"; });
 }
 function makeShopStock(G){
  const shopNum = Math.floor(G.floor/10)+1;
  const maxTier = shopNum>=3?4:shopNum===2?3:2;
  const stock = [];
  let gear = shopItemPool("gear").filter(function(d){ return d.tier <= maxTier; });
  const top = gear.filter(function(d){ return d.tier === maxTier; });
  if(top.length && Math.random()<0.7) gear = top;
  for(let i=0;i<(Delve.CONFIG.shop.stockGear||1) && gear.length;i++){
   stock.push({ item: Object.assign({}, gear[Math.floor(Math.random()*gear.length)]), sold:false });
  }
  const cons = shopItemPool("consumable").filter(function(d){ return d.tier <= Math.min(maxTier,3); });
  const used = {};
  const want = Math.min(Delve.CONFIG.shop.stockConsumables||4, cons.length);
  let guard=0;
  while(Object.keys(used).length < want && guard++<100){
   const pick = cons[Math.floor(Math.random()*cons.length)];
   if(used[pick.id]) continue;
   used[pick.id]=1;
   stock.push({ item: Object.assign({}, pick), sold:false });
  }
  return stock;
 }
 function shopHealCost(G){
  return Math.max(1, Math.round(Delve.healCost(G.floor)*(1-Delve.luckDiscount())));
 }

 Delve.openShop = function(){
  const G = Delve.G; if(!G) return;
  hideAll();
  if(!G.shop) G.shop = { x:-1, y:-1 };
  if(!G.shop.stock) G.shop.stock = makeShopStock(G);
  $("shopScreen").style.display = "flex";
  Delve.buildShop();
 };

 Delve.buildShop = function(){
  const G = Delve.G;
  $("shopGold").textContent = G.gold;
  $("shopGreeting").textContent = Delve.luckDiscount() > 0
   ? "\"Lucky one, aren't you? Here's " + Math.round(Delve.luckDiscount()*100) + "% off.\""
   : "\"Take a look. Everything's honestly priced.\"";
  const healCost = shopHealCost(G);
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
    if(G.inventory.length >= (Delve.inventoryCap?Delve.inventoryCap():Delve.CONFIG.inventorySlots)){ Delve.flash("Bag is full!"); return; }
    G.gold -= price;
    entry.sold = true;
    Delve.recordStat("goldSpentShop", price);
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
  const cost = shopHealCost(G);
  if(G.gold < cost || G.hp >= Delve.maxHp()) return;
  G.gold -= cost;
  const heal = Math.round(Delve.maxHp()*Delve.CONFIG.shop.healPct);
  G.hp = Math.min(Delve.maxHp(), G.hp+heal);
  Delve.recordStat("goldSpentShop", cost);
  Delve.flash("+" + heal + " HP");
  Delve.updateHUD();
  Delve.buildShop();
 }

 // shopkeeper tap-to-open
 (function wrapShopTap(){
  function atShop(tx,ty){ const G=Delve.G; return G && G.shop && G.shop.x===tx && G.shop.y===ty && !G.inCombat && !G.targetingAbility; }
  function open(){ const G=Delve.G; G._path=null; if(G._pathTimer){clearInterval(G._pathTimer); G._pathTimer=null;} Delve.openShop(); }
  const a1=Delve.tryAct, a2=Delve.tryActOnStep;
  Delve.tryAct = function(tx,ty){ if(atShop(tx,ty)) open(); else a1(tx,ty); };
  Delve.tryActOnStep = function(tx,ty){ if(atShop(tx,ty)) open(); else a2(tx,ty); };
 })();

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

 // ── DEBUG PANEL ──────────────────────────────────────────────
 function applyDebugEffect(id){
  return function(){
   const G = Delve.G; if(!G) return;
   let t = null;
   if(G.boss && Delve.mdist(G.boss.x,G.boss.y,G.px,G.py)<=1) t = G.boss;
   else t = G.monsters.find(function(m){ return Delve.mdist(m.x,m.y,G.px,G.py)<=1; }) || G.monsters[0];
   if(t && Delve.applyEffect){ Delve.applyEffect(t, id); Delve.flash(id + " applied"); }
   else Delve.flash("No target");
   Delve.updateHUD(); Delve.draw();
  };
 }

 Delve.initDebug = function(){
  const p = $("debugPanel"); if(!p) return;
  p.style.display = "flex";
  const need = function(){ return Delve.G && !Delve.G.runEnded; };
  $("dbgGo").addEventListener("click", function(){
   if(!need()) return;
   Delve.G.floor = parseInt($("dbgFloor").value,10);
   Delve.genFloor(); Delve.updateHUD(); Delve.draw();
   Delve.showFloorCard(Delve.G.floor);
  });
  $("dbgGold").addEventListener("click", function(){ if(!need()) return; Delve.G.gold += 25; Delve.updateHUD(); });
  $("dbgShards").addEventListener("click", function(){ Delve.save.shards += 5; Delve.persist(); Delve.updateHUD(); });
  $("dbgHeal").addEventListener("click", function(){ if(!need()) return; Delve.G.hp = Delve.maxHp(); Delve.updateHUD(); });
  $("dbgLowHp").addEventListener("click", function(){ if(!need()) return; Delve.G.hp = 5; Delve.updateHUD(); });
  $("dbgPoison").addEventListener("click", applyDebugEffect("poison"));
  $("dbgBleed").addEventListener("click", applyDebugEffect("bleed"));
  $("dbgWeaken").addEventListener("click", function(){ if(!need()) return; if(Delve.applyPlayerEffect) Delve.applyPlayerEffect("weaken"); Delve.flash("Weaken applied (you)"); });
  $("dbgElite").addEventListener("click", function(){
   if(!need()) return;
   const m = Delve.G.monsters.find(function(x){ return !x.elite; });
   if(m){ Delve.makeElite(m); Delve.draw(); Delve.flash("Elite created"); }
   else Delve.flash("No monster to promote");
  });
  $("dbgXP").addEventListener("click", function(){ if(!need()) return; Delve.addXP(20); });
  $("dbgShop").addEventListener("click", function(){ if(!need()) return; Delve.openShop(); });
  $("dbgVictory").addEventListener("click", function(){ if(!need()) return; Delve.showVictory(Math.floor(Delve.G.gold/10), true); });
  $("dbgDeath").addEventListener("click", function(){ if(!need()) return; Delve.die(); });
  $("dbgDump").addEventListener("click", function(){
   console.log("RUN STATS", Delve.G && Delve.G.runStats);
   console.log("SAVE", Delve.save);
   Delve.flash("Dumped to console");
  });
  $("dbgReset").addEventListener("click", function(){
   Object.keys(localStorage).forEach(function(k){ if(/underward|delve/i.test(k)) localStorage.removeItem(k); });
   location.reload();
  });
 };

 // ── WIRING ───────────────────────────────────────────────────
 $("startBtn").addEventListener("click", Delve.startRun);
 $("deathBtn").addEventListener("click", Delve.showHub);

 $("minimapBtn").addEventListener("click", function(){
  const w = $("minimapWrap");
  w.style.display = (getComputedStyle(w).display === "none") ? "block" : "none";
  Delve.renderMinimap();
 });

 $("gearBtn").addEventListener("click", function(){
  if(Delve.G && !Delve.G.runEnded) $("pauseMenu").style.display = "flex";
 });
 $("pauseCloseBtn").addEventListener("click", function(){ $("pauseMenu").style.display = "none"; });
 $("pauseRetreatBtn").addEventListener("click", function(){
  $("pauseMenu").style.display = "none";
  Delve.retreat();
 });
 // Mute toggle
 $("muteBtn").addEventListener("click", function(){
  const muted = Delve.sfxToggleMute ? Delve.sfxToggleMute() : false;
  $("muteBtn").textContent = muted ? "🔇" : "🔊";
 });
 // Volume slider
 $("volumeSlider").addEventListener("input", function(){
  if(Delve.sfxSetVolume) Delve.sfxSetVolume(parseFloat(this.value));
 });

 $("shopHealBtn").addEventListener("click", doShopHeal);
 $("shopLeaveBtn").addEventListener("click", closeShop);

 $("victoryContinue").addEventListener("click", function(){
  hideAll();
  $("hud").style.display = "flex";
  const G = Delve.G;
  G.victoryDone = false;
  G.floor++;
  G.secondWindUsed = false;
  Delve.genFloor();
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

})();
