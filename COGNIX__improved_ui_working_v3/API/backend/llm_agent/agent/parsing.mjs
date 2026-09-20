// Deliberately narrow parser for the existing one-force, one-mass MVP.
// Never infer a final answer from the last arbitrary number in working.
const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?`;
const clean = text => String(text).replace(/−/g, '-').replace(/([+-])\s+(?=[\d.])/g, '$1').trim();

function quantity(question, unit) {
  const pattern = new RegExp(String.raw`(?<![\w.,+\-/])(${NUMBER})\s*${unit}\b`, 'gi');
  const matches = [...question.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error('This MVP supports a question with exactly one mass in kg and one net force in N.');
  }
  return Number(matches[0][1]);
}

export function parseAttempt(attempt) {
  // A final line, assignment or explicit final-answer label separates working
  // from the submitted result. Expressions without a result stay unverified.
  let final = clean(attempt).split(/\r?\n/).filter(line => line.trim()).at(-1) || '';
  final = final.split(/(?:final\s+answer|answer|acceleration)\s*(?:is|:|=)\s*/i).at(-1);
  final = final.split('=').at(-1).trim();
  const result = final.match(new RegExp(String.raw`^(${NUMBER})\s*(m\s*\/\s*s(?:\s*(?:\^\s*2|2|²))?|N|kg)?\s*[.!]?$`, 'i'));
  if (!result || !Number.isFinite(Number(result[1]))) return {submitted: null, hasUnits: false};
  const units = (result[2] || '').replace(/\s/g, '').toLowerCase();
  return {submitted: Number(result[1]), hasUnits: ['m/s²', 'm/s^2', 'm/s2'].includes(units)};
}

export function parseProblem(question, attempt) {
  question = clean(question);
  if (!/\bacceleration\b/i.test(question)) {
    throw new Error('This MVP supports net-force questions asking for acceleration.');
  }
  const mass = quantity(question, 'kg');
  const force = quantity(question, 'N');
  if (!(mass > 0 && mass <= 10000 && force > 0 && force <= 100000)) {
    throw new Error('Use a positive mass and net force within the demo range.');
  }
  const {submitted, hasUnits} = parseAttempt(attempt);
  const expected = force / mass;
  return {mass, force, expected, submitted, hasUnits,
    numericCorrect: submitted !== null && Math.abs(submitted - expected) < 1e-6};
}
