const sessions=new Map();
export function getSession(id){ if(!id) id='anon'; if(!sessions.has(id)){ sessions.set(id,{turns:[],askedCounts:{},lastQuestions:{},createdAt:Date.now()}); } return sessions.get(id); }
export function rememberTurn(id, text){ getSession(id).turns.push(String(text||'')); }
export function getAskCount(id, f){ return getSession(id).askedCounts[f]||0; }
export function incrementAsk(id, f, q){ const s=getSession(id); s.askedCounts[f]=(s.askedCounts[f]||0)+1; if(q) s.lastQuestions[f]=q; }
export function getLastQuestion(id,f){ return getSession(id).lastQuestions[f]||""; }
export function getTurns(id,n=6){ return getSession(id).turns.slice(-n); }
