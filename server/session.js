const sessions = new Map(); // sessionId -> {turns:string[], askedCounts:Record<string,number>, lastQuestions:Record<string,string>, createdAt:number}

export function getSession(sessionId){
  if (!sessionId) sessionId = 'anon';
  if (!sessions.has(sessionId)){
    sessions.set(sessionId, { turns: [], askedCounts: {}, lastQuestions: {}, createdAt: Date.now() });
  }
  return sessions.get(sessionId);
}

export function rememberTurn(sessionId, text){
  const s = getSession(sessionId);
  s.turns.push(String(text||''));
}

export function getAskCount(sessionId, field){
  const s = getSession(sessionId);
  return s.askedCounts[field] || 0;
}

export function incrementAsk(sessionId, field, question){
  const s = getSession(sessionId);
  s.askedCounts[field] = (s.askedCounts[field] || 0) + 1;
  if (question) s.lastQuestions[field] = question;
}

export function getLastQuestion(sessionId, field){
  const s = getSession(sessionId);
  return s.lastQuestions[field] || "";
}

export function getTurns(sessionId, lastN=6){
  const s = getSession(sessionId);
  return s.turns.slice(-lastN);
}
