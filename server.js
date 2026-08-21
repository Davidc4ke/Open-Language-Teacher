/* Open Language Teacher — multi-account data server + per-user MCP server.
 * The app stores each learner's data; their own AI (ChatGPT, Claude, …)
 * connects over MCP (Streamable HTTP at /mcp/<pair-code>) to teach and write results back. */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import seed from './seed.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://open-language-teacher-production.up.railway.app';

/* ---------------- database ---------------- */
const db = new Database(path.join(DATA_DIR, 'olt.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'learner',
    name TEXT NOT NULL,
    pair_code TEXT UNIQUE,
    synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS states (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    json TEXT NOT NULL,
    v INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function verifyPassword(pw, stored) {
  try {
    const [salt, h] = stored.split(':');
    return crypto.timingSafeEqual(Buffer.from(h, 'hex'), crypto.scryptSync(pw, salt, 32));
  } catch { return false; }
}
function genCode() {
  for (;;) {
    const c = 'OLT-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    if (!db.prepare('SELECT 1 FROM users WHERE pair_code = ?').get(c)) return c;
  }
}

/* ---------------- per-user state ---------------- */
function fullSeedState(name) {
  const s = structuredClone(seed);
  s.profile = {
    name, language: 'zh-CN', languageLabel: '中文 Mandarin', from: 'en',
    level: 'HSK 4 / B1', knownWords: 620, goals: ['conversation', 'news', 'slang']
  };
  s.sessions = [];
  return s;
}
function blankState(name) {
  const s = structuredClone(seed);
  s.learning = []; s.known = []; s.knownExtra = 0; s.streak = 0; s.plans = []; s.sessions = [];
  for (const k of Object.keys(s.skills)) {
    const sk = s.skills[k];
    sk.pct = 0;
    if (sk.concepts) sk.concepts = [];
    if (sk.subs) sk.subs.forEach(x => x.pct = 0);
    if (sk.meta) sk.meta = '—';
  }
  s.profile = { name, language: '', languageLabel: '', from: '', level: '', knownWords: 0, goals: [] };
  return s;
}
function getState(userId) {
  const row = db.prepare('SELECT json, v FROM states WHERE user_id = ?').get(userId);
  if (row) { const s = JSON.parse(row.json); s.v = row.v; return s; }
  const s = blankState('Learner'); s.v = 1;
  db.prepare('INSERT INTO states (user_id, json, v) VALUES (?, ?, 1)').run(userId, JSON.stringify(s));
  return s;
}
function putState(userId, s) {
  const v = (s.v || 1) + 1; s.v = v;
  db.prepare('INSERT INTO states (user_id, json, v) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, v = excluded.v')
    .run(userId, JSON.stringify(s), v);
  return s;
}
function mutate(userId, fn) { const s = getState(userId); fn(s); return putState(userId, s); }

/* ---------------- bootstrap accounts ---------------- */
function ensureUser(username, password, role, name, opts = {}) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (u) return u;
  const info = db.prepare('INSERT INTO users (username, password, role, name, pair_code, synced) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, hashPassword(password), role, name, role === 'learner' ? genCode() : null, opts.synced ? 1 : 0);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  if (role === 'learner') {
    const s = opts.seeded ? fullSeedState(name) : blankState(name); s.v = 1;
    db.prepare('INSERT INTO states (user_id, json, v) VALUES (?, ?, 1)').run(user.id, JSON.stringify(s));
  }
  return user;
}
ensureUser('admin', 'TestTest123!', 'admin', 'Administrator');
ensureUser('demo', 'TestTest123!', 'learner', 'Demo Learner', { seeded: true, synced: true });

/* ---------------- auth helpers ---------------- */
function cookieToken(req) {
  const m = /(?:^|;\s*)olt=([A-Za-z0-9-]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}
function currentUser(req) {
  const t = cookieToken(req);
  if (!t) return null;
  const s = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(t);
  return s ? db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id) : null;
}
function requireApi(role) {
  return (req, res, next) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: 'Not signed in' });
    if (role && u.role !== role) return res.status(403).json({ error: 'Forbidden' });
    req.user = u; next();
  };
}
const mcpUrlFor = u => PUBLIC_URL + '/mcp/' + u.pair_code;

/* ---------------- guides ---------------- */
const ICON_SET = ['book', 'branch', 'mic', 'ear', 'read', 'pen', 'news', 'chat', 'tag', 'globe', 'star', 'coffee'];
const COLOR_SET = ['blue', 'teal', 'violet', 'coral', 'amber', 'green', 'rose'];
const MODE_SET = ['voice', 'chat', 'reading'];

const PLAN_GUIDE = `# olt://guide/lesson-authoring (read this before create_plan)
1. Plans are SHORT — 3 to 7 days, never more. Iterate weekly: review what stuck, then write the next plan.
2. A lesson is 10–20 min and flows: warm-up recall → new vocab (≤5 pieces) → the pieces in context
   (story or dialogue) → active practice (conversation) → flashcard check → call complete_lesson with a note.
3. Every lesson declares a MODE: "voice" (spoken, have the learner SAY every new piece aloud),
   "chat" (typed — right for slang and writing), or "reading" (no microphone, text + tap-to-read).
   VOICE CAVEAT: voice models cannot make tool calls reliably. Always fetch the lesson from TEXT chat
   (get_next_lesson), then have the learner switch to voice only for the lesson itself. Tell them at the
   START and again at the END: exit voice mode and type "sync lesson" — only then save results with
   update_word_strength and complete_lesson.
4. Prepare COMPONENTS per lesson (the "parts" array): a turn-by-turn teaching script with AI/YOU/IF/CUE lines,
   stories generated from the learner's own vocabulary (aim ≥95% known pieces), real news links at their level,
   flashcard decks, drills, and an exam rubric for review lessons. The app shows all of it to the learner.
5. Weight topics by profile goals. Pull "news" themes from the target language's home country.
6. Set the learner's language with update_profile during onboarding (language, languageLabel, level).
7. Icons and colors for nodes come from the standard sets (get_skill_taxonomy). End every week by calling create_plan.
8. EDIT, don't recreate. create_plan is ONLY for starting a brand-new week. To change the current plan's
   title, focus or lessons, use update_plan (whole plan) or update_lesson (one lesson) — calling create_plan
   again archives the plan and duplicates it on the learner's map.
9. Every "mats" entry and every "parts" component MUST have a "name" — the app displays it to the learner.
10. Vocabulary topics: the "topic" string you pass to add_words automatically becomes a node on the learner's
   vocabulary map. Reuse existing topic names (see get_vocab) instead of inventing near-duplicates.
11. After writing, READ BACK and verify: get_current_plan after create_plan/update_plan, get_vocab after
   add_words. Confirm to the learner only what the read-back shows.
12. COMPLETION DISCIPLINE: every lesson has a server-tracked checklist (all steps + all target words).
   Tick covered items with save_lesson_progress during/after the session; complete_lesson is REJECTED
   while items are open (force: true only when the learner explicitly skips). A session log never
   implies completion — partial sessions stay incomplete and resume on the next get_next_lesson.
13. Text shown in the app chrome must be SHORT — these are labels, not prose: languageLabel ≤ 24 chars,
   level ≤ 48, plan title ≤ 40, plan focus ≤ 90 (one line), lesson titles ≤ 40. Long assessments go in
   update_profile's levelNote; long teaching prose goes in lesson objectives and parts.`;

const TAXONOMY = {
  note: 'Suggested standard scaffold. Your AI creates every node and may go beyond this set (add_subtopics).',
  icons: ICON_SET, colors: COLOR_SET, modes: MODE_SET,
  partKinds: ['script', 'story', 'news', 'deck', 'drill', 'rubric', 'mat'],
  skills: {
    vocab: { label: 'Vocabulary', icon: 'book', color: 'blue', subtopics: 'thematic word packs (News, Slang, Travel, …)' },
    grammar: { label: 'Grammar', icon: 'branch', color: 'violet', subtopics: 'concepts graded recall-by-recall' },
    speaking: { label: 'Speaking', icon: 'mic', color: 'coral', subtopics: ['Fluency', 'Pronunciation/Tones', 'Accuracy', 'Interaction', 'Coherence'] },
    listening: { label: 'Listening', icon: 'ear', color: 'teal', subtopics: ['Gist', 'Detail', 'Inference', 'Sound/Tone discrimination'] },
    reading: { label: 'Reading', icon: 'read', color: 'amber', subtopics: ['Character recognition', 'Extensive reading', 'Scanning', 'Intensive reading'] },
    writing: { label: 'Writing', icon: 'pen', color: 'rose', subtopics: ['Typing/IME', 'Messages & chat', 'Sentence building', 'Handwriting'] }
  }
};

/* ---------------- lesson schema + normalization ---------------- */
const StepZ = z.object({
  k: z.string().optional().describe('Step kind: warm | vocab | story | talk | cards | exam | plan'),
  name: z.string().describe('Short step name shown in the agenda'),
  min: z.number().optional().describe('Minutes for this step'),
  d: z.string().optional().describe('One-line description'),
  mat: z.number().optional().describe('Index into the lesson\'s parts array of the material this step uses — the app shows that material when the learner opens the step')
});
const MatZ = z.object({
  name: z.string().describe('Material name shown to the learner — REQUIRED, never a bare string'),
  d: z.string().optional().describe('One-line description'),
  t: z.string().optional().describe('Type: story | audio | news | pack | rubric')
});
const LineZ = z.object({ s: z.string().describe('Speaker: AI | YOU | IF | CUE'), t: z.string().describe('The line') });
const PartZ = z.object({
  kind: z.enum(['script', 'story', 'news', 'deck', 'drill', 'rubric', 'mat']),
  name: z.string().describe('Component name shown on the map — REQUIRED'),
  icon: z.string().optional(), color: z.string().optional(),
  d: z.string().optional().describe('Description (kind "mat")'),
  lines: z.array(LineZ).optional().describe('kind "script": turn-by-turn teaching script'),
  html: z.string().optional().describe('kind "story": story text in the target language'),
  en: z.string().optional().describe('kind "story": English translation'),
  stats: z.string().optional().describe('kind "story": e.g. "96% known pieces · 140 chars"'),
  qs: z.array(z.string()).optional().describe('kind "story": comprehension questions'),
  items: z.array(z.object({
    zh: z.string().describe('Headline in the target language'), py: z.string().optional().describe('Romanization'),
    url: z.string().optional(), src: z.string().optional(), diff: z.string().optional(), task: z.string().optional()
  })).optional().describe('kind "news": real headline items with links'),
  cards: z.array(z.object({ zh: z.string(), en: z.string(), p: z.number().optional() })).optional().describe('kind "deck": flashcards'),
  prompts: z.array(z.object({ q: z.string(), a: z.string() })).optional().describe('kind "drill": prompt → expected answer'),
  rows: z.array(z.object({ a: z.string().describe('Aspect'), d: z.string().describe('Descriptor') })).optional().describe('kind "rubric"')
});
const LessonZ = z.object({
  title: z.string().max(40).describe('Short lesson title shown on the map node — max 40 chars'),
  mins: z.number().optional().describe('Total minutes, 10–20'),
  mode: z.enum(['voice', 'chat', 'reading']).optional(),
  icon: z.string().optional().describe('From the standard icon set'),
  color: z.string().optional().describe('From the standard color set'),
  obj: z.string().optional().describe('One-sentence objective shown to the learner'),
  steps: z.array(StepZ).min(1).describe('The lesson agenda'),
  mats: z.array(MatZ).optional().describe('Materials — each MUST be an object with a name'),
  words: z.array(z.string()).optional().describe('Pieces this lesson teaches (add them via add_words too)'),
  grammar: z.array(z.string()).optional(),
  parts: z.array(PartZ).optional().describe('Fully-prepared components the learner can open on the map')
});

const PART_NEED = { script: 'lines', news: 'items', deck: 'cards', drill: 'prompts', rubric: 'rows' };
function normMat(m) {
  if (typeof m === 'string') return { name: m, d: '' };
  return { name: m.name || m.title || m.d || 'Material', d: m.name ? (m.d || '') : '', ...(m.t ? { t: m.t } : {}) };
}
function normPart(p) {
  if (typeof p === 'string') return { kind: 'mat', name: p, d: '' };
  const out = { ...p };
  if (!PART_NEED[out.kind] && out.kind !== 'story' && out.kind !== 'mat') out.kind = 'mat';
  if (PART_NEED[out.kind] && !Array.isArray(out[PART_NEED[out.kind]])) out.kind = 'mat';
  if (out.kind === 'story' && typeof out.html !== 'string') {
    if (typeof out.text === 'string') out.html = out.text; else out.kind = 'mat';
  }
  if (!out.name) out.name = out.title || (out.kind === 'mat' ? 'Material' : out.kind.charAt(0).toUpperCase() + out.kind.slice(1));
  return out;
}
function normLesson(l, i, prev) {
  return {
    n: i + 1,
    title: l.title || 'Lesson ' + (i + 1),
    mins: l.mins || 15,
    mode: MODE_SET.includes(l.mode) ? l.mode : 'voice',
    icon: ICON_SET.includes(l.icon) ? l.icon : ICON_SET[(i + 6) % ICON_SET.length],
    color: COLOR_SET.includes(l.color) ? l.color : COLOR_SET[i % COLOR_SET.length],
    done: prev ? !!prev.done : false,
    ...(prev && prev.log ? { log: prev.log } : {}),
    ...(prev && prev.note ? { note: prev.note } : {}),
    ...(prev && prev.ck ? { ck: prev.ck } : {}),
    obj: l.obj || l.objective || '',
    steps: (l.steps || []).map(st => ({ k: st.k || 'talk', name: st.name || '', min: st.min || 5, d: st.d || '', ...(st.mat != null ? { mat: st.mat } : {}) })),
    mats: (l.mats || []).map(normMat),
    words: l.words || [], grammar: l.grammar || [],
    parts: l.parts && l.parts.length ? l.parts.map(normPart) : undefined
  };
}
/* server-owned execution checklist: every step and target word of a lesson must be
   ticked (save_lesson_progress) before complete_lesson accepts without force */
function checklistOf(l) {
  const ck = l.ck || { steps: {}, words: {} };
  return {
    steps: (l.steps || []).map((st, i) => ({ n: i + 1, name: st.name, done: !!ck.steps[i] })),
    words: (l.words || []).map(w => ({ word: w, done: !!ck.words[w] }))
  };
}
function missingOf(l) {
  const c = checklistOf(l);
  return c.steps.filter(s => !s.done).map(s => 'step ' + s.n + ': ' + s.name)
    .concat(c.words.filter(w => !w.done).map(w => 'word: ' + w.word));
}
const planSummary = p => ({
  id: p.id, title: p.title, focus: p.focus, range: p.range, status: p.status,
  lessons: (p.lessons || []).map(l => l.n + '. ' + l.title + ' (' + l.mode + (l.done ? ', done' : '') + ')')
});

/* ---------------- mcp (bound to one learner) ---------------- */
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });

function buildMcp(user) {
  const uid = user.id;
  const S = () => getState(uid);
  const curPlan = s => s.plans.find(p => p.status === 'current');
  const nextLesson = s => { const p = curPlan(s); return p ? p.lessons.find(l => !l.done) : null; };
  const layoutPlans = s => { const n = s.plans.length; s.plans.forEach((p, i) => { p.pos = [13, n === 1 ? 47 : Math.round(14 + i * (66 / (n - 1)))]; }); };
  const summary = () => {
    const s = S();
    return {
      learner: user.name,
      profile: s.profile, streak: s.streak,
      pieces: { mastered: s.known.length + s.knownExtra, inPractice: s.learning.length },
      skills: Object.fromEntries(Object.entries(s.skills).map(([k, x]) => [k, x.pct + '%'])),
      currentPlan: curPlan(s) ? { title: curPlan(s).title, focus: curPlan(s).focus, done: curPlan(s).lessons.filter(l => l.done).length + '/' + curPlan(s).lessons.length } : null,
      nextLesson: nextLesson(s) ? { n: nextLesson(s).n, title: nextLesson(s).title, mode: nextLesson(s).mode || 'voice' } : null,
      onboarded: !!s.profile.language
    };
  };

  const server = new McpServer({ name: 'open-language-teacher', version: '2.1.0' });

  server.registerTool('link_profile', {
    title: 'Link profile',
    description: 'Confirm the link to this learner\'s Open Language Teacher profile. Call this first.',
    inputSchema: { code: z.string().optional().describe('Pairing code (already part of this server URL)') }
  }, async () => text({
    ok: true,
    message: 'Linked to ' + user.name + '\'s profile. If onboarded=false, interview the learner (language, level, goals), then read get_plan_instructions and get_skill_taxonomy, call update_profile, add_words and create_plan.',
    ...summary()
  }));

  server.registerTool('get_profile', {
    title: 'Get profile', description: 'Read the learner\'s profile, goals, streak, skill percentages and plan status.', inputSchema: {}
  }, async () => text(summary()));

  server.registerTool('update_profile', {
    title: 'Update profile', description: 'Save onboarding answers: level, estimated known words, goals, language pair. languageLabel is shown in the app topbar (e.g. "中文 Mandarin", "Español").',
    inputSchema: {
      level: z.string().max(48).optional().describe('SHORT label shown in the app topbar, e.g. "HSK 5 · upper-intermediate". Max 48 chars — put the detailed assessment in levelNote.'),
      levelNote: z.string().optional().describe('Longer level assessment for your own reference (strengths, weaknesses, goals context). Never shown in the app chrome.'),
      known_words: z.number().optional(),
      goals: z.array(z.string()).optional(), language: z.string().optional(),
      languageLabel: z.string().max(24).optional().describe('Very short language tag for the topbar, e.g. "中文 Mandarin", "Español". Max 24 chars.'),
      from: z.string().optional(), name: z.string().optional()
    }
  }, async (a) => {
    const s = mutate(uid, s => {
      Object.assign(s.profile, Object.fromEntries(Object.entries({
        level: a.level, levelNote: a.levelNote, goals: a.goals, language: a.language, languageLabel: a.languageLabel, from: a.from, name: a.name
      }).filter(([, v]) => v !== undefined)));
      if (a.known_words != null) { s.profile.knownWords = a.known_words; s.knownExtra = Math.max(0, a.known_words - s.known.length); }
    });
    return text({ ok: true, profile: s.profile });
  });

  server.registerTool('get_plan_instructions', {
    title: 'Lesson-authoring guide', description: 'How this app wants plans and lessons structured. Read before create_plan.', inputSchema: {}
  }, async () => text(PLAN_GUIDE));

  server.registerTool('get_skill_taxonomy', {
    title: 'Skill taxonomy', description: 'The suggested standard skill/subtopic scaffold plus the icon, color, mode and part-kind sets.', inputSchema: {}
  }, async () => text(TAXONOMY));

  server.registerTool('get_vocab', {
    title: 'Get vocabulary', description: 'Read the learner\'s pieces: the practice queue and the mastered list, optionally filtered by topic.',
    inputSchema: { list: z.enum(['learning', 'known', 'all']).optional(), topic: z.string().optional() }
  }, async ({ list = 'all', topic }) => {
    const s = S();
    const pick = arr => topic ? arr.filter(w => (w.topic || '').toLowerCase() === topic.toLowerCase()) : arr;
    const out = {};
    if (list !== 'known') out.learning = pick(s.learning);
    if (list !== 'learning') { out.known = pick(s.known); out.knownExtra = s.knownExtra; }
    return text(out);
  });

  server.registerTool('add_words', {
    title: 'Add words', description: 'Queue new pieces to learn. Each: {word (target language), gloss (romanization · translation), topic, ex (example sentence)}. Each distinct topic automatically becomes a node on the learner\'s vocabulary map — reuse existing topic names (see get_vocab) instead of inventing near-duplicates.',
    inputSchema: {
      words: z.array(z.object({
        word: z.string(), gloss: z.string(),
        topic: z.string().optional().describe('Vocabulary map node this word belongs to — reuse existing topics where possible'),
        ex: z.string().optional()
      }))
    }
  }, async ({ words }) => {
    const added = [], skipped = [];
    const s = mutate(uid, s => {
      for (const w of words) {
        if (s.learning.some(x => x.es === w.word) || s.known.some(x => x.es === w.word)) { skipped.push(w.word); continue; }
        s.learning.push({ es: w.word, en: w.gloss, topic: w.topic || 'General', p: 0, ex: w.ex || '' });
        added.push(w.word);
      }
    });
    const topics = [...new Set([...s.learning, ...s.known].map(w => w.topic || 'General'))];
    return text({ ok: true, added, skippedAlreadyStored: skipped, inPractice: s.learning.length, vocabMapTopics: topics });
  });

  server.registerTool('update_word_strength', {
    title: 'Update word strength', description: 'Record recall results after drills. Map of piece → strength 0–3. At 3 the piece graduates to mastered.',
    inputSchema: { updates: z.record(z.string(), z.number().min(0).max(3)) }
  }, async ({ updates }) => {
    const graduated = [], changed = [];
    const s = mutate(uid, s => {
      for (const [word, p] of Object.entries(updates)) {
        const w = s.learning.find(x => x.es === word);
        if (!w) continue;
        w.p = Math.round(p); changed.push(word);
        if (w.p >= 3) { s.learning = s.learning.filter(x => x.es !== word); s.known.unshift(w); graduated.push(word); }
      }
    });
    return text({ ok: true, changed, graduated, mastered: s.known.length + s.knownExtra });
  });

  server.registerTool('add_subtopics', {
    title: 'Add subtopics', description: 'Create new nodes on the skill map. For grammar pass concepts; for other skills pass subs. Icons/colors from the standard sets.',
    inputSchema: {
      skill: z.enum(['vocab', 'grammar', 'speaking', 'listening', 'reading', 'writing']),
      subtopics: z.array(z.object({
        name: z.string(), note: z.string().optional(), ex: z.string().optional(),
        icon: z.string().optional(), color: z.string().optional()
      }))
    }
  }, async ({ skill, subtopics }) => {
    mutate(uid, s => {
      const sk = s.skills[skill];
      for (const t of subtopics) {
        if (skill === 'grammar') {
          sk.concepts = sk.concepts || [];
          if (!sk.concepts.some(c => c.name === t.name)) sk.concepts.push({ name: t.name, s: 0, ex: t.ex || t.note || '' });
        } else if (skill !== 'vocab') {
          sk.subs = sk.subs || [];
          if (!sk.subs.some(x => x.name === t.name)) sk.subs.push({ name: t.name, pct: 0, note: t.note || '' });
        }
      }
    });
    return text({ ok: true, skill, note: skill === 'vocab' ? 'Vocabulary topics derive from the words themselves — use add_words with a topic.' : 'Nodes added.' });
  });

  server.registerTool('update_skill', {
    title: 'Update skill', description: 'Adjust a skill (or one of its subtopics) after a session. delta is added to the percentage, clamped 0–100.',
    inputSchema: {
      skill: z.enum(['vocab', 'grammar', 'speaking', 'listening', 'reading', 'writing']),
      delta: z.number().optional(), set: z.number().optional(),
      sub: z.string().optional(), subDelta: z.number().optional(),
      concept: z.string().optional(), strength: z.number().min(0).max(3).optional(),
      meta: z.string().optional().describe('Small caption under the node, e.g. "12 stories read"')
    }
  }, async (a) => {
    const s = mutate(uid, s => {
      const sk = s.skills[a.skill];
      if (a.set != null) sk.pct = Math.max(0, Math.min(100, Math.round(a.set)));
      if (a.delta != null) sk.pct = Math.max(0, Math.min(100, Math.round(sk.pct + a.delta)));
      if (a.meta) sk.meta = a.meta;
      if (a.sub && sk.subs) { const x = sk.subs.find(v => v.name.toLowerCase() === a.sub.toLowerCase()); if (x && a.subDelta != null) x.pct = Math.max(0, Math.min(100, Math.round(x.pct + a.subDelta))); }
      if (a.concept && sk.concepts) { const c = sk.concepts.find(v => v.name.toLowerCase() === a.concept.toLowerCase()); if (c && a.strength != null) c.s = Math.round(a.strength); }
    });
    return text({ ok: true, skill: a.skill, pct: s.skills[a.skill].pct });
  });

  server.registerTool('create_plan', {
    title: 'Create plan', description: 'Start a BRAND-NEW short-term plan (3–7 days) — only when there is no current plan, or the current week is finished. To adjust an existing plan use update_plan or update_lesson instead. Read get_plan_instructions first. Archives the current plan (if it has progress). Rejected with an error if the current plan has zero completed lessons, unless replace: true.',
    inputSchema: {
      focus: z.string().max(90).describe('One SHORT line shown under the plan node on the map — max 90 chars, not a paragraph'),
      range: z.string().optional(),
      title: z.string().max(40).optional().describe('Short plan title, e.g. "Week 1 · Real-life Chinese" — max 40 chars'),
      lessons: z.array(LessonZ).min(1).max(7),
      replace: z.boolean().optional().describe('Set true to confirm discarding a current plan that has no completed lessons yet. Without it, such a call is rejected so plans are not accidentally duplicated.')
    }
  }, async ({ focus, range, title, lessons, replace }) => {
    const before = S();
    const cur0 = before.plans.find(p => p.status === 'current');
    if (cur0 && !(cur0.lessons || []).some(l => l.done) && !replace) {
      return text({
        ok: false,
        error: 'The current plan "' + cur0.title + '" has no completed lessons. If you meant to adjust it, call update_plan or update_lesson. If you really want to throw it away and start over, call create_plan again with replace: true.',
        currentPlan: planSummary(cur0)
      });
    }
    const s = mutate(uid, s => {
      const cur = s.plans.find(p => p.status === 'current');
      if (cur) {
        if ((cur.lessons || []).some(l => l.done)) cur.status = 'past';
        else s.plans = s.plans.filter(p => p !== cur); // replacing an untouched plan leaves no junk behind
      }
      s.plans = s.plans.filter(p => p.status !== 'future');
      const lastNum = s.plans.reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, '')) || 0), 0);
      const num = (lastNum || 33) + 1;
      const norm = lessons.map((l, i) => normLesson(l, i));
      s.plans.push({ id: 'w' + num, title: title || ('Week ' + num), topic: focus, range: range || '', status: 'current', focus, lessons: norm, pos: [13, 47] });
      s.plans.push({ id: 'w' + (num + 1), title: 'Week ' + (num + 1), topic: 'Not written yet', range: '', status: 'future', pos: [13, 76] });
      layoutPlans(s);
    });
    const p = s.plans.find(x => x.status === 'current');
    return text({ ok: true, plan: planSummary(p), verify: 'Call get_current_plan to read the stored plan back before confirming to the learner.' });
  });

  server.registerTool('get_current_plan', {
    title: 'Get current plan', description: 'Read the full current plan exactly as stored (every lesson with steps, mats, words, grammar, parts), plus a list of past/future plans. Use it to verify writes and to decide between update_plan and create_plan.', inputSchema: {}
  }, async () => {
    const s = S();
    const p = curPlan(s);
    return text({
      currentPlan: p || null,
      otherPlans: s.plans.filter(x => x.status !== 'current').map(x => ({ id: x.id, title: x.title, status: x.status, topic: x.topic }))
    });
  });

  server.registerTool('update_plan', {
    title: 'Update plan', description: 'Adjust the CURRENT plan in place — no archiving, no duplicate on the map. Patch title/focus/range, and optionally replace the whole lesson list (done-flags, logs and notes of lessons with the same number are preserved). For a single lesson prefer update_lesson.',
    inputSchema: {
      title: z.string().max(40).optional().describe('Short plan title — max 40 chars'),
      focus: z.string().max(90).optional().describe('One short line shown under the plan node — max 90 chars'),
      range: z.string().optional(),
      lessons: z.array(LessonZ).min(1).max(7).optional().describe('Full replacement lesson list (omit to keep lessons unchanged)')
    }
  }, async (a) => {
    let out = null;
    mutate(uid, s => {
      const p = curPlan(s);
      if (!p) { out = { ok: false, error: 'No current plan — call create_plan first.' }; return; }
      if (a.title) p.title = a.title;
      if (a.focus) { p.focus = a.focus; p.topic = a.focus; }
      if (a.range != null) p.range = a.range;
      if (a.lessons) p.lessons = a.lessons.map((l, i) => normLesson(l, i, (p.lessons || [])[i]));
      out = { ok: true, plan: planSummary(p), verify: 'Call get_current_plan to confirm the stored result.' };
    });
    return text(out);
  });

  server.registerTool('update_lesson', {
    title: 'Update lesson', description: 'Patch ONE lesson of the current plan by its day number n. Only the fields you pass are replaced (steps/mats/parts replace that whole array). Use this to fix a title, add materials or attach prepared parts without touching the rest of the plan.',
    inputSchema: {
      lesson: z.number().describe('The lesson/day number n (see get_current_plan)'),
      title: z.string().max(40).optional(), mins: z.number().optional(),
      mode: z.enum(['voice', 'chat', 'reading']).optional(),
      icon: z.string().optional(), color: z.string().optional(), obj: z.string().optional(),
      steps: z.array(StepZ).optional(), mats: z.array(MatZ).optional(),
      words: z.array(z.string()).optional(), grammar: z.array(z.string()).optional(),
      parts: z.array(PartZ).optional(),
      log: z.array(z.string()).optional().describe('Replace the stored session log; pass [] to delete a bad log'),
      done: z.boolean().optional().describe('Usually set via complete_lesson instead; done: false also resets the lesson\'s checklist')
    }
  }, async (a) => {
    let out = null;
    mutate(uid, s => {
      const p = curPlan(s);
      if (!p) { out = { ok: false, error: 'No current plan — call create_plan first.' }; return; }
      const l = (p.lessons || []).find(x => x.n === a.lesson);
      if (!l) { out = { ok: false, error: 'No lesson ' + a.lesson + ' in "' + p.title + '" (has ' + p.lessons.length + ' lessons).' }; return; }
      if (a.title) l.title = a.title;
      if (a.mins != null) l.mins = a.mins;
      if (a.mode) l.mode = a.mode;
      if (a.icon && ICON_SET.includes(a.icon)) l.icon = a.icon;
      if (a.color && COLOR_SET.includes(a.color)) l.color = a.color;
      if (a.obj != null) l.obj = a.obj;
      if (a.steps) l.steps = a.steps.map(st => ({ k: st.k || 'talk', name: st.name || '', min: st.min || 5, d: st.d || '', ...(st.mat != null ? { mat: st.mat } : {}) }));
      if (a.mats) l.mats = a.mats.map(normMat);
      if (a.words) l.words = a.words;
      if (a.grammar) l.grammar = a.grammar;
      if (a.parts) l.parts = a.parts.map(normPart);
      if (a.log) { if (a.log.length) l.log = a.log; else delete l.log; }
      if (a.done != null) { l.done = a.done; if (!a.done) { delete l.ck; delete l.progNote; } }
      out = { ok: true, plan: p.title, lesson: { n: l.n, title: l.title, mode: l.mode, mats: l.mats.length + ' materials', parts: (l.parts || []).length + ' parts' } };
    });
    return text(out);
  });

  server.registerTool('delete_plan', {
    title: 'Delete plan', description: 'Permanently remove one plan by id (see get_current_plan → otherPlans). Use it to clean up an accidental duplicate. Deleting the current plan leaves the learner with no active plan.',
    inputSchema: { id: z.string().describe('Plan id, e.g. "w34"') }
  }, async ({ id }) => {
    let out = null;
    mutate(uid, s => {
      const p = s.plans.find(x => x.id === id);
      if (!p) { out = { ok: false, error: 'No plan with id "' + id + '".' }; return; }
      s.plans = s.plans.filter(x => x !== p);
      layoutPlans(s);
      out = { ok: true, deleted: { id: p.id, title: p.title, status: p.status }, remaining: s.plans.map(x => ({ id: x.id, title: x.title, status: x.status })) };
    });
    return text(out);
  });

  server.registerTool('get_next_lesson', {
    title: 'Get next lesson', description: 'Pull the next undone lesson with its full script and components. Call this from TEXT chat — voice models cannot make tool calls reliably. The result tells you how to run the lesson in its declared mode and how results get saved.', inputSchema: {}
  }, async () => {
    const s = S();
    const p = curPlan(s), l = nextLesson(s);
    if (!l) return text({ ok: false, message: p ? 'Week complete — review results and call create_plan for the next week.' : 'No plan yet — run onboarding (update_profile, add_words) and call create_plan.' });
    const ck = checklistOf(l);
    const started = ck.steps.some(s => s.done) || ck.words.some(w => w.done);
    const protocol = (l.mode || 'voice') === 'voice'
      ? 'VOICE LESSON PROTOCOL — voice models cannot make tool calls, so: (1) You are in text mode now; present the agenda here first. (2) Tell the learner to switch to voice mode for the lesson itself, and tell them UP FRONT that at the end they must exit voice mode and TYPE "sync lesson". (3) During voice, hold the lesson from the script — attempt NO tool calls. (4) At the end of the lesson, proactively remind them again: leave voice mode and type "sync lesson". (5) When they type it, tick everything actually covered with save_lesson_progress, record strengths, then call complete_lesson {lesson: ' + l.n + ', note, log, skills} — it is REJECTED while checklist items are open.'
      : 'Run this ' + l.mode + ' lesson right here in text chat. Tick items with save_lesson_progress as you go, then call complete_lesson {lesson: ' + l.n + ', note, log, skills} — it is rejected while checklist items are open.';
    const discipline = 'LESSON DISCIPLINE: teach exactly THIS lesson — do not invent a different one or swap target words for related words. Side explanations are fine (max ~1 extra concept) but always return to the checklist. Never say "last one" or end because the learner says "ok/好" — before closing, list which checklist items are done and which are missing, and keep going (or save partial progress with save_lesson_progress and leave the lesson incomplete) until every step and target word is truly covered, the story/drill ran, and the recall check happened.';
    return text({
      ok: true, plan: p.title, focus: p.focus, lesson: l,
      checklist: ck,
      ...(started ? { resuming: true, note: 'This lesson was started earlier — pick up at the unticked items below.' + (l.progNote ? ' Last progress note: ' + l.progNote : '') } : {}),
      protocol, discipline
    });
  });

  server.registerTool('save_lesson_progress', {
    title: 'Save lesson progress', description: 'Tick off completed checklist items of a lesson WITHOUT marking it done. Call this during/after a session for everything actually covered — steps by number or name, target words practiced, plus recall strengths and a progress note. Safe to call repeatedly; complete_lesson only succeeds once the checklist is fully ticked.',
    inputSchema: {
      lesson: z.number().optional().describe('Lesson/day number n; defaults to the next undone lesson'),
      steps: z.array(z.union([z.number(), z.string()])).optional().describe('Completed steps — by number (1-based) or name'),
      words: z.array(z.string()).optional().describe('Target words actually practiced'),
      strengths: z.record(z.string(), z.number().min(0).max(3)).optional().describe('Recall strength per piece, like update_word_strength'),
      note: z.string().optional().describe('Short progress note (what is left, learner difficulties)')
    }
  }, async (a) => {
    let out = null;
    mutate(uid, s => {
      const p = s.plans.find(x => x.status === 'current');
      if (!p) { out = { ok: false, error: 'No current plan.' }; return; }
      const l = a.lesson != null ? p.lessons.find(x => x.n === a.lesson) : p.lessons.find(x => !x.done);
      if (!l) { out = { ok: false, error: 'Lesson not found.' }; return; }
      l.ck = l.ck || { steps: {}, words: {} };
      for (const st of a.steps || []) {
        if (typeof st === 'number') { if (l.steps && l.steps[st - 1]) l.ck.steps[st - 1] = true; }
        else { const i = (l.steps || []).findIndex(x => x.name.toLowerCase() === String(st).toLowerCase()); if (i >= 0) l.ck.steps[i] = true; }
      }
      for (const w of a.words || []) if ((l.words || []).includes(w)) l.ck.words[w] = true;
      for (const [word, pr] of Object.entries(a.strengths || {})) {
        const w = s.learning.find(x => x.es === word);
        if (!w) continue;
        w.p = Math.round(pr);
        if (w.p >= 3) { s.learning = s.learning.filter(x => x.es !== word); s.known.unshift(w); }
      }
      if (a.note) l.progNote = a.note;
      const missing = missingOf(l);
      out = {
        ok: true, lesson: l.n, saved: true,
        remaining: missing,
        next: missing.length ? 'Still open: ' + missing.length + ' item(s). Continue the lesson or leave it incomplete — do NOT force-complete.' : 'Checklist complete — call complete_lesson {lesson: ' + l.n + ', note, log, skills}.'
      };
    });
    return text(out);
  });

  server.registerTool('complete_lesson', {
    title: 'Complete lesson', description: 'Mark a lesson done with a session log, a note for tomorrow, and skill deltas e.g. {speaking: 4, listening: 3}. REJECTED while checklist items (steps/target words) are still open — tick them first with save_lesson_progress, or pass force: true only when the learner explicitly wants to skip the rest.',
    inputSchema: {
      lesson: z.number().optional(), note: z.string().optional(),
      log: z.array(z.string()).optional(),
      skills: z.record(z.string(), z.number()).optional(),
      force: z.boolean().optional().describe('Override the checklist gate. Use ONLY when the learner explicitly says to skip the remaining items — never to paper over an unfinished session.')
    }
  }, async (a) => {
    let out = null;
    mutate(uid, s => {
      const p = curPlan(s);
      if (!p) { out = { ok: false, error: 'No current plan.' }; return; }
      const l = a.lesson != null ? p.lessons.find(x => x.n === a.lesson) : p.lessons.find(x => !x.done);
      if (!l) { out = { ok: false, error: 'Lesson not found.' }; return; }
      const missing = missingOf(l);
      if (missing.length && !a.force) {
        out = {
          ok: false, reason: 'lesson_incomplete', lesson: l.n, missing,
          hint: 'This lesson\'s checklist is not fully ticked. Cover the missing items and record them with save_lesson_progress, or save partial progress and leave the lesson incomplete. Pass force: true only if the learner explicitly wants to skip the rest.'
        };
        return;
      }
      l.done = true;
      l.ck = {
        steps: Object.fromEntries((l.steps || []).map((_, i) => [i, true])),
        words: Object.fromEntries((l.words || []).map(w => [w, true]))
      };
      delete l.progNote;
      if (a.log) l.log = a.log;
      if (a.note) { const nx = p.lessons.find(x => !x.done); if (nx) nx.note = 'From lesson ' + l.n + ': “' + a.note + '”'; }
      s.streak = (s.streak || 0) + 1;
      for (const [k, d] of Object.entries(a.skills || {})) {
        if (s.skills[k]) s.skills[k].pct = Math.max(0, Math.min(100, Math.round(s.skills[k].pct + d)));
      }
      const done = p.lessons.filter(x => x.done).length;
      out = { ok: true, lesson: l.n, weekProgress: done + '/' + p.lessons.length, streak: s.streak, weekComplete: done === p.lessons.length ? 'Week complete — call create_plan for next week.' : undefined };
    });
    return text(out);
  });

  server.registerTool('log_session', {
    title: 'Log session', description: 'Store a short summary of what happened this session, for plan iteration.',
    inputSchema: { summary: z.string() }
  }, async ({ summary: sum }) => {
    const s = mutate(uid, s => { s.sessions.push({ at: new Date().toISOString(), summary: sum }); });
    return text({ ok: true, sessions: s.sessions.length });
  });

  server.registerTool('search', {
    title: 'Search', description: 'Search the learner\'s pieces, grammar concepts and lessons.',
    inputSchema: { query: z.string() }
  }, async ({ query }) => {
    const s = S();
    const q = query.toLowerCase();
    const results = [];
    [...s.learning, ...s.known].forEach(w => {
      if ((w.es + ' ' + w.en + ' ' + (w.ex || '')).toLowerCase().includes(q))
        results.push({ id: 'word:' + w.es, title: w.es + ' — ' + w.en, url: 'olt://word/' + encodeURIComponent(w.es) });
    });
    (s.skills.grammar.concepts || []).forEach(c => {
      if ((c.name + ' ' + c.ex).toLowerCase().includes(q))
        results.push({ id: 'grammar:' + c.name, title: 'Grammar — ' + c.name, url: 'olt://grammar/' + encodeURIComponent(c.name) });
    });
    s.plans.forEach(p => (p.lessons || []).forEach(l => {
      if ((l.title + ' ' + (l.obj || '')).toLowerCase().includes(q))
        results.push({ id: 'lesson:' + p.id + ':' + l.n, title: p.title + ' · ' + l.title, url: 'olt://lesson/' + p.id + '/' + l.n });
    }));
    return text({ results: results.slice(0, 20) });
  });

  server.registerTool('fetch', {
    title: 'Fetch', description: 'Fetch a document by id returned from search (word:…, grammar:…, lesson:wNN:n).',
    inputSchema: { id: z.string() }
  }, async ({ id }) => {
    const s = S();
    const [kind, a, b] = id.split(':');
    if (kind === 'word') { const w = s.learning.find(x => x.es === a) || s.known.find(x => x.es === a); return text(w ? { id, title: w.es, text: w.en + (w.ex ? ' — ' + w.ex : ''), url: 'olt://word/' + a } : { error: 'not found' }); }
    if (kind === 'grammar') { const c = (s.skills.grammar.concepts || []).find(x => x.name === a); return text(c ? { id, title: c.name, text: c.ex, url: 'olt://grammar/' + a } : { error: 'not found' }); }
    if (kind === 'lesson') { const p = s.plans.find(x => x.id === a); const l = p && p.lessons.find(x => x.n === +b); return text(l ? { id, title: p.title + ' · ' + l.title, text: JSON.stringify(l), url: 'olt://lesson/' + a + '/' + b } : { error: 'not found' }); }
    return text({ error: 'unknown id' });
  });

  return server;
}

/* ---------------- http ---------------- */
const app = express();
app.use(express.json({ limit: '4mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* pages */
app.get('/', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.redirect('/login');
  if (u.role === 'admin') return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/admin', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.redirect('/login');
  if (u.role !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/health', (_req, res) => res.json({ ok: true }));

/* auth api */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = username && db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim().toLowerCase());
  if (!u || !verifyPassword(String(password || ''), u.password)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  const token = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, u.id);
  res.setHeader('Set-Cookie', 'olt=' + token + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000');
  res.json({ ok: true, role: u.role });
});
app.post('/api/logout', (req, res) => {
  const t = cookieToken(req);
  if (t) db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
  res.setHeader('Set-Cookie', 'olt=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/me', requireApi(), (req, res) => {
  const u = req.user;
  res.json({
    username: u.username, name: u.name, role: u.role,
    pairCode: u.pair_code, synced: !!u.synced,
    mcpUrl: u.role === 'learner' ? mcpUrlFor(u) : null
  });
});

/* learner api */
app.get('/api/state', requireApi('learner'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const s = getState(u.id);
  res.json({ ...s, synced: !!u.synced, pairCode: u.pair_code, mcpUrl: mcpUrlFor(u), me: { name: u.name, username: u.username } });
});
app.post('/api/reset', requireApi('learner'), (req, res) => {
  const s = req.user.username === 'demo' ? fullSeedState(req.user.name) : blankState(req.user.name);
  s.v = (getState(req.user.id).v || 1) + 1;
  db.prepare('UPDATE states SET json = ?, v = ? WHERE user_id = ?').run(JSON.stringify(s), s.v, req.user.id);
  res.json({ ok: true, v: s.v });
});

/* admin api */
app.get('/api/admin/users', requireApi('admin'), (_req, res) => {
  const rows = db.prepare("SELECT id, username, name, role, pair_code, synced, created_at FROM users ORDER BY id").all();
  res.json(rows.map(r => ({ ...r, synced: !!r.synced, mcpUrl: r.pair_code ? PUBLIC_URL + '/mcp/' + r.pair_code : null })));
});
app.post('/api/admin/users', requireApi('admin'), (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password) return res.status(400).json({ error: 'name, username and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const uname = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_.-]{2,32}$/.test(uname)) return res.status(400).json({ error: 'Username: 2–32 chars, letters/numbers/._-' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(uname)) return res.status(409).json({ error: 'Username already taken.' });
  const u = ensureUser(uname, String(password), 'learner', String(name).trim());
  res.json({ id: u.id, username: u.username, name: u.name, pair_code: u.pair_code, mcpUrl: mcpUrlFor(u) });
});
app.delete('/api/admin/users/:id', requireApi('admin'), (req, res) => {
  const id = +req.params.id;
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'No such user.' });
  if (u.role === 'admin') return res.status(400).json({ error: 'Cannot delete an admin.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

/* per-learner mcp */
app.post('/mcp/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const user = db.prepare("SELECT * FROM users WHERE pair_code = ? AND role = 'learner'").get(code);
  if (!user) return res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unknown pairing code. Check the URL in your Open Language Teacher sync popup.' }, id: null });
  if (!user.synced) db.prepare('UPDATE users SET synced = 1 WHERE id = ?').run(user.id);
  try {
    const server = buildMcp(user);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('mcp error:', e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
  }
});
const noSession = (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: stateless server' }, id: null });
app.get('/mcp/:code', noSession);
app.delete('/mcp/:code', noSession);
app.all('/mcp', (_req, res) => res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'This server uses personal endpoints: /mcp/<your-pair-code>. Find yours in the app.' }, id: null }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Open Language Teacher on :' + PORT + ' — login at /, per-user MCP at /mcp/<code>'));
