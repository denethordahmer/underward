window.Delve = window.Delve || {};
(function(){

  Delve.TIERS = {
    names:  { 1:"Common", 2:"Uncommon", 3:"Rare", 4:"Legendary" },
    colors: { 1:"#cfd8e0", 2:"#7ee08a", 3:"#7ea8e8", 4:"#ffd75e" }
  };

  // ── Equipment slot definitions ──────────────────────────────
  Delve.SLOTS = {
    weapon:  { label:"Weapon",  icon:"⚔" },
    armour:  { label:"Armour",  icon:"🛡" },
    trinket: { label:"Trinket", icon:"◆" }
  };

  // ── Full item list ──────────────────────────────────────────
  // speed on weapons: how fast they swing (1.0 = base, higher = faster)
  // flavour: one-line atmospheric description shown on stat card
  const defs = [

    // ── WEAPONS: SWORDS (balanced — speed 1.0) ────────────────
    { id:"shortsword",       name:"Shortsword",        type:"weapon", tier:1, atk:2,  style:"sword",  speed:1.0,
      flavour:"Light enough to forget you're holding it. Until it matters." },
    { id:"longsword",        name:"Longsword",         type:"weapon", tier:1, atk:3,  style:"sword",  speed:1.0,
      flavour:"Standard issue. Whoever issued it isn't using it anymore." },
    { id:"broadsword",       name:"Broadsword",        type:"weapon", tier:2, atk:5,  style:"sword",  speed:1.0,
      flavour:"Heavy enough to mean it. Wide enough not to miss." },
    { id:"knights_blade",    name:"Knight's Blade",    type:"weapon", tier:3, atk:7,  style:"sword",  speed:1.0,
      flavour:"Etched with a crest nobody alive can identify." },
    { id:"dawnblade",        name:"Dawnblade",         type:"weapon", tier:4, atk:10, style:"sword",  speed:1.0, keep:true,
      flavour:"It hums faintly. It was humming before you picked it up." },

    // ── WEAPONS: DAGGERS (fast 1.4, lower damage) ─────────────
    { id:"rusty_dagger",     name:"Rusty Dagger",      type:"weapon", tier:1, atk:1,  style:"dagger", speed:1.4,
      flavour:"Rust means it's seen use. Probably recent." },
    { id:"thin_stiletto",    name:"Thin Stiletto",     type:"weapon", tier:1, atk:2,  style:"dagger", speed:1.4,
      flavour:"Not a weapon. A strong opinion, delivered quickly." },
    { id:"poison_bodkin",    name:"Poison Bodkin",     type:"weapon", tier:2, atk:3,  style:"dagger", speed:1.4, luck:1,
      flavour:"The green tinge isn't rust. Don't lick it." },
    { id:"assassins_fang",   name:"Assassin's Fang",   type:"weapon", tier:3, atk:5,  style:"dagger", speed:1.4, luck:2,
      flavour:"It arrives before you decide to throw it." },
    { id:"whisper",          name:"Whisper",           type:"weapon", tier:4, atk:7,  style:"dagger", speed:1.4, luck:3, keep:true,
      flavour:"You never hear it. Neither do they." },

    // ── WEAPONS: AXES (slow 0.85, hits harder) ────────────────
    { id:"hand_axe",         name:"Hand Axe",          type:"weapon", tier:1, atk:3,  style:"axe",    speed:0.85,
      flavour:"Splits kindling. Splits skulls. Versatile." },
    { id:"woodcutters_axe",  name:"Woodcutter's Axe",  type:"weapon", tier:1, atk:4,  style:"axe",    speed:0.85,
      flavour:"The wood it was cutting stopped being the problem." },
    { id:"battle_axe",       name:"Battle Axe",        type:"weapon", tier:2, atk:6,  style:"axe",    speed:0.85,
      flavour:"Two-pound head. Zero-pound patience." },
    { id:"executioners_axe", name:"Executioner's Axe", type:"weapon", tier:3, atk:8,  style:"axe",    speed:0.85, shardBonus:1,
      flavour:"Ceremonial. The ceremony was not pleasant." },
    { id:"gravegullet",      name:"Gravegullet",       type:"weapon", tier:4, atk:11, style:"axe",    speed:0.85, shardBonus:3, keep:true,
      flavour:"It doesn't just cut. It collects." },

    // ── WEAPONS: HAMMERS (slowest 0.70, most damage) ──────────
    { id:"club",             name:"Club",              type:"weapon", tier:1, atk:3,  style:"hammer", speed:0.70,
      flavour:"Primitive. Effective. Unapologetic." },
    { id:"iron_mace",        name:"Iron Mace",         type:"weapon", tier:1, atk:4,  style:"hammer", speed:0.70,
      flavour:"Favoured by those who distrust anything with an edge." },
    { id:"war_hammer",       name:"War Hammer",        type:"weapon", tier:2, atk:6,  style:"hammer", speed:0.70,
      flavour:"Sends a message. The message is: no." },
    { id:"crusher",          name:"Crusher",           type:"weapon", tier:3, atk:8,  style:"hammer", speed:0.70, bossAtk:3,
      flavour:"Engineered specifically for things that think armour helps." },
    { id:"stormbrand",       name:"Stormbrand",        type:"weapon", tier:4, atk:12, style:"hammer", speed:0.70, bossAtk:5, keep:true,
      flavour:"Thunder is just the sound it makes on the way down." },

    // ── NEW WEAPONS: SPEARS (speed 0.95, extra reach feel) ────
    { id:"short_spear",      name:"Short Spear",       type:"weapon", tier:1, atk:3,  style:"spear",  speed:0.95,
      flavour:"The reach is the point. So is the point." },
    { id:"warspear",         name:"Warspear",          type:"weapon", tier:2, atk:5,  style:"spear",  speed:0.95,
      flavour:"Whoever carried this was paid well and spent it quickly." },
    { id:"shadowlance",      name:"Shadowlance",       type:"weapon", tier:3, atk:8,  style:"spear",  speed:0.95, luck:1,
      flavour:"The shadows lean toward it. That's probably fine." },

    // ── ARMOUR (body slot — flat damage reduction) ─────────────
    { id:"cloth_wrap",       name:"Cloth Wrap",        type:"armour", tier:1, red:1,
      flavour:"Better than nothing. Marginally." },
    { id:"padded_gambeson",  name:"Padded Gambeson",   type:"armour", tier:1, red:1, hp:4,
      flavour:"Quilted by someone who survived long enough to finish it." },
    { id:"hardened_leather", name:"Hardened Leather",  type:"armour", tier:1, red:2,
      flavour:"Cured in something best not asked about." },
    { id:"studded_leather",  name:"Studded Leather",   type:"armour", tier:2, red:3, hp:5,
      flavour:"The studs are decorative. The protection is not." },
    { id:"iron_breastplate", name:"Iron Breastplate",  type:"armour", tier:2, red:4,
      flavour:"Dented already. Whoever dented it fared worse." },
    { id:"blackguard_plate", name:"Blackguard Plate",  type:"armour", tier:3, red:5, hp:8,
      flavour:"Worn by the Undercroft's old enforcers. They stopped needing it." },
    { id:"warden_scraps",    name:"Warden Scraps",     type:"armour", tier:3, red:4, hp:10,
      flavour:"Torn from something much larger than you. Still warm." },
    { id:"immortal_plate",   name:"Immortal Plate",    type:"armour", tier:4, red:7, hp:14, keep:true,
      flavour:"The name is aspirational. Mostly." },

    // ── TRINKETS ──────────────────────────────────────────────
    { id:"lucky_coin",       name:"Lucky Coin",        type:"trinket", tier:1, luck:1,
      flavour:"Heads every time. You've stopped checking." },
    { id:"whetstone_knot",   name:"Whetstone Knot",    type:"trinket", tier:1, dropBonus:0.05,
      flavour:"Tied to a whetstone. Tied to better odds. Somehow." },
    { id:"scrap_medal",      name:"Scrap Medal",       type:"trinket", tier:1, goldBonus:0.08,
      flavour:"Awarded for something. Commemorating something else." },
    { id:"rabbit_foot",      name:"Rabbit's Foot",     type:"trinket", tier:1, luck:1, goldBonus:0.05,
      flavour:"Lucky for you. Less so for the rabbit." },
    { id:"silver_ring",      name:"Silver Ring",       type:"trinket", tier:2, luck:2,
      flavour:"Inscribed on the inside. The language is not yours." },
    { id:"warding_charm",    name:"Warding Charm",     type:"trinket", tier:2, red:1,
      flavour:"Smells of old smoke and older prayers." },
    { id:"swift_talisman",   name:"Swift Talisman",    type:"trinket", tier:2, speedBonus:0.10,
      flavour:"A small weight that somehow makes you lighter." },
    { id:"cracked_lens",     name:"Cracked Lens",      type:"trinket", tier:2, luck:1, dropBonus:0.06,
      flavour:"You see more through the crack than through the glass." },
    { id:"gilded_idol",      name:"Gilded Idol",       type:"trinket", tier:3, luck:3, goldBonus:0.12,
      flavour:"Smiling. It was smiling when you found it." },
    { id:"thieves_palm",     name:"Thief's Palm",      type:"trinket", tier:3, luck:1, dropBonus:0.10,
      flavour:"Sticky in all the right ways." },
    { id:"bloodstone",       name:"Bloodstone",        type:"trinket", tier:3, atk:2, healOnKill:1,
      flavour:"Red before you found it. Redder after." },
    { id:"fates_sigil",      name:"Fate's Sigil",      type:"trinket", tier:4, luck:5, dropBonus:0.18, keep:true,
      flavour:"Fate had a plan. You have this." },

    // ── CONSUMABLES: HEALING ──────────────────────────────────
    { id:"small_draught",    name:"Small Draught",     type:"consumable", tier:1, healPct:0.20,
      flavour:"Tastes like iron and optimism." },
    { id:"health_draught",   name:"Health Draught",    type:"consumable", tier:1, healPct:0.30,
      flavour:"A field medic's recipe. The field is gone. The recipe survived." },
    { id:"greater_draught",  name:"Greater Draught",   type:"consumable", tier:2, healPct:0.60,
      flavour:"Burns going down. Stops the other burning." },
    { id:"vitality_vial",    name:"Vitality Vial",     type:"consumable", tier:3, healPct:1.0,
      flavour:"Full heal. Someone paid a lot for this. You found it on a rat." },
    { id:"bandage_roll",     name:"Bandage Roll",      type:"consumable", tier:1, healFlat:8,
      flavour:"Clean enough. Probably." },
    { id:"mending_salve",    name:"Mending Salve",     type:"consumable", tier:2, healFlat:18,
      flavour:"Smells terrible. Works brilliantly." },

    // ── CONSUMABLES: DAMAGE ───────────────────────────────────
    { id:"firecracker",      name:"Firecracker",       type:"consumable", tier:1, dmg:8,
      flavour:"Loud, brief, effective. A life philosophy." },
    { id:"blast_bomb",       name:"Blast Bomb",        type:"consumable", tier:2, dmg:16,
      flavour:"The pin is a courtesy. The explosion is the point." },
    { id:"demolition_charge",name:"Demolition Charge", type:"consumable", tier:3, dmg:28,
      flavour:"Overkill is underrated." },
    { id:"venom_flask",      name:"Venom Flask",       type:"consumable", tier:2, dmg:12,
      flavour:"Distilled from something that was very angry." },

    // ── CONSUMABLES: CONTROL ─────────────────────────────────
    { id:"choking_dust",     name:"Choking Dust",      type:"consumable", tier:1, control:"adjacent",
      flavour:"Works on anything that breathes. Mostly everything breathes." },
    { id:"smoke_powder",     name:"Smoke Powder",      type:"consumable", tier:2, control:"all",
      flavour:"Everyone hesitates in a room that's suddenly grey." },
    { id:"flashstone",       name:"Flashstone",        type:"consumable", tier:2, control:"adjacent",
      flavour:"One second of blindness is all you need." },

    // ── CONSUMABLES: BUFFS ────────────────────────────────────
    { id:"sharpening_stone", name:"Sharpening Stone",  type:"consumable", tier:2, atkBuff:2,
      flavour:"Ten minutes of work. One hit that counts." },
    { id:"emberstone",       name:"Emberstone",        type:"consumable", tier:3, atkBuff:4,
      flavour:"Your weapon will run hotter than usual. This is intentional." },
    { id:"swift_tonic",      name:"Swift Tonic",       type:"consumable", tier:2, speedBuff:0.20,
      flavour:"Everything else slows down. You don't." },
    { id:"iron_ration",      name:"Iron Ration",       type:"consumable", tier:1, healPct:0.15, atkBuff:1,
      flavour:"Horrible to eat. Better than starving in the dark." }
  ];

  Delve.itemDefs = {};
  defs.forEach(d => { Delve.itemDefs[d.id] = d; });

  Delve.itemsByTier = function(tier){ return defs.filter(d => d.tier === tier); };
  Delve.wardOf     = function(floor){ return Math.max(1, Math.ceil(floor / 10)); };

  // ── Tier roll ────────────────────────────────────────────────
  Delve.rollTier = function(floor){
    const L = Delve.CONFIG.loot, luck = Delve.luckPts(), ward = Delve.wardOf(floor);
    const w = {
      common:    L.weights.common(),
      uncommon:  L.weights.uncommon(luck),
      rare:      L.weights.rare(luck, ward),
      legendary: L.weights.legendary(luck, ward)
    };
    const total = w.common + w.uncommon + w.rare + w.legendary;
    const roll  = Math.random() * total;
    if(roll < w.common)                          return 1;
    if(roll < w.common + w.uncommon)             return 2;
    if(roll < w.common + w.uncommon + w.rare)    return 3;
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
    const item  = Delve.makeItem(tier);
    item.x = x; item.y = y;
    Delve.G.items.push(item);
    return true;
  };

  Delve.pickupItem = function(item){
    // Remove map position before storing
    const stored = Object.assign({}, item);
    delete stored.x; delete stored.y;
    Delve.G.inventory.push(stored);
    Delve.flash("Picked up " + item.name);
    if(Delve.logPickup) Delve.logPickup(item.name, item.tier);
    Delve.updateHUD();
  };

  // ── Effective weapon speed ───────────────────────────────────
  Delve.playerSpeed = function(){
    const G = Delve.G;
    const cfg = Delve.CONFIG;
    const sec = cfg.secondaries;
    let speed = 1.0;
    // weapon style speed
    if(G && G.equip && G.equip.weapon){
      const ws = cfg.WEAPON_SPEEDS[G.equip.weapon.style];
      if(ws) speed = ws;
      // weapon-level speed bonus
      speed += (G.equip.weapon.speed || 0) - (ws || 1.0);
    }
    // agility bonus
    speed += Delve.agiPts() * sec.speedPerAgi;
    // trinket speed bonuses
    if(G && G.equip){
      (G.equip.trinkets || []).forEach(t => { speed += t.speedBonus || 0; });
    }
    // run-buff speed
    if(G) speed += (G.speedBuff || 0);
    return Math.max(0.5, speed);
  };

  // ── Equip helpers ────────────────────────────────────────────
  Delve.itemBuffs = function(){
    const e = (Delve.G && Delve.G.equip) || { weapon:null, armour:null, trinkets:[] };
    const b = { atk:0, red:0, hp:0, luck:0, dropBonus:0, goldBonus:0, shardBonus:0, bossAtk:0, speedBonus:0, healOnKill:0 };
    if(e.weapon)  add(e.weapon, b);
    if(e.armour)  add(e.armour, b);
    (e.trinkets || []).forEach(t => add(t, b));
    return b;

    function add(it, o){
      o.atk        += it.atk        || 0;
      o.red        += it.red        || 0;
      o.hp         += it.hp         || 0;
      o.luck       += it.luck       || 0;
      o.dropBonus  += it.dropBonus  || 0;
      o.goldBonus  += it.goldBonus  || 0;
      o.shardBonus += it.shardBonus || 0;
      o.bossAtk    += it.bossAtk    || 0;
      o.speedBonus += it.speedBonus || 0;
      o.healOnKill += it.healOnKill || 0;
    }
  };

  function removeFromInv(item){
    const inv = Delve.G.inventory;
    const i   = inv.indexOf(item);
    if(i >= 0) inv.splice(i, 1);
    else {
      // also try by id in case object ref differs
      const j = inv.findIndex(x => x.id === item.id);
      if(j >= 0) inv.splice(j, 1);
    }
  }
  function clampHp(){
    Delve.G.hp = Math.min(Delve.G.hp, Delve.maxHp());
  }

  Delve.equipWeapon = function(item){
    if(Delve.G.equip.weapon) Delve.G.inventory.push(Delve.G.equip.weapon);
    Delve.G.equip.weapon = item;
    removeFromInv(item); clampHp();
    Delve.flash("Equipped " + item.name);
    if(Delve.logEquip) Delve.logEquip(item.name, "weapon");
  };
  Delve.unequipWeapon = function(){
    if(Delve.G.equip.weapon) Delve.G.inventory.push(Delve.G.equip.weapon);
    Delve.G.equip.weapon = null; clampHp();
  };
  Delve.equipArmour = function(item){
    if(Delve.G.equip.armour) Delve.G.inventory.push(Delve.G.equip.armour);
    Delve.G.equip.armour = item;
    removeFromInv(item); clampHp();
    Delve.flash("Equipped " + item.name);
    if(Delve.logEquip) Delve.logEquip(item.name, "armour");
  };
  Delve.unequipArmour = function(){
    if(Delve.G.equip.armour) Delve.G.inventory.push(Delve.G.equip.armour);
    Delve.G.equip.armour = null; clampHp();
  };
  Delve.equipTrinket = function(item){
    const t = Delve.G.equip.trinkets;
    if(t.length >= 2) Delve.G.inventory.push(t.shift());
    t.push(item);
    removeFromInv(item); clampHp();
    Delve.flash("Equipped " + item.name);
    if(Delve.logEquip) Delve.logEquip(item.name, "trinket");
  };
  Delve.unequipTrinket = function(item){
    const t = Delve.G.equip.trinkets;
    const i = t.indexOf(item);
    if(i >= 0){ t.splice(i, 1); Delve.G.inventory.push(item); }
    clampHp();
  };

  // ── Use consumables ──────────────────────────────────────────
  Delve.useConsumable = function(item){
    const G = Delve.G;

    if(item.healPct || item.healFlat){
      removeFromInv(item);
      const heal = item.healFlat
        ? item.healFlat
        : Math.round(Delve.maxHp() * item.healPct);
      G.hp = Math.min(Delve.maxHp(), G.hp + heal);
      Delve.flash(item.name + "! +" + heal + " HP");
      if(Delve.logConsumable) Delve.logConsumable(item.name, "+" + heal + " HP");
      if(Delve.logHeal)       Delve.logHeal(heal, item.name);
      Delve.enemiesTurn();

    } else if(item.dmg){
      const targets = [];
      if(G.boss && Delve.mdist(G.boss.x, G.boss.y, G.px, G.py) <= 1) targets.push(G.boss);
      G.monsters.forEach(m => {
        if(Delve.mdist(m.x, m.y, G.px, G.py) <= 1) targets.push(m);
      });
      if(!targets.length){ Delve.flash("No adjacent enemy"); Delve.updateHUD(); return; }
      targets.sort((a,b) => b.hp - a.hp);
      const t = targets[0];
      removeFromInv(item);
      t.hp -= item.dmg;
      Delve.flash(item.name + "! -" + item.dmg);
      if(Delve.logConsumable) Delve.logConsumable(item.name, "-" + item.dmg + " to target");
      if(t.hp <= 0) Delve.killMonster(t);
      Delve.enemiesTurn();

    } else if(item.control){
      removeFromInv(item);
      const all = item.control === "all";
      [G.boss].concat(G.monsters).forEach(m => {
        if(!m) return;
        if(all || Delve.mdist(m.x, m.y, G.px, G.py) <= 1) m.skipNext = true;
      });
      Delve.flash(all ? "Smoke — enemies hesitate!" : "Dust! Nearby enemies blinded");
      Delve.enemiesTurn();

    } else if(item.atkBuff){
      removeFromInv(item);
      G.atkBuff = (G.atkBuff || 0) + item.atkBuff;
      Delve.flash("+" + item.atkBuff + " ATK this run");
      Delve.enemiesTurn();

    } else if(item.speedBuff){
      removeFromInv(item);
      G.speedBuff = (G.speedBuff || 0) + item.speedBuff;
      Delve.flash("+" + item.speedBuff + " speed this run");
      Delve.enemiesTurn();
    }

    Delve.updateHUD();
  };

  // ── Stat comparison helper (used by inventory UI) ────────────
  // Returns array of { label, value, compare, delta } for an item
  Delve.itemStatLines = function(item){
    const lines = [];
    const eq    = Delve.G && Delve.G.equip;

    function cmp(field, label, format){
      const val   = item[field] || 0;
      if(!val) return;
      let delta = 0;
      if(eq){
        const current =
          (item.type === "weapon"  && eq.weapon)  ? (eq.weapon[field]  || 0) :
          (item.type === "armour"  && eq.armour)  ? (eq.armour[field]  || 0) :
          (item.type === "trinket")
            ? (eq.trinkets || []).reduce((s,t) => s + (t[field]||0), 0) : 0;
        delta = val - current;
      }
      lines.push({ label, value: format ? format(val) : val, delta });
    }

    cmp("atk",        "Attack");
    cmp("red",        "Flat DR");
    cmp("hp",         "Max HP");
    cmp("luck",       "Luck");
    cmp("dropBonus",  "Drop%",   v => "+" + Math.round(v*100) + "%");
    cmp("goldBonus",  "Gold%",   v => "+" + Math.round(v*100) + "%");
    cmp("shardBonus", "Shards");
    cmp("bossAtk",    "vs Boss");
    cmp("speedBonus", "Speed",   v => "+" + v.toFixed(2));
    cmp("healOnKill", "Leech");
    // consumable stats
    if(item.healPct)  lines.push({ label:"Heals",    value: Math.round(Delve.maxHp() * item.healPct) + " HP", delta:0 });
    if(item.healFlat) lines.push({ label:"Heals",    value: item.healFlat + " HP", delta:0 });
    if(item.dmg)      lines.push({ label:"Damage",   value: item.dmg, delta:0 });
    if(item.atkBuff)  lines.push({ label:"+ATK buff",value: item.atkBuff, delta:0 });
    if(item.speedBuff)lines.push({ label:"+Spd buff",value: item.speedBuff.toFixed(2), delta:0 });
    if(item.control)  lines.push({ label:"Control",  value: item.control === "all" ? "All enemies" : "Adjacent", delta:0 });
    if(item.style){
      const spd = Delve.CONFIG.WEAPON_SPEEDS[item.style] || 1.0;
      lines.push({ label:"Speed", value: spd.toFixed(2), delta:0 });
    }
    return lines;
  };

})();
