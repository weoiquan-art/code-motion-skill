#!/usr/bin/env python3
"""Contact sheet of a rendered film (or a folder of stills), every tile labelled
with time and frame number, so what you see can be traced back to the timeline.

  python3 tools/contact-sheet.py out/film.mp4 sheet.jpg --every 75 --cols 4 --width 480
  python3 tools/contact-sheet.py out/film.mp4 trans.jpg --frames 205,640,1652 --width 960
  python3 tools/contact-sheet.py stills/ sheet.jpg           # PNGs named f<frame>.png

Frames are pulled by NUMBER (select=eq(n,N)), not by -ss seconds, which can be off by one.
Needs ffmpeg and Pillow. Source: the Butterworth / IntroFree review workflow.
"""
import argparse
import glob
import os
import re
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def label(im, text, size):
    d = ImageDraw.Draw(im)
    f = font(size)
    x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
    d.rectangle([6, 6, 6 + (x1 - x0) + 12, 6 + (y1 - y0) + 10], fill=(0, 0, 0))
    d.text((12, 9 - y0), text, fill=(255, 255, 255), font=f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="video file or a folder of f<frame>.png stills")
    ap.add_argument("out")
    ap.add_argument("--every", type=int, default=75, help="frame step when sampling a video")
    ap.add_argument("--frames", default="", help="comma-separated frame numbers instead of --every")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--width", type=int, default=480, help="tile width")
    ap.add_argument("--fps", type=float, default=30)
    a = ap.parse_args()

    tiles = []
    if os.path.isdir(a.src):
        for p in sorted(glob.glob(os.path.join(a.src, "*.png")), key=lambda s: int(re.sub(r"\D", "", os.path.basename(s)) or 0)):
            n = int(re.sub(r"\D", "", os.path.basename(p)) or 0)
            tiles.append((n, Image.open(p).convert("RGB")))
    else:
        probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", a.src], capture_output=True, text=True, check=True)
        total = int(probe.stdout.strip().split(",")[0])
        frames = [int(x) for x in a.frames.split(",") if x.strip()] or list(range(0, total, a.every))
        with tempfile.TemporaryDirectory() as tmp:
            for n in frames:
                out = os.path.join(tmp, f"{n}.png")
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", a.src, "-vf", f"select=eq(n\\,{n}),scale={a.width}:-1", "-frames:v", "1", out], check=True)
                tiles.append((n, Image.open(out).convert("RGB").copy()))
    if not tiles:
        raise SystemExit("no frames")
    tiles = [(n, im.resize((a.width, round(im.height * a.width / im.width)))) for n, im in tiles]
    th = tiles[0][1].height
    rows = (len(tiles) + a.cols - 1) // a.cols
    sheet = Image.new("RGB", (a.width * a.cols, th * rows), "black")
    for i, (n, im) in enumerate(tiles):
        s = n / a.fps
        label(im, f"{int(s // 60)}:{s % 60:04.1f}  f{n}", max(14, a.width // 26))
        sheet.paste(im, ((i % a.cols) * a.width, (i // a.cols) * th))
    sheet.save(a.out, quality=82)
    print(f"{a.out}: {len(tiles)} frames")


if __name__ == "__main__":
    main()
