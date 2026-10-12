// SPDX-License-Identifier: GPL-2.0-or-later
import {AgcCore,CYCLE_US,verifiedBytes} from './core.mjs';
import {fixedWord,wordBits,recordFlatout} from './rope-trace.mjs';
import {inspectBench} from './lab.mjs';
import {WordSonifier} from './sonify.mjs';
const $=id=>document.getElementById(id),oct=(x,n=5)=>x.toString(8).padStart(n,'0');
let trace=null,index=0,selectedBit=14,live=null,loading=false,playing=false,timer=null,pulseTimer=null;
let hearing=false,hearToken=0;
const sonifier=new WordSonifier({enabled:()=>globalThis.RopeAudio.isEnabled(),onBit(i,bit){document.querySelectorAll('[data-rope-bit]').forEach(g=>g.classList.toggle('sounding',+g.dataset.ropeBit===i));$('rope-hear-status').textContent='Bit '+(15-i)+' / '+bit+' / '+(bit?660:220)+' Hz';},onEnd(){hearing=false;$('rope-hear').textContent='HEAR THE WORD!';document.querySelectorAll('[data-rope-bit]').forEach(g=>g.classList.toggle('sounding',false));}});
try{const prefs=JSON.parse(localStorage.getItem('apollo-rope-lab.sonify.v1')||'{}');if(Number.isFinite(prefs.pace)&&prefs.pace>=50&&prefs.pace<=200)$('rope-bit-pace').value=String(prefs.pace);if(Number.isFinite(prefs.volume)&&prefs.volume>=0&&prefs.volume<=100)$('rope-tone-volume').value=String(prefs.volume);$('rope-sonify-replay').checked=prefs.replay===true;}catch{}
sonifier.setVolume(+$('rope-tone-volume').value/100);
function saveToneSettings(){try{localStorage.setItem('apollo-rope-lab.sonify.v1',JSON.stringify({pace:+$('rope-bit-pace').value,volume:+$('rope-tone-volume').value,replay:$('rope-sonify-replay').checked}));}catch{}}
function toneLabels(){$('rope-pace-label').textContent=$('rope-bit-pace').value+' ms';$('rope-volume-label').textContent=$('rope-tone-volume').value+'%';}
const status=t=>$('rope-status').textContent=t;
function stop(){hearToken++;playing=false;clearTimeout(timer);timer=null;sonifier.stop();$('rope-play').textContent='REPLAY TRACE';}
function controls(){for(const id of ['rope-preset','rope-read','rope-prev','rope-next','rope-play'])$(id).disabled=loading||!trace||!!live;$('rope-load').disabled=loading;$('rope-live').disabled=loading;$('rope-hear').disabled=loading||!(trace||live);if(trace&&!live){$('rope-prev').disabled=index===0;$('rope-next').disabled=index===trace.frames.length-1;}}
async function hear(){const request=++hearToken;const f=live||(trace&&trace.frames[index]);if(!f)return;if(!globalThis.RopeAudio.isEnabled()){$('rope-hear-status').textContent='Sound is muted. Enable sound in the Flight Deck or AGC sound controls.';return;}hearing=true;$('rope-hear').textContent='STOP WORD';try{const started=await sonifier.play(f.word,+$('rope-bit-pace').value);if(request!==hearToken)return;if(started){hearing=true;$('rope-hear').textContent='STOP WORD';}else sonifier.stop();}catch(e){if(request!==hearToken)return;sonifier.stop();$('rope-hear-status').textContent='Word audio unavailable: '+e.message;}}
function wires(word){
 const bits=wordBits(word);
 $('rope-wires').innerHTML='<svg viewBox="0 0 960 200" role="group" aria-label="15 schematic sense-wire routes">'+bits.map((bit,i)=>{
  const x=35+i*63,path=bit?'M '+x+' 23 V 163':'M '+x+' 23 V 45 Q '+(x-28)+' 55 '+(x-28)+' 91 Q '+(x-28)+' 132 '+x+' 143 V 163';
  return '<g class="rope-bit '+(i===selectedBit?'selected':'')+'" data-rope-bit="'+i+'" role="button" tabindex="0" aria-label="Bit '+(15-i)+', '+bit+', '+(bit?'through':'bypass')+'"><ellipse class="core-ring" cx="'+x+'" cy="92" rx="19" ry="31" fill="#6b4c30"/><ellipse cx="'+x+'" cy="92" rx="10" ry="22" fill="#0e170d"/><path class="sense-wire '+(bit?'':'bypass')+'" d="'+path+'"/><path class="read-pulse" d="'+path+'"/><text x="'+x+'" y="187" text-anchor="middle" fill="'+(bit?'#e9c68c':'#899c75')+'" font-family="monospace" font-size="20">'+bit+'</text><text x="'+x+'" y="12" text-anchor="middle" fill="#a1ab97" font-family="monospace" font-size="10">'+(15-i)+'</text></g>';
 }).join('')+'</svg>';
 $('rope-bit-detail').textContent='Bit '+(15-selectedBit)+' = '+bits[selectedBit]+'. Sense wire '+(bits[selectedBit]?'threads through the core.':'bypasses the core.');
}
function render(){
 const f=live||(trace&&trace.frames[index]);if(!f){controls();return;}
 $('rope-address').textContent='BANK '+oct(f.bank,2)+' / '+oct(f.address,4);$('rope-octal').textContent=oct(f.word);$('rope-binary').textContent=wordBits(f.word).join('').match(/.{3}/g).join(' ');wires(f.word);
 $('rope-instruction').textContent=live?'Live fixed-memory word':f.name;
 $('rope-explanation').textContent=live?'Read-only snapshot from '+f.program+'. This is the word at Z; pending instruction, EXTEND and interrupt context are not inferred.':f.explanation;
 const before=live?f:f.before,after=live?null:f.after;
 $('rope-registers').innerHTML=[['A / accumulator','a',6],['THRUST / 0055','thrust',5],['Output CH 014','channel14',5]].map(([name,key,n])=>'<tr><td>'+name+'</td><td>'+oct(before[key],n)+'</td><td class="'+(after&&before[key]!==after[key]?'changed':'')+'">'+(after?oct(after[key],n):'snapshot')+'</td></tr>').join('');
 $('rope-effect').textContent=live?'Live bench at '+f.cycles.toLocaleString()+' memory cycles. No registers changed by this peek.':f.address===0o2370?'A now holds 4096: a fixed constant read from the rope.':f.address===0o2315?'THRUST now holds 4096 pulses of demand.':f.address===0o2320?'Channel 014 bit 4 is on. The external thrust drive can now clock the demand.':f.before.a!==f.after.a?'Accumulator changed from '+oct(f.before.a,6)+' to '+oct(f.after.a,6)+'.':'Control advances to '+oct(f.after.pc,4)+'. '+f.explanation;
 $('rope-timing').textContent=live?'Snapshot only. Boot Apollo 11 in Original AGC to inspect its flight rope.':f.memoryCycles+' memory cycle'+(f.memoryCycles===1?'':'s')+' · '+(f.memoryCycles*CYCLE_US).toFixed(2)+' µs in the emulator. Replay is deliberately slow.';
 document.querySelectorAll('[data-rope-step]').forEach(b=>{b.classList.toggle('active',!live&&+b.dataset.ropeStep===index);b.setAttribute('aria-current',!live&&+b.dataset.ropeStep===index?'step':'false');});controls();
}
function read(){if(!trace||live)return;const el=$('rope-wires');el.classList.remove('reading');void el.offsetWidth;el.classList.add('reading');clearTimeout(pulseTimer);pulseTimer=setTimeout(()=>el.classList.remove('reading'),1150);}
async function load(){
 if(loading)return;stop();live=null;
 if(trace){index=0;render();read();status('Verified original trace: 15 instructions, '+trace.cycles+' memory cycles.');return;}
 loading=true;controls();status('Verifying the rope and recording the original instructions…');
 try{
  const response=await fetch(new URL('./provenance.json',import.meta.url));if(!response.ok)throw new Error('Provenance unavailable.');const manifest=await response.json();
  const [wasm,rom]=await Promise.all(['yaAGC.wasm','Luminary099.bin'].map(name=>verifiedBytes(new URL('./'+name,import.meta.url),manifest.assets[name].sha256)));
  const core=await AgcCore.create(wasm);core.loadRom(rom);trace=recordFlatout(core,rom);index=0;
  $('rope-steps').innerHTML=trace.frames.map((f,i)=>'<button data-rope-step="'+i+'">'+oct(f.address,4)+' / '+f.name+'<br>word '+oct(f.word)+'</button>').join('');
  $('rope-load').textContent='RESET TRACE';status('Verified unchanged rope. Recorded 15 instructions in '+trace.cycles+' memory cycles ('+(trace.cycles*CYCLE_US).toFixed(2)+' µs).');render();read();
 }catch(e){status('Trace unavailable: '+e.message);}finally{loading=false;controls();}
}
function replay(){if(!trace||live)return;if(playing){stop();return;}sonifier.stop();playing=true;index=0;$('rope-play').textContent='PAUSE REPLAY';const advance=async()=>{if(!playing)return;if(document.hidden||$('inside').hidden){stop();return;}render();read();const musical=$('rope-sonify-replay').checked;if(musical)await hear();if(!playing)return;const duration=musical?15*(+$('rope-bit-pace').value)+180:900;timer=setTimeout(()=>{if(index===trace.frames.length-1){stop();return;}index++;advance();},duration);};advance();}
$('rope-load').onclick=load;$('rope-read').onclick=read;$('rope-play').onclick=replay;
$('rope-preset').onchange=()=>{stop();live=null;index=+$('rope-preset').value;render();read();};
for(const [id,delta] of [['rope-prev',-1],['rope-next',1]])$(id).onclick=()=>{stop();index=Math.max(0,Math.min(trace.frames.length-1,index+delta));render();read();};
$('rope-steps').onclick=e=>{const b=e.target.closest('[data-rope-step]');if(!b)return;stop();live=null;index=+b.dataset.ropeStep;render();read();};
function chooseBit(target){const bit=target.closest('[data-rope-bit]');if(!bit)return;stop();selectedBit=+bit.dataset.ropeBit;render();if(!live)read();}
$('rope-wires').onclick=e=>chooseBit(e.target);$('rope-wires').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseBit(e.target);}};
$('rope-live').onclick=()=>{stop();const snap=inspectBench();if(!snap){status('Boot the computer in Original AGC first, then return and peek.');return;}if(snap.pc<0o2000){status('Z currently points into erasable memory; this instruction is not a fixed-rope word. Peek again.');return;}if(snap.program!=='Luminary099.bin'){status('The bench is running CPU validation. Boot Apollo 11 to inspect its flight rope.');return;}try{live={...snap,address:snap.pc,word:fixedWord(snap.rom,snap.bank,snap.pc)};render();status('Read-only snapshot taken from the '+(snap.running?'running':'paused')+' original computer. Reset trace to return to the worked example.');}catch(e){status(e.message);}};
$('rope-hear').onclick=()=>{if(hearing){hearToken++;sonifier.stop();return;}stop();return hear();};
$('rope-bit-pace').oninput=()=>{stop();toneLabels();saveToneSettings();};$('rope-tone-volume').oninput=()=>{sonifier.setVolume(+$('rope-tone-volume').value/100);toneLabels();saveToneSettings();};$('rope-sonify-replay').onchange=()=>{stop();saveToneSettings();};
document.addEventListener('rope-audio-preference',e=>{if(!e.detail.enabled)stop();});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='inside'){if(!trace)load();}else stop();}));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);toneLabels();controls();
