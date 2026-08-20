export default {
    connected: true,
    knownExtra: 612,
    streak: 6,
    learning: [
      { es: '新闻',   en: 'xīnwén · the news (item)',      topic: 'News',         p: 2, ex: '你看了今天的新闻吗？' },
      { es: '标题',   en: 'biāotí · headline',             topic: 'News',         p: 1, ex: '这个标题太夸张了。' },
      { es: '调查',   en: 'diàochá · survey, poll',        topic: 'News',         p: 1, ex: '根据调查，大多数人同意。' },
      { es: '罢工',   en: 'bàgōng · to strike (labour)',   topic: 'News',         p: 0, ex: '明天地铁要罢工。' },
      { es: '政府',   en: 'zhèngfǔ · government',          topic: 'News',         p: 2, ex: '政府宣布了新政策。' },
      { es: '给力',   en: 'gěilì · awesome (slang)',       topic: 'Slang',        p: 1, ex: '这首歌太给力了！' },
      { es: '靠谱',   en: 'kàopǔ · reliable, legit',       topic: 'Slang',        p: 2, ex: '他这个人很靠谱。' },
      { es: '老铁',   en: 'lǎotiě · buddy, mate',          topic: 'Slang',        p: 0, ex: '老铁，最近怎么样？' },
      { es: '躺平',   en: 'tǎngpíng · to opt out, coast',  topic: 'Slang',        p: 0, ex: '我今天只想躺平。' },
      { es: '不过',   en: 'búguò · however',               topic: 'Conversation', p: 1, ex: '不过我不太同意。' },
      { es: '顺便说', en: 'shùnbiàn shuō · by the way',    topic: 'Conversation', p: 2, ex: '顺便说一下，你的旅行怎么样？' },
      { es: '约',     en: 'yuē · to meet up, arrange',     topic: 'Conversation', p: 1, ex: '我们周六约吧？' }
    ],
    known: [
      { es: '你好', en: 'nǐ hǎo · hello',          topic: 'Basics', p: 3, ex: '你好！最近好吗？' },
      { es: '谢谢', en: 'xièxie · thank you',      topic: 'Basics', p: 3, ex: '谢谢你的帮助。' },
      { es: '买单', en: 'mǎidān · the bill',       topic: 'Food',   p: 3, ex: '服务员，买单！' },
      { es: '旅行', en: 'lǚxíng · to travel',      topic: 'Travel', p: 3, ex: '我喜欢坐火车旅行。' },
      { es: '火车', en: 'huǒchē · train',          topic: 'Travel', p: 3, ex: '火车十点出发。' },
      { es: '海滩', en: 'hǎitān · beach',          topic: 'Travel', p: 2, ex: '我们明天去海滩吧。' },
      { es: '城市', en: 'chéngshì · city',         topic: 'Travel', p: 3, ex: '这个城市的夜景很美。' },
      { es: '朋友', en: 'péngyou · friend',        topic: 'Conversation', p: 3, ex: '他是我的好朋友。' },
      { es: '明白', en: 'míngbai · to understand', topic: 'Conversation', p: 2, ex: '我不明白，可以再说一遍吗？' }
    ],
    skills: {
      vocab: { pct: 72, label: 'Vocabulary', icon: 'book', color: 'blue', pos: [24, 26],
        desc: 'Every piece your AI has taught you, grouped by theme. The 1,000 most common characters cover about 90% of everyday text — that’s the race you’re running.' },
      grammar: { pct: 41, label: 'Grammar', icon: 'branch', color: 'violet', pos: [64, 22],
        desc: 'The patterns that glue words together — graded like words, recall by recall, always inside real sentences.',
        concepts: [
          { name: 'Word order & time',   s: 3, ex: '我明天去北京 — time before the verb, always.' },
          { name: 'Measure words',       s: 2, ex: '一本书、三个人、两杯茶。' },
          { name: '了 (completed)',      s: 2, ex: '我已经吃了饭。' },
          { name: '是…的 (emphasis)',    s: 1, ex: '我是坐火车来的。' },
          { name: '把 construction',     s: 1, ex: '我把书放在桌子上。' },
          { name: 'Resultative endings', s: 0, ex: '听懂 / 看完 / 找到 — verb plus result.' }
        ] },
      speaking: { pct: 55, label: 'Speaking', icon: 'mic', color: 'coral', meta: '34 conversations', pos: [42, 74],
        desc: 'Graded live in voice mode on the five CEFR aspects of spoken language.',
        subs: [
          { name: 'Fluency',     pct: 55, note: 'keeping going without long pauses' },
          { name: 'Tones',       pct: 42, note: 'phonological control — the four tones in real speech' },
          { name: 'Accuracy',    pct: 52, note: 'right patterns while speaking, not just on paper' },
          { name: 'Interaction', pct: 60, note: 'turn-taking, asking back, repair moves' },
          { name: 'Coherence',   pct: 44, note: 'linking ideas — 不过, 顺便说一下' }
        ] },
      listening: { pct: 63, label: 'Listening', icon: 'ear', color: 'teal', meta: '41 stories heard', pos: [86, 40],
        desc: 'Trained entirely by ear, split the way listening research splits it.',
        subs: [
          { name: 'Gist',                pct: 70, note: 'catch the overall meaning of a story' },
          { name: 'Detail',              pct: 58, note: 'specific facts at native speed' },
          { name: 'Inference',           pct: 45, note: 'what’s meant but never said' },
          { name: 'Tone discrimination', pct: 61, note: 'mǎi vs mài, shū vs shú — by ear alone' }
        ] },
      reading: { pct: 48, label: 'Reading', icon: 'read', color: 'amber', meta: '12 stories read', pos: [14, 66],
        desc: 'Volume plus precision: lots of easy reading, a little hard reading.',
        subs: [
          { name: 'Character recognition', pct: 52, note: '~980 characters read on sight' },
          { name: 'Extensive reading',     pct: 58, note: 'long easy stories built from your own pieces' },
          { name: 'Scanning',              pct: 45, note: 'find the fact fast — real Chinese headlines' },
          { name: 'Intensive reading',     pct: 40, note: 'short hard texts, every character accounted for' }
        ] },
      writing: { pct: 26, label: 'Writing', icon: 'pen', color: 'rose', meta: '9 notes written', pos: [76, 78],
        desc: 'The quiet skill — trained in chat mode, where your AI corrects as you type.',
        subs: [
          { name: 'Pinyin typing',     pct: 41, note: 'picking the right character from the IME list' },
          { name: 'Messages & chat',   pct: 34, note: 'informal register, WeChat-ready' },
          { name: 'Sentence building', pct: 28, note: 'word order, connectors, particles' },
          { name: 'Handwriting',       pct: 12, note: 'stroke order — the slow burn' }
        ] }
    },
    plans: [
      { id: 'w33', title: 'Week 33', topic: 'Food & getting around', range: '11 – 17 Aug', status: 'past', pos: [13, 25],
        focus: 'restaurant & travel basics',
        lessons: [
          { n: 1, title: 'Menu survival', mins: 12, done: true, icon: 'coffee', color: 'amber', mode: 'reading',
            obj: 'Order in a small restaurant without switching to English.',
            steps: [
              { k: 'vocab', name: 'New: 点菜, 买单, 好吃', min: 4, d: 'menu pieces in context' },
              { k: 'story', name: 'Story: 「在小饭馆」', min: 4, d: '68 pieces, 95% already known' },
              { k: 'cards', name: 'Flashcards', min: 4, d: 'see English, answer in Chinese' }
            ],
            mats: [{ t: 'story', name: '在小饭馆', d: 'generated from your vocabulary' }],
            words: ['点菜', '买单', '好吃'], grammar: ['Measure words'],
            log: ['3/3 new pieces recalled next day', 'tone on 买单 (mǎidān) drifted twice'] },
          { n: 2, title: 'Ordering & paying', mins: 14, done: true, icon: 'chat', color: 'coral', mode: 'voice',
            obj: 'Hold a full restaurant exchange by voice.',
            steps: [
              { k: 'warm', name: 'Recall menu pieces aloud', min: 3, d: '' },
              { k: 'talk', name: 'Roleplay: order dinner for two', min: 7, d: 'AI plays the waiter, at slow pace' },
              { k: 'cards', name: 'Flashcards: polite forms', min: 4, d: '请、麻烦你、可以吗' }
            ],
            mats: [{ t: 'audio', name: 'Waiter dialogue (0.8×)', d: 'slowed native audio' }],
            words: ['请', '麻烦你'], grammar: ['Word order & time'],
            log: ['ordering fluent', 'numbers above 100 still slow'] },
          { n: 3, title: 'Directions & transport', mins: 15, done: true, icon: 'globe', color: 'teal', mode: 'voice',
            obj: 'Never be lost in a Chinese city again.',
            steps: [
              { k: 'vocab', name: 'New: 火车, 城市, 拐弯', min: 4, d: '' },
              { k: 'story', name: 'Story: 「最后一班火车」', min: 5, d: 'with two comprehension questions' },
              { k: 'talk', name: 'Ask & give directions', min: 6, d: 'AI describes, you navigate' }
            ],
            mats: [{ t: 'story', name: '最后一班火车', d: 'HSK 3, 了-aspect seeds' }],
            words: ['火车', '城市'], grammar: ['了 (completed)'],
            log: ['gist 100%', 'detail questions 1/2'] },
          { n: 4, title: 'Hotel check-in', mins: 12, done: true, icon: 'tag', color: 'violet', mode: 'chat',
            obj: 'Survive reception, complaints included — typed, WeChat register.',
            steps: [
              { k: 'talk', name: 'Roleplay: check-in with a problem', min: 8, d: 'the room is wrong — fix it politely' },
              { k: 'cards', name: 'Flashcards: hotel pack', min: 4, d: '' }
            ],
            mats: [{ t: 'pack', name: 'Hotel pack · 6 pieces', d: '' }],
            words: ['房间', '钥匙'], grammar: ['把 construction'],
            log: ['complaint handled with humour', '把 used correctly 4/5'] },
          { n: 5, title: 'Review & exam', mins: 18, done: true, icon: 'star', color: 'blue', mode: 'voice',
            obj: 'Prove week 33 stuck; seed week 34.',
            steps: [
              { k: 'cards', name: 'All 11 practice pieces', min: 6, d: '' },
              { k: 'exam', name: 'Free conversation exam', min: 8, d: 'graded on the CEFR speaking aspects' },
              { k: 'plan', name: 'AI writes week 34', min: 2, d: 'create_plan → news & slang' }
            ],
            mats: [{ t: 'rubric', name: 'CEFR-lite exam rubric', d: '' }],
            words: [], grammar: [],
            log: ['9/11 mastered', 'fluency +4', 'goal shift logged: “more news, more slang”'] }
        ] },
      { id: 'w34', title: 'Week 34', topic: 'News, slang & talk', range: '18 – 24 Aug', status: 'current', pos: [13, 47],
        focus: 'news, slang & conversation',
        lessons: [
          { n: 1, title: 'Greetings & recall', mins: 10, done: true, icon: 'chat', color: 'blue', mode: 'voice',
            obj: 'Re-activate what you already own before the new week begins.',
            steps: [
              { k: 'warm', name: 'Rapid recall: 10 known pieces', min: 3, d: 'AI prompts in English, you answer by voice' },
              { k: 'talk', name: 'Micro-conversation: introduce yourself', min: 4, d: 'name, city, why Chinese' },
              { k: 'cards', name: 'Flashcards: greetings pack', min: 3, d: '' }
            ],
            mats: [{ t: 'pack', name: 'Greetings pack · 8 pieces', d: 'from week 32' }],
            words: ['你好', '谢谢'], grammar: ['Word order & time'],
            log: ['10/10 recalled', 'tone pair in 你好 (nǐ hǎo) now solid'],
            parts: [
              { kind: 'drill', name: 'Recall drill · 10', icon: 'mic', color: 'blue', prompts: [
                { q: 'hello', a: '你好 nǐ hǎo' }, { q: 'thank you', a: '谢谢 xièxie' }, { q: 'the bill', a: '买单 mǎidān' },
                { q: 'train', a: '火车 huǒchē' }, { q: 'city', a: '城市 chéngshì' }, { q: 'beach', a: '海滩 hǎitān' },
                { q: 'friend', a: '朋友 péngyou' }, { q: 'to travel', a: '旅行 lǚxíng' }, { q: 'to understand', a: '明白 míngbai' },
                { q: 'by the way', a: '顺便说 shùnbiàn shuō' }] },
              { kind: 'script', name: 'Teaching script', icon: 'mic', color: 'coral', lines: [
                { s: 'CUE', t: 'Voice mode. Fast pace — this is a warm-up, not a lesson. 10 minutes hard cap.' },
                { s: 'AI', t: 'English prompt, Chinese answer, no thinking time: hello… thank you… the bill…' },
                { s: 'IF', t: 'Any word takes >3s: note it, keep moving, drill it again at the end.' },
                { s: 'AI', t: '自我介绍 — name, city, and why Chinese. One follow-up question, then wrap.' }] }
            ] },
          { n: 2, title: 'First news words', mins: 15, done: true, icon: 'news', color: 'violet', mode: 'reading',
            obj: 'Meet the five core news pieces — in context, never as a list. A reading lesson: no microphone, just text.',
            steps: [
              { k: 'vocab', name: 'New: 新闻、标题、政府、调查、罢工', min: 5, d: 'each inside a real sentence' },
              { k: 'story', name: 'Micro-story: 「地铁罢工」', min: 4, d: '72 pieces, 96% already known' },
              { k: 'story', name: 'Tap-to-read check', min: 3, d: 'unknown characters reveal pinyin — an MCP app in your chat' },
              { k: 'cards', name: 'Flashcards EN→中文', min: 3, d: 'flashcard app, tap to flip' }
            ],
            mats: [
              { t: 'story', name: '地铁罢工', d: 'generated from your vocabulary + 5 new pieces' },
              { t: 'pack', name: 'News pack · 5 pieces', d: 'suggested by goal: “follow Chinese news”' }
            ],
            words: ['新闻', '标题', '政府', '调查', '罢工'], grammar: ['Measure words'],
            log: ['4/5 recalled next day', '调查 shaky — flagged for lesson 3'],
            parts: [
              { kind: 'script', name: 'Teaching script', icon: 'read', color: 'violet', lines: [
                { s: 'CUE', t: 'Reading mode — no microphone. Everything happens in chat, materials render as MCP apps.' },
                { s: 'AI', t: '五个新词，一个一个来 — each word arrives inside a real sentence, never as a list.' },
                { s: 'AI', t: 'Serve the story as ui://olt/story with tap-to-reveal pinyin. No audio version.' },
                { s: 'IF', t: 'More than 4 taps on the same word: queue it for tomorrow’s warm-up via add_words.' },
                { s: 'AI', t: 'Close with flashcards EN→中文, typed answers. Accept pinyin, praise characters.' }] },
              { kind: 'story', name: 'Story · 地铁罢工 (v1)', icon: 'read', color: 'teal',
                stats: '72 pieces · 96% known · seeds: 了, 条',
                html: '今天早上，<span class="zi" data-py="标题 biāotí — headline">标题</span>写着：地铁<span class="zi" data-py="罢工 bàgōng — to strike">罢工</span>。很多人只好走路上班。',
                en: 'This morning the headline read: subway strike. Many people had no choice but to walk to work.',
                qs: ['标题说了什么？ — What did the headline say?'] },
              { kind: 'deck', name: 'News pack · 5', icon: 'book', color: 'blue', cards: [
                { zh: '新闻', en: 'xīnwén · the news', p: 2 }, { zh: '标题', en: 'biāotí · headline', p: 1 },
                { zh: '政府', en: 'zhèngfǔ · government', p: 2 }, { zh: '调查', en: 'diàochá · survey', p: 1 },
                { zh: '罢工', en: 'bàgōng · strike', p: 0 }] }
            ] },
          { n: 3, title: 'News in conversation', mins: 15, done: false, today: true, icon: 'mic', color: 'coral', mode: 'voice',
            obj: 'Push the news pieces from recognition into speech.',
            steps: [
              { k: 'warm', name: 'Review lesson-2 words aloud', min: 3, d: 'open with 调查 — it was shaky' },
              { k: 'story', name: 'Story recall: questions on 「地铁罢工」', min: 4, d: 'gist first, then two detail questions' },
              { k: 'talk', name: 'Conversation: 你这周看了什么新闻？', min: 5, d: 'AI corrects gently, keeps the flow' },
              { k: 'cards', name: 'Voice flashcards to close', min: 3, d: 'all five news pieces + 不过' }
            ],
            mats: [
              { t: 'story', name: '地铁罢工 (reprise)', d: 'same story, harder questions' },
              { t: 'news', name: '3 real headlines · 人民日报', d: 'scan for the one about transport' }
            ],
            words: ['新闻', '标题', '调查', '不过'], grammar: ['了 (completed)'],
            note: 'From lesson 2: “调查 still shaky — open with it.”',
            parts: [
              { kind: 'script', name: 'Teaching script', icon: 'mic', color: 'coral', lines: [
                { s: 'CUE', t: 'Voice mode. Keep every AI turn under 12 seconds. Correct tones by echo, never by lecture.' },
                { s: 'AI', t: '今天我们聊新闻。Repeat after me: 新闻 xīnwén… 标题 biāotí… 调查 diàochá.' },
                { s: 'YOU', t: '新闻… 标题… 调查。' },
                { s: 'IF', t: '调查 tone drifts: echo the pair 调查/调查 once, then move on. Max one retry — no tone lectures.' },
                { s: 'AI', t: '很好。Now the story — I read, you follow in the reader (ui://olt/story).' },
                { s: 'AI', t: '第一个问题：标题说了什么？ — expected: 地铁罢工 / the subway strike.' },
                { s: 'AI', t: '第二个问题：根据调查，政府怎么样？ — expected: 失去了支持 (losing support).' },
                { s: 'AI', t: 'Conversation: 你这周看了什么新闻？ Follow up twice; feed 不过 if the learner contrasts two ideas.' },
                { s: 'IF', t: 'Learner stalls >5s: offer the scaffold 我看了一条关于…的新闻 and let them finish it.' },
                { s: 'AI', t: 'Flashcards to close (ui://olt/flashcards): 标题, 调查, 罢工, 政府, 不过 — EN prompt, 中文 answer.' },
                { s: 'CUE', t: 'Wrap: update_word_strength, then complete_lesson with a note for lesson 4.' }] },
              { kind: 'story', name: 'Story · 地铁罢工', icon: 'read', color: 'teal',
                stats: '72 pieces · 96% known · seeds: 了 (completed), 条 (measure word)',
                html: '今天早上，<span class="zi" data-py="标题 biāotí — headline">标题</span>写着：地铁<span class="zi" data-py="罢工 bàgōng — to strike">罢工</span>。很多人只好走路上班。根据一项<span class="zi" data-py="调查 diàochá — survey, poll">调查</span>，<span class="zi" data-py="政府 zhèngfǔ — government">政府</span>已经失去了很多支持。<span class="zi" data-py="不过 búguò — however">不过</span>，也有人说：走路挺好的！',
                en: 'This morning the headline read: subway strike. Many people had no choice but to walk to work. According to a survey, the government has already lost a lot of support. However, some people said: walking is actually quite nice!',
                qs: ['标题说了什么？ — What did the headline say?', '根据调查，政府怎么样？ — What is happening to the government?'] },
              { kind: 'news', name: 'Real headlines · 3', icon: 'news', color: 'violet', items: [
                { zh: '多地地铁将延长运营时间', py: 'Metro hours to be extended in several cities', src: '人民网 · people.com.cn', url: 'https://www.people.com.cn', diff: '82% known', task: 'Scan: which word means “extend”?' },
                { zh: '调查显示：年轻人更爱坐高铁', py: 'Survey: young people prefer high-speed rail', src: '新华网 · news.cn', url: 'https://www.news.cn', diff: '76% known', task: 'Find 调查 in the wild.' },
                { zh: '今日头条：城市交通新政策', py: 'Today’s headline: new urban transport policy', src: '央视网 · cctv.com', url: 'https://news.cctv.com', diff: '71% known', task: 'Read the headline aloud — tones count.' }] },
              { kind: 'deck', name: 'Flashcard deck · 6', icon: 'book', color: 'blue', cards: [
                { zh: '新闻', en: 'xīnwén · the news', p: 2 }, { zh: '标题', en: 'biāotí · headline', p: 1 },
                { zh: '调查', en: 'diàochá · survey', p: 1 }, { zh: '罢工', en: 'bàgōng · strike', p: 0 },
                { zh: '政府', en: 'zhèngfǔ · government', p: 2 }, { zh: '不过', en: 'búguò · however', p: 1 }] }
            ] },
          { n: 4, title: 'Slang starter', mins: 15, done: false, icon: 'tag', color: 'rose', mode: 'chat',
            obj: 'First real slang — sound like a person, not a textbook. Runs in chat, where slang actually lives.',
            steps: [
              { k: 'vocab', name: 'New: 给力、靠谱、老铁、躺平', min: 4, d: 'register notes: with friends, never with your boss' },
              { k: 'story', name: 'Dialogue: running into a friend', min: 4, d: 'street pace, real fillers' },
              { k: 'talk', name: 'Roleplay the dialogue, swap roles', min: 5, d: 'you start the second run' },
              { k: 'cards', name: 'Flashcards 中文→EN', min: 2, d: '' }
            ],
            mats: [
              { t: 'audio', name: 'Street-pace dialogue (1.0×)', d: 'first full-speed material this week' },
              { t: 'pack', name: 'Slang pack · 4 pieces', d: 'goal: “real slang, not textbook stuff”' }
            ],
            words: ['给力', '靠谱', '老铁', '躺平'], grammar: [],
            parts: [
              { kind: 'script', name: 'Teaching script', icon: 'chat', color: 'rose', lines: [
                { s: 'CUE', t: 'Chat mode. Match the learner’s energy. Slang register: friends only — flag it every time.' },
                { s: 'AI', t: '开场：老铁！最近怎么样？ — wait for a typed reply, any register is fine.' },
                { s: 'AI', t: 'Introduce 给力 / 靠谱 / 躺平 one at a time, each inside a two-line chat exchange.' },
                { s: 'IF', t: 'Learner uses slang in the wrong register (e.g. to a boss): laugh, then show the neutral version.' },
                { s: 'AI', t: 'Roleplay: plan a weekend over chat, using at least two slang pieces. Then swap roles.' }] },
              { kind: 'story', name: 'Dialogue · 老铁！', icon: 'chat', color: 'coral',
                stats: 'chat register · street pace · 4 slang seeds',
                html: '— <span class="zi" data-py="老铁 lǎotiě — buddy, mate">老铁</span>！周末去看演出吗？<br>— 什么演出？<span class="zi" data-py="靠谱 kàopǔ — reliable, legit">靠谱</span>吗？<br>— 特别<span class="zi" data-py="给力 gěilì — awesome">给力</span>的乐队！<br>— 行，不想在家<span class="zi" data-py="躺平 tǎngpíng — to coast, opt out">躺平</span>了，走！',
                en: '— Mate! Gig this weekend? — What gig? Is it legit? — A seriously awesome band! — Fine, I’m done coasting at home. Let’s go!',
                qs: ['谁不想躺平了？ — Who is done coasting at home?'] },
              { kind: 'deck', name: 'Slang pack · 4', icon: 'tag', color: 'rose', cards: [
                { zh: '给力', en: 'gěilì · awesome', p: 1 }, { zh: '靠谱', en: 'kàopǔ · reliable, legit', p: 2 },
                { zh: '老铁', en: 'lǎotiě · buddy, mate', p: 0 }, { zh: '躺平', en: 'tǎngpíng · to coast', p: 0 }] }
            ] },
          { n: 5, title: 'Review & mini exam', mins: 20, done: false, icon: 'star', color: 'amber', mode: 'voice',
            obj: 'Prove the week stuck — then let the AI write the next one.',
            steps: [
              { k: 'cards', name: 'All 12 practice pieces', min: 5, d: 'three solid recalls each to graduate' },
              { k: 'talk', name: 'Free conversation using ≥8 pieces', min: 8, d: 'topic of your choice' },
              { k: 'exam', name: 'AI grades the week', min: 4, d: 'recall, fluency, coherence — CEFR-lite' },
              { k: 'plan', name: 'AI writes week 35', min: 2, d: 'create_plan, after reviewing results' }
            ],
            mats: [{ t: 'rubric', name: 'CEFR-lite exam rubric', d: 'the same five spoken-language aspects' }],
            words: [], grammar: ['是…的 (emphasis)'],
            parts: [
              { kind: 'rubric', name: 'Exam rubric · CEFR-lite', icon: 'star', color: 'amber', rows: [
                { a: 'Fluency', d: 'Keeps going 60s+ on a familiar topic; pauses to think, not to translate.' },
                { a: 'Tones', d: 'Core pairs stable (调查, 政府); self-corrects without prompting.' },
                { a: 'Accuracy', d: '了 and measure words right in 4 of 5 sentences.' },
                { a: 'Interaction', d: 'Asks at least two questions back; repairs a breakdown in Chinese.' },
                { a: 'Coherence', d: 'Links ideas with 不过 / 因为 / 所以 at least three times.' }] },
              { kind: 'script', name: 'Exam flow', icon: 'mic', color: 'coral', lines: [
                { s: 'CUE', t: 'Voice mode. Grade silently during the conversation — never break the flow to score.' },
                { s: 'AI', t: 'Flashcards first: all 12 practice pieces, shuffled, EN→中文.' },
                { s: 'AI', t: 'Free conversation, learner picks the topic. Steer gently toward this week’s pieces.' },
                { s: 'CUE', t: 'Score against the rubric, read the verdict kindly, then call create_plan for week 35.' }] }
            ] }
        ] },
      { id: 'w35', title: 'Week 35', topic: 'Not written yet', range: '25 – 31 Aug', status: 'future', pos: [13, 76] }
    ]
  };
