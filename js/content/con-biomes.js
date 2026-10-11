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
    secretRoomChanceBase:0.20, secretRoomChanceLuck:0.04, secretRoomChanceCap:0.70 },

  { id:2, name:"The Blackvein", floors:[11,20], biome:1,
    roomMin:6, roomMax:10,
    roomWMin:4, roomWMax:10, roomHMin:4, roomHMax:10,
    roomMaxDuplicateSize:2, roomSplitArea:85, dungeonSize:28,
    bossArenaPadding:2,
    treasureChanceBase:0.10, treasureChanceLuck:0.018, treasureChanceCap:0.35,
    secretRoomChanceBase:0.20, secretRoomChanceLuck:0.04, secretRoomChanceCap:0.70 }
 ];

 C.BIOMES = [
  { name:"Upper Ruins",
    wall:"#64707c", wallEdge:"#8d99a6", wallBrick:"#3a4248", mortar:"#0b0f14",
    floor:"#2e3842", floor2:"#283039", moss:"#3f6d55",
    water:"#1e3a4a", torch:"#ffb347", light:"rgba(70,140,255,0.06)" },
  { name:"The Blackvein",
    wall:"#2a3524", wallEdge:"#4d5c3e", wallBrick:"#141c10", mortar:"#080c06",
    floor:"#2c3524", floor2:"#242c1e", moss:"#7a9a3a",
    water:"#3a2048", torch:"#c8d84a", light:"rgba(120,180,60,0.06)" }
 ];
})();
