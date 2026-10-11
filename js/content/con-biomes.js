window.Delve = window.Delve || {};
(function(){
 const C = Delve.CONFIG;

 // ── content/con-biomes.js : biome visuals + ward (floor-band) rules ──

 C.WARDS = [
  { id:1, name:"Upper Ruins", floors:[1,10], biome:0,
    roomMin:6, roomMax:9,
    roomWMin:4, roomWMax:9, roomHMin:4, roomHMax:9,
    roomMaxDuplicateSize:2, roomSplitArea:80, dungeonSize:26,
    bossArenaPadding:2,
    treasureChanceBase:0.14, treasureChanceLuck:0.018, treasureChanceCap:0.45,
    secretRoomChanceBase:0.20, secretRoomChanceLuck:0.04, secretRoomChanceCap:0.70 }
 ];

 C.BIOMES = [
  { name:"Upper Ruins",
    wall:"#64707c", wallEdge:"#8d99a6", wallBrick:"#3a4248", mortar:"#0b0f14",
    floor:"#2e3842", floor2:"#283039", moss:"#3f6d55",
    water:"#1e3a4a", torch:"#ffb347", light:"rgba(70,140,255,0.06)" },
  { name:"Sunken Halls",
    wall:"#13261f", wallEdge:"#2f5c4a", wallBrick:"#0c1814", mortar:"#08100c",
    floor:"#254034", floor2:"#1f3730", moss:"#4f9a67",
    water:"#1a344c", torch:"#5ad8c3", light:"rgba(64,190,150,0.07)" }
 ];
})();
