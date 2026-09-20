const plainObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateInterpretation(value) {
  if (!plainObject(value)) return false;
  if (Object.keys(value).some(k => !['classification','quote','note'].includes(k))) return false;
  return ['pass','fail','uncertain'].includes(value.classification)
    && typeof value.quote === 'string' && value.quote.length <= 1000
    && typeof value.note === 'string' && value.note.length <= 500;
}

export function validatePlan(value) {
  if (!plainObject(value)) return false;
  if (Object.keys(value).some(k => !['hypothesis','question_id','question'].includes(k))) return false;
  return typeof value.hypothesis === 'string' && value.hypothesis.length > 0 && value.hypothesis.length <= 80
    && typeof value.question_id === 'string' && value.question_id.length > 0 && value.question_id.length <= 120
    && typeof value.question === 'string'
    && value.question.length >= 8
    && value.question.length <= 280;
}
