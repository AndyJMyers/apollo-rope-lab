// Real-core interaction checks on DOM stubs; no layout or browser-rendering claim.
import './agc-bench-ui.test.mjs';
import assert from 'node:assert/strict';
import {inspectBench} from '../dist/agc/lab.mjs';
const $=id=>document.getElementById(id);
const originalQuery=document.querySelectorAll;
document.querySelectorAll=selector=>selector==='[data-rope-step]'?[]:originalQuery(selector);
$('rope-wires').classList.add=()=>{};$('rope-wires').classList.remove=()=>{};
document.hidden=false;$('inside').hidden=false;
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
