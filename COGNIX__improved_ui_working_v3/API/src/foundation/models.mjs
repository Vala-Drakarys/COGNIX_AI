// COGNIX Foundation model layer — merged from the Agent Foundation Skeleton.
export const RunStatus = Object.freeze({RUNNING:"RUNNING", WAITING_FOR_STUDENT:"WAITING_FOR_STUDENT", CONFIRMATION_REQUIRED:"CONFIRMATION_REQUIRED", COMPLETED:"COMPLETED", SAFE_STOP:"SAFE_STOP"});
export const HypothesisStatus = Object.freeze({PROPOSED:"PROPOSED", TESTING:"TESTING", SUPPORTED:"SUPPORTED", CONTRADICTED:"CONTRADICTED", UNCERTAIN:"UNCERTAIN", UNTESTED:"UNTESTED"});
export const EvidenceResult = Object.freeze({SUPPORTS:"SUPPORTS", CONTRADICTS:"CONTRADICTS", INSUFFICIENT:"INSUFFICIENT"});
export function makeStudentState(student_id){return {student_id,topic:"",current_gap:null,confidence:0,confirmation_status:"NOT_ASKED",confirmed_gaps:[],rejected_hypotheses:[],uncertain_hypotheses:[],diagnostic_history:[]};}
export function makeDiagnosticRun(run_id,student_id){return {run_id,student_id,status:RunStatus.RUNNING,attempts_used:0,revisions_used:0,max_attempts:6,max_revisions:3,hypotheses:{},checks:{},current_hypothesis_id:null,current_check_id:null,diagnosis:null,evidence_summary:[],outcome:null};}
