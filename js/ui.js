window.Delve = window.Delve || {};
(function(){

  // ── HUD update ────────────────────────────────────────────────
  Delve.updateHUD = function(){
    const G=Delve.G; if(!G) return;
    document.getElementById("hudHp").textContent    = G.hp+"/"+Delve.maxHp();
    document.getElementById("hudAtk").textContent   = Delve.atk();
    document.getElementById("hudTou").textContent   = Math.round(Delve.dmgRed()*100)+"%";
    document.getElementById("hudAgi").textContent   = Math.round(Delve.dodge()*100)+"%";
    document.getElementById("hudLuc").textContent   = Delve.luckPts();
    document.getElementById("hudFloor").textContent = G.floor;
    document.getElementById("hudGold").textContent  = G.gold;
    document.getElementById("hudShards").textContent= Delve.save.shards;
    // Rest dots
    const rd=document.getElementById("restDots");
    if(rd){
      const max=Delve.CONFIG.restPerFloor, used=G.restCount||0;
      rd.innerHTML="";
      for(let i=0;i<max;i++){
        const d=document.createElement("span");
        d.className="rest-dot"+(i<used?" used":"");
        rd.appendChild(d);
      }
    }
  };

  // ── ITEM STAT CARD ────────────────────────────────────────────
  let pendingItemAction = null; // { item, source:'floor'|'inventory' }

  Delve.showItemCard = function(item, source){
    pendingItemAction = { item, source };
    const overlay = document.getElementById("itemCardOverlay");
    const tierCol = (Delve.TIERS.colors[item.tier])||"#cfd8e0";
    const tierName= (Delve.TIERS.names[item.tier])||"";

    document.getElementById("icName").textContent  = item.name;
    document.getElementById("icName").style.color  = tierCol;
    document.getElementById("icTier").textContent  = tierName;
    document.getElementById("icTier").style.color  = tierCol;
    document.getElementById("icFlavour").textContent = item.flavour||"";

    // Stat lines
    const body = document.getElementById("icStats");
    body.innerHTML = "";
    const lines = Delve.itemStatLines(item);
    lines.forEach(function(l){
      const row = document.createElement("div");
      row.className = "ic-stat-row";
      const lbl = document.createElement("span");
      lbl.className = "ic-stat-label";
      lbl.textContent = l.label;
      const val = document.createElement("span");
      val.className = "ic-stat-value";
      val.textContent = l.value;
      if(l.delta > 0){ val.textContent += " ▲"+l.delta; val.style.color="#7ee08a"; }
      else if(l.delta < 0){ val.textContent += " ▼"+Math.abs(l.delta); val.style.color="#ff9a9a"; }
      row.appendChild(lbl); row.appendChild(val);
      body.appendChild(row);
    });

    // Buttons
    const primary   = document.getElementById("icPrimaryBtn");
    const secondary = document.getElementById("icSecondaryBtn");

    if(source === "floor"){
      const full = (Delve.G.inventory.length >= Delve.CONFIG.inventorySlots);
      primary.textContent = full ? "No Room" : "Pick Up";
      primary.disabled    = full;
      secondary.textContent = "Leave";
      secondary.onclick   = function(){ closeItemCard(); };
      primary.onclick     = function(){
        if(full) return;
        const it = Object.assign({}, pendingItemAction.item);
        const x=it.x, y=it.y; delete it.x; delete it.y;
        Delve.G.items = Delve.G.items.filter(i=>!(i.x===x&&i.y===y));
        if(Delve.G.grid[y]) Delve.G.grid[y][x]=Delve.T.FLOOR;
        Delve.G.inventory.push(it);
        if(Delve.logPickup) Delve.logPickup(it.name, it.tier);
        Delve.flash("Picked up "+it.name);
        Delve.updateHUD(); Delve.draw();
        closeItemCard();
      };
    } else {
      // inventory source
      if(item.type==="weapon"||item.type==="armour"||item.type==="trinket"){
        primary.textContent = "Equip";
        primary.disabled    = false;
        primary.onclick     = function(){
          if(item.type==="weapon")  Delve.equipWeapon(item);
          else if(item.type==="armour")  Delve.equipArmour(item);
          else if(item.type==="trinket") Delve.equipTrinket(item);
          Delve.updateHUD(); Delve.draw(); closeItemCard();
          openInventory();
        };
      } else {
        primary.textContent = "Use";
        primary.disabled    = false;
        primary.onclick     = function(){
          Delve.useConsumable(item);
          Delve.updateHUD(); Delve.draw(); closeItemCard();
        };
      }
      secondary.textContent = "Discard";
      secondary.onclick     = function(){
        Delve.G.inventory = Delve.G.inventory.filter(i=>i!==item&&i.id!==item.id);
        Delve.flash("Discarded "+item.name);
        Delve.updateHUD(); Delve.draw(); closeItemCard();
        openInventory();
      };
    }

    overlay.style.display = "flex";
  };

  function closeItemCard(){
    document.getElementById("itemCardOverlay").style.display = "none";
  }
  document.getElementById("icCloseBtn").addEventListener("click", closeItemCard);

  // ── INVENTORY SCREEN ─────────────────────────────────────────
  function openInventory(){
    const G=Delve.G; if(!G) return;
    const screen=document.getElementById("inventoryScreen");

    // ── Character silhouette with slots
    const slotIds=["slot-weapon","slot-armour","slot-trinket1","slot-trinket2"];
    const eq=G.equip||{weapon:null,armour:null,trinkets:[]};

    function fillSlot(id, item){
      const el=document.getElementById(id);
      if(!el) return;
      if(item){
        const col=(Delve.TIERS.colors[item.tier])||"#cfd8e0";
        el.innerHTML="<span style='color:"+col+";font-size:11px;font-weight:800;'>"+item.name+"</span>";
        el.classList.add("filled");
        el.onclick=function(){ Delve.showItemCard(item,"inventory"); };
      } else {
        el.innerHTML="<span style='color:#3a4d5c;'>empty</span>";
        el.classList.remove("filled");
        el.onclick=null;
      }
    }
    fillSlot("slot-weapon",  eq.weapon);
    fillSlot("slot-armour",  eq.armour);
    fillSlot("slot-trinket1",(eq.trinkets||[])[0]||null);
    fillSlot("slot-trinket2",(eq.trinkets||[])[1]||null);

    // ── Carried items grid
    const grid=document.getElementById("invCarriedGrid");
    grid.innerHTML="";
    if(!(G.inventory||[]).length){
      const empty=document.createElement("div");
      empty.style.cssText="color:#3a4d5c;font-size:13px;padding:8px;";
      empty.textContent="Nothing carried.";
      grid.appendChild(empty);
    }
    (G.inventory||[]).forEach(function(it){
      const col=(Delve.TIERS.colors[it.tier])||"#cfd8e0";
      const btn=document.createElement("button");
      btn.className="inv-item-btn";
      btn.style.borderColor=col+"66";
      btn.innerHTML="<span style='color:"+col+";font-weight:800;'>"+it.name+"</span>"+
        "<span style='font-size:10px;color:#7f94a8;'>"+((Delve.TIERS.names[it.tier])||"")+"</span>";
      btn.addEventListener("click",function(){ Delve.showItemCard(it,"inventory"); });
      grid.appendChild(btn);
    });

    screen.style.display="flex";
  }

  function closeInventory(){
    document.getElementById("inventoryScreen").style.display="none";
  }
  document.getElementById("invBtn").addEventListener("click", openInventory);
  document.getElementById("invCloseBtn2").addEventListener("click", closeInventory);

  // ── LOG WINDOW ───────────────────────────────────────────────
  const logExpandBtn = document.getElementById("logExpandBtn");
  const logWindow    = document.getElementById("logWindow");
  const logWindowContent = document.getElementById("logWindowContent");
  const logWindowClose   = document.getElementById("logWindowClose");

  if(logExpandBtn) logExpandBtn.addEventListener("click",function(){
    // Clone current log entries into window
    const src=document.getElementById("combatLog");
    if(src) logWindowContent.innerHTML=src.innerHTML;
    logWindow.style.display="flex";
    setTimeout(function(){ logWindowContent.scrollTop=logWindowContent.scrollHeight; },50);
  });
  if(logWindowClose) logWindowClose.addEventListener("click",function(){
    logWindow.style.display="none";
  });

  // ── STAIRS CONFIRM ───────────────────────────────────────────
  Delve.showStairsPrompt = function(){
    document.getElementById("stairsPrompt").style.display="flex";
  };
  document.getElementById("stairsYes").addEventListener("click",function(){
    document.getElementById("stairsPrompt").style.display="none";
    Delve.descend();
  });
  document.getElementById("stairsNo").addEventListener("click",function(){
    document.getElementById("stairsPrompt").style.display="none";
  });

  // ── FLOOR TITLE CARD ─────────────────────────────────────────
  Delve.showFloorCard = function(floor){
    const G=Delve.G;
    const ward=Delve.getWard(floor);
    const card=document.getElementById("floorCard");
    document.getElementById("floorCardNum").textContent="Floor "+floor;
    document.getElementById("floorCardName").textContent=ward.name||"The Undercroft";
    card.style.display="flex";
    card.style.opacity="1";
    // Fade out after 1.5s
    setTimeout(function(){
      card.style.transition="opacity 0.6s";
      card.style.opacity="0";
      setTimeout(function(){
        card.style.display="none";
        card.style.transition="";
        card.style.opacity="1";
      },650);
    },1500);
  };

  // ── BOSS INTRO ───────────────────────────────────────────────
  Delve.showBossIntro = function(floor){
    const cfg=Delve.CONFIG;
    const ward=Math.ceil(floor/10);
    const bossDef=cfg.BOSS_DEFS[ward]||cfg.BOSS_DEFS[1];
    document.getElementById("bossIntroName").textContent   = bossDef.name||"The Warden";
    document.getElementById("bossIntroTitle").textContent  = bossDef.title||"";
    document.getElementById("bossIntroFlavour").textContent= bossDef.flavour||"";
    const overlay=document.getElementById("bossIntroOverlay");
    overlay.style.display="flex";
    overlay.style.opacity="1";
    setTimeout(function(){
      overlay.style.transition="opacity 0.8s";
      overlay.style.opacity="0";
      setTimeout(function(){
        overlay.style.display="none";
        overlay.style.transition="";
        overlay.style.opacity="1";
      },900);
    },3000);
  };

  // ── HUB ──────────────────────────────────────────────────────
  Delve.refreshHub = function(){
    document.getElementById("hubShards").textContent=Delve.save.shards;
    const shop=document.getElementById("shop"); shop.innerHTML="";
    Delve.CONFIG.ATTR_ORDER.forEach(function(id){
      const a=Delve.CONFIG.ATTRS[id];
      if(a.kind==="dormant") return;
      const lvl=Delve.save.lvls[id]||0;
      const cost=Delve.attrCost(id);
      const capped=(a.kind==="pct"&&a.cap&&Delve.dmgRed()>=a.cap);
      const row=document.createElement("div"); row.className="upgrade";
      const info=document.createElement("div");
      const name=document.createElement("div"); name.className="name";
      name.textContent=a.name;
      const lv=document.createElement("span"); lv.className="lvl"; lv.textContent=" Lv "+lvl;
      name.appendChild(lv);
      const desc=document.createElement("div"); desc.className="desc"; desc.textContent=a.desc;
      info.appendChild(name); info.appendChild(desc);
      const btn=document.createElement("button"); btn.className="btn";
      btn.textContent=capped?"MAX":String(cost);
      btn.disabled=capped||Delve.save.shards<cost;
      btn.addEventListener("click",function(){
        const c=Delve.attrCost(id);
        if(Delve.save.shards<c) return;
        Delve.save.shards-=c; Delve.save.lvls[id]++;
        Delve.persist(); Delve.refreshHub();
      });
      row.appendChild(info); row.appendChild(btn);
      shop.appendChild(row);
    });
  };

  Delve.showHub=function(){
    document.getElementById("hubScreen").style.display="flex";
    document.getElementById("hud").style.display="none";
    document.getElementById("inventoryScreen").style.display="none";
    document.getElementById("logWindow").style.display="none";
    document.getElementById("levelupScreen").style.display="none";
    Delve.refreshHub();
  };
  Delve.hideHub=function(){
    document.getElementById("hubScreen").style.display="none";
    document.getElementById("hud").style.display="flex";
    document.getElementById("levelupScreen").style.display="none";
  };

  document.getElementById("startBtn").addEventListener("click",function(){
    Delve.hideHub(); Delve.newRun(); Delve.resize(); Delve.draw();
  });
  document.getElementById("deathBtn").addEventListener("click",function(){
    document.getElementById("deathScreen").style.display="none";
    Delve.showHub();
  });
})();
