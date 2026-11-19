/** Audit exported declarations using the TypeScript syntax tree. Findings require semantic review. */
import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
const root=resolve('src');const findings=[];let declarations=0;
const words=s=>new Set(s.replace(/([a-z0-9])([A-Z])/g,'$1 $2').toLowerCase().match(/[a-z]+/g)||[]);
const stop=words('the a an this of to is for and or whether returns return sets set gets get provides behavior handles handle current new value member public condition active widget object instance creates event implements s it its on be has with clears shows hides called true false if when in given specified property flag reads stores changes updates assigns configured stored');
function inspect(node,sf,owner=''){
 const name=node.name?.getText(sf)||(ts.isConstructorDeclaration(node)?'constructor':'');
 const docs=node.jsDoc||[];const tags=docs.flatMap(d=>d.tags?Array.from(d.tags):[]);
 if(tags.some(t=>t.tagName.text==='internal')||node.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword)||node.name&&ts.isPrivateIdentifier(node.name))return;
 const summary=docs.map(d=>typeof d.comment==='string'?d.comment:d.comment?.map(p=>p.text).join('')||'').join(' ').trim();
 const line=sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1;
 const report=(reason)=>findings.push({file:relative(root,sf.fileName).replaceAll('\\','/'),line,name:owner?owner+'.'+name:name,reason,summary});
 declarations++;
 const inherited=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.OverrideKeyword);
 if(!summary&&!inherited)report('missing-summary');
 if(/See the tuple signature|Defines the public .* API|\[native code\]|Returns or updates the/.test(summary))report('boilerplate');
 if(ts.isPropertyDeclaration(node)&&node.initializer?.getText(sf).includes('new CSignal')&&!tags.some(t=>t.tagName.text==='group'&&t.comment==='Signals'))report('missing-signals-group');
 if(/^(?:Provides .+ behavior\.?|Handles .+ behavior\.?|Implements the .+|Public .+ member\.?|Creates a new (?:\w+ )?instance\.?)$/i.test(summary))report('boilerplate');
 const extra=[...words(summary)].filter(w=>!stop.has(w)&&!words(name).has(w));
 if(summary&&summary.split(/\s+/).length<=8&&!extra.length)report('possible-tautology');
}
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.ts')&&!p.endsWith('.d.ts')){const sf=ts.createSourceFile(p,readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);for(const n of sf.statements){if(!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;if(ts.isClassDeclaration(n)||ts.isInterfaceDeclaration(n)||ts.isEnumDeclaration(n)){inspect(n,sf);for(const m of n.members)inspect(m,sf,n.name?.text||'');}else if(ts.isFunctionDeclaration(n)||ts.isTypeAliasDeclaration(n))inspect(n,sf);}}}}
walk(root);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({declarations,findings},null,2)+'\n');
console.log(JSON.stringify({declarations,findings},null,2));
if(findings.length)process.exitCode=1;
