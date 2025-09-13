const urlRe = /(https?:\/\/[^\s)]+)$/gim;
const dateRe = /(\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4}\b|\bby\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;
const audienceWords = /(boss|manager|client|customer|judge|board|students|non-technical|technical)/i;
const desiredWords = /(bullet|bulleted|email|memo|summary|json|table|outline|steps|plan|checklist|script|letter)/i;
const domainHints = [
  {re:/lease|tenancy|landlord|tenant|lawsuit|contract|appeal|subpoena|pdpa|statute|regulation/i, val:'legal'},
  {re:/bug|error|exception|stack trace|node|react|python|javascript|java|api|database|sql|frontend|backend/i, val:'coding'},
  {re:/paper|research|literature|citation|abstract|hypothesis|survey/i, val:'research'},
  {re:/plan|roadmap|milestone|deadline|budget|stakeholder/i, val:'planning'}
];
const jurisdictionMap = [
  {re:/\bsg\b|singapore/i, val:'SG'},
  {re:/\buk\b|united kingdom|england|wales|scotland/i, val:'UK'},
  {re:/\beu\b|european union|eu law/i, val:'EU'},
  {re:/\bus\b|united states|usa/i, val:'US'},
  {re:/\b(australia|au)\b/i, val:'AU'},
  {re:/\b(india|in)\b/i, val:'IN'}
];

function pickFirst(arr) { return arr && arr.length ? arr[0] : ""; }

export function softInfer(prevBrief, turns, latest){
  const brief = {...prevBrief};
  const text = [ ...(turns||[]), latest||'' ].join('\n').slice(-2000);

  if (!brief.domain){
    for (const h of domainHints){ if (h.re.test(text)) { brief.domain = h.val; break; } }
  }
  if (!brief.jurisdiction){
    for (const j of jurisdictionMap){ if (j.re.test(text)) { brief.jurisdiction = j.val; break; } }
  }
  if (!brief.resources){
    const urls = text.match(urlRe);
    if (urls && urls.length) brief.resources = pickFirst(urls);
  }
  if (!brief.constraints){
    const date = text.match(dateRe);
    if (date) brief.constraints = `Deadline/constraint detected: ${date[0]}`;
    const word = text.match(/\b(\d{2,4})\s*(words|tokens|chars)\b/i);
    if (word) brief.constraints = (brief.constraints ? brief.constraints + '; ' : '') + `Length: ${word[0]}`;
    const tone = text.match(/\b(formal|friendly|neutral|concise|professional)\b/i);
    if (tone) brief.constraints = (brief.constraints ? brief.constraints + '; ' : '') + `Tone: ${tone[0]}`;
  }
  if (!brief.desired_output){
    const m = text.match(desiredWords);
    if (m) brief.desired_output = `Please produce a ${m[0]}`;
  }
  if (!brief.audience){
    const m = text.match(audienceWords);
    if (m) brief.audience = m[0];
  }
  if (!brief.goal){
    const first = (latest||'').split(/[.!?]\s/)[0];
    if (first && first.length >= 8) brief.goal = first.trim();
  }
  if (!brief.facts){
    const rest = (latest||'').replace(/^.*?[.!?]\s/,'').trim();
    if (rest && rest.length >= 20) brief.facts = rest;
  }
  if (!brief.success_criteria){
    const pct = text.match(/\b\d{1,3}%\b/);
    if (pct) brief.success_criteria = `Success: achieve ${pct[0]}`;
    const metric = text.match(/\b(KPI|metric|score|grade|uptime|latency)\b/i);
    if (metric) brief.success_criteria = (brief.success_criteria ? brief.success_criteria + '; ' : '') + `Metric: ${metric[0]}`;
  }
  return brief;
}
