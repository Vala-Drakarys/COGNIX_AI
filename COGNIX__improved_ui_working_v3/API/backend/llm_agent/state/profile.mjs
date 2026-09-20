import {HYPOTHESES as H, MODULES} from '../agent/catalog.mjs';
const date = () => new Date().toISOString();

export function emptyProfile(id, name = 'Demo Student') {
  return {student_id:id, name, diagnostic_history:[], confirmed_gaps:[],
    rejected_hypotheses:[], unresolved_hypotheses:[], topics:{}, tasks:[],
    interventions:[], last_updated:date(), revision:0};
}
export function current(profile) { return profile.diagnostic_history.at(-1) || null; }

// Formula recognition and a conceptual relationship are different observations.
// Derive this from question IDs so old saved evidence needs no migration.
export function evidenceSkill(e) {
  if (e.question_id === 'force_change') return 'Concept understanding';
  return H[e.hypothesis].skill;
}

export function refreshProfile(p) {
  const topics = {};
  for (const run of p.diagnostic_history) {
    for (const e of run.evidence) {
      const skill = evidenceSkill(e);
      const topic = topics[skill] ??= {skill, checks:[], status:'Not checked'};
      topic.checks.push({result:e.result, at:e.at, run_id:run.id});
      topic.status = e.result === 'pass' ? 'Demonstrated on latest check'
        : e.result === 'fail' ? 'Needs investigation' : 'Uncertain';
    }
  }
  p.topics = topics;
  p.rejected_hypotheses = p.diagnostic_history.flatMap(r => r.rejected.map(x => ({...x, run_id:r.id})));
  p.unresolved_hypotheses = p.diagnostic_history.flatMap((run, index) => {
    if (['confirmed','no_gap_observed'].includes(run.outcome)) return [];
    const hypotheses = new Set(run.evidence.filter(e => e.result !== 'pass').map(e => e.hypothesis));
    if (run.state !== 'FINISH' || run.outcome === 'stopped' || run.outcome === 'unconfirmed') {
      if (run.hypothesis) hypotheses.add(run.hypothesis);
    }
    if (run.outcome === 'insufficient') {
      for (const h of MODULES[run.module].order) if (!run.visited.includes(h)) hypotheses.add(h);
    }
    if (!hypotheses.size && run.hypothesis) hypotheses.add(run.hypothesis);
    return [...hypotheses].filter(h => {
      const later = p.diagnostic_history.slice(index + 1);
      if (later.some(r => r.outcome === 'confirmed' && r.hypothesis === h)) return false;
      const checks = later.flatMap(r => r.evidence).filter(e => e.hypothesis === h);
      return !(checks.length >= 2 && checks.slice(-2).every(e => e.result === 'pass'));
    }).map(h => ({run_id:run.id, hypothesis:h, status:run.outcome || run.state,
      at:run.updated_at || run.created_at}));
  });
  for (const gap of p.confirmed_gaps) {
    const index = p.diagnostic_history.findIndex(r => r.id === gap.run_id);
    if (index < 0) continue;
    // Match the actual hypothesis, not a shared display skill name.
    const newer = p.diagnostic_history.slice(index + 1)
      .flatMap(r => r.evidence).filter(e => e.hypothesis === gap.hypothesis);
    gap.status = newer.length >= 2 && newer.slice(-2).every(e => e.result === 'pass')
      ? 'Improving — recheck later' : 'Active';
  }
  p.last_updated = date();
}
