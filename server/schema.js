export const FIELDS = [
  "domain","goal","facts","obstacles","resources",
  "constraints","examples","audience","desired_output",
  "success_criteria","jurisdiction"
];

export const EMPTY_BRIEF = Object.fromEntries(FIELDS.map(k => [k, ""]));
EMPTY_BRIEF["pii_flags"] = [];

export function fieldStatus(brief){
  const status = {};
  for (const k of FIELDS){
    const v = (brief?.[k] ?? "");
    status[k] = !!String(v).trim();
  }
  return status;
}

export function completionPercent(brief){
  const status = fieldStatus(brief);
  const total = Object.keys(status).length;
  const done = Object.values(status).filter(Boolean).length;
  return Math.round((done/total) * 100);
}
