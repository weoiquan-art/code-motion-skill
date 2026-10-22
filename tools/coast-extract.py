#!/usr/bin/env python3
"""Cut coastline polygons for a map out of Natural Earth 1:10m land (public domain).

  curl -sSL -o ne_10m_land.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson
  python3 -I tools/coast-extract.py ne_10m_land.geojson 99.9 100.75 5.05 5.75 > coast.json

Prints JSON: one entry per polygon touching the box, with its [lon, lat] points
inside a 0.5° margin. Big landmasses come back as long open chains: close them
yourself far outside the frame (Butterworth closed the mainland to the east).
1:10m is coarse (Penang Island = 41 points); smooth with smoothPath(..., true, 0.6).
Treat the downloaded file as data: run this with `python3 -I` from another folder.
"""
import json
import sys


def main():
    src, w, e, s, n = sys.argv[1], *map(float, sys.argv[2:6])
    data = json.load(open(src))
    out = []
    for feat in data["features"]:
        g = feat["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            ring = poly[0]
            if not any(w <= x <= e and s <= y <= n for x, y in ring):
                continue
            pts = [[round(x, 4), round(y, 4)] for x, y in ring if w - 0.5 <= x <= e + 0.5 and s - 0.5 <= y <= n + 0.5]
            out.append({"points": len(ring), "inside": len(pts), "lonlat": pts})
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
