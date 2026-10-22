// Map projection and route helpers (Butterworth opening/ending map). No imports.
// Coastlines: Natural Earth 1:10m land (public domain), clipped with
// library/tools/coast-extract.py; smooth them with scene/draw smoothPath(…, true, 0.6).

export type LonLat = [number, number];

// Equirectangular × cos(lat0): fine for a city-sized map. pxPerDeg ≈ 3600 shows
// ~0.5° across 1920 px. Returns world px (origin at lon0/lat0, y down).
export const makeProjection = (lon0: number, lat0: number, pxPerDeg = 3600) => {
  const c = Math.cos((lat0 * Math.PI) / 180);
  return ([lon, lat]: LonLat): [number, number] => [(lon - lon0) * c * pxPerDeg, -(lat - lat0) * pxPerDeg];
};

// Map camera: world point at screen centre + zoom. Strokes and dashes inside the
// zoomed <g> must be divided by z to stay the same width on screen.
export type MapCam = { x: number; y: number; z: number };
export const mapTransform = (c: MapCam, width = 1920, height = 1080) => `translate(${width / 2},${height / 2}) scale(${c.z}) translate(${-c.x},${-c.y})`;
export const toScreen = (c: MapCam, p: [number, number], width = 1920, height = 1080) => ({
  x: width / 2 + (p[0] - c.x) * c.z,
  y: height / 2 + (p[1] - c.y) * c.z,
});

// Polyline length (× 1.04 to cover spline overshoot when drawing on with a dash).
export const pathLength = (pts: [number, number][]) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l * 1.04;
};

// Point at fraction t along a polyline: for tokens (trains, ferries, cars) moving on a route.
export const along = (pts: [number, number][], t: number): [number, number] => {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let want = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i]) {
      const u = want / seg[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
    }
    want -= seg[i];
  }
  return pts[pts.length - 1];
};
