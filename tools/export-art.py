"""Validate and export generated art at the dimensions in ART_PROMPTS_V2_FULL.md."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageOps

p = argparse.ArgumentParser()
p.add_argument('source', type=Path)
p.add_argument('destination', type=Path)
p.add_argument('--kind', choices=['portrait', 'sheet', 'sprite', 'still'], required=True)
p.add_argument('--height', type=int)
a = p.parse_args()
if a.destination.exists():
    raise SystemExit(f'Refusing to overwrite {a.destination}')
im = Image.open(a.source)
if a.kind in ('portrait', 'sprite'):
    if 'A' not in im.getbands() or im.getchannel('A').getextrema()[0] != 0:
        raise SystemExit('Source does not contain genuine transparent pixels')
    im = im.convert('RGBA')
    if a.kind == 'portrait':
        scaled = ImageOps.contain(im, (800, 1000), Image.Resampling.LANCZOS)
        im = Image.new('RGBA', (800, 1000))
        im.alpha_composite(scaled, ((800-scaled.width)//2, 1000-scaled.height))
    else:
        if not a.height:
            raise SystemExit('--height is required for sprite exports')
        bounds = im.getchannel('A').getbbox()
        im = im.crop(bounds)
        im = im.resize((round(im.width*a.height/im.height), a.height), Image.Resampling.LANCZOS)
        # Resampling faint edge pixels can leave a fully transparent edge row.
        # Fit the actual alpha bounds once more so the requested subject height
        # is measured on the exported silhouette rather than its empty canvas.
        bounds = im.getchannel('A').getbbox()
        if bounds[3] - bounds[1] != a.height:
            im = im.crop(bounds)
            im = im.resize((round(im.width*a.height/im.height), a.height), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (im.width+64, a.height+64))
        canvas.alpha_composite(im, (32,32))
        im = canvas
elif a.kind == 'still':
    im = ImageOps.fit(im.convert('RGB'), (1920,1080), Image.Resampling.LANCZOS)
a.destination.parent.mkdir(parents=True, exist_ok=True)
im.save(a.destination, **({'quality':95, 'subsampling':0} if a.destination.suffix.lower() in ('.jpg','.jpeg') else {}))
check = Image.open(a.destination)
result = {'file':str(a.destination), 'size':check.size, 'mode':check.mode}
if 'A' in check.getbands():
    result['alpha_extrema'] = check.getchannel('A').getextrema()
    result['subject_bounds'] = check.getchannel('A').getbbox()
print(json.dumps(result))
