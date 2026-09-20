from app.models import LLMCheckResult, LLMPlan

class FakeProvider:
    """Deterministic provider for tests/demo mode. No API key required."""
    def plan(self,state,candidates):
        case=candidates[0] if candidates else None
        hs=[h["id"] for h in state.get("current_hypotheses",[]) if h["status"]!="rejected"]
        return LLMPlan(
            action="ask_check" if case else "continue",
            selected_case_id=case["id"] if case else None,
            hypothesis_ids=hs[:3],
            reason="deterministic demo plan",
            question=case["diagnostic_question"] if case else None)

    def evaluate(self,case,learner_response):
        exact=case["expected_answer"].strip().casefold()==learner_response.strip().casefold()
        return LLMCheckResult(
            case_id=case["id"],hypothesis_id=case["candidate_hypothesis"],
            polarity="supports" if exact else "contradicts",
            confidence=.90 if exact else .80,
            strength="strong" if exact else "moderate",
            reason="exact-match demo evaluator")
