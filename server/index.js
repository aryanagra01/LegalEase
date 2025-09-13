import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { FIELDS, EMPTY_BRIEF, fieldStatus, completionPercent } from './schema.js';
import { getSession, rememberTurn, getAskCount, incrementAsk, getLastQuestion, getTurns } from './session.js';
import { softInfer } from './inference.js';
import { COACH_PROMPT } from './coach.js';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.get('/api/health', (_req, res) => res.json({ ok: true, model: MODEL }));

app.post('/api/coach/next', async (req, res) => {
  try {
    const { sessionId = 'anon', brief = EMPTY_BRIEF, user_input = "" } = req.body || {};
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    rememberTurn(sessionId, user_input);

    const turns = getTurns(sessionId);
    const inferred = softInfer({ ...EMPTY_BRIEF, ...brief }, turns, user_input);

    const status = fieldStatus(inferred);
    const percent = completionPercent(inferred);
    const totalTurns = getSession(sessionId).turns.length;

    const askCounts = Object.fromEntries(FIELDS.map(f => [f, getAskCount(sessionId, f)]));
    const allowedReask = FIELDS.filter(f => !status[f] && askCounts[f] < 3);
    const hardAvoid = FIELDS.filter(f => status[f] || askCounts[f] >= 3);
    const prevQuestions = Object.fromEntries(FIELDS.map(f => [f, getLastQuestion(sessionId, f)]));

    const phaseHint = (percent >= 80 || totalTurns >= 8) ? 'confirm' : 'gather';

    const messages = [
      { role: 'system', content: COACH_PROMPT },
      { role: 'user', content:
`Fields: ${JSON.stringify(FIELDS)}
Inferred Brief JSON (server): ${JSON.stringify(inferred)}
Field completion status: ${JSON.stringify(status)}
Completion percent (server): ${percent}
Phase hint (server): ${phaseHint}

Re-ask cap per field: 3
Ask counts so far: ${JSON.stringify(askCounts)}
Fields allowed to re-ask now: ${JSON.stringify(allowedReask)}
Fields to avoid (done or cap reached): ${JSON.stringify(hardAvoid)}
Previous question wordings per field: ${JSON.stringify(prevQuestions)}

User latest message:
<<<
${user_input}
>>>

Follow the re-ask policy (if you re-ask, change the wording and include examples/choices/template). Return JSON as specified.` }
    ];

    const r = await client.responses.create({ model: MODEL, input: messages });
    const text = r.output_text || (r.output?.[0]?.content?.[0]?.text) || '';
    let out;
    try { out = JSON.parse(text); }
    catch {
      const start = text.indexOf('{'); const end = text.lastIndexOf('}');
      if (start>=0 && end>start) { try { out = JSON.parse(text.slice(start, end+1)); } catch { out = { error:'parse_failed', raw:text }; } }
      else { out = { error:'parse_failed', raw: text }; }
    }

    const updated = { ...inferred, ...(out.updated_brief || {}) };

    if (out.target_field && out.question) {
      incrementAsk(sessionId, out.target_field, out.question);
    }

    const newStatus = fieldStatus(updated);
    const newPercent = completionPercent(updated);

    let phase = out.phase || phaseHint;
    if (phase === 'final' && newPercent < 100) phase = 'confirm';

    res.json({
      phase,
      target_field: out.target_field || null,
      question: out.question || (phase === 'confirm' ? 'Please review your brief. Does everything look okay? (yes/no)' : 'What would help most next?'),
      why_it_matters: out.why_it_matters || 'This will improve the prompt quality.',
      updated_brief: updated,
      progress: Math.max(newPercent, out.progress || 0),
      gold_prompt: out.gold_prompt,
      verify_list: out.verify_list,
      _field_status: newStatus,
      _ask_counts: Object.fromEntries(FIELDS.map(f => [f, getAskCount(sessionId, f)]))
    });
  } catch (err) {
    console.error('Coach error:', err?.status, err?.message);
    res.status(500).json({ error: 'coach_failed', detail: err?.message || String(err) });
  }
});

app.listen(PORT, () => console.log(`Ms LegalEase server on http://localhost:${PORT}`));
