window.Delve = window.Delve || {};
(function(){

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
  };

  Delve.refreshHub = function(){
    document.getElementById("hubShards").textContent = Delve.save.shards;
    const shop = document.getElementById("shop");
    shop.innerHTML = "";

    Delve.CONFIG.ATTR_ORDER.forEach(function(id){
      const a = Delve.CONFIG.ATTRS[id];
      if(a.kind === "dormant") return; // Energy: skills not built yet

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
