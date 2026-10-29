"""Check the delivered source-art dimensions, alpha, and runtime manifests."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
rows, errors = [], []
def check(path, size=None, transparent=False, height=None):
    path = ROOT / path
    if not path.is_file():
        errors.append(f'Missing: {path.relative_to(ROOT)}')
        return
    with Image.open(path) as im:
        im.load()
        row = {'path':path.relative_to(ROOT).as_posix(), 'size':list(im.size), 'mode':im.mode}
        if size and im.size != size:
            errors.append(f'{row["path"]}: size {im.size}, expected {size}')
        if transparent:
            if im.mode != 'RGBA':
                errors.append(f'{row["path"]}: expected RGBA')
            else:
                alpha = im.getchannel('A')
                row['alpha_extrema'] = list(alpha.getextrema())
                row['subject_bounds'] = list(alpha.getbbox())
                if alpha.getextrema() != (0,255):
                    errors.append(f'{row["path"]}: expected transparent and opaque pixels')
                if height and row['subject_bounds'][3]-row['subject_bounds'][1] != height:
                    errors.append(f'{row["path"]}: silhouette height differs from {height}')
        rows.append(row)

for name in ['pakin','daow','mom','duty_teacher','teacher_ratree']:
    check(f'concept/{name}_sheet.png')
portraits = {
    'pakin':['neutral','scared','sad','eerie'],
    'daow':['neutral','sad','happy','eerie'],
    'mom':['neutral','sad'], 'teacher':['neutral','eerie'], 'ratree':['neutral','happy'],
}
expected_portraits = {f'{name}_{expression}' for name, expressions in portraits.items() for expression in expressions}
for name in sorted(expected_portraits):
    check(f'assets/portraits/{name}.png', (800,1000), transparent=True)
rooms = {'road':3,'sala':2,'sala_morning':2,'street':2,'living':2,'hall2':2,'mom_room':2,'daow_room':2,
         'school_gate':2,'hall1':3,'p3':2,'hall2s':3,'library':2,'nurse':2,'archive':2,'bridge':2,
         'control':1,'pa_room':2,'flashback':1,'city':1,'school_dawn':2}
expected_bg = {f'{room}_{i}.jpg' for room,count in rooms.items() for i in range(1,count+1)}
for name in sorted(expected_bg):
    check(f'assets/bg/{name}', (1920,1080))
for name,height in {'pakin':400,'daow':270,'teacher':540,'nameless':620}.items():
    check(f'assets/sprites/{name}/full.png', transparent=True, height=height)
for name in ['title','end_a','end_b','end_c']:
    check(f'assets/art/{name}.jpg', (1920,1080))
for relative, expected in [('assets/portraits/manifest.json',expected_portraits),('assets/bg/manifest.json',expected_bg)]:
    actual = json.loads((ROOT/relative).read_text(encoding='utf-8-sig'))
    if set(actual) != expected or len(actual) != len(expected):
        errors.append(f'{relative}: missing, duplicate or unexpected entries')
report = {
    'scope':'File existence, dimensions, decoding, alpha bounds, and manifest membership only; not visual acceptance or animation approval.',
    'counts':{'sheets':5,'portraits':14,'background_panels':42,'sprite_sources':4,'key_art':4},
    'checked_files':len(rows),'errors':errors,'files':rows,
    'remaining':['Manual puppet layers with redrawn concealed joints and common canvas origin',
                 '45/90 degree elbow and knee animation tests',
                 'Complete room-by-room visual placement and interaction alignment review'],
}
out = ROOT/'concept/qa/art_validation.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'checked_files':len(rows),'errors':errors,'report':str(out)}))
raise SystemExit(bool(errors))
