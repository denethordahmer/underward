window.Delve = window.Delve || {};
(function(){

  function tierCol(it){ return Delve.TIERS.colors[it.tier] || "#cfd8e0"; }

  function mkChip(label, color, onclick, cls){
    const b = document.createElement("button");
    b.className = cls || "invChip";
    b.textContent = label;
    b.style.borderColor = color + "88";
    b.style.color = color;
    b.addEventListener("click", onclick);
    return b;
  }

  // ── Inventory drawer open/close ────────────────────────────
  const drawer   = document.getElementById("invDrawer");
  const invBtn   = document.getElementById("invBtn");
  const closeBtn = document.getElementById("invCloseBtn");

  invBtn.addEventListener("click", function(e){
    e.stopPropagation();
    drawer.classList.toggle("open");
    if(drawer.classList.contains("open")) buildDrawer();
  });
  closeBtn.addEventListener("click", function(e){
    e.stopPropagation();
    drawer.classList.remove("open");
  });

  function buildDrawer(){
    const G = Delve.G;
    if(!G) return;

    // Equipped
    const equBar = document.getElementById("equippedBar");
    equBar.innerHTML = "";
    const e = G.equip || {weapon:null, armour:null, trinkets:[]};
    if(e.weapon) equBar.appendChild(mkChip("⚔ "+e.weapon.name, tierCol(e.weapon), function(){
      Delve.unequipWeapon(); Delve.updateHUD(); buildDrawer();
    }));
    if(e.armour) equBar.appendChild(mkChip("🛡 "+e.armour.name, tierCol(e.armour), function(){
      Delve.unequipArmour(); Delve.updateHUD(); buildDrawer();
    }));
    (e.trinkets||[]).forEach(function(t){
      equBar.appendChild(mkChip("◆ "+t.name, tierCol(t), function(){
        Delve.unequipTrinket(t); Delve.updateHUD(); buildDrawer();
      }));
    });
    if(!equBar.children.length){
      const none = document.createElement("span");
      none.style.cssText = "font-size:12px;color:#7f94a8;";
      none.textContent = "Nothing equipped";
      equBar.appendChild(none);
    }

    // Abilities
    const aBar = document.getElementById("abilityBar");
    aBar.innerHTML = "";
    (G.abilities || []).forEach(function(a){
      aBar.appendChild(mkChip("✦ "+a.name+" ("+a.cost+")", "#c98aff", function(){
        G.targetingAbility = G.targetingAbility ? null : a;
        Delve.flash(G.targetingAbility ? "Choose target for "+a.name : "Cancelled");
        drawer.classList.remove("open");
      }));
    });
    if(!aBar.children.length){
      const none = document.createElement("span");
      none.style.cssText = "font-size:12px;color:#7f94a8;";
      none.textContent = "No abilities yet";
      aBar.appendChild(none);
    }

    // Carried items
    const grid = document.getElementById("invGrid");
    grid.innerHTML = "";
    if(!(G.inventory||[]).length){
      const none = document.createElement("span");
      none.style.cssText = "font-size:12px;color:#7f94a8;";
      none.textContent = "Bag is empty";
      grid.appendChild(none);
    }
    (G.inventory||[]).forEach(function(it){
      const prefix = it.type === "weapon" ? "⚔ " : it.type === "armour" ? "🛡 " :
                     it.type === "trinket" ? "◆ " : "🧪 ";
      grid.appendChild(mkChip(prefix+it.name, tierCol(it), function(){
        if(it.type === "weapon") Delve.equipWeapon(it);
        else if(it.type === "armour") Delve.equipArmour(it);
        else if(it.type === "trinket") Delve.equipTrinket(it);
        else Delve.useConsumable(it);
        Delve.updateHUD(); Delve.draw(); buildDrawer();
      }));
    });
  }

  // ── HUD update ─────────────────────────────────────────────
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

    // Refresh drawer if open
    if(drawer.classList.contains("open")) buildDrawer();
  };

  // ── Hub ────────────────────────────────────────────────────
  Delve.refreshHub = function(){
    document.getElementById("hubShards").textContent = Delve.save.shards;
    const shop = document.getElementById("shop");
    shop.innerHTML = "";

    Delve.CONFIG.ATTR_ORDER.forEach(function(id){
      const a = Delve.CONFIG.ATTRS[id];
      if(a.kind === "dormant") return;

      const lvl = Delve.save.lvls[id] || 0;
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
    drawer.classList.remove("open");
    document.getElementById("levelupScreen").style.display = "none";
    Delve.refreshHub();
  };
  Delve.hideHub = function(){
    document.getElementById("hubScreen").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    document.getElementById("levelupScreen").style.display = "none";
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
