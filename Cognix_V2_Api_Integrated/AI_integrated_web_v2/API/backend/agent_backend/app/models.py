from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field

class Evidence(BaseModel):
    case_id: str
    hypothesis_id: str
    polarity: Literal["supports", "contradicts", "neutral"]
    strength: Literal["weak", "moderate", "strong"]
    learner_response: str
    evaluator_reason: str
    confidence: float = Field(ge=0, le=1)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HypothesisState(BaseModel):
    id: str
    diagnosis: str | None = None
    status: Literal["candidate", "supported", "rejected", "confirmed"] = "candidate"
    confidence: float = Field(default=.5, ge=0, le=1)
    evidence_ids: list[str] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiagnosticState(BaseModel):
    student_id: str
    subject: str
    topic: str
    current_hypotheses: list[HypothesisState] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    tested_case_ids: list[str] = Field(default_factory=list)
    current_diagnosis: str | None = None
    learner_confirmation: Literal["pending", "confirmed", "rejected"] = "pending"
    next_diagnostic_dimension: str | None = None
    attempt_count: int = 0
    version: int = 1

class StudentMessage(BaseModel):
    student_id: str
    subject: str
    topic: str
    message: str

class DiagnosticDecision(BaseModel):
    action: Literal["ask_check", "revise", "confirm", "continue"]
    selected_case_id: str | None = None
    diagnosis: str | None = None
    hypothesis_ids: list[str] = Field(default_factory=list)
    reason: str
    learner_facing_prompt: str | None = None

class LLMCheckResult(BaseModel):
    case_id: str
    hypothesis_id: str
    polarity: Literal["supports", "contradicts", "neutral"]
    confidence: float = Field(ge=0, le=1)
    strength: Literal["weak", "moderate", "strong"]
    reason: str
    extracted_concept: str | None = None

class LLMPlan(BaseModel):
    hypothesis_ids: list[str] = Field(default_factory=list)
    selected_case_id: str | None = None
    reason: str
    action: Literal["ask_check", "revise", "confirm", "continue"]
    question: str | None = None

class StepResponse(BaseModel):
    state: DiagnosticState
    decision: DiagnosticDecision
    question: str | None = None
