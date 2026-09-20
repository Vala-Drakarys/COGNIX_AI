import {retrieve} from '../retrieval/index.mjs';

export async function findEducationalCases(datasetDir, query, limit = 8) {
  const docs = await retrieve(query, {datasetDir, limit});
  return docs
    .map(doc => doc.metadata || doc)
    .filter(doc => doc && typeof doc.diagnostic_question === 'string' && typeof doc.candidate_hypothesis === 'string');
}

export function educationalQuestion(c) {
  return {
    id: c.id,
    h: c.candidate_hypothesis,
    prompt: c.diagnostic_question,
    choices: [],
    reason: [
      `Expected answer: ${c.expected_answer}`,
      `Evidence if correct: ${c.evidence_if_correct}`,
      `Evidence if wrong: ${c.evidence_if_wrong}`
    ].join(' '),
    dataset: c
  };
}

export function findEducationalQuestion(run, id) {
  const found = run.education?.candidates?.find(c => c.id === id);
  return found ? educationalQuestion(found) : null;
}

export function evaluateEducationalLocally(q, answer) {
  const expected = String(q.dataset?.expected_answer || '').toLowerCase();
  const text = String(answer || '').toLowerCase();
  const phrases = expected
    .split(/[,.;:()\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
    .slice(0, 3);
  if (phrases.some(phrase => text.includes(phrase))) {
    return {classification: 'pass', quote: answer, note: q.dataset.evidence_if_correct};
  }
  if (/^(i\s*don't\s*know|i\s*am\s*not\s*sure|not\s*sure|unsure|unknown)\.?$/i.test(text.trim())) {
    return {classification: 'uncertain', quote: answer, note: 'The student expressed uncertainty; no mistake is inferred.'};
  }
  return {classification: 'uncertain', quote: answer, note: 'The response could not be matched reliably. A different check is needed; the app will not guess.'};
}
