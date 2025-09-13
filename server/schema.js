export const FIELDS = ["domain","goal","facts","obstacles","resources","constraints","examples","audience","desired_output","success_criteria","jurisdiction"];
export const EMPTY_BRIEF = Object.fromEntries(FIELDS.map(k => [k, ""])); EMPTY_BRIEF["pii_flags"] = [];
export function fieldStatus(brief){ const s={}; for (const k of FIELDS){ const v=(brief?.[k]??""); s[k]=!!String(v).trim(); } return s; }
export function completionPercent(brief){ const s=fieldStatus(brief); const t=Object.keys(s).length; const d=Object.values(s).filter(Boolean).length; return Math.round((d/t)*100); }
