window.Delve = window.Delve || {};
(function(){

 Delve.TIERS = {
  names: { 1:"Common", 2:"Uncommon", 3:"Rare", 4:"Legendary" },
  colors: { 1:"#cfd8e0", 2:"#7ee08a", 3:"#7ea8e8", 4:"#ffd75e" }
 };

 const SLOT_DEFS = {
  weapon:  { type:"weapon", equipKey:"weapon" },
  offhand: { type:"offhand", equipKey:"offhand" },
  head:    { type:"head", equipKey:"head" },
  body:    { type:"body", equipKey:"body" },
  hands:   { type:"hands", equipKey:"hands" },
  feet:    { type:"feet", equipKey:"feet" },
  cloak:   { type:"cloak", equipKey:"cloak" },
  amulet:  { type:"amulet", equipKey:"amulet" },
  ring:    { type:"ring", equipKey:null }
 };

 function L(id, name, slot, tier, stats, lore, extra){
  const d = { id:id, name:name, slot:slot, tier:tier };
  if(stats) Object.assign(d, stats);
  if(lore) d.lore = lore;
  if(extra) Object.assign(d, extra);
  return d;
 }

 const defs = [

  // ============================ WEAPONS ============================
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

  // ============================ HEAD ================================
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

  // ============================ BODY ================================
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

  // ============================ HANDS ===============================
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

  // ============================ FEET ================================
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

  // ============================ CLOAK ===============================
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

  // ============================ AMULET ==============================
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

  // ============================ RING ================================
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
 defs.forEach(function(d){ Delve.itemDefs[d.id] = d; });
 Delve.potionDefs = defs.filter(function(d){ return d.slot === "consumable"; });
 Delve.SLOT_DEFS = SLOT_DEFS;

})();
