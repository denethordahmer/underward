window.Delve = window.Delve || {};
(function(){

 Delve.TIERS = {
  names: { 1:"Common", 2:"Uncommon", 3:"Rare", 4:"Legendary" },
  colors: { 1:"#cfd8e0", 2:"#7ee08a", 3:"#7ea8e8", 4:"#ffd75e" }
 };

 // Canonical slot list mirrors CONFIG.SLOTS. ring1/ring2 both map to "ring".
 const SLOT_DEFS = {
  weapon:  { type:"weapon",    equipKey:"weapon"  },
  offhand: { type:"offhand",   equipKey:"offhand" },
  head:    { type:"head",      equipKey:"head"    },
  body:    { type:"body",      equipKey:"body"    },
  hands:   { type:"hands",     equipKey:"hands"   },
  feet:    { type:"feet",      equipKey:"feet"    },
  cloak:   { type:"cloak",     equipKey:"cloak"   },
  amulet:  { type:"amulet",    equipKey:"amulet"  },
  ring:    { type:"ring",      equipKey:null }      // resolved to ring1/ring2 at equip time
 };

 function L(id, name, slot, tier, stats, lore, extra){
  const d = { id: id, name: name, slot: slot, tier: tier };
  if(stats) Object.assign(d, stats);
  if(lore) d.lore = lore;
  if(extra) Object.assign(d, extra);
  return d;
 }

 const defs = [

  // ============================ WEAPONS ============================
  // Swords (balanced, speed 1.0)
  L("shortsword","Shortsword","weapon",1,{atk:2,style:"sword"},
    "Light enough to forget you're holding it. Until it matters."),
  L("longsword","Longsword","weapon",1,{atk:3,style:"sword"},
    "Standard issue. Whoever issued it isn't using it anymore."),
  L("broadsword","Broadsword","weapon",2,{atk:5,style:"sword"},
    "Heavy enough to mean it. Wide enough not to miss."),
  L("knights_blade","Knight's Blade","weapon",3,{atk:7,style:"sword"},
    "Etched with a crest nobody alive can identify."),
  L("dawnblade","Dawnblade","weapon",4,{atk:10,style:"sword",keep:true},
    "It hums faintly. It was humming before you picked it up."),

  // Daggers (fast 1.4, lighter hits, status riders)
  L("rusty_dagger","Rusty Dagger","weapon",1,{atk:1,style:"dagger"},
    "Rust means it's seen use. Probably recent."),
  L("thin_stiletto","Thin Stiletto","weapon",1,{atk:2,style:"dagger"},
    "Not a weapon. A strong opinion, delivered quickly."),
  L("poison_bodkin","Poison Bodkin","weapon",2,{atk:3,style:"dagger",status:"poison"},
    "The green tinge isn't rust. Don't lick it."),
  L("assassins_fang","Assassin's Fang","weapon",3,{atk:5,style:"dagger",status:"bleed",crit:0.05},
    "It arrives before you decide to throw it. You don't throw it anymore."),
  L("whisper","Whisper","weapon",4,{atk:7,style:"dagger",status:"bleed",luck:3,keep:true},
    "You never hear it. Neither do they."),

  // Axes (slow 0.85, hard hits)
  L("hand_axe","Hand Axe","weapon",1,{atk:3,style:"axe"},
    "Splits kindling. Splits skulls. Versatile."),
  L("woodcutters_axe","Woodcutter's Axe","weapon",1,{atk:4,style:"axe"},
    "The wood it was cutting stopped being the problem."),
  L("battle_axe","Battle Axe","weapon",2,{atk:6,style:"axe"},
    "Two-pound head. Zero-pound patience."),
  L("executioners_axe","Executioner's Axe","weapon",3,{atk:8,style:"axe",shardBonus:1},
    "Ceremonial. The ceremony was not pleasant."),
  L("gravegullet","Gravegullet","weapon",4,{atk:11,style:"axe",shardBonus:3,keep:true},
    "It doesn't just cut. It collects."),

  // Hammers (slowest 0.70, most damage)
  L("club","Club","weapon",1,{atk:3,style:"hammer"},
    "Primitive. Effective. Unapologetic."),
  L("iron_mace","Iron Mace","weapon",1,{atk:4,style:"hammer"},
    "Favoured by those who distrust anything with an edge."),
  L("war_hammer","War Hammer","weapon",2,{atk:6,style:"hammer"},
    "Sends a message. The message is: no."),
  L("crusher","Crusher","weapon",3,{atk:8,style:"hammer",bossAtk:3},
    "Engineered specifically for things that think armour helps."),
  L("stormbrand","Stormbrand","weapon",4,{atk:12,style:"hammer",bossAtk:5,keep:true},
    "Thunder is just the sound it makes on the way down."),

  // Spears (speed 0.95, reach feel)
  L("short_spear","Short Spear","weapon",1,{atk:3,style:"spear"},
    "The reach is the point. So is the point."),
  L("warspear","Warspear","weapon",2,{atk:5,style:"spear"},
    "Whoever carried this was paid well and spent it quickly."),
  L("shadowlance","Shadowlance","weapon",3,{atk:8,style:"spear",luck:1},
    "The shadows lean toward it. That's probably fine."),

  // ============================ OFF-HAND ============================
  L("wooden_buckler","Wooden Buckler","offhand",1,{red:1},
    "Splinters after enough abuse. You're counting on 'enough'."),
  L("warden_lantern","Warden's Lantern","offhand",1,{luck:1,goldBonus:0.05},
    "Burns with a pale light that doesn't flicker. Convenient. Unsettling."),
  L("parrying_dagger","Parrying Dagger","offhand",2,{red:1,crit:0.05},
    "For catching blades you'd rather not wear."),
  L("iron_kite_shield","Iron Kite Shield","offhand",2,{red:3},
    "Heavy, dented, and entirely on your side."),
  L("tower_shield","Tower Shield","offhand",3,{red:5,hp:6},
    "You hide behind it. That's the whole strategy."),
  L("wardens_aegis","Warden's Aegis","offhand",4,{red:6,hp:12,bossAtk:2,keep:true},
    "The Warden's own wall. It still faces the shadows."),

  // ============================ HEAD ============================ ===
  L("cloth_hood","Cloth Hood","head",1,{dodge:0.02,weight:"light"},
    "Keeps your ears warm and your presence small."),
  L("iron_cap","Iron Cap","head",1,{red:1,weight:"medium"},
    "Better than nothing. Marginally heavier than nothing."),
  L("kettle_helm","Cracked Kettle Helm","head",2,{red:2,hp:3,weight:"medium"},
    "Half a helmet. Whoever wore it never found the other half, and stopped looking."),
  L("ranger_hood","Ranger's Hood","head",2,{dodge:0.04,luck:1,weight:"light"},
    "Woven from the dark between branches. Or so the trader claims."),
  L("greathelm","Greathelm","head",3,{red:3,hp:8,weight:"heavy"},
    "You can hear your own breathing. Nothing else."),
  L("shadow_hood","Shadow Hood","head",3,{dodge:0.06,crit:0.04,weight:"light"},
    "The shadows seem to gather around the brim."),
  L("wardens_helm","Warden's Helm","head",4,{red:4,hp:10,bossAtk:2,weight:"heavy",keep:true},
    "He wore this for a century. It fits better than it should."),

  // ============================ BODY ============================ ===
  L("cloth_wrap","Cloth Wrap","body",1,{red:1,weight:"light"},
    "Better than nothing. Marginally."),
  L("padded_gambeson","Padded Gambeson","body",1,{red:1,hp:4,weight:"light"},
    "Quilted by someone who survived long enough to finish it."),
  L("hardened_leather","Hardened Leather","body",1,{red:2,weight:"light"},
    "Cured in something best not asked about."),
  L("ranger_tunic","Ranger's Tunic","body",2,{red:1,dodge:0.03,weight:"light"},
    "Quiet enough to hear a rat blink."),
  L("studded_leather","Studded Leather","body",2,{red:3,hp:5,weight:"medium"},
    "The studs are decorative. The protection is not."),
  L("iron_breastplate","Iron Breastplate","body",2,{red:4,weight:"heavy"},
    "Dented already. Whoever dented it fared worse."),
  L("plate_of_the_deep","Plate of the Deep","body",3,{red:5,hp:6,weight:"heavy"},
    "Cold to the touch, even after hours against your chest."),
  L("blackguard_plate","Blackguard Plate","body",3,{red:5,hp:8,weight:"heavy"},
    "Worn by the Undercroft's old enforcers. They stopped needing it."),
  L("warden_scraps","Warden Scraps","body",3,{red:4,hp:10,weight:"heavy"},
    "Torn from something much larger than you. Still warm."),
  L("immortal_plate","Immortal Plate","body",4,{red:7,hp:14,weight:"heavy",keep:true},
    "The name is aspirational. Mostly."),

  // ============================ HANDS ============================ ==
  L("cloth_wraps","Cloth Wraps","hands",1,{speedBonus:0.03,weight:"light"},
    "Worn soft by someone else's grip."),
  L("leather_gloves","Leather Gloves","hands",1,{atk:1,weight:"light"},
    "Better friction. Better everything."),
  L("iron_gauntlets","Iron Gauntlets","hands",2,{atk:1,red:1,weight:"medium"},
    "Knuckle plates for people who shake hands badly."),
  L("swift_grips","Swift Grips","hands",3,{speedBonus:0.10,weight:"light"},
    "Your hands forget they have bones."),
  L("gauntlets_of_vigil","Gauntlets of the Iron Vigil","hands",3,{atk:2,bossAtk:2,red:1,weight:"heavy"},
    "Worn by the last watchmen. Their grip has not loosened."),

  // ============================ FEET ============================ ====
  L("ragged_boots","Ragged Boots","feet",1,{dodge:0.01,weight:"light"},
    "Holes where your toes think."),
  L("mouldy_tackety","Mouldy Tackety Boots","feet",1,{dodge:0.02,weight:"light"},
    "They squeak. The rats hear you coming. You have made peace with it."),
  L("hardened_boots","Hardened Boots","feet",2,{red:1,weight:"medium"},
    "Steel toe. Timeless."),
  L("iron_greaves","Iron Greaves","feet",3,{red:2,hp:2,weight:"heavy"},
    "Each step is an announcement."),
  L("swiftshadow_boots","Swiftshadow Boots","feet",3,{dodge:0.06,speedBonus:0.04,weight:"light"},
    "Stitched with the colour of a shadow at noon. Your footsteps arrive after you."),
  L("boots_of_the_deep","Boots of the Deep","feet",4,{dodge:0.07,speedBonus:0.06,weight:"light",keep:true},
    "They walk on the dark as if it were solid."),

  // ============================ CLOAK ============================ ===
  L("travel_cloak","Travel Cloak","cloak",1,{dodge:0.02,weight:"light"},
    "Shields you from weather, and lightly from blame."),
  L("patched_shroud","Patched Shroud","cloak",1,{hp:3,weight:"light"},
    "Forty patches, counting. None of them yours."),
  L("swiftshadow_cloak","Swiftshadow Cloak","cloak",2,{dodge:0.04,weight:"light"},
    "The hem never quite settles."),
  L("shadow_mantle","Shadow Mantle","cloak",3,{dodge:0.05,luck:1,weight:"light"},
    "It drinks the light that touches it."),
  L("wardens_shroud","The Warden's Shroud","cloak",4,{dodge:0.06,bossAtk:3,weight:"light",keep:true},
    "Cut from his own banner after he fell. It still smells of cold iron."),

  // ============================ AMULET ============================ ==
  L("copper_pendant","Copper Pendant","amulet",1,{luck:1},
    "Warm against your skin, in a way copper shouldn't be."),
  L("silver_chain","Silver Chain","amulet",2,{luck:2},
    "Inscribed on the inside. The language is not yours."),
  L("lucky_talisman","Lucky Talisman","amulet",2,{luck:1,goldBonus:0.08},
    "Sometimes it rattles when no one moves."),
  L("amulet_of_the_deep","Amulet of the Deep","amulet",3,{luck:2,dropBonus:0.06},
    "A green stone the size of a knuckle. It feels heavier underwater."),
  L("wardens_sigil","Warden's Sigil","amulet",4,{luck:3,bossAtk:2,keep:true},
    "His mark. Carrying it, the dark gives you a wider berth."),
  L("fates_sigil","Fate's Sigil","amulet",4,{luck:5,dropBonus:0.18,keep:true},
    "Fate had a plan. You have this."),

  // ============================ RING ============================ ====
  L("brass_ring","Brass Ring","ring",1,{goldBonus:0.05},
    "Scratched. Ordinary. Yours now."),
  L("silver_ring","Silver Ring","ring",2,{luck:1},
    "Polished to a mirror you never seem to age in."),
  L("storm_ring","Storm Ring","ring",2,{crit:0.05},
    "A faint static crackles when you clench your fist."),
  L("ruby_ring","Ruby Ring","ring",3,{atk:2},
    "The stone glows when blood is near. It is always near."),
  L("thieves_palm","Thief's Palm","ring",3,{luck:1,dropBonus:0.10},
    "Sticky in all the right ways."),
  L("gilded_idol_ring","Gilded Idol Ring","ring",3,{luck:2,goldBonus:0.12},
    "Smiling. It was smiling when you found it."),
  L("bloodstone_ring","Bloodstone Ring","ring",3,{atk:2,healOnKill:1},
    "Red before you found it. Redder after."),
  L("ring_of_nine_regrets","Ring of Nine Regrets","ring",4,{luck:4,crit:0.08,keep:true},
    "Nine small stones. You feel you should know their names."),

  // ============================ CONSUMABLES =========================
  // Healing (7)
  L("small_draught","Small Draught","consumable",1,{healPct:0.20,kind:"heal"},
    "Tastes like iron and optimism."),
  L("health_draught","Health Draught","consumable",1,{healPct:0.30,kind:"heal"},
    "A field medic's recipe. The field is gone; the recipe survived."),
  L("bandage_roll","Bandage Roll","consumable",1,{healFlat:8,kind:"heal"},
    "Clean enough. Probably."),
  L("greater_draught","Greater Draught","consumable",2,{healPct:0.60,kind:"heal"},
    "Burns going down. Stops the other burning."),
  L("mending_salve","Mending Salve","consumable",2,{healFlat:18,kind:"heal"},
    "Smells terrible. Works brilliantly."),
  L("vitality_vial","Vitality Vial","consumable",3,{healPct:1.0,kind:"heal"},
    "Full restore. Someone paid dearly for this. You found it on a rat."),
  L("salve_of_the_deep","Salve of the Deep","consumable",3,{healPct:0.40,cures:["bleed"],kind:"heal"},
    "Mends flesh and stops blood in the same cold sweep."),

  // Buffs (7)
  L("iron_ration","Iron Ration","consumable",1,{healPct:0.15,atkBuff:1,kind:"buff"},
    "Horrible to eat. Better than starving in the dark."),
  L("sharpening_stone","Sharpening Stone","consumable",2,{atkBuff:2,kind:"buff"},
    "Ten minutes of work. One hit that counts."),
  L("swift_tonic","Swift Tonic","consumable",2,{speedBuff:0.20,kind:"buff"},
    "Everything else slows down. You don't."),
  L("emberstone","Emberstone","consumable",3,{atkBuff:4,kind:"buff"},
    "Your weapon runs hotter than usual. This is intentional."),
  L("stoneblood_tonic","Stoneblood Tonic","consumable",2,{redBuff:2,kind:"buff"},
    "Turns skin to bark for a time. You can still move. Barely."),
  L("lucky_draught","Lucky Draught","consumable",2,{luckBuff:2,kind:"buff"},
    "The world tilts a little in your favour."),
  L("hearty_stew","Hearty Stew","consumable",3,{healPct:0.30,floorHeal:3,kind:"buff"},
    "Warm, heavy, and stubbornly good for the next few descents."),

  // Cures (5)
  L("antidote","Antidote","consumable",1,{cures:["poison"],kind:"cure"},
    "Neutralises what's already in your veins."),
  L("clotting_powder","Clotting Powder","consumable",1,{cures:["bleed"],kind:"cure"},
    "Stings. Then stops."),
  L("smelling_salts","Smelling Salts","consumable",1,{cures:["weaken"],kind:"cure"},
    "A violent whiff of how-to-stay-alive."),
  L("burn_salve","Burn Salve","consumable",1,{cures:["burn"],kind:"cure"},
    "Cold cream that hisses on contact."),
  L("calming_draught","Calming Draught","consumable",2,{cures:["poison","bleed","burn","weaken"],kind:"cure"},
    "Clears what ails you. All of it. For a while."),

  // Utility (5)
  L("torch_bundle","Torch Bundle","consumable",1,{reveal:3,kind:"utility"},
    "Reveals the rooms around you for a moment."),
  L("waterskin","Waterskin","consumable",1,{healFlat:3,kind:"utility"},
    "Mundane, cheap, and never not welcome."),
  L("map_scrap","Map Scrap","consumable",2,{revealFloor:true,kind:"utility"},
    "Someone's shorthand. The X marks nothing good."),
  L("rope_coil","Rope Coil","consumable",2,{escape:true,kind:"utility"},
    "For leaving a fight the way you came in."),
  L("whetstone_kit","Whetstone Kit","consumable",2,{atkBuff:1,speedBuff:0.05,kind:"utility"},
    "Edge and ease in one small pouch.")
 ];

 Delve.itemDefs = {};
 defs.forEach(d => { Delve.itemDefs[d.id] = d; });
 Delve.potionDefs = defs.filter(d => d.type === undefined && d.slot === "consumable");
 // fix: type isn't set on consumables above; identify by slot
 Delve.potionDefs = defs.filter(d => d.slot === "consumable");

 Delve.SLOT_DEFS = SLOT_DEFS;

 Delve.itemsByTier = function(tier){ return defs.filter(d => d.tier === tier); };
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
  let t = Math.max(1, Math.min(4, tier));
  let pool = Delve.itemsByTier(t);
  if(!pool.length) pool = Delve.itemsByTier(1);
  const d = pool[Math.floor(Math.random() * pool.length)];
  return Object.assign({}, d);
 };

 // ── Provenance: stamp a human-readable origin on every item ────
 Delve.stampProvenance = function(item, source){
  const G = Delve.G;
  const floor = G ? G.floor : "?";
  let line = "";
  switch(source.kind){
   case "monster":
    if(source.elite) line = "Wrested from an Elite " + source.name + " on Floor " + floor + ".";
    else line = "Recovered from a " + source.name + " on Floor " + floor + ".";
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

 // ── Loot rolls ─────────────────────────────────────────────────
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
  let pool = Delve.potionDefs.filter(d => d.tier === (tier || 2));
  if(!pool.length) pool = Delve.potionDefs;
  const it = Object.assign({}, pool[Math.floor(Math.random() * pool.length)]);
  it.x = x; it.y = y;
  Delve.stampProvenance(it, source || { kind:"monster", name:"foe", elite:false });
  Delve.G.items.push(it);
  return it;
 };

 // ── Shop price ──────────────────────────────────────────────────
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

 // ── Inventory capacity (start 16, KIT tree raises toward 24) ──
 Delve.inventoryCap = function(){
  return Math.min(Delve.CONFIG.inventoryMax || 24, Delve.CONFIG.inventorySlots || 16);
 };

 // ── Pickup with capacity enforcement ───────────────────────────
 Delve.pickupItem = function(item){
  const G = Delve.G;
  if(!G.inventory) G.inventory = [];
  if(G.inventory.length >= Delve.inventoryCap()){
   item.x = G.px; item.y = G.py;
   const dup = (G.items||[]).find(i => i.x===item.x && i.y===item.y && i.id===item.id);
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

 // ── Weight profile (speed/dodge modifiers per equipped piece) ──
 function weightProfile(item){
  const W = Delve.CONFIG.WEIGHT;
  const w = (item.weight && W[item.weight]) || W.medium;
  // Non-body pieces contribute half their weight effect
  const scale = item.slot === "body" ? 1.0 : 0.5;
  return { speed: w.speed * scale, dodge: w.dodge * scale };
 }

 // ── Effective attack speed (weapon + weight + agi + mods) ──────
 Delve.playerSpeed = function(){
  const G = Delve.G, cfg = Delve.CONFIG, sec = cfg.secondaries;
  let speed = 1.0;
  if(G && G.equip && G.equip.weapon){
   const ws = cfg.WEAPON_SPEEDS[G.equip.weapon.style];
   if(ws) speed = ws;
  }
  speed += Delve.agiPts() * sec.speedPerAgi;

  // weight from all equipped armour pieces
  let wSpeed = 0;
  const eq = G && G.equip ? G.equip : {};
  ["head","body","hands","feet"].forEach(function(s){
   if(eq[s]) wSpeed += weightProfile(eq[s]).speed;
  });
  // Strength mitigates only the negative part
  if(wSpeed < 0){
   const mitigation = Delve.strPts() * (cfg.weightMitigation.strPerPoint || 0.01);
   wSpeed = Math.min(0, wSpeed + mitigation);
   wSpeed = Math.max(cfg.weightMitigation.speedPenaltyFloor || -0.04, wSpeed);
  }
  speed += wSpeed;

  // item speed bonuses (hands, feet, rings, consumable buffs)
  if(G && G.equip){
   ["weapon","head","body","hands","feet","cloak","amulet","ring1","ring2"].forEach(function(s){
    const it = G.equip[s];
    if(it && it.speedBonus) speed += it.speedBonus;
   });
  }
  if(G) speed += (G.speedBuff || 0);
  return Math.max(0.5, speed);
 };

 // ── Aggregate stats from all 12 equip slots ────────────────────
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

  // weight profile
  ["head","body","hands","feet"].forEach(function(s){
   if(eq[s]){
    const wp = weightProfile(eq[s]);
    b.weightSpeed += wp.speed;
    b.weightDodge += wp.dodge;
   }
  });
  return b;
 };

 // ── Equip / unequip (generic, handles ring1/ring2) ─────────────
 function targetKey(slotDef){
  if(slotDef && slotDef.equipKey) return slotDef.equipKey;
  return null;
 }
 function ringKeys(){
  const eq = Delve.G.equip;
  return [eq.ring1, eq.ring2];
 }
 function removeFromInv(item){
  const inv = Delve.G.inventory;
  const i = inv.indexOf(item);
  if(i >= 0) inv.splice(i, 1);
  else {
   const j = inv.findIndex(x => x.id === item.id);
   if(j >= 0) inv.splice(j, 1);
  }
 }
 function clampHp(){ Delve.G.hp = Math.min(Delve.G.hp, Delve.maxHp()); }

 Delve.equipItem = function(item, toKey){
  const G = Delve.G;
  const def = SLOT_DEFS[item.slot];
  let key = toKey;
  if(!key) key = def ? def.equipKey : null;
  if(!key){
   // ring: choose first open ring slot
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
  for(const key of Delve.CONFIG.SLOT_ORDER){
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

 // Back-compat aliases used by older code paths
 Delve.equipWeapon = function(item){ Delve.equipItem(item, "weapon"); };
 Delve.equipArmour = function(item){ Delve.equipItem(item, "body"); };

 // ── Status-on-hit chance by weapon tier ────────────────────────
 Delve.weaponStatus = function(weapon){
  if(!weapon || !weapon.status) return null;
  const cfg = Delve.CONFIG.statusChance || {};
  const table = cfg[weapon.status];
  if(!table) return null;
  const chance = table[weapon.tier] || 0;
  return { kind: weapon.status, chance: chance };
 };

 // ── Use consumables (self-only) ────────────────────────────────
 Delve.useConsumable = function(item){
  const G = Delve.G;

  if(item.cures){
   removeFromInv(item);
   const cured = [];
   if(!G.effects) G.effects = [];
   item.cures.forEach(function(id){
    const before = G.effects.length;
    G.effects = G.effects.filter(e => e.id !== id);
    if(G.effects.length < before) cured.push(id);
   });
   const label = cured.length ? cured.map(c => Delve.CONFIG.STATUS_EFFECTS[c].name).join(", ") : "nothing to cure";
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
   // track separately if not yet removed
   if(!item.cures){ removeFromInv(item); Delve.recordStat("consumablesUsed",1); }
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

 // ── Stat card lines (full words, no shorthand) ─────────────────
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
  cmp("crit", "Critical Chance", v => "+" + Math.round(v*100) + "%");
  cmp("dodge", "Dodge Chance", v => "+" + Math.round(v*100) + "%");
  cmp("dropBonus", "Item Find", v => "+" + Math.round(v*100) + "%");
  cmp("goldBonus", "Gold Find", v => "+" + Math.round(v*100) + "%");
  cmp("shardBonus", "Bonus Shards");
  cmp("bossAtk", "Damage vs Ward Bosses");
  cmp("speedBonus", "Attack Speed", v => "+" + Math.round(v*100) + "%");
  cmp("healOnKill", "Life Steal on Kill");
  if(item.healPct) lines.push({ label:"Restores", value: Math.round(Delve.maxHp() * item.healPct) + " Health", delta:0 });
  if(item.healFlat) lines.push({ label:"Restores", value: item.healFlat + " Health", delta:0 });
  if(item.healPct && item.cures) lines.push({ label:"Also cures", value: item.cures.map(c => Delve.CONFIG.STATUS_EFFECTS[c].name).join(", "), delta:0 });
  if(item.cures && !item.healPct && !item.healFlat) lines.push({ label:"Cures", value: item.cures.map(c => Delve.CONFIG.STATUS_EFFECTS[c].name).join(", "), delta:0 });
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
