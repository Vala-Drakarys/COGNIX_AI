from app.models import StudentMessage, StepResponse, DiagnosticDecision
from app.retrieval.retriever import TopicRetriever
from app.state.machine import DiagnosticStateMachine
from app.storage.sqlite import SQLiteStore
from app.llm.fake_provider import FakeProvider

class DiagnosticAgent:
    def __init__(self,retriever,store,provider):
        self.retriever=retriever; self.store=store; self.provider=provider
        self.machine=DiagnosticStateMachine()

    def _state(self,msg):
        state=self.store.load(msg.student_id)
        if state: return state
        hs=self.retriever.all_hypotheses(msg.subject,msg.topic)
        state=self.machine.initialize(msg.student_id,msg.subject,msg.topic,hs)
        self.store.save(state)
        return state

    def next_step(self,msg):
        state=self._state(msg)
        active=[h.id for h in state.current_hypotheses if h.status not in ("rejected","confirmed")]
        candidates=self.retriever.retrieve(
            msg.subject,msg.topic,msg.message,
            top_k=8,hypothesis_ids=active,
            exclude_case_ids=set(state.tested_case_ids))
        plan=self.provider.plan(state.model_dump(),candidates)
        case=self.retriever.get_case(msg.subject,msg.topic,plan.selected_case_id) if plan.selected_case_id else None
        if case: state.next_diagnostic_dimension=case["diagnostic_dimension"]
        decision=DiagnosticDecision(
            action=plan.action,selected_case_id=plan.selected_case_id,
            diagnosis=state.current_diagnosis,hypothesis_ids=plan.hypothesis_ids,
            reason=plan.reason,learner_facing_prompt=plan.question)
        self.store.save(state)
        return StepResponse(state=state,decision=decision,
                            question=case["diagnostic_question"] if case else None)

    def submit_answer(self,msg,case_id):
        state=self._state(msg)
        case=self.retriever.get_case(msg.subject,msg.topic,case_id)
        result=self.provider.evaluate(case,msg.message)
        state=self.machine.apply_evidence(state,result,msg.message,case_id)
        self.store.save(state)
        return self.next_step(msg)

def build_agent(data_dir="data",db_path="cognix.db",use_fake=False):
    from app.config import settings
    from app.llm.openai_provider import OpenAIProvider
    retriever=TopicRetriever(data_dir)
    store=SQLiteStore(db_path)
    provider=FakeProvider() if use_fake or not settings.openai_api_key else OpenAIProvider()
    return DiagnosticAgent(retriever,store,provider)
