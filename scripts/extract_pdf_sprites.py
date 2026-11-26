"""Extract the supplied volleyball PDF's front/back sprite grid to transparent atlases.
Usage: python scripts/extract_pdf_sprites.py Sprites_Voleibol.pdf src/assets
Requires pypdf and Pillow. The generated atlases are already included in the project.
"""
from collections import deque
from pathlib import Path
import colorsys
import io
import sys
from PIL import Image
from pypdf import PdfReader

source, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
image = Image.open(io.BytesIO(PdfReader(str(source)).pages[7].images[0].data)).convert('RGBA')
# Front/back rows: reception, approach, set, block, serve, dive.
row_tops = [140, 216, 333, 408, 525, 600, 718, 793, 911, 983, 1103, 1173]

def cell(row, column):
    x = round(279 + column * 80.5) + 3
    y = row_tops[row] + 2
    result = image.crop((x, y, x + 72, y + 64)).convert('RGBA')
    pixels = result.load()
    width, height = result.size
    seen = set()
    queue = deque()
    def background(x, y):
        r, g, b, _ = pixels[x, y]
        return min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 35
    for x in range(width):
        for y in (0, height - 1):
            if background(x, y):
                seen.add((x, y)); queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if background(x, y) and (x, y) not in seen:
                seen.add((x, y)); queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and background(nx, ny):
                seen.add((nx, ny)); queue.append((nx, ny))
    for x, y in seen:
        pixels[x, y] = (0, 0, 0, 0)
    return result

def recolor(sprite, hue):
    pixels = sprite.load()
    for y in range(sprite.height):
        for x in range(sprite.width):
            r, g, b, a = pixels[x, y]
            # Shift blue cloth while preserving skin, white shoes and dark outlines.
            if a and b > r + 7 and b > g + 3 and b > 30 and r < 130 and b < 180:
                _, saturation, value = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                nr, ng, nb = colorsys.hsv_to_rgb(hue, max(.5, saturation), min(1, value*1.55+.03))
                pixels[x, y] = (round(nr*255), round(ng*255), round(nb*255), a)
    return sprite

for name, hue in [('volley-original', None), ('volley-rival', .015), ('volley-libero', .14)]:
    atlas = Image.new('RGBA', (960, 960), (0,0,0,0))
    for row in range(12):
        for column in range(12):
            sprite = cell(row, column)
            if hue is not None:
                sprite = recolor(sprite, hue)
            atlas.paste(sprite, (column*80+4, row*80+8), sprite)
    atlas.save(output / (name + '.png'), optimize=True)
