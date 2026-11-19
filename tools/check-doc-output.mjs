/** Check reference structure that cannot be guaranteed by comment linting alone. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const project=JSON.parse(readFileSync(process.argv[2]||'docs-site/api.json','utf8'));
const nodes=[];function visit(x){if(!x||typeof x!=='object')return;if(x.name)nodes.push(x);for(const value of Object.values(x))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
visit(project);
const button=nodes.find(x=>x.name==='CPushButton'&&x.children);
assert(button,'CPushButton must have a reference page');
const clicked=button.children.find(x=>x.name==='clicked');assert(clicked?.inheritedFrom,'clicked must be inherited on CPushButton');
assert(button.groups?.some(g=>g.title==='Signals'&&g.children.includes(clicked.id)),'clicked must belong to Signals');
for(const name of ['focusTarget','setInputBlocker','touchScrollAreaFor','dropExternalFiles'])assert(!nodes.some(x=>x.name===name),name+' must remain internal');
assert(!nodes.some(x=>x.kind===32768&&/^_[a-zA-Z]/.test(x.name)),'Rendered parameter names must omit unused-parameter prefixes');
const config=JSON.parse(readFileSync('typedoc.json','utf8'));
assert.equal(nodes.filter(x=>x.kind===8388608).length,config.projectDocuments.length,'Every configured guide must be included');
console.log('Reference verified: inherited clicked, Signals group, internal exclusions, parameter names and all configured guides.');
