import {adapter} from "./src/local-db.mjs";
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import app from './dist/server/index.js';
import {modelEnvironment, modelConfig} from './backend/llm_agent/llm/providers/config.mjs';
import llmApp from './backend/llm_agent/api/app.mjs';
import {chat, ensureChatTable, loadChat, clearChat} from './src/chat.mjs';
import {adapter as llmAdapter} from './backend/llm_agent/state/database.mjs';
fs.mkdirSync('.local',{recursive:true});
const sqlite=new DatabaseSync(process.env.COGNIX_DB||'.local/cognix.sqlite');
sqlite.exec('PRAGMA journal_mode = WAL');
ensureChatTable({exec: async sql => sqlite.exec(sql), prepare: sql => { const stmt=sqlite.prepare(sql); return {get:(...a)=>stmt.get(...a), run:(...a)=>stmt.run(...a)}; }});
sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(name)){sqlite.exec('BEGIN');try{sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}
const env={DB:adapter(sqlite),LOCAL:true,OPENAI_API_KEY:process.env.OPENAI_API_KEY||'',OPENAI_MODEL:process.env.OPENAI_MODEL||'gpt-4.1-mini'};

// LLM agent backend: kept separate from the existing application DB so the
// existing web app/database remains intact while its /api/profile and
// /api/action contract is served by the integrated LLM diagnostic agent.
const llmDbFile=process.env.COGNIX_LLM_DB||'.local/cognix-llm.sqlite';
fs.mkdirSync(path.dirname(llmDbFile),{recursive:true});
const llmSqlite=new DatabaseSync(llmDbFile);
llmSqlite.exec('PRAGMA journal_mode = WAL');
llmSqlite.exec(fs.readFileSync('backend/llm_agent/db/migrations/001_initial.sql','utf8'));
const llmEnv={DB:llmAdapter(llmSqlite),LOCAL:true,DATASET_DIR:process.env.DATASET_DIR||'backend/llm_agent/dataset',...modelEnvironment()};
const port=Number(process.env.PORT||8765);
const pythonBackend=process.env.COGNIX_PYTHON_BACKEND_URL||'http://127.0.0.1:8787';
const server=createServer(async(req,res)=>{try{
// Integrated Node LLM agent API used directly by the FINAL 2 web UI.
if(req.url?.startsWith('/api/llm/health')){
  const cfg=modelConfig(llmEnv);
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({ok:true,service:'COGNIX LLM Diagnostic Agent',provider:cfg.provider,configured:Boolean(cfg.key),model:cfg.model}));
  return;
}
if(req.url?.startsWith('/api/chat/clear')){
  const cookieHeader=req.headers['cookie']||'';
  const who=cookieHeader.match(/(?:^|; )cognix_session=([a-f0-9-]{36})(?:;|$)/)?.[1] || null;
  if(!who){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'No session.'}));return;}
  clearChat({prepare: sql => { const stmt=sqlite.prepare(sql); return {run:(...a)=>stmt.run(...a)}; }}, who);
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({ok:true})); return;
}
if(req.url?.startsWith('/api/chat')){
  const chunks=[];
  let size=0;

  for await(const c of req){
    size+=c.length;
    if(size>12000){
      res.writeHead(413);
      res.end(JSON.stringify({error:'Request too large'}));
      return;
    }
    chunks.push(c);
  }

  let body={};
  try{
    body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
  }catch{
    res.writeHead(400,{'Content-Type':'application/json'});
    res.end(JSON.stringify({error:'Invalid JSON'}));
    return;
  }

  const cookieHeader=req.headers['cookie']||'';
  const who=
    cookieHeader.match(/(?:^|; )cognix_session=([a-f0-9-]{36})(?:;|$)/)?.[1]
    || crypto.randomUUID();

  const setCookie=
    cookieHeader.includes('cognix_session=')
      ? {}
      : {
          'Set-Cookie':`cognix_session=${who}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`
        };

  try{
    const result=await chat(
      {
        OPENROUTER_API_KEY:process.env.OPENROUTER_API_KEY||'',
        OPENROUTER_MODEL:process.env.OPENROUTER_MODEL||'',
        OPENAI_API_KEY:process.env.OPENAI_API_KEY||'',
        OPENAI_MODEL:process.env.OPENAI_MODEL||'',
        LLM_PROVIDER:process.env.LLM_PROVIDER||''
      },
      {
        prepare: sql => {
          const stmt=sqlite.prepare(sql);
          return {
            get:(...a)=>stmt.get(...a),
            run:(...a)=>stmt.run(...a)
          };
        },
        exec: sql=>sqlite.exec(sql)
      },
      who,
      body.message
    );

    res.writeHead(200,{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      ...setCookie
    });

    res.end(JSON.stringify(result));
    return;

  }catch(e){
    res.writeHead(400,{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      ...setCookie
    });

    res.end(JSON.stringify({
      error:e.message||'The tutor could not answer.'
    }));

    return;
  }
}
if(req.url?.startsWith('/api/agent/health')){
  const cfg=modelConfig(llmEnv);
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({ok:true,service:'COGNIX LLM Diagnostic Agent',provider:cfg.provider,configured:Boolean(cfg.key),model:cfg.model}));
  return;
}
if(req.url?.startsWith('/api/profile')||req.url?.startsWith('/api/action')){
  const chunks=[]; let proxySize=0;
  for await(const c of req){proxySize+=c.length;if(proxySize>15000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}
  const body=Buffer.concat(chunks);
  const target=new URL(req.url,'http://127.0.0.1:8765');
  const headers=new Headers(req.headers);
  headers.delete('host');
  const request=new Request(target,{method:req.method,headers,...(body.length?{body}: {})});
  const response=await llmApp.fetch(request,llmEnv);
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
  return;
}
if(req.url?.startsWith('/api/agent/')){
  const suffix=req.url.slice('/api/agent'.length);
  const target=pythonBackend+suffix;
  const headers=new Headers(req.headers);
  headers.delete('host');
  const chunks=[]; let proxySize=0;
  for await(const c of req){proxySize+=c.length;if(proxySize>15000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}
  const proxyBody=Buffer.concat(chunks);
  try{
    const pr=await fetch(target,{method:req.method,headers,body:proxyBody.length?proxyBody:undefined});
    res.writeHead(pr.status,Object.fromEntries(pr.headers));
    res.end(Buffer.from(await pr.arrayBuffer()));
  }catch(e){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Agent backend is offline. Start it with: python backend/agent_backend/run.py'}));}
  return;
}
if(req.method==='GET'&&(req.url==='/'||req.url?.split('?')[0]==='/')){const html=fs.readFileSync('web/index.html','utf8');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.site https://chatgpt.com"});res.end(html);return;}const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>15000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}const body=Buffer.concat(chunks);const request=new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers:req.headers,...(body.length?{body}: {})});const response=await app.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local server could not process this request.'}));}});
server.listen(port,'127.0.0.1',()=>console.log(`COGNIX ready at http://127.0.0.1:${port} — integrated LLM backend: ${modelConfig(llmEnv).key?'AI configured':'deterministic fallback (AI key not configured)'}`));