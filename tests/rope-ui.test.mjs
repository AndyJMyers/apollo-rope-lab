// Real-core interaction checks on DOM stubs; no layout or browser-rendering claim.
import './agc-bench-ui.test.mjs';
import assert from 'node:assert/strict';
import {inspectBench} from '../dist/agc/lab.mjs';
const $=id=>document.getElementById(id);
const originalQuery=document.querySelectorAll;
document.querySelectorAll=selector=>['[data-rope-step]','[data-rope-bit]'].includes(selector)?[]:originalQuery(selector);
$('rope-wires').classList.add=()=>{};$('rope-wires').classList.remove=()=>{};
document.hidden=false;$('inside').hidden=false;
globalThis.window={addEventListener(){}};$('rope-bit-pace').value='100';$('rope-tone-volume').value='35';$('rope-sonify-replay').checked=false;
await import('../dist/agc/rope-ui.mjs');
await $('rope-load').onclick();assert.match($('rope-status').textContent,/15 instructions in 27 memory cycles/);assert.equal($('rope-instruction').textContent,'CAF BIT13');assert.equal($('rope-octal').textContent,'34737');assert.match($('rope-wires').innerHTML,/Bit 15/);
$('rope-preset').value='11';$('rope-preset').onchange();assert.equal($('rope-instruction').textContent,'TS THRUST');assert.match($('rope-effect').textContent,/4096 pulses/);
$('rope-next').onclick();assert.equal($('rope-instruction').textContent,'CAF BIT4');$('rope-prev').onclick();assert.equal($('rope-instruction').textContent,'TS THRUST');
$('rope-preset').value='14';$('rope-preset').onchange();assert.equal($('rope-instruction').textContent,'WOR CHAN14');assert.match($('rope-effect').textContent,/bit 4 is on/);
// Validation is not misrepresented as the flight rope.
$('rope-live').onclick();assert.match($('rope-status').textContent,/CPU validation/);
await $('agc-boot').onclick();const before=inspectBench();$('rope-live').onclick();const after=inspectBench();assert.equal(before.cycles,after.cycles);assert.equal(before.pc,after.pc);assert.equal($('rope-instruction').textContent,'Live fixed-memory word');assert($('rope-play').disabled);
await $('rope-load').onclick();assert.equal($('rope-instruction').textContent,'CAF BIT13');assert.equal($('rope-play').disabled,false);
$('rope-wires').onclick({target:{closest:()=>({dataset:{ropeBit:'0'}})}});assert.match($('rope-bit-detail').textContent,/Bit 15/);
$('rope-play').onclick();assert.equal($('rope-play').textContent,'PAUSE REPLAY');$('rope-play').onclick();assert.equal($('rope-play').textContent,'REPLAY TRACE');
console.log('PASS: real trace load, preset/step navigation, bit inspection, replay controls, validation exclusion and non-mutating live flight-bench snapshot.');

class ToneParam{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}setTargetAtTime(){}}
class ToneNode{constructor(){this.gain=new ToneParam();this.frequency={value:0};}connect(){}disconnect(){}start(){}stop(){}}
let toneContext;globalThis.AudioContext=class{constructor(){toneContext=this;this.currentTime=0;this.destination={};this.nodes=[];}createGain(){return new ToneNode();}createOscillator(){const node=new ToneNode();this.nodes.push(node);return node;}async resume(){}};
globalThis.RopeAudio.isEnabled=()=>true;globalThis.requestAnimationFrame=fn=>setTimeout(fn,20);globalThis.cancelAnimationFrame=clearTimeout;
await $('rope-hear').onclick();assert.equal($('rope-hear').textContent,'STOP WORD');assert.equal(toneContext.nodes.length,20);$('rope-hear').onclick();assert.equal($('rope-hear').textContent,'HEAR THIS WORD');
$('rope-bit-pace').value='200';$('rope-bit-pace').oninput();assert.equal($('rope-pace-label').textContent,'200 ms');$('rope-tone-volume').value='60';$('rope-tone-volume').oninput();assert.equal($('rope-volume-label').textContent,'60%');
globalThis.RopeAudio.isEnabled=()=>false;await $('rope-hear').onclick();assert.match($('rope-hear-status').textContent,/Sound is muted/);
console.log('PASS: Hear/Stop Word controls, real tone scheduling from selected rope word, pace/volume labels and global mute.');
