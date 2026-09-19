import tempfile
from app.agent.agent import build_agent
from app.models import StudentMessage

def test_contradiction_revision_evidence_confirmation():
    with tempfile.NamedTemporaryFile(suffix=".db") as f:
        agent=build_agent(db_path=f.name,use_fake=True)
        base={"student_id":"TEST","subject":"Mathematics","topic":"Partial Derivatives"}
        first=agent.next_step(StudentMessage(**base,message="seed"))
        cid=first.decision.selected_case_id
        out=agent.submit_answer(StudentMessage(**base,message="wrong"),cid)
        assert out.state.evidence[0].polarity=="contradicts"

        for _ in range(2):
            nxt=agent.next_step(StudentMessage(**base,message="seed"))
            cid=nxt.decision.selected_case_id
            case=agent.retriever.get_case(base["subject"],base["topic"],cid)
            agent.submit_answer(StudentMessage(**base,message=case["expected_answer"]),cid)

        final=agent.store.load("TEST")
        assert len(final.evidence)>=3
