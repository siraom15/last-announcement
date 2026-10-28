# ART PROMPTS — เสียงตามสาย (The Last Announcement)

รายการภาพทั้งหมดที่เกมใช้ พร้อม prompt (ภาษาอังกฤษ) + ชื่อไฟล์ + ขนาด
วางไฟล์ตามโฟลเดอร์ที่ระบุ แล้วบอก Claude ว่า "ภาพมาแล้ว" — Claude จะใส่เข้าเกมและอัปเดต manifest ให้เอง

> ใช้ The Coma เป็นแค่ **แนวทางลายเส้น** เท่านั้น — ทุก prompt เขียนเป็นตัวละคร/ฉากของเราเอง ไม่ใส่ชื่อเกม/ตัวละครของเขาใน prompt

---

## 0. กติการวม (อ่านก่อน)

| หมวด | โฟลเดอร์ | ฟอร์แมต | ขนาด |
|---|---|---|---|
| ภาพหน้าตัวละคร (บทสนทนา) | `assets/portraits/` | **PNG พื้นหลังโปร่งใส** | 800 × 1000 |
| ฉากหลัง | `assets/bg/` | JPG (คุณภาพ 85+) หรือ PNG | ดูแต่ละห้อง |
| ตัวละครในเกม (แยกชิ้น) | `assets/sprites/<ตัวละคร>/` | PNG โปร่งใส | ดูหมวด 3 |
| ภาพปก / ภาพตอนจบ | `assets/art/` | JPG | 1920 × 1080 |

- ชื่อไฟล์ **ตัวพิมพ์เล็ก ภาษาอังกฤษ ใช้ `_`** ตามตารางเป๊ะ ๆ
- ถ้าเครื่องมือสร้างภาพโปร่งใสไม่ได้ → สร้างบน **พื้นสีเขียวล้วน #00FF00** แล้วส่งมา Claude ลบพื้นให้ได้ (หรือใช้ remove.bg)
- ทำ **ภาพอ้างอิงตัวละคร (character sheet)** ก่อน แล้วใช้ภาพนั้นเป็น reference / `--cref` / "image prompt" ทุกครั้ง ตัวละครจะหน้าเหมือนกันทุกภาพ

### Style block — แปะต่อท้ายทุก prompt ตัวละคร
```
Korean manhwa horror art style, clean bold black ink lineart with varying line weight, cel shading with soft painted gradients, dramatic rim light, semi-realistic proportions, muted desaturated palette, gritty paper texture, high detail, original character
```

### Style block — แปะต่อท้ายทุก prompt ฉากหลัง
```
2D side-scrolling horror game background, perfectly flat orthographic side view, camera facing the back wall straight on, no vanishing point, no people, no characters, no text, no letters, Korean manhwa horror art style, clean ink lineart with painted shading, gritty, desaturated, rural Thailand
```
**กฎฉากหลังสำคัญ:** เส้นที่ผนังชนพื้นต้องอยู่ที่ **74% ของความสูงภาพ** (จากบน) — ตัวละครเดินบนพื้นช่วง 74–100% ล่าง; อย่าวาดสิ่งของขวางพื้นตรงกลาง

### Negative prompt (ถ้าเครื่องมือรองรับ)
```
text, watermark, logo, signature, letters, people, extra limbs, deformed hands, perspective, fisheye, 3d render, photo, blurry
```

---

## 1. ภาพหน้าตัวละคร (Portraits) — ทำก่อน เห็นผลทันที

แสดงตอนคุยกันแบบ The Coma (ใหญ่ ซ้าย/ขวา คนไม่พูดมืดลง)
**ขนาด 800×1000 PNG โปร่งใส · ครึ่งตัว (หัวถึงเอว) · หันหน้า ¾ · ภาคินหันไปทางขวา คนอื่นหันไปทางซ้าย**

ถ้าไม่มีไฟล์อารมณ์ไหน เกมจะใช้ `_neutral` แทน → **อย่างน้อยทำ `_neutral` ของทุกตัวก่อน**

### 1.1 ภาคิน (Pakin) — หันไปทาง **ขวา**
Character sheet (ทำครั้งแรก):
```
Character design sheet, front view, side view and back view, full body, of a 28-year-old Thai man named Pakin, slim build, messy short black hair, tired dark eyes with dark circles, light stubble, olive-brown skin, wearing a worn dark olive rain jacket over a grey t-shirt, dark jeans, muddy sneakers, holding a small metal flashlight, rain-soaked, quiet and guarded expression, neutral grey background, [STYLE]
```
| ไฟล์ | prompt (แปะ STYLE ต่อท้าย) |
|---|---|
| `pakin_neutral.png` | `Half-body portrait of Pakin (28, Thai man, messy black hair, stubble, worn olive rain jacket, wet hair), three-quarter view facing right, calm tired guarded expression, holding a flashlight near his chest, transparent background, [STYLE]` |
| `pakin_scared.png` | `...same character..., three-quarter view facing right, wide eyes, mouth slightly open in shock, sweat and rain on face, flashlight raised, transparent background, [STYLE]` |
| `pakin_sad.png` | `...same character..., three-quarter view facing right, eyes glistening with held-back tears, brows pinched, looking down, transparent background, [STYLE]` |
| `pakin_eerie.png` | `...same character..., three-quarter view facing right, blank hollow stare, face half in shadow, unsettling faint smile, transparent background, [STYLE]` *(ใช้ตอนจบ A)* |

### 1.2 ดาว (Daow) — หันไปทาง **ซ้าย**
Character sheet:
```
Character design sheet, front, side and back view, full body, of a 9-year-old Thai girl named Daow, short black bob haircut with a bright sky-blue ribbon tied on the left side, round gentle face, Thai primary school uniform: white short-sleeve blouse with sailor-style collar and a navy blue pleated skirt, white socks, black school shoes, slightly wet clothes and hair, holding a small silver bicycle bell, soft kind expression, neutral grey background, [STYLE]
```
| ไฟล์ | prompt |
|---|---|
| `daow_neutral.png` | `Half-body portrait of Daow (9-year-old Thai girl, black bob hair, sky-blue ribbon, white Thai school blouse, navy skirt, slightly wet), three-quarter view facing left, soft calm expression, small silver bicycle bell in hand, transparent background, [STYLE]` |
| `daow_sad.png` | `...same character..., facing left, sad teary eyes, small frown, wet hair sticking to cheeks, transparent background, [STYLE]` |
| `daow_happy.png` | `...same character..., facing left, gentle warm smile, eyes soft, warm morning light from the right, transparent background, [STYLE]` *(ใช้ตอนจบ C)* |
| `daow_eerie.png` | `...same character but subtly wrong: NO ribbon, eyes hidden in shadow under wet hair, too-wide sweet smile, fingers slightly too long, pale grey skin, water dripping, facing left, transparent background, [STYLE]` *(ดาวปลอม/ผู้ไร้ชื่อ)* |

### 1.3 แม่ (Mom) — หันไปทาง **ซ้าย** · โผล่ผ่านเทปเท่านั้น (เกมจะใส่ฟิลเตอร์ภาพเก่าให้เอง)
```
Character design: Thai woman in her mid-50s, kind tired face, greying black hair tied in a low bun, simple cream-colored blouse, thin gold necklace, soft sorrowful eyes, [STYLE]
```
| ไฟล์ | prompt |
|---|---|
| `mom_neutral.png` | `Half-body portrait of a Thai mother in her mid-50s, greying hair in a low bun, cream blouse, three-quarter view facing left, gentle sad smile, transparent background, [STYLE]` |
| `mom_sad.png` | `...same character..., facing left, crying quietly, hand near her mouth, transparent background, [STYLE]` |

### 1.4 ครูเวร (The Duty Teacher) — หันไปทาง **ซ้าย** · ตัวร้าย
Character sheet:
```
Character design sheet, front and side view, full body, of a tall unnaturally thin Thai female schoolteacher ghost, disproportionately long neck and long arms, Thai government teacher uniform: khaki-beige blouse with shoulder boards and a long dark straight skirt, hard black heels, long soaking-wet black hair hanging over most of her face, one pale eye visible, holding a thick red-brown attendance register book to her chest, water dripping from her hem, head tilted slightly, menacing but sorrowful, neutral dark background, [STYLE]
```
| ไฟล์ | prompt |
|---|---|
| `teacher_neutral.png` | `Half-body portrait of the ghost teacher (tall thin Thai teacher, khaki uniform, long wet black hair over her face, one pale eye visible, red-brown attendance book), facing left, cold stare, head tilted, transparent background, [STYLE]` |
| `teacher_eerie.png` | `...same character..., facing left, leaning forward toward the viewer, hair parting to reveal a wide unblinking eye and a crooked mouth, transparent background, [STYLE]` |

### 1.5 ครูราตรี (Teacher Ratree, ร่างจริง — ตอนจบ C) — หันไปทาง **ซ้าย**
| ไฟล์ | prompt |
|---|---|
| `ratree_neutral.png` | `Half-body portrait of a kind Thai female teacher in her 40s, neat black hair in a bun, tidy khaki Thai teacher uniform, holding a red-brown attendance book, three-quarter view facing left, calm gentle expression, transparent background, [STYLE]` |
| `ratree_happy.png` | `...same character..., facing left, relieved warm smile, eyes closed softly, golden dawn light on her face, transparent background, [STYLE]` |

---

## 2. ฉากหลัง (Backgrounds)

**ระบบไฟล์:** ห้องยาวเกินจอ → แบ่งเป็น **แผง (panel)** ละ 1920×1080 ต่อกันซ้าย→ขวา
ชื่อไฟล์ `assets/bg/<room>_1.jpg`, `<room>_2.jpg`, … (แผงสุดท้ายอาจยาวเกินห้อง — เกมตัดเอง)

**วิธีให้แผงต่อกันเนียน:** สร้างแผง 1 → ใช้ "Extend / Outpaint / Pan right" จากแผง 1 เพื่อสร้างแผง 2 (Midjourney: Pan ➡, Photoshop: Generative Expand, ChatGPT/Leonardo: "extend this image to the right") แล้วตัดเป็นช่วง ๆ ละ 1920 px
> หรือส่งมาเป็น **ภาพยาวภาพเดียว** ชื่อ `<room>.jpg` ขนาด (กว้างห้อง×2) × 1080 ก็ได้

**ตำแหน่ง:** ตัวเลข `x` ด้านล่างคือหน่วยในเกม — ในภาพจริงคูณ 2 (px) · แผงที่ n ครอบคลุม x = (n−1)×960 ถึง n×960
**ห้ามวาด:** นาฬิกา, ข้อความบนกระดาน, กระจกเงา — เกมวาดทับเองเพื่อเปลี่ยนเวลา/ข้อความ (วาดเป็นกรอบว่าง/ผนังเปล่าตรงนั้น)

### PART 1 — หมู่บ้าน (โทน: น้ำเงินเทา ฝนหนัก กลางคืน)

**`road` · ถนนเข้าหมู่บ้าน · กว้าง 2000 → 3 แผง (`road_1..3.jpg`)**
- x 0–400 รถเก๋งเก่าจอดอยู่ซ้ายสุด (เกมวาดรถเอง — เว้นที่ว่างได้) · x 660 ต้นไม้ล้มขวางถนน (ด้านหน้า) · x 1080–1180 ป้ายหมู่บ้านไม้หักครึ่ง · ต้นมะพร้าว เสาไฟมีสายไฟ ทุ่งนาน้ำท่วมด้านหลัง
```
Panoramic rural Thai road at night in heavy rain, flooded rice fields in the background, silhouetted coconut palms and a dark tree line, wooden utility poles with sagging wires, cracked wet asphalt road with puddles reflecting faint light, a broken wooden village welcome sign snapped in half on the right side, a fallen tree lying across the road, cold blue-grey tones, [BG STYLE]
```

**`sala` · ศาลาหมู่บ้าน · กว้าง 1800 → 2 แผง**
- x 260–680 ศาลาไทยหลังคาจั่วซ้อน · x 420–540 บอร์ดตารางประกาศในศาลา · x 800–1000 ป้ายหินรายชื่อผู้เสียชีวิต **แผ่นล่างถูกงัดออก เหลือรู 23 รู** · x 1000–1260 บอร์ดแผนที่หมู่บ้าน (เส้นสีแดง) + รูปหมู่ซีด · x 1460 เสาลำโพงฮอร์นสนิม 2 ตัว · x 1580–1730 ป้ายชี้ทางไปโรงเรียน
```
Old Thai village pavilion (sala) with a tiered wooden roof at night in the rain, a rusted stone memorial plaque with its lower panel pried off leaving 23 empty screw holes, a weathered village notice board with a hand-drawn map, a tall concrete pole with two rusty horn loudspeakers, a small faded sign pointing to a school on a hill, single dying warm streetlamp, [BG STYLE]
```
**`sala_morning` (ตอนจบ A) · 2 แผง** — prompt เดิม แต่ `grey overcast early morning, rain stopped, mist, cold pale light`

**`street` · หน้าบ้านแม่ · กว้าง 1500 → 2 แผง**
- x 160–720 บ้านไม้สองชั้นแบบไทยชนบท ประตูหน้าที่ **x 440** (กว้าง ~90) ไฟหน้าบ้านดวงเล็ก · ขวา: เนินเขามีอาคารโรงเรียนเล็ก ๆ ไกล ๆ
```
Old two-storey wooden Thai rural house with dark teak plank walls and a gabled roof, closed front door with a single dim porch bulb, shuttered windows, wet dirt road in front, in the distance on the right a dark hill with a small two-storey school building silhouette, heavy rain at night, [BG STYLE]
```

**`living` · ห้องรับแขก · กว้าง 1300 → 2 แผง**
- x 160 ประตูหน้าบ้าน · x 360 **ผนังเปล่า** (นาฬิกาเกมวาดเอง) · x 470–600 หน้าต่างลูกกรง · x 560–820 โซฟาเก่า · x 760–940 กรอบรูปครอบครัวบนผนัง · x 860–1020 โต๊ะเตี้ยมีเครื่องเล่นเทปคาสเซ็ต (**โต๊ะสะอาดผิดปกติ ไม่มีฝุ่น**) · x 1030 ปลั๊กพ่วงบนพื้น · x 1080–1300 บันไดไม้ขึ้นชั้นสอง
```
Interior of an old Thai wooden house living room at night, teak plank walls covered in dust and water stains, a barred window with rain outside, a worn sofa, faded family photo frames on the wall, a low wooden table with an old cassette tape player that is strangely clean and dust-free, a power strip on the floor, a wooden staircase going up on the right, single bare hanging bulb, [BG STYLE]
```

**`hall2` · โถงชั้น 2 (บ้าน) · กว้าง 1100 → 2 แผง**
- x 40–300 ช่องบันไดลง · x 520 ประตูห้องแม่ · x 820 ประตูห้องดาว (มีป้ายชื่อเด็ก สีฟ้า เขียน "ห้องดาว" — หรือเว้นว่าง) · x 960–1060 หน้าต่าง
```
Narrow upstairs hallway of an old Thai wooden house at night, stairwell railing going down on the left, two closed wooden bedroom doors, one door has a small pastel blue child's name plate, a window at the far right with rain, dust, peeling wood, [BG STYLE]
```

**`mom_room` · ห้องแม่ · กว้าง 1000 → 2 แผง**
- x 120 ประตู · x 230–350 ตู้เสื้อผ้าไม้ (ที่ซ่อน) · x 470–550 กรอบรูปบนผนัง · x 600–700 ปฏิทินกระดาษเดือนมิถุนายน · x 740–940 โต๊ะเขียนหนังสือมีกล่องไม้เล็ก
```
A middle-aged Thai mother's bedroom at night, old wooden wardrobe, framed photo on the wall, a paper wall calendar open to June with one date circled in red, a writing desk with a small locked wooden box and handwritten notes, neat but dusty, dim cold window light, [BG STYLE]
```

**`daow_room` · ห้องดาว · กว้าง 1000 → 2 แผง**
- x 120 ประตู · x 330–550 **ผนังเปล่าสีครีม** (ภาพวาดชอล์กเกมวาดเอง) · x 560–790 เตียงเด็กมีตุ๊กตากระต่าย · x 740–790 กระเป๋านักเรียนสีกรม · x 830–960 โต๊ะเด็ก
```
A 9-year-old Thai girl's bedroom abandoned for 16 years, small bed with a faded white rabbit plush, navy school backpack on the floor, a small wooden desk, a blank cream-colored wall section for drawings, water stains, dust, cold moonlight, eerie stillness, [BG STYLE]
```

### PART 2 — โรงเรียน (โทน: เขียวหม่น น้ำตาล ไฟนีออนกะพริบ · **มีคราบน้ำท่วมเป็นเส้นบนผนังทุกห้องที่ระดับ ~60% ความสูง**)

**`school_gate` · หน้าโรงเรียน · กว้าง 1600 → 2 แผง**
- x 160–1500 อาคารเรียนคอนกรีต 2 ชั้น หน้าต่างแถว · x 1100–1350 ประตูรั้วเหล็กพร้อมป้าย "ศูนย์อพยพชั่วคราว พ.ศ. 2553" (เว้นป้ายว่างได้ เกมใส่ตัวหนังสือเอง)
```
Abandoned two-storey concrete Thai rural primary school building at night in heavy rain, rows of dark windows on both floors, a visible brown flood water line stained across the walls, rusted iron sliding gate with an empty sign board above it, overgrown weeds, [BG STYLE]
```

**`hall1` · โถงชั้น 1 · กว้าง 2200 → 3 แผง**
- x 170 ประตูเหล็กคู่ทางออก · x 300–420 หน้าต่างลูกกรง · x 600 ประตูห้อง ป.3 (บานไม้มีกระจก ป้ายเหนือประตู) · x 760–950 บอร์ดประกาศ · x 990–1200 **ตู้ล็อกเกอร์เหล็ก 4 ตู้** (ที่ซ่อน) · x 1230–1350 หน้าต่าง · x 1450 ประตูห้องพยาบาล · x 1640–1760 หน้าต่าง · x 1880–2140 บันไดขึ้น
```
Long ground-floor corridor of an abandoned Thai primary school at night, two-tone walls (dirty cream upper, dark green lower) with a brown flood line, terrazzo floor wet with puddles, barred windows, wooden classroom doors with small glass panes and blank sign plates above, a cork notice board with curling papers, a row of four dented metal lockers, a concrete staircase going up at the far right, dead fluorescent tube lights on the ceiling, [BG STYLE]
```

**`p3` · ห้องเรียน ป.3 · กว้าง 1500 → 2 แผง**
- x 120 ประตู · x 480–1000 **กระดานดำว่างเปล่า** (เกมเขียนตัวหนังสือเอง) · x 1080–1270 โต๊ะครู · x 1290–1460 บอร์ดกิจกรรมรูปเด็ก · โต๊ะนักเรียนแถวหลังเล็ก ๆ (เกมวาดโต๊ะแถวหน้าเอง)
```
Abandoned Thai primary school classroom at night, a large blank green chalkboard, rows of small wooden student desks with water-damaged name tags, a teacher's desk with drawers on the right, a children's activity board with faded group photos, ceiling fans, cream and green walls with a flood stain line, [BG STYLE]
```

**`hall2s` · โถงชั้น 2 (โรงเรียน) · กว้าง 2400 → 3 แผง**
- x 40–300 ช่องบันไดลง · x 600 ประตูห้องสมุด · x 780–890 หน้าต่าง · x 1000 ประตูห้องดนตรี · x 1180–1390 ล็อกเกอร์ 4 ตู้ · x 1420–1530 หน้าต่าง · x 1650 **ประตูเหล็กห้องเก็บเอกสาร** (มีเครื่องอ่านบัตร) · x 1900–2010 ตู้เอกสารเหล็กสูง · x 2140–2250 หน้าต่าง
```
Second-floor corridor of an abandoned Thai school at night, same two-tone walls with flood line, stairwell railing going down on the far left, several wooden classroom doors, a heavy grey steel door with a small card reader, metal lockers, a tall filing cabinet, barred windows with rain, one flickering fluorescent tube, [BG STYLE]
```

**`library` · ห้องสมุด · กว้าง 1500 → 2 แผง**
- x 120 ประตู · x 230–700 ชั้นหนังสือไม้สูง 2 ตู้ · x 740 กระดาษโน้ตติดผนัง · x 860 **ผนังเปล่า** (นาฬิกา) · x 920–1180 โต๊ะอ่านหนังสือยาว · x 1250–1350 ตู้เหล็กลิ้นชักเล็ก · x 1380–1470 **กรอบกระจกเงาว่าง** (เกมวาดเงาสะท้อนเอง)
```
Small abandoned Thai school library at night, tall wooden bookshelves with warped water-damaged books, a long reading table, a small steel card cabinet, an empty tall mirror frame on the right wall, dust motes, faint cold light, [BG STYLE]
```

**`nurse` · ห้องพยาบาล · กว้าง 1100 → 2 แผง**
- x 120 ประตู · x 220–450 เตียงเหล็กพยาบาล · x 460–570 ม่านกั้นเปื้อนคราบน้ำ (ที่ซ่อน) · x 590–820 เตียงที่ 2 · x 900–1020 ตู้ยากระจกมีกากบาทแดง
```
Abandoned Thai school nurse's room at night, two old metal hospital beds with stained white sheets, a water-stained privacy curtain, a glass medicine cabinet with a red cross, pale green walls, eerie and cold, [BG STYLE]
```

**`archive` · ห้องเก็บเอกสาร · กว้าง 1200 → 2 แผง**
- x 120 ประตูเหล็ก · x 240–640 ตู้เอกสารเหล็ก 4 ตู้ · x 680 กระดาษโน้ตบนผนัง · x 780–980 โต๊ะมีเครื่องเล่นเทปรีลใหญ่ · x 1030–1140 ตู้เหล็กสูง (ที่ซ่อน)
```
Cramped school records archive room at night, row of grey metal filing cabinets, a desk with a large old reel-to-reel/cassette tape deck, handwritten janitor notes taped to the wall, a tall steel locker, peeling plaster, [BG STYLE]
```

**`bridge` · ทางเชื่อมอาคาร · กว้าง 1600 → 2 แผง**
- หน้าต่างลูกกรงเรียงยาวเห็นฝนข้างนอก · x 600 ประตูเหล็กห้องควบคุมไฟ · x 1300 ประตูไม้ห้องประชาสัมพันธ์ มีลำโพงฮอร์นเหนือประตู
```
Covered concrete walkway connecting two school buildings at night, a long row of barred windows showing heavy rain and lightning outside, a grey steel utility door, a wooden door with a horn loudspeaker mounted above it, [BG STYLE]
```

**`control` · ห้องควบคุมไฟ · กว้าง 900 → 1 แผง**
- x 120 ประตู · x 420–570 ตู้ไฟเหล็ก (เกมวาดสวิตช์เอง — วาดเป็นตู้ปิด) · x 640–760 ชั้นอะไหล่ · x 790–880 ตู้เหล็กสูง
```
Small electrical control room in an old Thai school at night, a large grey metal breaker box on the wall, a shelf of spare parts and fuses, tangled old cables, a tall steel locker, single caged bulb, [BG STYLE]
```

**`pa_room` · ห้องประชาสัมพันธ์ · กว้าง 1200 → 2 แผง**
- x 120 ประตู · x 260–370 **กรอบกระจกเงาว่าง** · x 470 ผนังเปล่า (นาฬิกา) · x 480–760 โต๊ะประกาศ มีไมโครโฟนตั้งโต๊ะ มิกเซอร์เก่า · x 900–1100 แผงเดินสายสัญญาณบนผนัง · ลำโพงฮอร์นบนผนัง
```
Old school PA broadcast room at night, a desk with a vintage desk microphone, old mixer and cassette deck, a wall-mounted audio patch panel with labeled sockets and cables, horn loudspeakers on the wall, an empty tall mirror frame on the left wall, warm dim lamp glow, [BG STYLE]
```

### PART 3 — ใช้ฉากเดิม (เกมเติมน้ำท่วม/เงาเด็กเอง) ไม่ต้องทำเพิ่ม

### ฉากตอนจบ / ย้อนความทรงจำ
| ไฟล์ | กว้าง → แผง | prompt |
|---|---|---|
| `flashback_1.jpg` | 960 → 1 | `Night of a flash flood in 2010, a rural Thai school building half-submerged in brown floodwater, a small wooden evacuation boat on the right with rescuers, rain and searchlights, chaotic but no visible faces, [BG STYLE]` |
| `city_1.jpg` | 960 → 1 | `Small city apartment living room at night three months later, rain-streaked window with blurred city lights, a table with a cassette tape player and an unmarked parcel, a full-length mirror on the right wall (empty frame), [BG STYLE]` |
| `school_dawn_1..2.jpg` | 1600 → 2 | `The same abandoned two-storey Thai school at sunrise, rain has stopped, golden orange dawn light, open iron gate, puddles reflecting the sky, peaceful and melancholic, [BG STYLE]` |

---

## 3. ตัวละครที่เดินในเกม (Sprites แบบหุ่นเชิด)

ทำ **หลังจาก** portraits เสร็จ (ใช้ character sheet เดิมเป็น reference)

**ขั้นที่ 1 — ภาพเต็มตัวท่ายืน หันข้างขวา** `assets/sprites/<char>/full.png`
- PNG โปร่งใส · สูงตัวละคร: ภาคิน 400 px · ดาว 270 px · ครูเวร 540 px (สูงผิดปกติ) · ผู้ไร้ชื่อ 620 px
- **ยืนตรง แขนแนบลำตัวเล็กน้อย ขาห่างกันนิดหน่อย** มองเห็นแขน-ขาทั้งสองข้างไม่บังกัน
```
Full body side view (exact profile facing right) of [CHARACTER DESCRIPTION], standing straight in a neutral T-pose-like relaxed stance, arms slightly away from the body, legs slightly apart, both arms and both legs clearly visible and not overlapping, plain transparent background, game sprite, [STYLE]
```

**ขั้นที่ 2 — แยกชิ้น** (ทำใน Photoshop / Photopea ฟรี: ตัดเป็นเลเยอร์ แล้ว *Export layers* เป็น PNG **ขนาดผืนเท่ากับ full.png ทุกชิ้น** ชิ้นอยู่ตำแหน่งเดิม)
```
assets/sprites/pakin/
  full.png
  head.png          (หัว+ผม+คอ)
  torso.png         (ลำตัว+สะโพก)
  arm_back_upper.png  arm_back_lower.png   (แขนข้างไกล — รวมมือ)
  arm_front_upper.png arm_front_lower.png  (แขนข้างใกล้ — รวมมือ)
  leg_back_upper.png  leg_back_lower.png   (ขาข้างไกล — รวมเท้า)
  leg_front_upper.png leg_front_lower.png  (ขาข้างใกล้ — รวมเท้า)
  prop.png          (ไฟฉาย / สมุด / กระดิ่ง — ถ้ามี)
```
- วาด **ข้อต่อให้มนเกินเข้าไปใต้ชิ้นข้างบน** ~15 px (ไหล่ ศอก สะโพก เข่า) ตอนงอจะได้ไม่เห็นรอยขาด
- ตัวละคร: `pakin`, `daow`, `teacher`, `nameless` (ผู้ไร้ชื่อแยกชิ้นน้อยกว่าก็ได้: head, torso, arms, legs)
- ถ้าแยกชิ้นเองไม่ไหว → ส่ง `full.png` มาอย่างเดียว Claude ลองตัดให้ได้ (ผลอาจไม่เนียนเท่า)

ผู้ไร้ชื่อ (ไม่ต้องทำ portrait):
```
Full body side view facing right of a faceless tall shadow entity, featureless smooth head, body made of several overlapping translucent human silhouettes of different heights, elongated fingers, smoky dissolving edges, pure black and dark grey only, transparent background, [STYLE]
```

---

## 4. ภาพปก + ภาพตอนจบ (ไม่บังคับ)

| ไฟล์ | prompt |
|---|---|
| `assets/art/title.jpg` | `Key art poster, 1920x1080: Pakin (28, Thai man, olive rain jacket, flashlight) on the left looking back in fear, little Daow (9, sky-blue ribbon, Thai school uniform) standing on the right holding a bicycle bell, behind them the silhouette of a tall faceless shadow and a rusty horn loudspeaker on a pole, dark green chalkboard texture background with water stains, empty space at the centre bottom for a title, [STYLE]` |
| `assets/art/end_a.jpg` | `Pakin's portrait framed on a wall in an empty PA room labeled announcer, his reflection in the glass has no face, grey morning light, [STYLE]` |
| `assets/art/end_b.jpg` | `Pakin alone in a city apartment holding a cassette tape, behind him in the mirror the faint reflection of a little girl with wet hair, [STYLE]` |
| `assets/art/end_c.jpg` | `Sunrise at an old Thai school gate, little Daow with her sky-blue ribbon smiling and waving goodbye as a group of children walk into the golden light, Pakin watching from behind, hopeful and tearful, [STYLE]` |

---

## 5. ลำดับที่แนะนำ

1. Character sheet ภาคิน + ดาว + ครูเวร
2. `*_neutral.png` ทุกตัว → ส่งมาก่อน (Claude ใส่เข้าเกมทันที)
3. อารมณ์อื่น ๆ
4. ฉาก Part 1 (`road`, `sala`, `street`, `living`, `hall2`, `mom_room`, `daow_room`)
5. ฉาก Part 2 (school ทั้งหมด)
6. Sprites แยกชิ้น
7. ภาพปก / ตอนจบ

**ส่งภาพมา:** วางไฟล์ไว้ในโฟลเดอร์ตามตาราง (หรือโยนรวมไว้ที่ `incoming/` ก็ได้ Claude จะจัดให้) แล้วบอก "ภาพมาแล้ว"
