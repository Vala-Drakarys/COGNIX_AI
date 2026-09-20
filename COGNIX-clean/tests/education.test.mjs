import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {adapter} from '../backend/state/database.mjs';
import {emptyProfile,start,answer,current} from '../backend/agent/controller.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const datasetDir=path.join(root,'..','backend','dataset');
const migration=`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, space TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL);`;

function envWithModel(){
  return {
    DATASET_DIR:datasetDir,
    DB:adapter(new DatabaseSync(':memory:')),
    OPENROUTER_API_KEY:'test',
    SLICE_MODEL:'anthropic/claude-haiku-4.5',
    MODEL_FETCH:async (url,init)=>{
      const body=JSON.parse(init.body);
      const schema=body.response_format.json_schema.schema;
      const properties=schema.properties||{};
      let out;
      if(properties.hypothesis&&properties.question_id){
        out={hypothesis:'MATH_H1',question_id:'MATH_001',question:'What does the partial derivative mean here?'};
      }else{
        out={classification:'pass',quote:'held constant',note:'The answer matches the retrieved dataset explanation.'};
      }
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(out)}}]}));
    }
  };
}

test('education mode retrieves a reference case and uses the single OpenRouter model path',async()=>{
  const env=envWithModel();
  const p=emptyProfile('education-test');
  p.diagnostic_history=[];
  await start(p,env,{module:'education',mode:'live',question:'What does a partial derivative mean?',attempt:'It means I differentiate with respect to x while y is held constant.'});
  assert.equal(current(p).module,'education');
  assert.ok(current(p).education.candidates.length>0);
  assert.equal(current(p).education.subject,'Mathematics');
  assert.equal(current(p).question.id,'MATH_001');
  await answer(p,env,{question_id:'MATH_001',answer:'I differentiate with respect to x while y is held constant.'});
  assert.equal(current(p).evidence.at(-1).result,'pass');
});

test('education mode does not require kg, N or acceleration',async()=>{
  const env=envWithModel();
  const p=emptyProfile('education-test-2');
  await start(p,env,{module:'education',mode:'live',question:'What is the difference between stress and strain?',attempt:'Stress is force per area.'});
  assert.equal(current(p).module,'education');
  assert.equal(current(p).education.subject,'Physics');
});
