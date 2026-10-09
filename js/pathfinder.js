window.Delve = window.Delve || {};
(function(){
  // A* pathfinder — returns array of {x,y} steps from player to (gx,gy), or null
  Delve.findPath = function(gx, gy){
    const G = Delve.G, grid = G.grid;
    const T = Delve.T;
    if(!grid || !grid.length) return null;
    const h = grid.length, w = grid[0].length;
    if(gx < 0 || gy < 0 || gx >= w || gy >= h) return null;

    const startX = G.px, startY = G.py;
    if(startX === gx && startY === gy) return [];

    // heuristic
    const man = (x,y) => Math.abs(x-gx)+Math.abs(y-gy);

    // open = min-heap by f; encode as x + y*w
    const openSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    const key = (x,y) => x + y * w;
    const sk = key(startX, startY);
    gScore.set(sk, 0);
    fScore.set(sk, man(startX, startY));
    openSet.add(sk);

    function walkable(x,y){
      if(x < 0 || y < 0 || x >= w || y >= h) return false;
      const t = grid[y][x];
      // destination may be a monster — allow it so we can walk up to attack
      if(x === gx && y === gy) return true;
      return t !== T.WALL;
    }

    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];

    while(openSet.size){
      // pick lowest fScore
      let cur = -1, best = Infinity;
      for(const k of openSet){
        const f = fScore.get(k) ?? Infinity;
        if(f < best){ best = f; cur = k; }
      }
      if(cur === -1) break;
      const cx = cur % w, cy = Math.floor(cur / w);

      if(cx === gx && cy === gy){
        // reconstruct
        const path = [];
        let c = cur;
        while(cameFrom.has(c)){
          path.unshift({ x: c % w, y: Math.floor(c / w) });
          c = cameFrom.get(c);
        }
        return path;
      }

      openSet.delete(cur);

      for(const [dx,dy] of dirs){
        const nx = cx+dx, ny = cy+dy;
        if(!walkable(nx,ny)) continue;
        const nk = key(nx,ny);
        const tent = (gScore.get(cur) ?? Infinity) + 1;
        if(tent < (gScore.get(nk) ?? Infinity)){
          cameFrom.set(nk, cur);
          gScore.set(nk, tent);
          fScore.set(nk, tent + man(nx,ny));
          openSet.add(nk);
        }
      }
    }
    return null; // no path
  };

  // Walk one step along a stored path
  Delve.stepPath = function(){
    const G = Delve.G;
    if(!G || !G._path || !G._path.length) return false;
    const next = G._path[0];
    const T = Delve.T, g = G.grid;

    // If next cell is now a monster or wall, abort
    const cell = g[next.y] && g[next.y][next.x];
    if(cell === T.WALL){
      G._path = null;
      return false;
    }

    G._path.shift();
    Delve.tryActOnStep(next.x, next.y);
    return true;
  };
})();
