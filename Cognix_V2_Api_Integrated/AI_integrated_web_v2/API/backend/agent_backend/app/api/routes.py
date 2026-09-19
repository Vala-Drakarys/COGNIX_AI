from fastapi import APIRouter, HTTPException
from app.models import StudentMessage

router=APIRouter(prefix="/v1")
_agent=None

def configure(agent):
    global _agent
    _agent=agent

@router.post("/diagnostic/next")
def next_step(msg:StudentMessage):
    if not _agent: raise HTTPException(500,"agent not configured")
    return _agent.next_step(msg)

@router.post("/diagnostic/answer/{case_id}")
def answer(case_id:str,msg:StudentMessage):
    if not _agent: raise HTTPException(500,"agent not configured")
    return _agent.submit_answer(msg,case_id)

@router.get("/students/{student_id}/state")
def state(student_id:str):
    if not _agent: raise HTTPException(500,"agent not configured")
    found=_agent.store.load(student_id)
    if not found: raise HTTPException(404,"state not found")
    return found
