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
  ["hubScreen","deathScreen","levelupScreen","inventoryScreen","shopScreen","victoryScreen","stairsPrompt","bossIntroOverlay","retreatMenu"].forEach(id => {
   const el = $(id); if(el) el.style.display = "none";
  });
  const p = $("itemCardOverlay"); if(p) p.style.display = "none";
 }

 // ── Show hub ──────────────────────────────────────────────────
 Delve.showHub = function(){
  hideAll();
  $("hubScreen").style.display = "flex";
  $("hud").style.display = "none";
  Delve.buildHub();
 };

 // ── Build hub shop (attribute purchases) ─────────────────────
 Delve.buildHub = function(){
  const wrap = $("shop");
  if(!wrap) return;
  $("hubShards").textContent = Delve.save.shards;
  wrap.innerHTML = "";
  const order = Delve.CONFIG.ATTR_ORDER.filter(a => a !== "eng");
  order.forEach(attr => {
   const a = Delve.CONFIG.ATTRS[attr];
   const lvl = Delve.attrLevel(attr);
   const cost = Delve.attrCost(attr);
   const row = document.createElement("div");
   row.className = "upgrade";
   const info = document.createElement("div");
   info.innerHTML =
    '<div class="name">' + a.name + '<span class="lvl">Lv' + lvl + '</span></div>' +
    '<div class="desc">' + a.desc + '</div>';
   const btn = document.createElement("button");
   btn.className = "btn";
   btn.textContent = cost + " ◇";
   btn.disabled = Delve.save.shards < cost;
   btn.addEventListener("click", function(){
    if(Delve.save.shards < cost) return;
    Delve.save.shards -= cost;
    if(!Delve.save.lvls) Delve.save.lvls = {};
    Delve.save.lvls[attr] = (Delve.save.lvls[attr]||0) + 1;
    Delve.persist();
    Delve.buildHub();
   });
   row.appendChild(info);
   row.appendChild(btn);
   wrap.appendChild(row);
  });
 };

 // ── Start run ────────────────────────────────────────────────
 Delve.startRun = function(){
  hideAll();
  $("hud").style.display = "flex";
  Delve.newRun();
  Delve.showFloorCard(Delve.G.floor);
 };

 // ── Floor title card ─────────────────────────────────────────
 Delve.showFloorCard = function(floor){
  const ward = Delve.getWard(floor);
  $("floorCardNum").textContent = "Floor " + floor;
  $("floorCardName").textContent =
   Delve.isShopFloor(floor) ? "Trading Post — " + (ward ? ward.name : "") :
   floor % 10 === 0 ? (ward ? ward.name + " — Boss Arena" : "") :
   (ward ? ward.name : "");
  const card = $("floorCard");
  card.style.display = "flex";
  clearTimeout(Delve._floorCardT);
  Delve._floorCardT = setTimeout(function(){ card.style.display = "none"; }, 1500);
 };

 // ── Boss intro ───────────────────────────────────────────────
 Delve.showBossIntro = function(){
  const bossDef = Delve.CONFIG.BOSS_DEFS[Math.ceil(Delve.G.floor/10)] || Delve.CONFIG.BOSS_DEFS[1] || {};
  $("bossIntroName").textContent = bossDef.name || "The Warden";
  $("bossIntroTitle").textContent = bossDef.title || "";
  $("bossIntroFlavour").textContent = bossDef.flavour || "";
  const ov = $("bossIntroOverlay");
  ov.style.display = "flex";
  clearTimeout(Delve._bossIntroT);
  Delve._bossIntroT = setTimeout(function(){ ov.style.display = "none"; }, 3000);
 };

 // ── Stairs prompt ────────────────────────────────────────────
 Delve.showStairsPrompt = function(){
  $("stairsPrompt").style.display = "flex";
 };
 function hideStairs(){
  $("stairsPrompt").style.display = "none";
 }

 // ── Update HUD ───────────────────────────────────────────────
 Delve.updateHUD = function(){
  const G = Delve.G;
  if(!G) return;
  $("hudHp").textContent = G.hp + "/" + Delve.maxHp();
  $("hudAtk").textContent = Delve.atk();
  $("hudTou").textContent = Math.round(Delve.dmgRed()*100) + "%";
  $("hudAgi").textContent = Math.round(Delve.agiPts()) + " (" + Math.round(Delve.dodge()*100) + "%)";
  $("hudLuc").textContent = Math.round(Delve.luckPts());
  $("hudFloor").textContent = G.floor;
  $("hudEnergy").textContent = Math.floor(G.energy||0);
  $("hudGold").textContent = G.gold;
  $("hudShards").textContent = Delve.save.shards;

  // Rest dots
  const dots = $("restDots");
  dots.innerHTML = "";
  for(let i=0;i<Delve.CONFIG.restPerFloor;i++){
   const d = document.createElement("div");
   d.className = "rest-dot" + (i < G.restCount ? " used" : "");
   dots.appendChild(d);
  }

  Delve.renderAbilityBar();
  Delve.renderMinimap();
 };

 // ── Ability bar ──────────────────────────────────────────────
 Delve.renderAbilityBar = function(){
  const bar = $("abilityBar");
  if(!bar) return;
  const G = Delve.G;
  bar.innerHTML = "";
  if(!G || !G.abilities || !G.abilities.length){ bar.style.display = "none"; return; }
  bar.style.display = "flex";
  G.abilities.forEach(ab => {
   const cfg = (Delve.CONFIG.TRAITS.abilities||[]).find(a => a.id === ab) || { name:ab, cost:0 };
   const btn = document.createElement("button");
   btn.className = "ability-btn";
   const afford = (G.energy||0) >= (cfg.cost||0);
   btn.disabled = !afford;
   btn.innerHTML =
    '<span class="ability-name">' + (cfg.name||ab) + '</span>' +
    '<span class="ability-cost">⚡ ' + (cfg.cost||0) + '</span>';
   btn.addEventListener("click", function(){
    if(!afford) return;
    activateAbility(cfg);
   });
   bar.appendChild(btn);
  });
 };

 function activateAbility(cfg){
  const G = Delve.G;
  if(!cfg || (G.energy||0) < (cfg.cost||0)) return;
  G.energy -= cfg.cost;
  if(!cfg.target || cfg.target === "self"){
   // self-target abilities (stone skin, rally, whirlwind)
   Delve.castSelfAbility(cfg.id);
  } else {
   // targeted: enter targeting mode (routed via input.js)
   G.targetingAbility = cfg.id;
   Delve.flash(cfg.name + " — tap a target");
  }
  Delve.updateHUD();
  Delve.draw();
 }

 // Self-target ability engine (single-target handled by castAbility in input batch)
 Delve.castSelfAbility = function(id){
  const G = Delve.G;
  switch(id){
   case "stone_skin":
    G.stoneSkin = 2;
    Delve.flash("Stone Skin — damage halved for 2 turns");
    break;
   case "rally":
    const heal = Math.round(Delve.maxHp() * 0.35);
    G.hp = Math.min(Delve.maxHp(), G.hp + heal);
    G.effects = (G.effects||[]).filter(e => e.id !== "bleed");
    Delve.flash("Rally! +" + heal + " HP");
    Delve.addFloater("+" + heal, G.px, G.py, "#7ee08a");
    break;
   case "whirlwind":
    let hitAny = false;
    [G.boss].concat(G.monsters).forEach(m => {
     if(m && Delve.mdist(m.x,m.y,G.px,G.py) <= 1){
      m.hp -= Delve.atk();
      Delve.addFloater("-"+Delve.atk(), m.x, m.y, "#ffd75e");
      m.hitFlash = Date.now();
      hitAny = true;
      if(m.hp <= 0) Delve.killMonster(m);
     }
    });
    if(!hitAny) Delve.flash("No one in range");
    break;
  }
  Delve.enemiesTurn();
  Delve.updateHUD();
 };

 // ── Minimap ──────────────────────────────────────────────────
 Delve.renderMinimap = function(){
  const wrap = $("minimapWrap");
  if(!wrap || wrap.style.display === "none") return;
  const cv = $("minimap");
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const G = Delve.G;
  if(!G || !G.grid || !G.grid.length){ ctx.clearRect(0,0,cv.width,cv.height); return; }
  const gw = G.grid[0].length, gh = G.grid.length;
  const s = Math.min(cv.width/gw, cv.height/gh);
  const ox = (cv.width - gw*s)/2, oy = (cv.height - gh*s)/2;
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle = "#070a0e";
  ctx.fillRect(0,0,cv.width,cv.height);
  const visited = G.visited || [];
  for(let y=0;y<gh;y++){
   for(let x=0;x<gw;x++){
    const t = G.grid[y][x];
    if(t === Delve.T.WALL) continue;
    if(!visited[y] || !visited[y][x]) continue;
    let col = "#2a333d";
    if(t === Delve.T.STAIR) col = "#2ad0b0";
    else if(t === Delve.T.GOLD) col = "#d9a11f";
    else if(t === Delve.T.CHEST) col = "#c9971f";
    else if(t === Delve.T.BARREL) col = "#7a5c3a";
    ctx.fillStyle = col;
    ctx.fillRect(ox + x*s, oy + y*s, s+0.5, s+0.5);
   }
  }
  if(G.shop && G.shop.x >= 0){
   ctx.fillStyle = "#ffd75e";
   ctx.fillRect(ox + G.shop.x*s, oy + G.shop.y*s, s, s);
  }
  (G.monsters||[]).forEach(m => {
   ctx.fillStyle = m.elite ? "#c98aff" : "#e05a6a";
   const px = ox + m.x*s, py = oy + m.y*s;
   ctx.beginPath();
   ctx.arc(px + s/2, py + s/2, s*0.4, 0, Math.PI*2);
   ctx.fill();
  });
  if(G.boss){
   ctx.fillStyle = "#ff4a3d";
   const px = ox + G.boss.x*s, py = oy + G.boss.y*s;
   ctx.beginPath();
   ctx.arc(px + s/2, py + s/2, s*0.55, 0, Math.PI*2);
   ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  const px = ox + G.px*s, py = oy + G.py*s;
  ctx.beginPath();
  ctx.arc(px + s/2, py + s/2, s*0.3, 0, Math.PI*2);
  ctx.fill();
 };

 // ── Shop ─────────────────────────────────────────────────────
 Delve.openShop = function(){
  hideAll();
  $("hud").style.display = "none";
  $("shopScreen").style.display = "flex";
  Delve.buildShop();
 };

 Delve.buildShop = function(){
  const G = Delve.G;
  $("shopGold").textContent = G.gold;
  const healCost = Math.max(1, Math.round(Delve.healCost(G.floor) * (1 - Delve.luckDiscount())));
  $("shopHealBtn").textContent = "❤️ Restore 50% HP — " + healCost + "g";
  $("shopHealBtn").disabled = G.gold < healCost;

  const stock = $("shopStock");
  stock.innerHTML = "";

  // Gear (tier-gated by shop number)
  const ShopNum = Math.floor(G.floor/10) + 1;
  const maxTier = ShopNum >= 3 ? 4 : ShopNum === 2 ? 3 : 2;
  const gear = makeShopGear(maxTier);
  const consumables = makeShopConsumables();

  [gear].concat(consumables).forEach(item => {
   const row = document.createElement("div");
   row.className = "shop-item";
   const info = document.createElement("div");
   const price = Delve.itemPrice(item);
   info.innerHTML =
    '<div class="si-name" style="color:' + (Delve.TIERS.colors[item.tier]||"#fff") + '">' + item.name + '</div>' +
    '<div class="si-desc">' + (item.flavour||"") + '</div>';
   const buy = document.createElement("button");
   buy.className = "btn shop-buy";
   buy.textContent = price + "g";
   buy.disabled = G.gold < price;
   buy.addEventListener("click", function(){
    if(G.gold < price) return;
    G.gold -= price;
    Delve.recordStat("goldSpentShop", price);
    Delve.pickupItem(item);
    Delve.persist();
    Delve.buildShop();
   });
   row.appendChild(info);
   row.appendChild(buy);
   stock.appendChild(row);
  });
 };

 function makeShopGear(maxTier){
  let tier = maxTier;
  if(Math.random() < 0.3) tier = Math.max(1, tier-1);
  const pool = (Delve.itemDefs && Object.values(Delve.itemDefs)) ||
   [];
  const gear = pool.filter(d => (d.type === "weapon" || d.type === "armour" || d.type === "trinket") && d.tier === tier);
  if(!gear.length) return pool.find(d => d.type === "armour") || { name:"Iron Breastplate", type:"armour", tier:2, red:4, flavour:"Dented. It worked." };
  return gear[Math.floor(Math.random()*gear.length)];
 }
 function makeShopConsumables(){
  const pool = Object.values(Delve.itemDefs || {}).filter(d => d.type === "consumable");
  const out = [];
  const used = new Set();
  const n = Delve.CONFIG.shop.stockConsumables || 4;
  for(let i=0;i<n;i++){
   if(!pool.length) break;
   const pick = pool[Math.floor(Math.random()*pool.length)];
   if(used.has(pick.id)) { i--; continue; }
   used.add(pick.id);
   out.push(pick);
  }
  return out;
 }

 function doShopHeal(){
  const G = Delve.G;
  const healCost = Math.max(1, Math.round(Delve.healCost(G.floor) * (1 - Delve.luckDiscount())));
  if(G.gold < healCost) return;
  G.gold -= healCost;
  const heal = Math.round(Delve.maxHp() * Delve.CONFIG.shop.healPct);
  G.hp = Math.min(Delve.maxHp(), G.hp + heal);
  Delve.recordStat("goldSpentShop", healCost);
  Delve.flash("+" + heal + " HP");
  Delve.persist();
  Delve.buildShop();
 }

 // ── Victory ──────────────────────────────────────────────────
 Delve.showVictory = function(shards){
  hideAll();
  $("victoryShards").textContent = shards;
  $("victorySummary").innerHTML = summaryRows();
  $("victoryScreen").style.display = "flex";
 };

 // ── Retrofit / death ─────────────────────────────────────────
 Delve.showEndScreen = function(kind, extra){
  hideAll();
  if(kind === "victory"){
   Delve.showVictory((extra && extra.shards) || 0);
   return;
  }
  if(kind === "retreat"){
   $("deathInfo").textContent = "You escaped the depths.";
   $("deathQuote").textContent = "Some runs are measured in what you carry out.";
   $("deathSummary").innerHTML = summaryRows();
   $("deathShards").textContent = "+" + ((extra && extra.shards) || 0);
   $("deathScreen").style.display = "flex";
   return;
  }
  // death
  $("deathInfo").textContent = "You reached floor " + Delve.G.floor + " — best " + Delve.save.bestFloor;
  $("deathQuote").textContent = DEATH_QUOTES[Math.floor(Math.random()*DEATH_QUOTES.length)];
  $("deathSummary").innerHTML = summaryRows();
  $("deathShards").textContent = "+" + Delve.G.runShards + " shards this run";
  $("deathScreen").style.display = "flex";
 };

 function summaryRows(){
  const s = Delve.G && Delve.G.runStats || {};
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
  return rows.map(r =>
   '<div class="death-row"><span class="dr-label">' + r[0] + '</span><span class="dr-value">' + r[1] + '</span></div>'
  ).join("");
 }

 // ── Debug panel ──────────────────────────────────────────────
 Delve.initDebug = function(){
  const p = $("debugPanel");
  if(!p) return;
  p.style.display = "flex";

  $("dbgGo").addEventListener("click", function(){
   const f = parseInt($("dbgFloor").value, 10);
   const G = Delve.G;
   G.floor = f;
   Delve.genFloor();
   Delve.updateHUD();
   Delve.draw();
  });
  $("dbgGold").addEventListener("click", function(){ Delve.G.gold += 25; Delve.updateHUD(); Delve.draw(); });
  $("dbgShards").addEventListener("click", function(){ Delve.save.shards += 5; Delve.persist(); Delve.updateHUD(); Delve.draw(); });
  $("dbgHeal").addEventListener("click", function(){ Delve.G.hp = Delve.maxHp(); Delve.updateHUD(); Delve.draw(); });
  $("dbgLowHp").addEventListener("click", function(){ Delve.G.hp = 5; Delve.updateHUD(); Delve.draw(); });

  $("dbgPoison").addEventListener("click", applyDebugEffect("poison"));
  $("dbgBleed").addEventListener("click", applyDebugEffect("bleed"));
  $("dbgWeaken").addEventListener("click", function(){
   if(Delve.applyPlayerEffect) Delve.applyPlayerEffect("weaken");
   Delve.flash("Weaken applied (you)");
   Delve.updateHUD(); Delve.draw();
  });
  $("dbgElite").addEventListener("click", function(){
   const G = Delve.G;
   if(G.monsters && G.monsters.length){ Delve.makeElite(G.monsters[0]); Delve.updateHUD(); Delve.draw(); }
   else Delve.flash("No monster to promote");
  });
  $("dbgXP").addEventListener("click", function(){ Delve.addXP(Delve.CONFIG.XP_CURVE[Delve.G.level-1]||5); Delve.updateHUD(); Delve.draw(); });
  $("dbgShop").addEventListener("click", function(){ Delve.openShop(); });
  $("dbgVictory").addEventListener("click", function(){ Delve.showVictory(Math.floor(Delve.G.gold/10)); });
  $("dbgDeath").addEventListener("click", function(){ Delve.die(); });
  $("dbgDump").addEventListener("click", function(){ console.log("RUN STATS", Delve.G.runStats); console.log("SAVE", Delve.save); });
  $("dbgReset").addEventListener("click", function(){ localStorage.removeItem("underward_save"); location.reload(); });
 };

 function applyDebugEffect(id){
  return function(){
   const G = Delve.G;
   let target = null;
   if(G.boss && Delve.mdist(G.boss.x,G.boss.y,G.px,G.py)<=1) target = G.boss;
   else target = (G.monsters.find(m => Delve.mdist(m.x,m.y,G.px,G.py)<=1)) || (G.monsters[0]);
   if(target && Delve.applyEffect){ Delve.applyEffect(target, id); Delve.flash(id + " applied"); }
   else Delve.flash("No target");
   Delve.updateHUD(); Delve.draw();
  };
 }

 // ── Mark visited tiles for minimap reveal ────────────────────
 Delve.markVisited = function(x, y){
  const G = Delve.G;
  if(!G.visited) G.visited = [];
  if(!G.visited[y]) G.visited[y] = [];
  G.visited[y][x] = 1;
  [[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]].forEach(([ux,uy]) => {
   if(ux<0||uy<0||ux>=G.grid[0].length||uy>=G.grid.length) return;
   if(!G.visited[uy]) G.visited[uy] = [];
   G.visited[uy][ux] = 1;
  });
 };

 // ── Wire events ──────────────────────────────────────────────
 function init(){
  // Start / death / hub
  $("startBtn").addEventListener("click", Delve.startRun);
  $("deathBtn").addEventListener("click", Delve.showHub);

  // Bag toggle
  $("invBtn").addEventListener("click", Delve.openInventory);
  $("invCloseBtn2").addEventListener("click", function(){ $("inventoryScreen").style.display="none"; $("hud").style.display="flex"; });

  // minimap
  $("minimapBtn").addEventListener("click", function(){
   const w = $("minimapWrap");
   w.style.display = w.style.display === "none" ? "block" : "none";
   Delve.renderMinimap();
  });

  // gear (retreat)
  $("gearBtn").addEventListener("click", function(){ $("retreatMenu").style.display="flex"; });
  $("retreatYes").addEventListener("click", function(){
   $("retreatMenu").style.display="none";
   Delve.retreat();
  });
  $("retreatNo").addEventListener("click", function(){ $("retreatMenu").style.display="none"; });

  // stairs
  $("stairsYes").addEventListener("click", function(){ hideStairs(); Delve.descend(); });
  $("stairsNo").addEventListener("click", hideStairs);

  // shop
  $("shopHealBtn").addEventListener("click", doShopHeal);
  $("shopLeaveBtn").addEventListener("click", function(){
   hideAll();
   $("hud").style.display = "flex";
   Delve.draw();
  });

  // victory
  $("victoryContinue").addEventListener("click", function(){
   hideAll();
   $("hud").style.display = "flex";
   Delve.G.floor++;
   Delve.genFloor();
   Delve.updateHUD();
   if(Delve.showFloorCard) Delve.showFloorCard(Delve.G.floor);
  });
  $("victoryHub").addEventListener("click", function(){
   hideAll();
   Delve.showHub();
  });

  // log
  $("logExpandBtn").addEventListener("click", function(){
   $("logWindow").style.display = "flex";
   if(Delve.flushLogWindow) Delve.flushLogWindow();
  });
  $("logWindowClose").addEventListener("click", function(){ $("logWindow").style.display="none"; });

  // debug setup if ?debug=1
  if(/[?&]debug=1/.test(location.search)) Delve.initDebug();

  // Initial hub
  Delve.showHub();
 }

 if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
 else init();

})();
