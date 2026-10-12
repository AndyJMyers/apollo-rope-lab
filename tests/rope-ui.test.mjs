// Real-core interaction checks on DOM stubs; no layout or browser-rendering claim.
import './agc-bench-ui.test.mjs';
import assert from 'node:assert/strict';
import {inspectBench} from '../dist/agc/lab.mjs';
const $=id=>document.getElementById(id);
const originalQuery=document.querySelectorAll;
document.querySelectorAll=selector=>['[data-rope-step]','[data-rope-bit]'].includes(selector)?[]:originalQuery(selector);
$('rope-wires').classList.add=()=>{};$('rope-wires').classList.remove=()=>{};
document.hidden=false;$('inside').hidden=false;
const wordStorage=new Map();globalThis.localStorage={getItem:k=>wordStorage.get(k)||null,setItem:(k,v)=>wordStorage.set(k,v)};globalThis.window={addEventListener(){}};$('rope-bit-pace').value='100';$('rope-tone-volume').value='35';$('rope-sonify-replay').checked=false;
await import('../dist/agc/rope-ui.mjs');
await $('rope-load').onclick();assert.match($('rope-status').textContent,/15 instructions in 27 memory cycles/);assert.equal($('rope-instruction').textContent,'CAF BIT13');assert.equal($('rope-octal').textContent,'34737');assert.match($('rope-wires').innerHTML,/Bit 15/);
$('rope-preset').value='11';$('rope-preset').onchange();assert.equal($('rope-instruction').textContent,'TS THRUST');assert.match($('rope-effect').textContent,/4096 pulses/);
$('rope-next').onclick();assert.equal($('rope-instruction').textContent,'CAF BIT4');$('rope-prev').onclick();assert.equal($('rope-instruction').textContent,'TS THRUST');
$('rope-preset').value='14';$('rope-preset').onchange();assert.equal($('rope-instruction').textContent,'WOR CHAN14');assert.match($('rope-effect').textContent,/bit 4 is on/);
// Validation is not misrepresented as the flight rope.
$('rope-live').onclick();assert.match($('rope-status').textContent,/CPU validation/);
await $('agc-boot').onclick();const before=inspectBench();$('rope-live').onclick();const after=inspectBench();assert.equal(before.cycles,after.cycles);assert.equal(before.pc,after.pc);assert.equal($('rope-instruction').textContent,'Live fixed-memory word');assert($('rope-play').disabled);
await $('rope-load').onclick();assert.equal($('rope-instruction').textContent,'CAF BIT13');assert.equal($('rope-play').disabled,false);
$('rope-wires').onclick({target:{closest:()=>({dataset:{ropeBit:'0'}})}});assert.match($('rope-bit-detail').textContent,/Bit 15/);assert.equal($('rope-octal').textContent,'74737');assert.match($('rope-effect').textContent,/Sandbox edit/);assert.match($('rope-registers').innerHTML,/not been executed/);$('rope-restore').onclick();assert.equal($('rope-octal').textContent,'34737');
$('rope-play').onclick();assert.equal($('rope-play').textContent,'PAUSE REPLAY');$('rope-play').onclick();assert.equal($('rope-play').textContent,'REPLAY TRACE');
console.log('PASS: real trace load, preset/step navigation, bit inspection, replay controls, validation exclusion and non-mutating live flight-bench snapshot.');

class ToneParam{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}setTargetAtTime(){}}
class ToneNode{constructor(){this.gain=new ToneParam();this.frequency={value:0};}connect(){}disconnect(){}start(){}stop(){}}
let toneContext;globalThis.AudioContext=class{constructor(){toneContext=this;this.currentTime=0;this.destination={};this.nodes=[];}createGain(){return new ToneNode();}createOscillator(){const node=new ToneNode();this.nodes.push(node);return node;}async resume(){}};
globalThis.RopeAudio.isEnabled=()=>true;globalThis.requestAnimationFrame=fn=>setTimeout(fn,20);globalThis.cancelAnimationFrame=clearTimeout;
await $('rope-hear').onclick();assert.equal($('rope-hear').textContent,'STOP WORD');assert.equal(toneContext.nodes.length,20);$('rope-hear').onclick();assert.equal($('rope-hear').textContent,'HEAR THE WORD!');
$('rope-bit-pace').value='200';$('rope-bit-pace').oninput();assert.equal($('rope-pace-label').textContent,'200 ms');$('rope-tone-volume').value='60';$('rope-tone-volume').oninput();assert.equal($('rope-volume-label').textContent,'60%');
globalThis.RopeAudio.isEnabled=()=>false;await $('rope-hear').onclick();assert.match($('rope-hear-status').textContent,/Sound is muted/);
console.log('PASS: Hear/Stop Word controls, real tone scheduling from selected rope word, pace/volume labels and global mute.');

// Double toggle and keyboard activation are reversible; edits never reach CPU.
const cpuBefore=inspectBench(),originalWord=$('rope-octal').textContent;
const firstBit={closest:()=>({dataset:{ropeBit:'0'}})};
$('rope-wires').onclick({target:firstBit});assert.equal($('rope-octal').textContent,'74737');assert.equal($('rope-play').textContent,'REPLAY EDITED WORDS');globalThis.RopeAudio.isEnabled=()=>true;await $('rope-hear').onclick();assert.equal(toneContext.nodes.at(-20).frequency.value,660,'Sonification reads the toggled MSB');$('rope-hear').onclick();
$('rope-wires').onkeydown({key:'Enter',target:firstBit,preventDefault(){}});assert.equal($('rope-octal').textContent,originalWord);assert($('rope-restore').disabled);
$('rope-wires').onclick({target:firstBit});const lastBit={closest:()=>({dataset:{ropeBit:'14'}})};$('rope-wires').onclick({target:lastBit});assert.equal($('rope-octal').textContent,'74736');assert.equal(inspectBench().cycles,cpuBefore.cycles);assert.equal(inspectBench().pc,cpuBefore.pc);
$('rope-restore').onclick();assert.equal($('rope-octal').textContent,originalWord);
$('rope-wires').onclick({target:firstBit});await $('rope-load').onclick();assert.equal($('rope-octal').textContent,originalWord);assert.equal($('rope-play').textContent,'REPLAY TRACE');
console.log('PASS: MSB/LSB click toggles, keyboard reversal, edited-word marking, restore/reset and unchanged live CPU.');

// Create entirely new musical words and arrange a two-note melody.
$('word-new').onclick();assert.equal($('rope-octal').textContent,'00000');$('word-name').value='Bass <test>';$('word-name').oninput();$('rope-wires').onclick({target:firstBit});assert.equal($('rope-octal').textContent,'40000');$('word-save').onclick();assert.match($('wordbook-list').innerHTML,/Bass &lt;test&gt;/);assert.equal($('word-save').textContent,'UPDATE WORD');
$('word-new').onclick();$('word-name').value='Top';$('word-name').oninput();$('word-save').onclick();assert.match($('wordbook-status').textContent,/2 saved words/);
const card=(action,id)=>({target:{closest:()=>({dataset:{wordAction:action,wordId:id}})}});
$('wordbook-list').onclick(card('left','w2'));assert($('wordbook-list').innerHTML.indexOf('Top')<$('wordbook-list').innerHTML.indexOf('Bass'));
$('wordbook-list').onclick(card('duplicate','w1'));assert.match($('wordbook-status').textContent,/3 saved words/);$('wordbook-list').onclick(card('remove','w3'));assert.match($('wordbook-status').textContent,/2 saved words/);
globalThis.RopeAudio.isEnabled=()=>true;$('word-mode').value='notes';$('word-mode').onchange();const tonesBefore=toneContext.nodes.length;await $('word-play').onclick();assert.equal($('word-play').textContent,'STOP MELODY');assert.equal(toneContext.nodes.length,tonesBefore+1,'Word-note mode schedules one note per word');$('word-play').onclick();assert.equal($('word-play').textContent,'PLAY MELODY');
console.log('PASS: new musical words, named saving, HTML-safe titles, order/copy/remove and one-note melody playback/stop.');

$('wordbook-list').onclick(card('select','w1'));$('word-name').value='Returning draft';$('word-name').oninput();$('rope-wires').onclick({target:firstBit});const returningBits=$('rope-octal').textContent;
await import('../dist/agc/rope-ui.mjs?reload-wordbook=1');assert.match($('wordbook-list').innerHTML,/Bass &lt;test&gt;/);assert.equal($('rope-octal').textContent,returningBits);assert.equal($('word-name').value,'Returning draft');
console.log('PASS: saved melody and unsaved working bits restore on a fresh explorer instance.');
