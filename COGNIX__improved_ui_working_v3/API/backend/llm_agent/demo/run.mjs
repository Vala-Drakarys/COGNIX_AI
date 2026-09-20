import {loadEnvFile} from 'node:process';
import {modelConfig, modelEnvironment} from '../llm/providers/config.mjs';
import {checkModel} from '../llm/client.mjs';
// Terminal client: offline practice or a bounded LLM-assisted diagnostic agent.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import app from '../api/app.mjs';
import {parseProblem, parseAttempt} from '../agent/parsing.mjs';
import {adapter} from '../state/database.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const flags = process.argv.slice(2);
if (flags.some(flag => !['--interactive', '--live', '--check-llm', '--help'].includes(flag))) {
  console.error('Unknown option. Use --interactive, --live, --check-llm or --help.');
  process.exit(1);
}
if (flags.includes('--help')) {
  console.log('Run without flags for the scripted offline demo.\n--interactive: offline practice\n--live: LLM-assisted diagnostic agent\n--check-llm: small real provider connection test\nLive commands load .env from the project root. COGNIX_DEMO_DB overrides the separate demo SQLite file.');
  process.exit(0);
}
const live = flags.includes('--live');
const checking = flags.includes('--check-llm');
const interactive = flags.includes('--interactive') || live;
let llmEnv = {};
if (live || checking) {
  try {
    if (fs.existsSync(path.join(root,'.env'))) loadEnvFile(path.join(root,'.env'));
    llmEnv = modelEnvironment();
    const config = modelConfig(llmEnv);
    if (!config.key) throw new Error('Missing key');
    console.log(`LLM provider: ${config.provider}; model: ${config.model}; key: configured (hidden).`);
  } catch {
    console.error('Cannot configure live AI. Check .env: LLM_PROVIDER, the provider API key, and model.');
    process.exit(1);
  }
}
if (checking) {
  console.log('Checking the provider with a small structured-output request...');
  const result = await checkModel(llmEnv);
  console.log(result.ok ? 'LLM CONNECTION PASSED — a real model returned valid structured output.' : `LLM CONNECTION FAILED — ${result.reason}`);
  process.exit(result.ok ? 0 : 1);
}
const dbFile = process.env.COGNIX_DEMO_DB || path.join(root, '.local', 'engine-demo.sqlite');
fs.mkdirSync(path.dirname(path.resolve(dbFile)), {recursive:true});
const sql = new DatabaseSync(dbFile);
sql.exec(fs.readFileSync(path.join(root, 'backend/db/migrations/001_initial.sql'), 'utf8'));
const env = {DB:adapter(sql), LOCAL:true, DATASET_DIR:path.join(root,'backend/dataset'), ...llmEnv};
// Stable identity resumes interactive sessions. Scripted runs get a fresh profile
// without deleting earlier records. Both stay in the separate demo database.
const id = live ? '00000000-0000-4000-8000-000000000002' : interactive ? '00000000-0000-4000-8000-000000000001' : crypto.randomUUID();
const space = interactive ? 'practice' : 'demo';
let state;
const seen = new Set();
async function request(body) {
  if (live && body && ['start','answer','confirm'].includes(body.kind)) console.log('Agent is evaluating the evidence and selecting the next action...');
  const response = await app.fetch(new Request(`http://localhost/api/${body?'action':'profile'}?profile=${space}`, {
    method:body?'POST':'GET',
    headers:{Cookie:`cognix_session=${id}`, 'Content-Type':'application/json', Origin:'http://localhost'},
    ...(body?{body:JSON.stringify({...body, revision:state.profile.revision, request_id:crypto.randomUUID()})}:{})
  }), env);
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), {status:response.status});
  state = result;
  for (const event of state.run?.events || []) {
    if (!seen.has(event.id)) {
      if (!interactive || (live && ['MEMORY LOADED','MODEL DECISION','FALLBACK','MODEL_RESPONSE_REJECTED','REVISE','CONFIRM','STORE'].includes(event.type))) console.log(`[${event.type}] ${event.text}`);
      seen.add(event.id);
    }
  }
  return state;
}
function summary() {
  console.log('\n--- Saved backend result ---');
  console.log(`State: ${state.run?.state || 'No investigation'}; outcome: ${state.run?.outcome || 'Pending'}`);
  console.log(`Investigations: ${state.profile.diagnostic_history.length}`);
  for (const gap of state.profile.confirmed_gaps) console.log(`Gap: ${gap.label} — ${gap.status}`);
  console.log(`Database: ${dbFile}`);
  console.log(`Profile: ${state.profile.student_id}`);
}
async function scripted() {
  console.log('SCRIPTED DEMO — all responses and confirmation in this run are supplied by the demo.');
  await request({kind:'demo_start'});
  for (let step=0; step<30 && state.run.demo_encounter!==2; step++) await request({kind:'demo_step'});
  if (state.run.demo_encounter!==2) throw new Error('Demo did not reach its return visit.');
  console.log('\nRETURN VISIT — memory selected an application check.');
  for (let step=0; step<2; step++) {
    console.log('SCRIPTED RETURN ANSWER — choose the correct setup.');
    await request({kind:'answer', question_id:state.run.question.id, choice:0});
  }
  await request({kind:'stop'});
  await request(); // Read back the persisted profile through the API.
  if (state.profile.confirmed_gaps[0]?.status!=='Improving — recheck later') throw new Error('Expected memory improvement was not saved.');
  summary();
  console.log('DEMO PASSED: diagnosis, confirmation, persistence and memory recheck completed.');
}
async function manual() {
  const rl = createInterface({input:process.stdin, crlfDelay:Infinity});
  const lines = rl[Symbol.asyncIterator]();
  async function ask(prompt) {
    process.stdout.write(prompt);
    const next = await lines.next();
    if (next.done) throw new Error('INPUT_CLOSED');
    const value = next.value.trim();
    if (value.toLowerCase() === ':quit') throw new Error('INPUT_QUIT');
    return value;
  }
  const useSample = value => !value || ['sample','/sample'].includes(value.toLowerCase());
  const modules = [
    ['exam', 'Understand why an answer was wrong'],
    ['learning', 'Check why studying has not helped you solve a problem'],
    ['decay', 'Check what you remember and compare with saved checks'],
    ['connection', 'Check how force, mass and acceleration connect'],
    ['friction', 'Explore what made a study session difficult']
  ];
  console.log(live ? '\nCOGNIX — live diagnostic agent' : '\nCOGNIX — try the engine in your terminal');
  if (live) console.log('The LLM chooses permitted checks and interprets written explanations. Memory and evidence guide its next action. Any rule-based fallback is labelled.');
  console.log('Press Enter to use a displayed example. Type :quit at any prompt to leave.');
  console.log('The four academic checks currently use force, mass and acceleration only.');
  try {
    if (!state.run || state.run.state==='FINISH') {
      console.log('\nStep 1 — What would you like to check?');
      modules.forEach(([key,label],i)=>console.log(`${i+1}. ${label} (${key})`));
      let module;
      while (!module) {
        const value = (await ask('Choose 1–5 or a name; Enter selects exam: ')).toLowerCase();
        module = !value ? 'exam' : modules[Number(value)-1]?.[0] || modules.find(([key])=>key===value)?.[0];
        if (!module) console.log('Please choose a listed number or name. For example: 3 or decay.');
      }
      if (module==='decay') console.log('Retention check: we will ask what you remember. Without earlier saved checks, this establishes a starting point; it cannot prove forgetting.');
      const friction = module==='friction';
      const sampleQuestion = friction ? 'I could not finish my study session.' : state.defaults.question;
      let question;
      console.log(friction ? '\nStep 2 — Describe what happened while studying.' : '\nStep 2 — Enter the full physics problem, not your answer.');
      if (!friction) console.log('Include one mass in kg, one net force in N, and ask for acceleration.');
      console.log(`Example: ${sampleQuestion}`);
      while (!question) {
        const value = await ask(friction ? 'Your study situation (Enter or sample uses the example): ' : 'Full problem (Enter or sample uses the example): ');
        const candidate = useSample(value) ? sampleQuestion : value;
        if (candidate.length>2500) { console.log('Please shorten this to 2,500 characters or fewer.'); continue; }
        if (!friction) {
          try { parseProblem(candidate, 'not sure'); }
          catch {
            console.log('That problem does not yet fit this demo. Use one positive mass (up to 10,000 kg), one positive net force (up to 100,000 N), and ask for acceleration.');
            console.log(`For example: ${sampleQuestion}`);
            console.log('Try again here, or press Enter to use that example. Nothing has been submitted.');
            continue;
          }
        }
        question = candidate;
      }
      console.log(`Using: ${question}`);
      const defaultAttempt = friction ? 'I opened my notes and stopped.' : question===sampleQuestion ? state.defaults.attempt : 'I am not sure';
      console.log(friction ? '\nStep 3 — What did you try before stopping?' : '\nStep 3 — What answer or working did you try?');
      if (!friction) {
        console.log('For example: a = 20 m/s². A formula such as F=ma is also allowed; follow-up questions will check your understanding.');
        console.log('You can type "not sure" if you have not worked out an answer.');
      }
      console.log(`Press Enter to use: ${defaultAttempt}`);
      let started = false;
      while (!started) {
        const value = await ask(friction ? 'What you tried: ' : 'Your answer or working: ');
        const attempt = useSample(value) ? defaultAttempt : value;
        if (attempt.length>1500) { console.log('Please shorten your answer to 1,500 characters or fewer.'); continue; }
        try {
          await request({kind:'start', mode:live?'live':'practice', module, question, attempt});
          started = true;
          if (!friction && parseAttempt(attempt).submitted===null) console.log('No final number was given. That is okay — we will use follow-up questions, without marking your working wrong.');
        } catch (error) {
          if (error.status!==400) throw error;
          console.log(`Please try again: ${error.message}`);
        }
      }
    } else {
      console.log('\nResuming your saved check. Previously submitted answers are already saved.');
      console.log(`Your problem: ${state.run.input.question}`);
    }
    while (state.run.state!=='FINISH') {
      try {
        if (state.run.state==='WAIT_FOR_STUDENT') {
          const q = state.run.question;
          if (live) {
            console.log(`Next action: test ${state.catalog[state.run.hypothesis].title}. Selected by: ${q.source}.`);
            console.log(`Provider responses: ${state.run.model_successes || 0}; model calls: ${state.run.model_calls}/12.`);
            console.log('For an LLM interpretation, explain your answer in words. Numbered options use the reviewed answer key.');
          }
          console.log(`\nQuestion ${state.run.attempts+1}: ${q.prompt}`);
          [...q.choices,'I’m not sure'].forEach((text,i)=>console.log(`${i+1}. ${text}`));
          console.log(`Choose an option by typing 1–${q.choices.length+1}. To give your own numerical answer, type answer: 5. You can also write an answer in words.`);
          console.log('Press Enter if unsure. Use :quit to resume later, or :stop to end this check.');
          const value = await ask('Your answer: ');
          if (value.toLowerCase()===':stop') { await request({kind:'stop'}); continue; }
          const explicitAnswer = /^answer\s*:/i.test(value);
          const answerText = explicitAnswer ? value.replace(/^answer\s*:/i, '').trim() : value;
          const optionNumber = !explicitAnswer && /^:?\d+$/.test(value);
          const choice = !value ? q.choices.length : optionNumber ? Number(value.replace(/^:/,''))-1 : undefined;
          if ((!explicitAnswer && value.startsWith(':') && !optionNumber) ||
              (optionNumber && (choice<0 || choice>q.choices.length))) {
            console.log(`Choose 1 through ${q.choices.length+1}. To submit a number as your answer instead, write answer: ${value.replace(/^:/,'')}.`);
            continue;
          }
          if (explicitAnswer && !answerText) { console.log('Write your answer after answer:, for example answer: 5.'); continue; }
          await request({kind:'answer', question_id:q.id, ...(choice===undefined?{answer:answerText}:{choice})});
          if (choice!==undefined) console.log(`You selected: ${choice===q.choices.length?'I’m not sure':q.choices[choice]}`);
          const evidence = state.run.evidence.at(-1);
          const result = evidence.result;
          if (live) console.log(`Evaluation source: ${evidence.source}. ${evidence.note}`);
          console.log(choice===q.choices.length ? 'You chose “I’m not sure”. That is recorded as uncertainty, not a wrong answer.' : result==='pass' ? 'This answer supports the skill being checked.' : result==='fail' ? 'This answer suggests a difficulty worth checking further. One answer alone is not a diagnosis.' : 'There is not enough clear information in that answer. It has not been marked wrong.');
        } else if (state.run.state==='WAIT') {
          console.log(`\nThe answers suggest: ${state.catalog[state.run.hypothesis].gap}. This is a possible explanation, not a certainty.`);
          console.log('yes = this matches my difficulty; no = check another possibility; unsure = leave it unconfirmed.');
          const entered = (await ask('Does that match your experience? yes / no / unsure (Enter = unsure): ')).toLowerCase();
          if (entered===':stop') { await request({kind:'stop'}); continue; }
          const value = ({y:'yes',n:'no','not sure':'unsure','':'unsure'})[entered] || entered;
          if (!['yes','no','unsure'].includes(value)) { console.log('Please type yes, no, or unsure. You can also type :quit to leave.'); continue; }
          await request({kind:'confirm',value});
        } else throw new Error(`Unexpected state: ${state.run.state}`);
      } catch (error) {
        if (error.status!==400) throw error;
        console.log(`Please retry: ${error.message}`);
      }
    }
    const messages = {
      confirmed:'You confirmed the proposed difficulty. It has been saved.',
      no_gap_observed:'These checks did not establish a learning gap. This does not prove overall mastery.',
      insufficient:'There is not enough consistent evidence to name a difficulty. The answers are saved for a later check.',
      unconfirmed:'The possible difficulty remains unconfirmed, as requested.',
      stopped:'You ended this check. Submitted answers remain saved.'
    };
    console.log(`\n${messages[state.run.outcome] || 'This check is complete.'}`);
    for (const item of state.profile.interventions.filter(i=>i.run_id===state.run.id)) console.log(`Suggested practice: ${item.text}`);
  } catch (error) {
    if (!['INPUT_CLOSED','INPUT_QUIT'].includes(error.message)) throw error;
    console.log(state.run && state.run.state!=='FINISH' ? '\nYour submitted answers are saved. Run the same command to continue.' : '\nYou have left the demo. No unfinished check was started.');
  } finally { rl.close(); }
  if (state.run) console.log(`\nSaved investigations: ${state.profile.diagnostic_history.length}`);
  console.log(`Local demo records: ${dbFile}`);
}

try {
  await request();
  if (interactive) await manual(); else await scripted();
} catch (error) {
  console.error(`Engine demo failed: ${error.message}`);
  process.exitCode=1;
} finally { sql.close(); }
