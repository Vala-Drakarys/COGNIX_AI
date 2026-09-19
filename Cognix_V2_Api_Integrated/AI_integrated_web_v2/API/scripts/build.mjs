import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('dist/server',{recursive:true});
await build({entryPoints:['src/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',loader:{'.html':'text'},minify:false});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('COGNIX Worker built.');
