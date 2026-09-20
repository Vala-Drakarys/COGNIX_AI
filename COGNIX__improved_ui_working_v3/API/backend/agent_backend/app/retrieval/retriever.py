from __future__ import annotations
import json, math, re
from pathlib import Path
from collections import Counter

TOKEN_RE = re.compile(r"[A-Za-z0-9_+\-]+")

class TopicRetriever:
    """Replaceable retrieval layer: metadata filters + lexical ranking now; vector DB later."""
    FILES = {
        "Mathematics": "mathematics_diagnostics.json",
        "Physics": "physics_diagnostics.json",
        "Chemistry": "chemistry_diagnostics.json",
    }

    def __init__(self, data_dir="data"):
        self.data_dir=Path(data_dir)
        self._cache={}

    def _load(self, subject, topic):
        key=(subject,topic)
        if key not in self._cache:
            fn=self.FILES.get(subject)
            if not fn: raise ValueError(f"Unsupported subject: {subject}")
            rows=json.loads((self.data_dir/fn).read_text(encoding="utf-8"))
            self._cache[key]=[r for r in rows if r["topic"].casefold()==topic.casefold()]
        return self._cache[key]

    def retrieve(self, subject, topic, query, top_k=8, dimensions=None,
                 hypothesis_ids=None, exclude_case_ids=None):
        rows=self._load(subject,topic)
        dimensions=set(dimensions or [])
        hypothesis_ids=set(hypothesis_ids or [])
        exclude_case_ids=exclude_case_ids or set()
        q=set(t.lower() for t in TOKEN_RE.findall(query))
        scored=[]
        for r in rows:
            if r["id"] in exclude_case_ids: continue
            score=0.0
            if r["diagnostic_dimension"] in dimensions: score += 4
            if r["candidate_hypothesis"] in hypothesis_ids: score += 5
            text=" ".join([r.get("student_problem",""),r.get("diagnostic_question",""),
                           r.get("likely_diagnosis","")," ".join(r.get("tags",[]))]).lower()
            tokens=Counter(TOKEN_RE.findall(text))
            score += sum(1 for t in q if t in tokens)/max(1,math.sqrt(len(q)))
            scored.append((score,r))
        scored.sort(key=lambda x:(x[0],x[1]["id"]),reverse=True)
        return [r for _,r in scored[:top_k]]

    def get_case(self, subject, topic, case_id):
        for r in self._load(subject,topic):
            if r["id"]==case_id: return r
        raise KeyError(case_id)

    def all_hypotheses(self, subject, topic):
        result={}
        for r in self._load(subject,topic):
            h=r["candidate_hypothesis"]
            result.setdefault(h,{"id":h,"diagnosis":r["likely_diagnosis"],"dimensions":set()})
            result[h]["dimensions"].add(r["diagnostic_dimension"])
        return [{**v,"dimensions":sorted(v["dimensions"])} for v in result.values()]
