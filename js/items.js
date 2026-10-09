window.Delve = window.Delve || {};
(function(){

  // ---- Tier metadata ----
  Delve.TIERS = {
    names:  {1:"Common", 2:"Uncommon", 3:"Rare", 4:"Legendary"},
    colors: {1:"#cfd8e0", 2:"#7ee08a", 3:"#7ea8e8", 4:"#ffd75e"}
  };

  // ---- Full item pyramid (locked list) ----
  const defs = [
    // WEAPONS — swords
    {id:"shortsword",      name:"Shortsword",       type:"weapon", tier:1, atk:1, style:"sword"},
    {id:"longsword",       name:"Longsword",        type:"weapon", tier:1, atk:2, style:"sword"},
    {id:"broadsword",      name:"Broadsword",       type:"weapon", tier:2, atk:4, style:"sword"},
    {id:"knights_blade",   name:"Knight's Blade",   type:"weapon", tier:3, atk:6, style:"sword"},
    {id:"dawnblade",       name:"Dawnblade",        type:"weapon", tier:4, atk:8, style:"sword", keep:true},

    // WEAPONS — axes (shard-hungry)
    {id:"hand_axe",        name:"Hand Axe",         type:"weapon", tier:1, atk:2, style:"axe"},
    {id:"woodcutters_axe", name:"Woodcutter's Axe", type:"weapon", tier:1, atk:3, style:"axe"},
    {id:"battle_axe",      name:"Battle Axe",       type:"weapon", tier:2, atk:5, style:"axe"},
    {id:"executioners_axe",name:"Executioner's Axe",type:"weapon", tier:3, atk:7, shardBonus:1, style:"axe"},
    {id:"gravegullet",     name:"Gravegullet",      type:"weapon", tier:4, atk:9, shardBonus:3, style:"axe", keep:true},

    // WEAPONS — daggers (luck-leaning)
    {id:"rusty_dagger",    name:"Rusty Dagger",     type:"weapon", tier:1, atk:1, style:"dagger"},
    {id:"thin_stiletto",   name:"Thin Stiletto",    type:"weapon", tier:1, atk:2, style:"dagger"},
    {id:"poison_bodkin",   name:"Poison Bodkin",    type:"weapon", tier:2, atk:3, luck:1, style:"dagger"},
    {id:"assassins_fang",  name:"Assassin's Fang",  type:"weapon", tier:3, atk:5, luck:2, style:"dagger"},
    {id:"whisper",         name:"Whisper",          type:"weapon", tier:4, atk:6, luck:3, style:"dagger", keep:true},

    // WEAPONS — hammers (boss-hunting)
    {id:"club",            name:"Club",             type:"weapon", tier:1, atk:2, style:"hammer"},
    {id:"iron_mace",       name:"Iron Mace",        type:"weapon", tier:1, atk:3, style:"hammer"},
    {id:"war_hammer",      name:"War Hammer",       type:"weapon", tier:2, atk:4, style:"hammer"},
    {id:"crusher",         name:"Crusher",          type:"weapon", tier:3, atk:6, bossAtk:2, style:"hammer"},
    {id:"stormbrand",      name:"Stormbrand",       type:"weapon", tier:4, atk:8, bossAtk:4, style:"hammer", keep:true},

    // ARMOUR
    {id:"cloth_wrap",      name:"Cloth Wrap",       type:"armour", tier:1, red:1},
    {id:"padded_gambeson", name:"Padded Gambeson",  type:"armour", tier:1, red:1, hp:3},
    {id:"hardened_leather",name:"Hardened Leather", type:"armour", tier:1, red:2},
    {id:"studded_leather", name:"Studded Leather",  type:"armour", tier:2, red:2, hp:5},
    {id:"iron_breastplate",name:"Iron Breastplate", type:"armour", tier:2, red:3},
    {id:"blackguard_plate",name:"Blackguard Plate", type:"armour", tier:3, red:3, hp:8},
    {id:"immortal_plate",  name:"Immortal Plate",   type:"armour", tier:4, red:5, hp:10, keep:true},

    // TRINKETS (the Luck home)
    {id:"lucky_coin",      name:"Lucky Coin",       type:"trinket", tier:1, luck:1},
    {id:"whetstone_knot",  name:"Whetstone Knot",   type:"trinket", tier:1, dropBonus:0.05},
    {id:"scrap_medal",     name:"Scrap Medal",      type:"trinket", tier:1, goldBonus:0.03},
    {id:"silver_ring",     name:"Silver Ring",      type:"trinket", tier:2, luck:2},
    {id:"warding_charm",   name:"Warding Charm",    type:"trinket", tier:2, red:1},
    {id:"gilded_idol",     name:"Gilded Idol",      type:"trinket", tier:3, luck:3, goldBonus:0.10},
    {id:"thieves_palm",    name:"Thief's Palm",     type:"trinket", tier:3, luck:1, dropBonus:0.08},
    {id:"fates_sigil",     name:"Fate's Sigil",     type:"trinket", tier:4, luck:5, dropBonus:0.15, keep:true},

    // CONSUMABLES — healing
    {id:"small_draught",   name:"Small Draught",    type:"consumable", tier:1, healPct:0.20},
    {id:"health_draught",  name:"Health Draught",   type:"consumable", tier:1, healPct:0.30},
    {id:"greater_draught", name:"Greater Draught",  type:"consumable", tier:2, healPct:0.60},
    {id:"vitality_vial",   name:"Vitality Vial",    type:"consumable", tier:3, healPct:1.0},

    // CONSUMABLES — damage
    {id:"firecracker",     name:"Firecracker",      type:"consumable", tier:1, dmg:6},
    {id:"blast_bomb",      name:"Blast Bomb",       type:"consumable", tier:2, dmg:12},
    {id:"demolition_charge",name:"Demolition Charge", type:"consumable", tier:3, dmg:22},

    // CONSUMABLES — control
    {id:"choking_dust",    name:"Choking Dust",     type:"consumable", tier:1, control:"adjacent"},
    {id:"smoke_powder",    name:"Smoke Powder",     type:"consumable", tier:2, control:"all"},

    // CONSUMABLES — run buffs
    {id:"sharpening_stone",name:"Sharpening Stone", type:"consumable", tier:2, atkBuff:1},
    {id:"emberstone",      name:"Emberstone",       type:"consumable", tier:3, atkBuff:3}
  ];

  Delve.itemDefs = {};
  defs.forEach(d => { Delve.itemDefs[d.id] = d; });

  Delve.itemsByTier = function(tier){ return defs.filter(d => d.tier === tier); };
  Delve.wardOf = function(floor){ return Math.max(1, Math.ceil(floor/10)); };

  // ---- Luck-first master roll: pick a tier ----
  Delve.rollTier = function(floor){
    const L = Delve.CONFIG.loot, luck = Delve.luckPts(), ward = Delve.wardOf(floor);
    const w = {
      common:     L.weights.common(),
      uncommon:   L.weights.uncommon(luck),
      rare:       L.weights.rare(luck, ward),
      legendary:  L.weights.legendary(luck, ward)
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

  Delve.rollKillDrop = function(x, y, opts){
    opts = opts || {};
    const L = Delve.CONFIG.loot;
    let chance = Math.min(L.dropCap, L.baseDrop + Delve.luckPts() * L.luckDrop);
    if(opts.guaranteed) chance = 1;
    if(chance === 0 || Math.random() > chance) return false;

    let tier = Delve.rollTier(Delve.G.floor);
    if(opts.minTier) tier = Math.max(opts.minTier, tier);
    const item = Delve.makeItem(tier);
    item.x = x; item.y = y;
    Delve.G.items.push(item);
    return true;
  };

  Delve.pickupItem = function(item){
    Delve.G.inventory.push(item);
    Delve.flash("Picked up " + item.name);
    Delve.logPickup(item.name, item.tier);
    Delve.updateHUD();
  };

  // ---------------- EQUIPPING ----------------

  Delve.itemBuffs = function(){
    const e = (Delve.G && Delve.G.equip) || {weapon:null, armour:null, trinkets:[]};
    const b = { atk:0, red:0, hp:0, luck:0, dropBonus:0, goldBonus:0, shardBonus:0, bossAtk:0 };
    if(e.weapon)      add(e.weapon, b);
    if(e.armour)      add(e.armour, b);
    (e.trinkets||[]).forEach(t => add(t, b));
    return b;

    function add(it,o){
      o.atk   += it.atk   || 0;
      o.red   += it.red   || 0;
      o.hp    += it.hp    || 0;
      o.luck  += it.luck  || 0;
      o.dropBonus  += it.dropBonus  || 0;
      o.goldBonus  += it.goldBonus  || 0;
      o.shardBonus += it.shardBonus || 0;
      o.bossAtk    += it.bossAtk    || 0;
    }
  };

  function removeFromInv(item){
    const i = Delve.G.inventory.indexOf(item);
    if(i >= 0) Delve.G.inventory.splice(i, 1);
  }
  function clampHp(){
    Delve.G.hp = Math.min(Delve.G.hp, Delve.maxHp());
  }

  Delve.equipWeapon = function(item){
    if(Delve.G.equip.weapon) Delve.G.inventory.push(Delve.G.equip.weapon);
    Delve.G.equip.weapon = item;
    removeFromInv(item);
    clampHp();
    Delve.flash("Equipped " + item.name);
  };
  Delve.unequipWeapon = function(){
    if(Delve.G.equip.weapon) Delve.G.inventory.push(Delve.G.equip.weapon);
    Delve.G.equip.weapon = null;
    clampHp();
  };
  Delve.equipArmour = function(item){
    if(Delve.G.equip.armour) Delve.G.inventory.push(Delve.G.equip.armour);
    Delve.G.equip.armour = item;
    removeFromInv(item);
    clampHp();
    Delve.flash("Equipped " + item.name);
  };
  Delve.unequipArmour = function(){
    if(Delve.G.equip.armour) Delve.G.inventory.push(Delve.G.equip.armour);
    Delve.G.equip.armour = null;
    clampHp();
  };
  Delve.equipTrinket = function(item){
    const t = Delve.G.equip.trinkets;
    if(t.length >= 2) Delve.G.inventory.push(t.shift());
    t.push(item);
    removeFromInv(item);
    clampHp();
    Delve.flash("Equipped " + item.name);
  };
  Delve.unequipTrinket = function(item){
    const t = Delve.G.equip.trinkets;
    const i = t.indexOf(item);
    if(i >= 0){ t.splice(i,1); Delve.G.inventory.push(item); }
    clampHp();
  };

  // ---------------- USING CONSUMABLES ----------------

  Delve.useConsumable = function(item){
    const G = Delve.G;
    if(item.healPct){
      removeFromInv(item);
      const heal = Math.round(Delve.maxHp() * item.healPct);
      G.hp = Math.min(Delve.maxHp(), G.hp + heal);
      Delve.flash(item.name + "! +" + heal + " HP");
      Delve.logConsumable(item.name, "+" + heal + " HP"); Delve.logHeal(heal, item.name);
      Delve.enemiesTurn();
    } else if(item.dmg){
      const targets = [];
      if(G.boss && Math.abs(G.boss.x-G.px)+Math.abs(G.boss.y-G.py) <= 1) targets.push(G.boss);
      G.monsters.forEach(m => {
        if(Math.abs(m.x-G.px)+Math.abs(m.y-G.py) <= 1) targets.push(m);
      });
      if(!targets.length){
        Delve.flash("No adjacent enemy — nothing to hit");
        Delve.updateHUD();
        return;
      }
      targets.sort((a,b) => b.hp - a.hp);
      const t = targets[0];
      removeFromInv(item);
      t.hp -= item.dmg;
      Delve.flash(item.name + "! -" + item.dmg);
      Delve.logConsumable(item.name, "-" + item.dmg + " to target");
      if(t.hp <= 0) Delve.killMonster(t);
      Delve.enemiesTurn();
    } else if(item.control){
      removeFromInv(item);
      const all = item.control === "all";
      [G.boss].concat(G.monsters).forEach(m => {
        if(!m) return;
        if(all || (Math.abs(m.x-G.px)+Math.abs(m.y-G.py) <= 1)) m.skipNext = true;
      });
      Delve.flash(all ? "Smoke everywhere — enemies hesitate!" : "Dust! Nearby enemies blinded");
      Delve.enemiesTurn();
    } else if(item.atkBuff){
      removeFromInv(item);
      G.atkBuff = (G.atkBuff || 0) + item.atkBuff;
      Delve.flash("+" + item.atkBuff + " ATK for this run");
      Delve.enemiesTurn();
    }
    Delve.updateHUD();
  };
})();
