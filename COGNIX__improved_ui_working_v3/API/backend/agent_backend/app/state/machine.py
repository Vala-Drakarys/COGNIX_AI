from __future__ import annotations
from datetime import datetime, timezone
from app.config import settings
from app.models import DiagnosticState, Evidence, HypothesisState, LLMCheckResult

class DiagnosticStateMachine:
    """Only this layer mutates diagnostic beliefs. The LLM cannot directly write state."""
    def initialize(self, student_id, subject, topic, hypotheses):
        return DiagnosticState(
            student_id=student_id,subject=subject,topic=topic,
            current_hypotheses=[
                HypothesisState(id=h["id"],diagnosis=h.get("diagnosis"),
                                status="candidate",confidence=.5)
                for h in hypotheses])

    def apply_evidence(self,state,result,learner_response,case_id):
        ev=Evidence(case_id=case_id,hypothesis_id=result.hypothesis_id,
                    polarity=result.polarity,strength=result.strength,
                    learner_response=learner_response,evaluator_reason=result.reason,
                    confidence=result.confidence)
        state.evidence.append(ev)
        if case_id not in state.tested_case_ids: state.tested_case_ids.append(case_id)
        state.attempt_count += 1
        target=next((h for h in state.current_hypotheses if h.id==result.hypothesis_id),None)
        if target:
            if result.polarity=="supports":
                target.confidence=min(.99,target.confidence+result.confidence*.28)
                target.status="supported"
            elif result.polarity=="contradicts":
                target.confidence=max(.01,target.confidence-result.confidence*.35)
                target.status="rejected" if target.confidence<.25 else "candidate"
            target.evidence_ids.append(f"{case_id}:{len(state.evidence)}")
            target.last_updated=datetime.now(timezone.utc)
        self.recompute(state)
        return state

    def recompute(self,state):
        ranked=sorted(state.current_hypotheses,key=lambda h:h.confidence,reverse=True)
        if not ranked: return state
        best=ranked[0]
        supports=sum(1 for e in state.evidence
                     if e.hypothesis_id==best.id and e.polarity=="supports")
        if supports>=settings.min_evidence_for_confirmation and best.confidence>=settings.confirmation_threshold:
            best.status="confirmed"
            state.current_diagnosis=best.diagnosis
        else:
            state.current_diagnosis=None
        return state
