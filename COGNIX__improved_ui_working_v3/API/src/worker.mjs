import {start,answer,confirmDiagnosis,demoStep,current,stop,dashboard,H,MODULES,DEFAULT_QUESTION,DEFAULT_ATTEMPT} from './controller.mjs';
import {load,acquire,persist,release} from './store.mjs';
import html from '../web/index.html';
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...HEADERS,...extra}});
function identity(req){const value=req.headers.get('Cookie')?.match(/(?:^|; )cognix_session=([a-f0-9-]{36})(?:;|$)/)?.[1];return {id:value||crypto.randomUUID(),fresh:!value};}
function packet(p,env){return {profile:p,dashboard:dashboard(p),run:current(p),catalog:H,modules:MODULES,defaults:{question:DEFAULT_QUESTION,attempt:DEFAULT_ATTEMPT},service:{configured:!!(env.OPENAI_API_KEY&&env.OPENAI_MODEL),model:env.OPENAI_MODEL||null,storage:env.LOCAL?'Local SQLite database':'Persistent database'}};}
export default {async fetch(req,env){const url=new URL(req.url);if(url.pathname==='/health')return json({ok:true});if(url.pathname==='/'&&req.method==='GET')return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.site https://chatgpt.com"}});
 if(!url.pathname.startsWith('/api/'))return json({error:'Not found'},404);const who=identity(req),space=url.searchParams.get('profile')==='demo'?'demo':'practice',id=who.id+':'+space;const cookie=who.fresh?{'Set-Cookie':`cognix_session=${who.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`} :{};let lease=null;
 try{
  const p=await load(env.DB,id,space==='demo'?'Demo Student':'Practice Student');
  if(req.method==='GET'&&url.pathname==='/api/profile')return json(packet(p,env),200,cookie);
  if(req.method!=='POST'||url.pathname!=='/api/action')return json({error:'Not found'},404,cookie);
  const origin=req.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Request origin not allowed.'},403,cookie);
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON request required.'},415,cookie);
  const raw=await req.text();if(raw.length>12000)return json({error:'Request is too large.'},413,cookie);let b;try{b=JSON.parse(raw);}catch{return json({error:'Invalid request JSON.'},400,cookie);}if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Invalid request.'},400,cookie);
  if(typeof b.request_id!=='string'||b.request_id.length>80)return json({error:'A request ID is required.'},400,cookie);
  if(p.processed?.includes(b.request_id))return json(packet(p,env),200,cookie);
  if(b.revision!==p.revision)return json({error:'The profile changed. Reloading the latest saved session is safe.',reload:true},409,cookie);
  lease=await acquire(env.DB,id,p.revision);if(!lease)return json({error:'An answer is already being processed. Wait, then reload the session.',reload:true},409,cookie);
  if(b.kind==='start'){if(b.mode==='demo'&&space!=='demo')throw new Error('Use the separate Demo Mode profile for scripted sessions.');await start(p,env,b);}
  else if(b.kind==='answer')await answer(p,env,b);
  else if(b.kind==='confirm')await confirmDiagnosis(p,env,b.value);
  else if(b.kind==='stop'){const r=current(p);if(!r||!['WAIT','WAIT_FOR_STUDENT'].includes(r.state))throw new Error('No active investigation to stop.');stop(r,'stopped','The student stopped the investigation. No diagnosis is inferred.');}
  else if(b.kind==='demo_start'){if(space!=='demo')throw new Error('Demo profile required.');if(current(p)&&current(p).state!=='FINISH')stop(current(p),'stopped','A new scripted rehearsal was started.');await start(p,env,{module:'exam',mode:'demo',ignoreMemory:true,demo_encounter:1});}
  else if(b.kind==='demo_step'){if(space!=='demo')throw new Error('Demo profile required.');await demoStep(p,env);}
  else if(b.kind==='task'){const title=String(b.title||'').trim();if(!title||title.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(b.due||'')||!Number.isFinite(Date.parse(b.due)))throw new Error('Enter a task and a valid date.');p.tasks.push({id:crypto.randomUUID(),title,due:b.due,done:false});}
  else if(b.kind==='task_done'){const t=p.tasks.find(t=>t.id===b.task_id);if(!t)throw new Error('Task not found.');t.done=!t.done;}
  else if(b.kind==='feedback'){const i=p.interventions.find(i=>i.id===b.intervention_id);if(!i||!['Helped','Did not help','Not tried'].includes(b.value))throw new Error('Invalid intervention feedback.');i.outcome=b.value;i.feedback_at=new Date().toISOString();}
  else throw new Error('Unknown action.');
  p.processed=[...(p.processed||[]),b.request_id].slice(-40);await persist(env.DB,p,lease);lease=null;return json(packet(p,env),200,cookie);
 }catch(e){if(lease)try{await release(env.DB,id,lease);}catch{}const expected=/question|attempt|Choose|Enter|Invalid|current|session|limit|already|mode|profile required|positive mass|MVP supports|Unknown action|Task not found|shorten|valid date/i.test(e.message);if(!expected)console.error('COGNIX request failed',url.pathname,e.message);return json({error:expected?e.message:'Could not load or save your session. Your answer has not been confirmed as saved. Please retry.',reload:!expected},expected?400:503,cookie);}
}};
