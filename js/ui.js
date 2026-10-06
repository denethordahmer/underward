window.Delve = window.Delve || {};
(function(){

  function mkChip(label, color, onclick){
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "background:#141b23;border:1px solid "+color+"66;border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;color:"+color+";font-family:inherit;white-space:nowrap;";
    b.addEventListener("click", onclick);
    return b;
  }

  Delve.updateHUD = function(){
    const G = Delve.G;
    if(!G) return;
    document.getElementById("hudHp").textContent    = G.hp + "/" + Delve.maxHp();
    document.getElementById("hudAtk").textContent   = Delve.atk();
    document.getElementById("hudTou").textContent   = Math.round(Delve.dmgRed()*100) + "%";
    document.getElementById("hudAgi").textContent   = Math.round(Delve.dodge()*100) + "%";
    document.getElementById("hudLuc").textContent   = Delve.luckPts();
    document.getElementById("hudFloor").textContent = G.floor;
    document.getElementById("hudGold").textContent  = G.gold;
    document.getElementById("hudShards").textContent = Delve.save.shards;

    // ---- inventory + equip bar (tap to equip / use / unequip) ----
    const bar = document.getElementById("invBar");
    bar.innerHTML = "";
    const e = G.equip || {weapon:null, armour:null, trinkets:[]};

    const tierCol = it => Delve.TIERS.colors[it.tier] || "#cfd8e0";

    if(e.weapon){
      const c = tierCol(e.weapon);
      bar.appendChild(mkChip("⚔ "+e.weapon.name, c, function(){ Delve.unequipWeapon(); Delve.updateHUD(); }));
    }
    if(e.armour){
      const c = tierCol(e.armour);
      bar.appendChild(mkChip("🛡 "+e.armour.name, c, function(){ Delve.unequipArmour(); Delve.updateHUD(); }));
    }
    (e.trinkets||[]).forEach(function(t){
      const c = tierCol(t);
      bar.appendChild(mkChip("◆ "+t.name, c, function(){ Delve.unequipTrinket(t); Delve.updateHUD(); }));
    });

    (G.inventory||[]).forEach(function(it){
      const c = tierCol(it);
      bar.appendChild(mkChip(it.name, c, function(){
        if(it.type === "weapon") Delve.equipWeapon(it);
        else if(it.type === "armour") Delve.equipArmour(it);
        else if(it.type === "trinket") Delve.equipTrinket(it);
        else Delve.useConsumable(it);
        Delve.updateHUD();
        Delve.draw();
      }));
    });
  };

  Delve.refreshHub = function(){
    document.getElementById("hubShards").textContent = Delve.save.shards;
    const shop = document.getElementById("shop");
    shop.innerHTML = "";

    Delve.CONFIG.ATTR_ORDER.forEach(function(id){
      const a = Delve.CONFIG.ATTRS[id];
      if(a.kind === "dormant") return;

      const lvl  = Delve.save.lvls[id] || 0;
      const cost = Delve.attrCost(id);
      const capped = (a.kind === "pct" && a.cap && Delve.dmgRed() >= a.cap);

      const row = document.createElement("div");
      row.className = "upgrade";

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = a.name;
      const lv = document.createElement("span");
      lv.className = "lvl";
      lv.textContent = " Lv " + lvl;
      name.appendChild(lv);
      const desc = document.createElement("div");
      desc.className = "desc";
      desc.textContent = a.desc;
      info.appendChild(name);
      info.appendChild(desc);

      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = capped ? "MAX" : String(cost);
      btn.disabled = capped || Delve.save.shards < cost;
      btn.addEventListener("click", function(){
        const c = Delve.attrCost(id);
        if(Delve.save.shards < c) return;
        Delve.save.shards -= c;
        Delve.save.lvls[id]++;
        Delve.persist();
        Delve.refreshHub();
      });

      row.appendChild(info);
      row.appendChild(btn);
      shop.appendChild(row);
    });
  };

  Delve.showHub = function(){
    document.getElementById("hubScreen").style.display = "flex";
    document.getElementById("hud").style.display = "none";
    document.getElementById("hint").style.display = "none";
    Delve.refreshHub();
  };
  Delve.hideHub = function(){
    document.getElementById("hubScreen").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    document.getElementById("hint").style.display = "block";
  };

  document.getElementById("startBtn").addEventListener("click", function(){
    Delve.hideHub();
    Delve.newRun();
    Delve.resize();
    Delve.draw();
  });
  document.getElementById("deathBtn").addEventListener("click", function(){
    document.getElementById("deathScreen").style.display = "none";
    Delve.showHub();
  });
})();
