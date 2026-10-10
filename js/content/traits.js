window.Delve = window.Delve || {};
(function(){
 const C = Delve.CONFIG;

 // ── content/traits.js : trait + ability definitions (data only) ──

 C.TRAITS = {
  passives: [
   { id:"sharpened_edge", name:"Sharpened Edge", rarity:"common", desc:"+2 Attack Power", effects:{ atk:2 } },
   { id:"thick_hide", name:"Thick Hide", rarity:"common", desc:"+6 Maximum Health", effects:{ maxHp:6 } },
   { id:"light_feet", name:"Light Feet", rarity:"common", desc:"+8% Dodge Chance", effects:{ dodge:0.08 } },
   { id:"fortunes_nod", name:"Fortune's Nod", rarity:"common", desc:"+1 Luck", effects:{ luck:1 } },
   { id:"coin_pusher", name:"Coin Pusher", rarity:"common", desc:"+15% Gold Find", effects:{ goldMult:0.15 } },
   { id:"studied_reflexes", name:"Studied Reflexes", rarity:"uncommon", desc:"+10% Critical Chance", effects:{ crit:0.10 } },
   { id:"brute_force", name:"Brute Force", rarity:"uncommon", desc:"+3 damage vs Ward bosses", effects:{ bossAtk:3 } },
   { id:"field_dressing", name:"Field Dressing", rarity:"uncommon", desc:"Heal 4 HP per floor cleared", effects:{ healPerFloor:4 } },
   { id:"bulwark_plate", name:"Bulwark Plate", rarity:"uncommon", desc:"+2 flat Damage Reduction", effects:{ flatRed:2 } },
   { id:"bloodthirst", name:"Bloodthirst", rarity:"rare", desc:"Heal 2 HP per kill", effects:{ healOnKill:2 } },
   { id:"ember_blood", name:"Ember Blood", rarity:"rare", desc:"+2 Energy per kill", effects:{ extraEnergyPerKill:2 } },
   { id:"evasive", name:"Evasive", rarity:"uncommon", desc:"+3% Dodge and +1 Agility", effects:{ dodge:0.03, agi:1 } },
   { id:"hardened_bones", name:"Hardened Bones", rarity:"rare", desc:"+4 Maximum Health and +1 Toughness", effects:{ maxHp:4, tou:1 } },
   { id:"deep_sight", name:"Deep Sight", rarity:"rare", desc:"+8% Item Find", effects:{ dropBonus:0.08 } },
   { id:"swift_hands", name:"Swift Hands", rarity:"uncommon", desc:"+15% Attack Speed", effects:{ speedBonus:0.15 } },
   { id:"iron_will", name:"Iron Will", rarity:"rare", desc:"Survive one killing blow at 1 HP", effects:{ unbroken:true } }
  ],
  uniques: [
   { id:"vampiric_strike", name:"Vampiric Strike", desc:"Critical hits heal for half the damage dealt", unique:true, effects:{ vampiric:true } },
   { id:"wardens_oath", name:"Warden's Oath", desc:"Second Wind heals 50% instead of 30%", unique:true, effects:{ secondWindHealOverride:0.50 } },
   { id:"unbroken", name:"Unbroken", desc:"Survive one killing blow at 1 HP, once", unique:true, effects:{ unbroken:true } },
   { id:"deep_pockets", name:"Deep Pockets", desc:"+50% Gold Find for the rest of the run", unique:true, effects:{ goldMult:0.50 } }
  ],
  abilities: [
   { id:"cleave", name:"Cleave", cost:4, target:"adjacent", desc:"Hit target and every enemy adjacent to it" },
   { id:"lunge", name:"Lunge", cost:5, target:"line4", desc:"Dash in a straight line up to 4 tiles and strike" },
   { id:"stone_skin", name:"Stone Skin", cost:6, target:"self", desc:"Take 60% less damage for 2 turns" },
   { id:"cinderbolt", name:"Cinderbolt", cost:4, target:"range5", desc:"10 damage, ignores armour, no retaliation, applies Burn" },
   { id:"rally", name:"Rally", cost:7, target:"self", desc:"Heal 35% max HP and clear bleed" },
   { id:"blink", name:"Blink", cost:5, target:"teleport4", desc:"Teleport to a visible empty tile within 4" },
   { id:"whirlwind", name:"Whirlwind", cost:8, target:"self", desc:"Strike every adjacent enemy at once" }
  ]
 };
})();
