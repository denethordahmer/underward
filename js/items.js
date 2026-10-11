window.Delve = window.Delve || {};
(function(){

 // items.js : item LOGIC only. Catalogue lives in js/content/con-items.js.
 // Depends on: Delve.itemDefs, Delve.potionDefs, Delve.TIERS, Delve.SLOT_DEFS.

 const SLOT_DEFS = function(){ return Delve.SLOT_DEFS || {}; };

 Delve.itemsByTier = function(tier){
  return Object.keys(Delve.itemDefs || {}).map(function(k){ return Delve.itemDefs[k]; })
   .filter(function(d){ return d.tier === tier; });
 };

 Delve.wardOf = function(floor){ return Math.max(1, Math.ceil(floor / 10)); };

 // ── Tier roll ──────────────────────────────────────────────────
 Delve.rollTier = function(floor){
  const L = Delve.CONFIG.loot, luck = Delve.luckPts(), ward = Delve.wardOf(floor);
  const w = {
   common: L.weights.common(),
   uncommon: L.weights.uncommon(luck),
   rare: L.weights.rare(luck, ward),
   legendary: L.weights.legendary(luck, ward)
  };
  const total = w.common + w.uncommon + w.rare + w.legendary;
  const roll = Math.random() * total;
  if(roll < w.common) return 1;
  if(roll < w.common + w.uncommon) return 2;
  if(roll < w.common + w.uncommon + w.rare) return 3;
  return 4;
 };

 Delve.makeItem = function(tier){
  const t = Math.max(1, Math.min(4, tier));
  let pool = Delve.itemsByTier(t);
  if(!pool.length) pool = Delve.itemsByTier(1);
  const d = pool[Math.floor(Math.random() * pool.length)];
  return Object.assign({}, d);
 };

 // ── Provenance ────────────────────────────────────────────────
 Delve.stampProvenance = function(item, source){
  const G = Delve.G;
  const floor = G ? G.floor : "?";
  let line = "";
  switch(source.kind){
   case "monster":
    line = source.elite ? "Wrested from an Elite " + source.name + " on Floor " + floor + ". "
     : "Recovered from a " + source.name + " on Floor " + floor + ".";
    break;
   case "boss":
    line = "Claimed from " + source.name + " on Floor " + floor + ".";
    break;
   case "chest":
    line = "Found sealed in a chest on Floor " + floor + ".";
    break;
   case "secret":
    line = "Hidden in a forgotten chamber, Floor " + floor + ".";
    break;
   case "shop":
    line = "Bought from the trader on Floor " + floor + ".";
    break;
   default:
    line = "Found on Floor " + floor + ".";
  }
  item.provenance = line;
  return item;
 };

 // ── Loot rolls ────────────────────────────────────────────────
 Delve.rollKillDrop = function(x, y, opts){
  opts = opts || {};
  const G = Delve.G;
  const L = Delve.CONFIG.loot;
  let chance = Math.min(L.dropCap, L.baseDrop + Delve.luckPts() * L.luckDrop);
  if(opts.guaranteed) chance = 1;
  if(Math.random() > chance) return false;
  let tier = Delve.rollTier(G.floor);
  if(opts.minTier) tier = Math.max(opts.minTier, tier);
  const item = Delve.makeItem(tier);
  item.x = x; item.y = y;
  Delve.stampProvenance(item, { kind:"monster", name:opts.name || "foe", elite:!!opts.elite });
  G.items.push(item);
  return true;
 };

 Delve.dropPotion = function(x, y, tier, source){
  let pool = (Delve.potionDefs || []).filter(function(d){ return d.tier === (tier || 2); });
  if(!pool.length) pool = Delve.potionDefs;
  const it = Object.assign({}, pool[Math.floor(Math.random() * pool.length)]);
  it.x = x; it.y = y;
  Delve.stampProvenance(it, source || { kind:"monster", name:"foe", elite:false });
  Delve.G.items.push(it);
  return it;
 };

 // ── Shop price ─────────────────────────────────────────────────
 Delve.itemPrice = function(item){
  const e = Delve.CONFIG.economy;
  const disc = Delve.luckDiscount();
  let base;
  if(item.slot === "consumable"){
   base = e.consumablePrices[item.tier] || (item.tier * 10);
  } else {
   base = e.tierPrices[item.tier - 1] || (item.tier * 12);
  }
  return Math.max(1, Math.round(base * (1 - disc)));
 };

 // ── Inventory capacity ────────────────────────────────────────
 Delve.inventoryCap = function(){
  const base = (Delve.save && Delve.save.inventoryCap) || Delve.CONFIG.inventorySlots || 16;
  return Math.min(Delve.CONFIG.inventoryMax || 24, base);
 };

 // ── Pickup with capacity enforcement ──────────────────────────
 Delve.pickupItem = function(item){
  if(Delve.sfx) Delve.sfx("pickup");
  const G = Delve.G;
  if(!G.inventory) G.inventory = [];
  if(G.inventory.length >= Delve.inventoryCap()){
   item.x = G.px; item.y = G.py;
   const dup = (G.items||[]).find(function(i){ return i.x===item.x && i.y===item.y && i.id===item.id; });
   if(!dup) G.items.push(item);
   Delve.flash("Bag is full!");
   if(Delve.logSystem) Delve.logSystem("Bag full — left " + item.name + " behind.");
   Delve.updateHUD();
   return false;
  }
  const stored = Object.assign({}, item);
  delete stored.x; delete stored.y;
  G.inventory.push(stored);
  Delve.flash("Picked up " + item.name);
  Delve.recordStat("itemsGained", 1);
  if(Delve.logPickup) Delve.logPickup(item.name, item.tier);
  Delve.updateHUD();
  return true;
 };

 // ── Weight profile ────────────────────────────────────────────
 function weightProfile(item){
  const W = Delve.CONFIG.WEIGHT;
  const w = (item.weight && W[item.weight]) || W.medium;
  const scale = item.slot === "body" ? 1.0 : 0.5;
  return { speed: w.speed * scale, dodge: w.dodge * scale };
 }

 // ── Attack speed ──────────────────────────────────────────────
 Delve.playerSpeed = function(){
  const G = Delve.G, cfg = Delve.CONFIG, sec = cfg.secondaries;
  let speed = 1.0;
  if(G && G.equip && G.equip.weapon){
   const ws = cfg.WEAPON_SPEEDS[G.equip.weapon.style];
   if(ws) speed = ws;
  }
  speed += Delve.agiPts() * sec.speedPerAgi;

  let wSpeed = 0;
  const eq = G && G.equip ? G.equip : {};
  ["head","body","hands","feet"].forEach(function(s){
   if(eq[s]) wSpeed += weightProfile(eq[s]).speed;
  });
  if(wSpeed < 0){
   const mitigation = Delve.strPts() * (cfg.weightMitigation.strPerPoint || 0.01);
   wSpeed = Math.min(0, wSpeed + mitigation);
   wSpeed = Math.max(cfg.weightMitigation.speedPenaltyFloor || -0.04, wSpeed);
  }
  speed += wSpeed;

  if(G && G.equip){
   ["weapon","head","body","hands","feet","cloak","amulet","ring1","ring2"].forEach(function(s){
    const it = G.equip[s];
    if(it && it.speedBonus) speed += it.speedBonus;
   });
  }
  if(G) speed += (G.speedBuff || 0);
  return Math.max(0.5, speed);
 };

 // ── Aggregate stats ───────────────────────────────────────────
 Delve.itemBuffs = function(){
  const G = Delve.G;
  const eq = G && G.equip ? G.equip : {};
  const b = { atk:0, red:0, hp:0, luck:0, dropBonus:0, goldBonus:0, shardBonus:0, bossAtk:0, speedBonus:0, healOnKill:0, crit:0, dodge:0, weightSpeed:0, weightDodge:0 };

  const add = function(it){
   if(!it) return;
   b.atk += it.atk || 0;
   b.red += it.red || 0;
   b.hp += it.hp || 0;
   b.luck += it.luck || 0;
   b.dropBonus += it.dropBonus || 0;
   b.goldBonus += it.goldBonus || 0;
   b.shardBonus += it.shardBonus || 0;
   b.bossAtk += it.bossAtk || 0;
   b.speedBonus += it.speedBonus || 0;
   b.healOnKill += it.healOnKill || 0;
   b.crit += it.crit || 0;
   b.dodge += it.dodge || 0;
  };
  add(eq.weapon); add(eq.offhand); add(eq.head); add(eq.body); add(eq.hands);
  add(eq.feet); add(eq.cloak); add(eq.amulet); add(eq.ring1); add(eq.ring2);

  ["head","body","hands","feet"].forEach(function(s){
   if(eq[s]){
    const wp = weightProfile(eq[s]);
    b.weightSpeed += wp.speed;
    b.weightDodge += wp.dodge;
   }
  });
  return b;
 };

 // ── Equip / unequip ───────────────────────────────────────────
 function removeFromInv(item){
  const inv = Delve.G.inventory;
  const i = inv.indexOf(item);
  if(i >= 0) inv.splice(i, 1);
  else {
   const j = inv.findIndex(function(x){ return x.id === item.id; });
   if(j >= 0) inv.splice(j, 1);
  }
 }
 function clampHp(){ Delve.G.hp = Math.min(Delve.G.hp, Delve.maxHp()); }

 Delve.equipItem = function(item, toKey){
  const G = Delve.G;
  const def = SLOT_DEFS()[item.slot];
  let key = toKey;
  if(!key) key = def ? def.equipKey : null;
  if(!key){
   if(!G.equip.ring1) key = "ring1";
   else if(!G.equip.ring2) key = "ring2";
   else key = "ring1";
  }
  const old = G.equip[key];
  if(old) G.inventory.push(old);
  G.equip[key] = item;
  removeFromInv(item);
  clampHp();
  Delve.flash("Equipped " + item.name);
  if(Delve.logEquip) Delve.logEquip(item.name, key);
  Delve.updateHUD();
 };

 Delve.unequipItem = function(item){
  const G = Delve.G;
  for(let i=0;i<Delve.CONFIG.SLOT_ORDER.length;i++){
   const key = Delve.CONFIG.SLOT_ORDER[i];
   if(G.equip[key] === item){
    G.equip[key] = null;
    G.inventory.push(item);
    clampHp();
    Delve.flash("Unequipped " + item.name);
    Delve.updateHUD();
    return;
   }
  }
 };

 Delve.equipWeapon = function(item){ Delve.equipItem(item, "weapon"); };
 Delve.equipArmour = function(item){ Delve.equipItem(item, "body"); };

 // ── Status-on-hit ─────────────────────────────────────────────
 Delve.weaponStatus = function(weapon){
  if(!weapon || !weapon.status) return null;
  const cfg = Delve.CONFIG.statusChance || {};
  const table = cfg[weapon.status];
  if(!table) return null;
  const chance = table[weapon.tier] || 0;
  return { kind: weapon.status, chance: chance };
 };

 // ── Use consumables ───────────────────────────────────────────
 Delve.useConsumable = function(item){
  const G = Delve.G;

  if(item.cures){
   removeFromInv(item);
   const cured = [];
   if(!G.effects) G.effects = [];
   item.cures.forEach(function(id){
    const before = G.effects.length;
    G.effects = G.effects.filter(function(e){ return e.id !== id; });
    if(G.effects.length < before) cured.push(id);
   });
   const label = cured.length ? cured.map(function(c){ return Delve.CONFIG.STATUS_EFFECTS[c].name; }).join(", ") : "nothing to cure";
   Delve.flash(item.name + " — cured " + label);
   Delve.recordStat("consumablesUsed", 1);
   if(Delve.logConsumable) Delve.logConsumable(item.name, "cured " + label);
  }
  if(item.healPct || item.healFlat){
   const heal = item.healFlat ? item.healFlat : Math.round(Delve.maxHp() * (item.healPct||0));
   if(heal > 0){
    G.hp = Math.min(Delve.maxHp(), G.hp + heal);
    Delve.flash(item.name + " — +" + heal + " HP");
    if(Delve.logHeal) Delve.logHeal(heal, item.name);
   }
   if(!item.cures){ removeFromInv(item); Delve.recordStat("consumablesUsed", 1); }
  }
  if(item.atkBuff){
   if(!item.cures && !item.healPct && !item.healFlat) removeFromInv(item);
   G.atkBuff = (G.atkBuff || 0) + item.atkBuff;
   Delve.flash("+" + item.atkBuff + " Attack Power for this run");
   Delve.recordStat("consumablesUsed", 1);
  }
  if(item.speedBuff){
   G.speedBuff = (G.speedBuff || 0) + item.speedBuff;
   Delve.flash("+" + Math.round(item.speedBuff*100) + "% Attack Speed for this run");
   Delve.recordStat("consumablesUsed", 1);
  }
  if(item.redBuff){
   G.redBuff = (G.redBuff || 0) + item.redBuff;
   Delve.flash("+" + item.redBuff + " Damage Reduction for this run");
   Delve.recordStat("consumablesUsed", 1);
  }
  if(item.luckBuff){
   G.luckBuff = (G.luckBuff || 0) + item.luckBuff;
   Delve.flash("+" + item.luckBuff + " Luck for this run");
   Delve.recordStat("consumablesUsed", 1);
  }

  Delve.enemiesTurn();
  Delve.updateHUD();
 };

 // ── Stat card lines ───────────────────────────────────────────
 Delve.itemStatLines = function(item){
  const lines = [];
  const eq = Delve.G && Delve.G.equip;

  function cmp(field, label, fmt){
   const val = item[field] || 0;
   if(!val) return;
   let delta = 0;
   if(eq){
    const cur = (item.slot === "weapon" && eq.weapon) ? (eq.weapon[field]||0) :
     (item.slot === "ring") ? Math.max(eq.ring1?eq.ring1[field]||0:0, eq.ring2?eq.ring2[field]||0:0) :
     (eq[item.slot]) ? (eq[item.slot][field]||0) : 0;
    delta = val - cur;
   }
   lines.push({ label: label, value: fmt ? fmt(val) : val, delta: delta });
  }

  cmp("atk", "Attack Power");
  cmp("red", "Damage Reduction");
  cmp("hp", "Maximum Health");
  cmp("luck", "Luck");
  cmp("crit", "Critical Chance", function(v){ return "+" + Math.round(v*100) + "%"; });
  cmp("dodge", "Dodge Chance", function(v){ return "+" + Math.round(v*100) + "%"; });
  cmp("dropBonus", "Item Find", function(v){ return "+" + Math.round(v*100) + "%"; });
  cmp("goldBonus", "Gold Find", function(v){ return "+" + Math.round(v*100) + "%"; });
  cmp("shardBonus", "Bonus Shards");
  cmp("bossAtk", "Damage vs Ward Bosses");
  cmp("speedBonus", "Attack Speed", function(v){ return "+" + Math.round(v*100) + "%"; });
  cmp("healOnKill", "Life Steal on Kill");
  if(item.healPct) lines.push({ label:"Restores", value: Math.round(Delve.maxHp() * item.healPct) + " Health", delta:0 });
  if(item.healFlat) lines.push({ label:"Restores", value: item.healFlat + " Health", delta:0 });
  if(item.healPct && item.cures) lines.push({ label:"Also cures", value: item.cures.map(function(c){ return Delve.CONFIG.STATUS_EFFECTS[c].name; }).join(", "), delta:0 });
  if(item.cures && !item.healPct && !item.healFlat) lines.push({ label:"Cures", value: item.cures.map(function(c){ return Delve.CONFIG.STATUS_EFFECTS[c].name; }).join(", "), delta:0 });
  if(item.atkBuff) lines.push({ label:"Grants", value:"+" + item.atkBuff + " Attack Power (run)", delta:0 });
  if(item.speedBuff) lines.push({ label:"Grants", value:"+" + Math.round(item.speedBuff*100) + "% Attack Speed (run)", delta:0 });
  if(item.redBuff) lines.push({ label:"Grants", value:"+" + item.redBuff + " Damage Reduction (run)", delta:0 });
  if(item.luckBuff) lines.push({ label:"Grants", value:"+" + item.luckBuff + " Luck (run)", delta:0 });
  if(item.status){
   lines.push({ label:"On Hit", value: item.status === "poison" ? "Chance to Poison" : "Chance to Bleed", delta:0 });
  }
  if(item.style){
   const spd = Delve.CONFIG.WEAPON_SPEEDS[item.style] || 1.0;
   lines.push({ label:"Attack Speed", value: spd.toFixed(2), delta:0 });
  }
  if(item.weight){
   const W = Delve.CONFIG.WEIGHT[item.weight];
   lines.push({ label:"Weight", value: W ? W.name : item.weight, delta:0 });
   if(W && W.speed){
    const vsign = W.speed > 0 ? "+" : "";
    lines.push({ label:"Speed Effect", value: vsign + Math.round(W.speed*100) + "%", delta:0 });
   }
  }
  return lines;
 };

})();
