// DOM-stub integration check with the actual unchanged AGC core and rope.
// Does not verify browser layout, speech delivery or acoustic quality.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
class Element {
 constructor(){this.children=[];this.disabled=false;this.hidden=false;this.textContent='';this.dataset={};this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes);}prepend(node){this.children.unshift(node);}addEventListener(name,fn){this.listeners??={};this.listeners[name]=fn;}click(){if(!this.disabled)return this.onclick?.();}
 get lastChild(){return {remove:()=>this.children.pop()};}
}
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new Element()]));
const keys=[...html.matchAll(/data-agc-key="([^"]+)"/g)].map(x=>Object.assign(new Element(),{dataset:{agcKey:x[1]}}));
const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(x=>Object.assign(new Element(),{dataset:{tab:x[1]}}));
const listeners={};
globalThis.document={hidden:false,getElementById:id=>{assert(elements.has(id),'Missing '+id);return elements.get(id);},createElement:()=>new Element(),querySelectorAll:selector=>selector==='[data-agc-key]'?keys:tabs,addEventListener:(name,fn)=>listeners[name]=fn};
let audio;
globalThis.RopeAudio={Scene:class{
 constructor(panel,options){assert(options.bench);audio=this;this.clicks=0;this.pauses=0;this.lines=[];this.cues=[];}
 reset(){this.lines=[];this.pauses++;}pause(){this.active=false;this.pauses++;}setBenchActive(active){this.active=active;}clearSpeech(){}keyClick(){this.clicks++;}transmit(lines){this.lines.push(...lines);}labCue(result){this.cues.push(result);}
}};
globalThis.fetch=async url=>{const data=fs.readFileSync(new URL(url));return {ok:true,json:async()=>JSON.parse(data.toString()),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.length)};};
globalThis.requestAnimationFrame=fn=>setImmediate(fn);
let cycle;globalThis.setInterval=fn=>{cycle=fn;return 1;};
await import('../dist/agc/lab.mjs');
const el=id=>elements.get('agc-'+id);
await el('boot').click();assert(audio.active);assert.match(el('status').textContent,/Original Apollo/);assert(audio.lines.some(x=>x.text.includes('computer is running')));
const enter=keys.find(x=>x.dataset.agcKey==='VERB');enter.click();assert.equal(audio.clicks,1,'Accepted DSKY key click');
el('pause').click();const clicks=audio.clicks;enter.click();assert.equal(audio.clicks,clicks,'Disabled keys are silent');assert(!audio.active);
el('pause').click();assert(audio.active);
await el('reset').click();await el('lamp').click();assert.equal(el('prog').textContent,'88');assert(audio.lines.some(x=>x.text==='Lamp test displayed.'));
await el('reset').click();await el('time').click();assert.equal(el('verb').textContent,'16');assert.equal(el('noun').textContent,'65');assert(audio.lines.some(x=>x.text==='Time display selected.'));
elements.get('agc').hidden=true;tabs.find(t=>t.dataset.tab==='flight').listeners.click();assert(!audio.active);cycle();assert(!audio.active);
elements.get('agc').hidden=false;tabs.find(t=>t.dataset.tab==='agc').listeners.click();assert(audio.active);
await el('validation').click();assert.equal(el('prog').textContent,'77');assert.deepEqual(audio.cues,[true]);assert(audio.lines.some(x=>x.text.includes('Code seven seven')));assert(!audio.active);
document.hidden=true;listeners.visibilitychange();assert(!audio.active);
console.log('PASS: actual flight boot, accepted/disabled DSKY key clicks, procedure comms confirmed by V35 and V16 N65 output, CPU pause/resume, panel visibility and real PROG77 validation feedback.');
