// All voiced lines. Single source of truth for subtitles AND tools/generate-voices.mjs.
// v   = voice key (mapped to an ElevenLabs voice id in tools/voices.config.json)
// who = subtitle speaker name (defaults to SPEAKERS[v]); fakes deliberately show the real name
// fx  = in-game processing chain: dry | tape | radio | pa | ghost | nameless | muffled | whisper | echo
// tag = ElevenLabs v3 audio tag(s) prepended at generation time only (never shown in subtitles)

export const SPEAKERS = {
  pakin: 'ภาคิน', daow: 'ดาว', mom: 'แม่', teacher: 'ครูเวร', announcer: 'เสียงประกาศ',
  officer: 'เจ้าหน้าที่', child: 'เสียงเด็ก', radio: 'วิทยุ',
};

const L = (v, fx, t, tag = '', who) => ({ v, fx, t, tag, who });

export const LINES = {
  // ── PART 1 · Opening ─────────────────────────────────────────────
  OP_R1: L('announcer', 'radio', '...ประกาศถึงผู้ที่ยังอยู่ในอาคารเรียน กรุณารอเรียกชื่อเพื่อเข้ารับการอพยพ...', '[distant, crackling]', 'วิทยุ'),
  OP_P1: L('pakin', 'dry', 'คลื่นอะไรเนี่ย...?', '[confused, tired]'),
  OP_D1: L('daow', 'radio', 'พี่ภาคิน... อย่าจอดรถนะ', '[whispers]', 'วิทยุ'),
  OP_P2: L('pakin', 'dry', '...ดาว?', '[shocked, quietly]'),
  CAR_P1: L('pakin', 'dry', 'รอยมือ... อยู่ด้านในกระจก', '[breathing heavily]'),
  CAR_PHONE: L('pakin', 'dry', 'ไม่มีสัญญาณเลย', '[sighs]'),
  CAR_TAPE: L('pakin', 'dry', 'ลายมือแม่... อย่าตอบ', '[quietly]'),
  ROAD_TREE: L('pakin', 'dry', 'ต้นไม้ล้มขวางถนน... ต้องเดินต่อแล้ว', ''),
  ROAD_BACK: L('pakin', 'dry', 'ควรเอาของในรถไปด้วยก่อน', ''),

  // ── Sala ─────────────────────────────────────────────────────────
  SALA_PLAQUE: L('pakin', 'dry', 'รอยสกรู... ยี่สิบสามรู มีคนงัดแผ่นชื่อออกไป', '[quietly]'),
  SALA_SPEAKER: L('pakin', 'dry', 'ไม่มีสายไฟต่อด้วยซ้ำ... แล้วมันดังได้ยังไง', '[uneasy]'),
  SALA_PHOTO: L('pakin', 'dry', 'ดาว...', '[softly]'),
  SALA_MAP: L('pakin', 'dry', 'เส้นสีแดง... จากบ้านแม่ไปโรงเรียน', ''),

  // ── House ────────────────────────────────────────────────────────
  LIV_ENTER: L('pakin', 'dry', 'ฝุ่นเต็มไปหมด... แต่โต๊ะตัวนี้สะอาด เหมือนมีคนเช็ดไว้รอ', '[whispers]'),
  LIV_PLUG: L('pakin', 'dry', 'ต้องเสียบปลั๊กก่อน', ''),
  M01_1: L('mom', 'tape', 'ภาคิน ถ้าลูกได้ยินเทปนี้ แปลว่าแม่คงไม่อยู่แล้ว', '[tired, gentle]'),
  M01_2: L('mom', 'tape', 'แม่อยากให้ลูกกลับไปโรงเรียนที่เราเคยหนีน้ำกัน... แม่ไม่ได้จะให้ลูกทำอะไรแทนแม่ทั้งหมด', '[gentle]'),
  M01_3: L('mom', 'tape', 'ในโรงเรียนยังมีชื่อที่ไม่มีใครพูดถึง', '[sad]'),
  M01_4: L('mom', 'tape', 'ถ้าลูกได้ยินใครเรียกชื่อลูกจากเสียงตามสาย อย่าขานรับ ไม่ว่าเสียงนั้นจะเหมือนใครก็ตาม', '[sobbing] [serious]'),
  M01_5: L('daow', 'ghost', 'พี่ภาคิน... หนูยังอยู่ที่โรงเรียน', '[whispers]', 'ดาว'),
  LIV_STEPS: L('pakin', 'dry', 'ใครอยู่ข้างบน?', '[nervous]'),
  STAIR_STEPS: L('pakin', 'dry', 'เมื่อกี้มันอยู่ข้างบน... ไม่ใช่เหรอ', '[whispers, scared]'),
  DR_DRAW: L('pakin', 'dry', 'รูปครอบครัวเรา... แต่หน้าดาวถูกขีดทับ', '[quietly]'),
  DR_P1: L('pakin', 'dry', 'ดาว... นี่ของเธอนี่', '[softly]'),
  DR_P2: L('pakin', 'dry', 'ใครอยู่ในบ้าน?', '[scared]'),
  MR_OPEN: L('pakin', 'dry', 'กุญแจโรงเรียน... แม่เก็บไว้ตลอด', ''),
  PA01_1: L('announcer', 'pa', 'ประกาศรายชื่อผู้รอดชีวิตลำดับสุดท้าย...', '[slow, flat]'),
  PA01_2: L('announcer', 'pa', 'เด็กชายภาคิน... ยังอยู่หรือเปล่าคะ?', '[slow, eerie]'),
  PA01_3: L('daow', 'muffled', 'พี่... หนูหนาว เปิดให้หนูหน่อย', '[shivering, pleading]', 'ดาว'),
  ANS_P1: L('pakin', 'dry', 'อยู่!', '[shouting]'),
  ANS_R: L('announcer', 'nameless', 'ได้ยินแล้ว', '[whispers]', 'วิทยุ'),
  PEEP_P: L('pakin', 'dry', 'ไม่มีใครอยู่ข้างนอกเลย...', '[whispers]'),
  PA01_4: L('daow', 'whisper', 'ทำไมพี่มองออกไปข้างนอกล่ะ... หนูอยู่ข้างหลังพี่ต่างหาก', '[whispers, close]', 'ดาว'),
  P1E_1: L('announcer', 'pa', 'รายชื่อยังไม่ครบค่ะ... กรุณามารายงานตัวที่ห้องประชาสัมพันธ์', '[flat]'),
  P1E_2: L('pakin', 'dry', 'ฉันจะไปหาเธอ... ดาว', '[determined, quietly]'),

  // ── PART 2 · School ──────────────────────────────────────────────
  GATE_P: L('pakin', 'dry', 'ศูนย์อพยพชั่วคราว... ปีสองพันห้าร้อยห้าสิบสาม', ''),
  P3_1: L('pakin', 'dry', 'ยี่สิบสาม... แล้วคนที่หายไปคือใคร?', '[whispers]'),
  P3_2: L('child', 'ghost', 'พวกเรามาครบแล้ว... เหลือแค่ครู', '[giggles softly]'),
  T1_1: L('teacher', 'echo', 'เด็กชายภาคิน... ทำไมไม่เข้าห้องเรียน?', '[slow, cold]'),
  T1_2: L('pakin', 'dry', 'ครู...?', '[scared]'),
  T1_3: L('teacher', 'echo', 'ใครที่ยังไม่มีชื่อในสมุด... ห้ามกลับบ้าน', '[cold]'),
  CH_1: L('teacher', 'echo', 'หมดเวลาแล้ว... กลับเข้าห้อง!', '[shouting]'),
  T_SEE: L('teacher', 'echo', 'ครูเห็นเธอนะ...', '[whispers, menacing]'),
  T_HEAR: L('teacher', 'echo', 'ใครวิ่งในทางเดิน?', '[sharp]'),
  T_SEARCH: L('teacher', 'echo', 'ขานรับสิ... ครูกำลังเช็กชื่ออยู่', '[sing-song, eerie]'),
  T_LOST: L('teacher', 'echo', '...หายไปไหนอีกแล้ว', '[muttering]'),
  NUR_1: L('pakin', 'dry', 'ฉันจำได้ว่า... ดาวจับมือฉันไว้', '[quietly]'),
  NUR_2: L('pakin', 'dry', 'ไม่ใช่... ฉันเป็นคนเอื้อมหาเธอ', '[realizing]'),
  NUR_3: L('pakin', 'dry', 'แล้วทำไมฉันจำเป็นว่า ฉันปล่อยมือเองมาตลอด?', '[voice breaking]'),
  PA_SW4: L('announcer', 'pa', 'เด็กชายภาคิน... มารายงานตัวด้วยค่ะ', '[slow, eerie]'),
  AR_1: L('officer', 'tape', 'เรือรับได้อีกแค่สิบเจ็ดคน ต้องปิดประตูแล้ว!', '[shouting, panicked]'),
  AR_2: L('mom', 'tape', 'ข้างในยังมีเด็กอีกยี่สิบสามคน ลูกสาวฉันด้วย!', '[screaming, desperate]'),
  AR_3: L('officer', 'tape', 'ถ้าเปิดตอนนี้ น้ำจะเข้ามาอีก ทุกคนที่นี่จะตาย!', '[shouting]'),
  AR_4: L('mom', 'tape', 'แล้วจะปล่อยให้เขาหายไปอย่างนั้นเหรอ?', '[crying]'),
  AR_5: L('teacher', 'tape', 'ฉันมีรายชื่อ ฉันอ่านให้ทุกคนได้ยิน—', '[urgent]', 'ครูราตรี'),
  AR_6: L('teacher', 'tape', 'หนึ่ง... สอง... ต้องให้ครบ... ต้องให้ครบทุกคน...', '[trembling, whispering]', 'ครูราตรี'),
  FB_P: L('pakin', 'dry', 'ฉันไม่ได้ปล่อยมือ... เธอหันกลับไปช่วยเพื่อน', '[crying softly]'),
  PAR_1: L('daow', 'ghost', 'พี่รู้แล้วใช่ไหมว่าหนูอยู่ที่ไหน', '[sweet]', 'ดาว'),
  PAR_2: L('pakin', 'dry', 'เธอเป็นใคร?', '[guarded]'),
  PAR_3: L('daow', 'ghost', 'พี่จำไม่ได้เหรอว่าพี่ปล่อยหนูไว้?', '[hurt]', 'ดาว'),
  PAR_4: L('pakin', 'dry', 'ตอนเด็ก... เวลาเราหลงกัน เธอให้ฉันฟังเสียงอะไร?', '[testing, careful]'),
  PAR_5: L('daow', 'nameless', 'พี่ไม่ต้องถามแล้ว แค่จับมือหนู', '[impatient]', 'ดาว'),
  P2E_1: L('daow', 'nameless', 'พี่... คราวนี้อย่าปล่อยมือหนูอีกนะ', '[whispers, distorted]', 'ดาว'),

  // ── PART 3 · Final call ──────────────────────────────────────────
  P3S_1: L('pakin', 'dry', 'ไม่มีไฟเข้าเครื่องขยายเสียง... ต้องไปห้องควบคุมไฟ', ''),
  T3_1: L('teacher', 'echo', 'เธอกลับมาสาย... มาก', '[slow]', 'ครูราตรี'),
  T3_2: L('pakin', 'dry', 'ผมหารายชื่อครบแล้วครับ', '[steady]'),
  T3_3: L('teacher', 'echo', 'ครบ... ทุกคน?', '[doubtful]', 'ครูราตรี'),
  T3_4: L('pakin', 'dry', 'ครบครับ ครู', '[firm]'),
  T3_5: L('teacher', 'echo', 'ถ้าอย่างนั้น... เริ่มเรียกชื่อได้', '[softer]', 'ครูราตรี'),
  T3_Q: L('teacher', 'echo', 'เธอขานรับเสียงนั้นมาแล้ว... ครูต้องถามก่อน ดาวเคาะกระดิ่งกี่ครั้ง?', '[suspicious]', 'ครูราตรี'),
  T3_QW: L('teacher', 'echo', 'ไม่ใช่... ตอบใหม่', '[cold]', 'ครูราตรี'),
  M02_1: L('mom', 'tape', 'ภาคิน ถ้าลูกมาถึงตรงนี้ แม่อยากบอกว่าลูกไม่ต้องรับผิดแทนทุกคน', '[gentle, emotional]'),
  M02_2: L('mom', 'tape', 'ลูกเป็นเด็กคนหนึ่งที่ควรได้รอด', '[tearful]'),
  M02_3: L('mom', 'tape', 'แต่ถ้าลูกยังทำไหว ขอให้เรียกชื่อพวกเขา เพื่อให้คนอื่นรู้ว่าพวกเขาเคยอยู่ที่นี่', '[gentle]'),
  M02_4: L('mom', 'tape', 'ไม่ว่าใครจะเรียกชื่อลูก... ห้ามตอบ', '[firm, whispering]'),
  AN_0: L('pakin', 'pa', 'รายชื่อผู้สูญหายจากเหตุการณ์วันที่ 17 ตุลาคม 2553...', '[solemn]'),
  NM_MOM: L('mom', 'nameless', 'ภาคิน... ลูกตอบแม่หน่อย', '[pleading, distorted]', 'แม่'),
  AN_ANS: L('pakin', 'dry', 'แม่...?', '[breaking]'),
  FC_1: L('daow', 'nameless', 'พี่... หนูอยู่ตรงนี้แล้ว', '[sweet, distorted]', 'ดาว'),
  FC_2: L('daow', 'nameless', 'พี่ไม่อยากพาหนูกลับบ้านเหรอ?', '[pleading]', 'ดาว'),
  FC_3: L('daow', 'nameless', 'เรียกชื่อพี่สักครั้งสิ... หนูจะได้รู้ว่าพี่อยู่', '[whispers]', 'ดาว'),

  // ── Endings ──────────────────────────────────────────────────────
  EA_1: L('pakin', 'dry', 'อยู่... พี่อยู่นี่', '[crying, giving in]'),
  EA_2: L('daow', 'nameless', 'ในที่สุด... ก็มีคนตอบแล้ว', '[many voices, satisfied]', '???'),
  EA_3: L('pakin', 'pa', 'ประกาศรายชื่อผู้รอดชีวิตลำดับต่อไป...', '[flat, hollow]', 'เสียงประกาศ'),
  EA_4: L('pakin', 'pa', 'คุณ... ยังอยู่หรือเปล่าครับ?', '[flat, eerie]', 'เสียงประกาศ'),
  EB_1: L('pakin', 'dry', 'พอแล้ว! ฉันทนไม่ไหวแล้ว!', '[shouting, panicked]'),
  EB_2: L('announcer', 'tape', 'รายชื่อยังไม่ครบค่ะ...', '[flat]', 'เครื่องเล่นเทป'),
  EB_3: L('announcer', 'tape', 'กรุณามารายงานตัวที่ห้องประชาสัมพันธ์', '[flat]', 'เครื่องเล่นเทป'),
  EC_1: L('pakin', 'pa', 'รายชื่อสุดท้าย...', '[steady, emotional]'),
  EC_3: L('pakin', 'pa', 'เด็กทั้งยี่สิบสามคนไม่ได้หายไปเพราะไม่มีใครจำชื่อได้', '[firm, emotional]'),
  EC_4: L('pakin', 'pa', 'พวกเขาอยู่ที่นี่... และพวกเขาทุกคนมีชื่อ', '[emotional]'),
  EC_5: L('teacher', 'dry', 'มาครบแล้ว...', '[relieved, gentle]', 'ครูราตรี'),
  EC_6: L('teacher', 'dry', 'เลิกเรียนได้', '[warm, smiling]', 'ครูราตรี'),
  EC_7: L('daow', 'dry', 'พี่...', '[softly]'),
  EC_8: L('pakin', 'dry', 'ดาว?', '[tearful]'),
  EC_9: L('daow', 'dry', 'คราวนี้หนูได้กลับบ้านแล้วนะ', '[happy, gentle]'),
  EC_10: L('pakin', 'dry', 'ขอโทษนะ ที่พี่มาช้า', '[crying softly]'),
  EC_11: L('daow', 'dry', 'พี่มาแล้ว', '[smiling]'),
};

// 23 names are read by Pakin through the PA. Generated as NAME_01..NAME_23.
import { NAMES } from './names.js';
NAMES.forEach((n, i) => {
  const id = 'NAME_' + String(i + 1).padStart(2, '0');
  LINES[id] = L('pakin', 'pa', n.name, i === 22 ? '[emotional, steady]' : '[solemn]');
});
