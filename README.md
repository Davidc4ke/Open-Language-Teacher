# Open Language Teacher

A web app for learning any language — where **your data lives in the app, but your own AI does the teaching**, connected over MCP. Built with ChatGPT voice mode as the flagship use case.

## The core idea

1. **Your data lives here.** Profile, known-vocabulary ledger, learning queue, and short-term lesson plans. Plain, portable data — no AI inside the app.
2. **Your own AI teaches.** ChatGPT (especially voice mode), Claude, or any MCP-capable agent holds the actual lessons in its own chat/voice interface.
3. **MCP connects them.** The AI pulls the next lesson, follows the app's lesson-authoring guide, and writes results back when the session ends.

## User journeys

### Onboarding (happens entirely in your AI)
- Create a profile in the web app, get a pairing code.
- Add the app's MCP server as a connector in your AI, then say *"link my Open Language Teacher profile"*.
- The AI asks how many words you know and what your goals are (conversation, reading, news from the language's home country, slang, specific subjects…).
- It reads the app's **lesson-authoring guide** (an MCP resource) and writes a **short-term plan — always 3–7 days** — plus an initial learning queue of words.

### A lesson (chat or voice)
- Say *"start my next lesson"* — the AI calls `get_next_lesson` and runs it: warm-up recall → new vocab → the words in a story/dialogue → conversation practice → voice flashcards.
- At the end it calls `update_word_strength` and `complete_lesson` with notes for tomorrow.
- At the end of each week, the AI reviews results and writes the next short plan. Easy iterations, never grand curricula.

## The skill map — who creates the nodes

Language is tracked as a node map, not a word list: six skills (Vocabulary, Grammar, Speaking, Listening, Reading, Writing), each expanding into subtopics (vocabulary themes, grammar concepts, the CEFR spoken-language aspects, listening/reading sub-skills…).

**The contract:**

- **The AI is fully in control of creating every node, dynamically.** Skill nodes, subtopics, word groups — all created, extended, renamed and graded by the learner's own AI through MCP tools (`add_subtopics`, `update_skill`, `update_word_strength`). "Add a football vocabulary pack" in voice mode → a new node appears.
- **The web app instructs a standard starting set over MCP.** A `get_skill_taxonomy` resource suggests the common scaffold — the six skills and their research-backed default subtopics (e.g. CEFR's five spoken-language aspects: fluency, pronunciation, accuracy, interaction, coherence; listening gist/detail/inference; extensive vs intensive reading). The AI reads it during onboarding and uses it as the baseline, then grows the map from what the learner actually does.

So the app owns the *schema and the score*; the AI owns the *content and the pedagogy*.

## MCP tool surface (draft)

| Tool | Purpose |
| --- | --- |
| `get_profile` / `update_profile` | read/save level, goals, native language |
| `get_plan_instructions` | resource: how the app wants plans & lessons structured |
| `get_skill_taxonomy` | resource: the suggested standard skill/subtopic scaffold |
| `add_subtopics` / `update_skill` | create new nodes on the skill map; write graded results |
| `create_plan` | write a short-term plan (3–7 days max) |
| `get_vocab` / `add_words` | read lists; queue new words with examples |
| `update_word_strength` | record recall results after drills |
| `get_next_lesson` / `complete_lesson` | pull today's lesson; mark done with notes |
| `log_session` | store a session summary for plan iteration |

## This repo

`index.html` — an interactive, self-contained mockup of the web app. It includes a "Your AI · voice mode" panel that simulates ChatGPT driving the app over MCP: play the **onboarding** or **voice lesson** scenario and watch tool calls stream in while the app's data updates live. Open the file in any browser; no build step.
