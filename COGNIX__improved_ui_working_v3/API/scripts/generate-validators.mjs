import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';
import fs from 'node:fs/promises';
import {interpretationSchema,planSchema} from '../src/schemas.mjs';
const ajv=new Ajv({allErrors:true,code:{source:true,esm:true,lines:true}});
ajv.addSchema(interpretationSchema,'interpret');ajv.addSchema(planSchema,'plan');
const code=standaloneCode(ajv,{validateInterpretation:'interpret',validatePlan:'plan'}).replaceAll('require("ajv/dist/runtime/ucs2length").default','ucs2length');
await fs.writeFile('src/generated-validators.mjs','import ucs2module from "ajv/dist/runtime/ucs2length.js";\nconst ucs2length = ucs2module.default || ucs2module;\n'+code);
console.log('Strict schema validators generated without runtime code evaluation.');
