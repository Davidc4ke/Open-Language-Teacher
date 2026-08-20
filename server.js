/* Open Language Teacher — data server + MCP server.
 * The app stores the learner's data; your own AI (ChatGPT, Claude, …)
 * connects over MCP (Streamable HTTP at /mcp) to teach and write results back. */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import seed from './seed.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PAIRING_CODE = process.env.OLT_CODE || 'OLT-4F2K';

/* ---------------- state ---------------- */
function freshState() {
  const s = structuredClone(seed);
  s.v = 1;
  s.profile = {
    name: 'Learner', language: 'zh-CN', languageLabel: '中文 Mandarin',
    from: 'en', level: 'HSK 4 / B1', knownWords: 620,
    goals: ['conversation', 'news', 'slang']
  };
  s.sessions = [];
  return s;
}
function load() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (s && s.plans && s.skills) return s;
  } catch { /* fall through */ }
  return freshState();
}
let state = load();
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (e) { console.error('save failed:', e.message); }
}
function mutate(fn) {
  const out = fn(state);
  state.v = (state.v || 1) + 1;
  save();
  return out;
}
const curPlan = () => state.plans.find(p => p.status === 'current');
const nextLesson = () => { const p = curPlan(); return p ? p.lessons.find(l => !l.done) : null; };
const findWord = zh => state.learning.find(w => w.es === zh) || state.known.find(w => w.es === zh);
function layoutPlans() {
  const n = state.plans.length;
  state.plans.forEach((p, i) => { p.pos = [13, n === 1 ? 47 : Math.round(14 + i * (66 / (n - 1)))]; });
}
const ICON_SET = ['book', 'branch', 'mic', 'ear', 'read', 'pen', 'news', 'chat', 'tag', 'globe', 'star', 'coffee'];
const COLOR_SET = ['blue', 'teal', 'violet', 'coral', 'amber', 'green', 'rose'];
const MODE_SET = ['voice', 'chat', 'reading'];

/* ---------------- guides (the app instructs, the AI creates) ---------------- */
const PLAN_GUIDE = `# olt://guide/lesson-authoring (read this before create_plan)
1. Plans are SHORT — 3 to 7 days, never more. Iterate weekly: review what stuck, then write the next plan.
2. A lesson is 10–20 min and flows: warm-up recall → new vocab (≤5 pieces) → the pieces in context
   (story or dialogue) → active practice (conversation) → flashcard check → call complete_lesson with a note.
3. Every lesson declares a MODE: "voice" (spoken, have the learner SAY every new piece aloud),
   "chat" (typed — right for slang and writing), or "reading" (no microphone, text + tap-to-read).
4. Prepare COMPONENTS per lesson (the "parts" array): a turn-by-turn teaching script with AI/YOU/IF/CUE lines,
   stories generated from the learner's own vocabulary (aim ≥95% known pieces), real news links at their level,
   flashcard decks, drills, and an exam rubric for review lessons. The app shows all of it to the learner.
5. Weight topics by profile goals. Pull "news" themes from the target language's home country.
6. In chat/reading modes, serve materials as MCP Apps (ui:// resources) when your client supports them.
7. Icons and colors for nodes come from the standard sets (get_skill_taxonomy). End every week by calling create_plan.`;

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

/* ---------------- mcp ---------------- */
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const summary = () => ({
  profile: state.profile,
  connected: state.connected,
  streak: state.streak,
  pieces: { mastered: state.known.length + state.knownExtra, inPractice: state.learning.length },
  skills: Object.fromEntries(Object.entries(state.skills).map(([k, s]) => [k, s.pct + '%'])),
  currentPlan: curPlan() ? { title: curPlan().title, focus: curPlan().focus, done: curPlan().lessons.filter(l => l.done).length + '/' + curPlan().lessons.length } : null,
  nextLesson: nextLesson() ? { n: nextLesson().n, title: nextLesson().title, mode: nextLesson().mode || 'voice' } : null
});

function buildMcp() {
  const server = new McpServer({ name: 'open-language-teacher', version: '1.0.0' });

  server.registerTool('link_profile', {
    title: 'Link profile',
    description: 'Link this AI to the learner\'s Open Language Teacher profile using their pairing code. Call this first.',
    inputSchema: { code: z.string().describe('Pairing code shown in the web app, e.g. OLT-4F2K') }
  }, async ({ code }) => {
    if (code.trim().toUpperCase() !== PAIRING_CODE) return text({ ok: false, error: 'Unknown pairing code.' });
    mutate(s => { s.connected = true; });
    return text({ ok: true, message: 'Profile linked. Read get_plan_instructions and get_skill_taxonomy before teaching.', ...summary() });
  });

  server.registerTool('get_profile', {
    title: 'Get profile', description: 'Read the learner\'s profile, goals, streak, skill percentages and plan status.', inputSchema: {}
  }, async () => text(summary()));

  server.registerTool('update_profile', {
    title: 'Update profile', description: 'Save onboarding answers: level, estimated known words, goals, language pair.',
    inputSchema: {
      level: z.string().optional(), known_words: z.number().optional(),
      goals: z.array(z.string()).optional(), language: z.string().optional(),
      languageLabel: z.string().optional(), from: z.string().optional(), name: z.string().optional()
    }
  }, async (a) => {
    mutate(s => {
      Object.assign(s.profile, Object.fromEntries(Object.entries({
        level: a.level, goals: a.goals, language: a.language, languageLabel: a.languageLabel, from: a.from, name: a.name
      }).filter(([, v]) => v !== undefined)));
      if (a.known_words != null) { s.profile.knownWords = a.known_words; s.knownExtra = Math.max(0, a.known_words - s.known.length); }
    });
    return text({ ok: true, profile: state.profile });
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
    const pick = arr => topic ? arr.filter(w => (w.topic || '').toLowerCase() === topic.toLowerCase()) : arr;
    const out = {};
    if (list !== 'known') out.learning = pick(state.learning);
    if (list !== 'learning') { out.known = pick(state.known); out.knownExtra = state.knownExtra; }
    return text(out);
  });

  server.registerTool('add_words', {
    title: 'Add words', description: 'Queue new pieces to learn. Each: {zh, en (pinyin · gloss), topic, ex (example sentence)}.',
    inputSchema: {
      words: z.array(z.object({
        zh: z.string(), en: z.string(), topic: z.string().optional(), ex: z.string().optional()
      }))
    }
  }, async ({ words }) => {
    const added = [];
    mutate(s => {
      for (const w of words) {
        if (findWord(w.zh)) continue;
        s.learning.push({ es: w.zh, en: w.en, topic: w.topic || 'General', p: 0, ex: w.ex || '' });
        added.push(w.zh);
      }
    });
    return text({ ok: true, added, inPractice: state.learning.length });
  });

  server.registerTool('update_word_strength', {
    title: 'Update word strength', description: 'Record recall results after drills. Map of piece → strength 0–3. At 3 the piece graduates to mastered.',
    inputSchema: { updates: z.record(z.string(), z.number().min(0).max(3)) }
  }, async ({ updates }) => {
    const graduated = [], changed = [];
    mutate(s => {
      for (const [zh, p] of Object.entries(updates)) {
        const w = s.learning.find(x => x.es === zh);
        if (!w) continue;
        w.p = Math.round(p); changed.push(zh);
        if (w.p >= 3) { s.learning = s.learning.filter(x => x.es !== zh); s.known.unshift(w); graduated.push(zh); }
      }
    });
    return text({ ok: true, changed, graduated, mastered: state.known.length + state.knownExtra });
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
    mutate(s => {
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
      sub: z.string().optional(), subDelta: z.number().optional(), concept: z.string().optional(), strength: z.number().min(0).max(3).optional()
    }
  }, async (a) => {
    mutate(s => {
      const sk = s.skills[a.skill];
      if (a.set != null) sk.pct = Math.max(0, Math.min(100, Math.round(a.set)));
      if (a.delta != null) sk.pct = Math.max(0, Math.min(100, Math.round(sk.pct + a.delta)));
      if (a.sub && sk.subs) { const x = sk.subs.find(v => v.name.toLowerCase() === a.sub.toLowerCase()); if (x && a.subDelta != null) x.pct = Math.max(0, Math.min(100, Math.round(x.pct + a.subDelta))); }
      if (a.concept && sk.concepts) { const c = sk.concepts.find(v => v.name.toLowerCase() === a.concept.toLowerCase()); if (c && a.strength != null) c.s = Math.round(a.strength); }
    });
    return text({ ok: true, skill: a.skill, pct: state.skills[a.skill].pct });
  });

  server.registerTool('create_plan', {
    title: 'Create plan', description: 'Write a new short-term plan (3–7 days). Read get_plan_instructions first. The current plan is archived. Each lesson: {title, mins, mode, icon, color, obj, steps:[{k,name,min,d}], mats, words, grammar, parts}.',
    inputSchema: {
      focus: z.string(), range: z.string().optional(), title: z.string().optional(),
      lessons: z.array(z.any()).min(1).max(7)
    }
  }, async ({ focus, range, title, lessons }) => {
    mutate(s => {
      const cur = s.plans.find(p => p.status === 'current');
      if (cur) cur.status = 'past';
      s.plans = s.plans.filter(p => p.status !== 'future');
      const lastNum = s.plans.reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, '')) || 0), 33);
      const num = lastNum + 1;
      const norm = lessons.map((l, i) => ({
        n: i + 1,
        title: l.title || 'Lesson ' + (i + 1),
        mins: l.mins || 15,
        mode: MODE_SET.includes(l.mode) ? l.mode : 'voice',
        icon: ICON_SET.includes(l.icon) ? l.icon : ICON_SET[(i + 6) % ICON_SET.length],
        color: COLOR_SET.includes(l.color) ? l.color : COLOR_SET[i % COLOR_SET.length],
        done: false,
        obj: l.obj || l.objective || '',
        steps: (l.steps || []).map(st => ({ k: st.k || 'talk', name: st.name || '', min: st.min || 5, d: st.d || '' })),
        mats: l.mats || [], words: l.words || [], grammar: l.grammar || [],
        parts: l.parts || undefined
      }));
      s.plans.push({ id: 'w' + num, title: title || ('Week ' + num), topic: focus, range: range || '', status: 'current', focus, lessons: norm, pos: [13, 47] });
      s.plans.push({ id: 'w' + (num + 1), title: 'Week ' + (num + 1), topic: 'Not written yet', range: '', status: 'future', pos: [13, 76] });
      layoutPlans();
    });
    return text({ ok: true, plan: { title: curPlan().title, focus, lessons: curPlan().lessons.map(l => l.n + '. ' + l.title + ' (' + l.mode + ')') } });
  });

  server.registerTool('get_next_lesson', {
    title: 'Get next lesson', description: 'Pull the next undone lesson with its full script and components. Hold the lesson in the declared mode, then call complete_lesson.', inputSchema: {}
  }, async () => {
    const p = curPlan(), l = nextLesson();
    if (!l) return text({ ok: false, message: p ? 'Week complete — review results and call create_plan for the next week.' : 'No plan yet — run onboarding and call create_plan.' });
    return text({ ok: true, plan: p.title, focus: p.focus, lesson: l, reminder: 'Run it in ' + (l.mode || 'voice') + ' mode. Afterwards call update_word_strength and complete_lesson {lesson:' + l.n + ', note, log, skills}.' });
  });

  server.registerTool('complete_lesson', {
    title: 'Complete lesson', description: 'Mark a lesson done with a session log, a note for tomorrow, and skill deltas e.g. {speaking: 4, listening: 3}.',
    inputSchema: {
      lesson: z.number().optional(), note: z.string().optional(),
      log: z.array(z.string()).optional(),
      skills: z.record(z.string(), z.number()).optional()
    }
  }, async (a) => {
    const p = curPlan();
    if (!p) return text({ ok: false, error: 'No current plan.' });
    const l = a.lesson != null ? p.lessons.find(x => x.n === a.lesson) : p.lessons.find(x => !x.done);
    if (!l) return text({ ok: false, error: 'Lesson not found.' });
    mutate(s => {
      l.done = true;
      if (a.log) l.log = a.log;
      if (a.note) { const nx = p.lessons.find(x => !x.done); if (nx) nx.note = 'From lesson ' + l.n + ': “' + a.note + '”'; }
      s.streak = (s.streak || 0) + 1;
      for (const [k, d] of Object.entries(a.skills || {})) {
        if (s.skills[k]) s.skills[k].pct = Math.max(0, Math.min(100, Math.round(s.skills[k].pct + d)));
      }
    });
    const done = p.lessons.filter(x => x.done).length;
    return text({ ok: true, lesson: l.n, weekProgress: done + '/' + p.lessons.length, streak: state.streak, weekComplete: done === p.lessons.length ? 'Week complete — call create_plan for next week.' : undefined });
  });

  server.registerTool('log_session', {
    title: 'Log session', description: 'Store a short summary of what happened this session, for plan iteration.',
    inputSchema: { summary: z.string() }
  }, async ({ summary: sum }) => {
    mutate(s => { s.sessions.push({ at: new Date().toISOString(), summary: sum }); });
    return text({ ok: true, sessions: state.sessions.length });
  });

  /* search + fetch, so ChatGPT connector mode is happy too */
  server.registerTool('search', {
    title: 'Search', description: 'Search the learner\'s pieces, grammar concepts and lessons.',
    inputSchema: { query: z.string() }
  }, async ({ query }) => {
    const q = query.toLowerCase();
    const results = [];
    [...state.learning, ...state.known].forEach(w => {
      if ((w.es + ' ' + w.en + ' ' + (w.ex || '')).toLowerCase().includes(q))
        results.push({ id: 'word:' + w.es, title: w.es + ' — ' + w.en, url: 'olt://word/' + encodeURIComponent(w.es) });
    });
    (state.skills.grammar.concepts || []).forEach(c => {
      if ((c.name + ' ' + c.ex).toLowerCase().includes(q))
        results.push({ id: 'grammar:' + c.name, title: 'Grammar — ' + c.name, url: 'olt://grammar/' + encodeURIComponent(c.name) });
    });
    state.plans.forEach(p => (p.lessons || []).forEach(l => {
      if ((l.title + ' ' + (l.obj || '')).toLowerCase().includes(q))
        results.push({ id: 'lesson:' + p.id + ':' + l.n, title: p.title + ' · ' + l.title, url: 'olt://lesson/' + p.id + '/' + l.n });
    }));
    return text({ results: results.slice(0, 20) });
  });

  server.registerTool('fetch', {
    title: 'Fetch', description: 'Fetch a document by id returned from search (word:…, grammar:…, lesson:wNN:n).',
    inputSchema: { id: z.string() }
  }, async ({ id }) => {
    const [kind, a, b] = id.split(':');
    if (kind === 'word') { const w = findWord(a); return text(w ? { id, title: w.es, text: w.en + (w.ex ? ' — ' + w.ex : ''), url: 'olt://word/' + a } : { error: 'not found' }); }
    if (kind === 'grammar') { const c = (state.skills.grammar.concepts || []).find(x => x.name === a); return text(c ? { id, title: c.name, text: c.ex, url: 'olt://grammar/' + a } : { error: 'not found' }); }
    if (kind === 'lesson') { const p = state.plans.find(x => x.id === a); const l = p && p.lessons.find(x => x.n === +b); return text(l ? { id, title: p.title + ' · ' + l.title, text: JSON.stringify(l), url: 'olt://lesson/' + a + '/' + b } : { error: 'not found' }); }
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

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true, v: state.v }));
app.get('/api/state', (_req, res) => res.json(state));
app.post('/api/reset', (_req, res) => { state = freshState(); save(); res.json({ ok: true, v: state.v }); });

app.post('/mcp', async (req, res) => {
  try {
    const server = buildMcp();
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
app.get('/mcp', noSession);
app.delete('/mcp', noSession);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Open Language Teacher on :' + PORT + ' — UI at /, MCP at /mcp, pairing code ' + PAIRING_CODE));
