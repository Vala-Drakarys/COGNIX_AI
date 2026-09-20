from __future__ import annotations
import json
from openai import OpenAI
from app.config import settings
from app.models import LLMCheckResult, LLMPlan
from app.llm.prompts import SYSTEM_PROMPT, PLAN_PROMPT, EVALUATE_PROMPT

class OpenAIProvider:
    def __init__(self):
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client=OpenAI(api_key=settings.openai_api_key)
        self.model=settings.openai_model

    def _parse(self, model_cls, instructions, payload):
        response=self.client.responses.create(
            model=self.model,
            instructions=instructions,
            input=json.dumps(payload, ensure_ascii=False),
            text={"format":{
                "type":"json_schema","name":model_cls.__name__,
                "strict":True,"schema":model_cls.model_json_schema()
            }},
        )
        return model_cls.model_validate(json.loads(response.output_text))

    def plan(self,state,candidates):
        return self._parse(LLMPlan,SYSTEM_PROMPT+"\n"+PLAN_PROMPT,
                           {"state":state,"candidates":candidates})

    def evaluate(self,case,learner_response):
        return self._parse(LLMCheckResult,SYSTEM_PROMPT+"\n"+EVALUATE_PROMPT,
                           {"case":case,"learner_response":learner_response})
