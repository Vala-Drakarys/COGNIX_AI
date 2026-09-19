import {spawn} from "node:child_process";
import process from "node:process";

const py = process.platform === "win32" ? "python" : "python3";
const backend = spawn(py,["backend/agent_backend/run.py"],{stdio:"inherit",env:{...process.env}});
const frontend = spawn(process.execPath,["server.mjs"],{stdio:"inherit",env:{...process.env,COGNIX_PYTHON_BACKEND_URL:process.env.COGNIX_PYTHON_BACKEND_URL||"http://127.0.0.1:8787"}});

const stop=()=>{if(!backend.killed) backend.kill(); if(!frontend.killed) frontend.kill();};
process.on("SIGINT",()=>{stop();process.exit(0);});
process.on("SIGTERM",()=>{stop();process.exit(0);});
backend.on("exit",code=>{if(code && code!==0) console.error(`COGNIX agent backend exited with code ${code}`);});
frontend.on("exit",code=>{stop();process.exit(code??0);});
