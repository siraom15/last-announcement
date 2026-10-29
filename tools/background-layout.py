"""Prepare geometry guides and slice continuous, world-sized background masters."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('name')
p.add_argument('world_width', type=int)
p.add_argument('--source', type=Path)
p.add_argument('--floor-y', type=int, help='Measured top of floor in source pixels')
p.add_argument('--align-floor', type=float, help='Measured source wall/floor fraction; resize the two regions to 799/281 pixels')
p.add_argument('--replace', action='store_true', help='Replace exports created by this task after QA correction')
a = p.parse_args()
w = a.world_width * 2
h = max(1080, math.ceil(w/3))
crop_top = (h-1080)//2
floor = 799+crop_top
out = Path('concept/backgrounds')
out.mkdir(parents=True, exist_ok=True)
if not a.source:
    im = Image.new('RGB', (w,h), '#b8bcb9')
    d = ImageDraw.Draw(im)
    d.rectangle((0,floor,w,h), fill='#555b5d')
    if a.name == 'road':
        d.rectangle((1240,floor-140,1400,floor-8),fill='#4d5950')
        d.rectangle((2160,floor-280,2360,floor-130),fill='#776a55')
        d.rectangle((2200,floor-130,2210,floor-4),fill='#776a55')
        d.rectangle((2310,floor-130,2320,floor-4),fill='#776a55')
    objects = {
        'sala': [(260,680,650),(420,540,300),(800,1000,360),(1000,1260,400),(1445,1475,700),(1580,1730,300)],
        'street': [(160,720,760),(440,530,470),(1100,1450,360)],
        'living': [(130,190,640),(470,600,490),(560,820,240),(860,1020,200),(1080,1300,680)],
        'hall2': [(40,300,680),(490,550,640),(790,850,640),(960,1060,490)],
        'mom_room': [(90,150,640),(230,350,590),(470,550,410),(600,700,430),(740,940,240)],
        'daow_room': [(90,150,640),(560,790,210),(830,960,240)],
        'school_gate': [(160,1500,720),(1100,1350,420)],
        'hall1': [(130,210,640),(300,420,480),(570,630,640),(760,950,450),(990,1200,590),(1230,1350,480),(1420,1480,640),(1640,1760,480),(1880,2140,680)],
        'p3': [(90,150,640),(480,1000,530),(1080,1270,240),(1290,1460,450)],
        'hall2s': [(40,300,680),(570,630,640),(780,890,480),(970,1030,640),(1180,1390,590),(1420,1530,480),(1620,1680,640),(1900,2010,450),(2140,2250,480)],
        'library': [(90,150,640),(230,450,650),(480,700,650),(920,1180,240),(1250,1350,450),(1380,1470,600)],
        'nurse': [(90,150,640),(220,450,240),(590,820,240),(900,1020,550)],
        'archive': [(90,150,640),(240,640,600),(780,980,240),(1030,1140,590)],
        'bridge': [(570,630,640),(1270,1330,640)],
        'control': [(90,150,640),(420,570,530),(640,760,590),(790,880,590)],
        'pa_room': [(90,150,640),(260,370,600),(480,760,240),(900,1100,520)],
        'city': [(220,430,240),(760,880,600)],
        'flashback': [(0,700,650),(700,960,180)],
    }.get(a.name, [])
    for index,(left,right,height) in enumerate(objects):
        d.rectangle((left*2,floor-height,right*2,floor-8), fill=('#7a827d' if index%2 else '#626c6a'), outline='#343c39',width=3)
    guide = out / f'{a.name}_layout.png'
    im.save(guide)
    print(json.dumps({'guide':str(guide),'size':[w,h],'floor_y':floor,'crop_top':crop_top}))
else:
    im = Image.open(a.source).convert('RGB')
    source_size = im.size
    if a.align_floor is not None:
        split = round(im.height*a.align_floor)
        if not 0 < split < im.height:
            raise SystemExit('Invalid wall/floor fraction')
        wall = im.crop((0,0,im.width,split)).resize((w,799),Image.Resampling.LANCZOS)
        lane = im.crop((0,split,im.width,im.height)).resize((w,281),Image.Resampling.LANCZOS)
        im = Image.new('RGB',(w,1080))
        im.paste(wall,(0,0))
        im.paste(lane,(0,799))
    else:
        target_h = round(im.height*w/im.width)
        im = im.resize((w,target_h), Image.Resampling.LANCZOS)
        top = round(a.floor_y*w/Image.open(a.source).width)-799 if a.floor_y is not None else (target_h-1080)//2
        if top < 0 or top+1080 > target_h:
            raise SystemExit(f'Insufficient vertical image area: crop {top}:{top+1080}, available {target_h}')
        im = im.crop((0,top,w,top+1080))
    master = out / f'{a.name}_master.png'
    if master.exists() and not a.replace:
        raise SystemExit(f'Refusing to overwrite {master}')
    im.save(master)
    names = []
    for n in range(math.ceil(w/1920)):
        panel = Image.new('RGB',(1920,1080))
        x = n*1920
        panel.paste(im.crop((x,0,min(w,x+1920),1080)),(0,0))
        if x+1920>w:
            panel.paste(im.crop((w-1,0,w,1080)).resize((x+1920-w,1080)),(w-x,0))
        path = Path('assets/bg') / f'{a.name}_{n+1}.jpg'
        if path.exists() and not a.replace:
            raise SystemExit(f'Refusing to overwrite {path}')
        panel.save(path,quality=95,subsampling=0)
        names.append(path.name)
    record = {'master':str(master),'source':str(a.source),'source_size':source_size,'size':im.size,'files':names,'unused_right_padding':math.ceil(w/1920)*1920-w,'floor_y':a.floor_y,'align_floor':a.align_floor}
    (out / f'{a.name}_export.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record))
