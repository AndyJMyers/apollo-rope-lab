const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {RadioDirector}=require('../dist/sound.js');
const state={t:0,h:600,vy:-28,fuel:2000,throttle:0.4,status:'flying',alarms:0};
const radio=new RadioDirector();
assert.deepEqual(radio.update(state,{active:false}),[]);
const first=radio.update(state,{active:true});assert.deepEqual(first.map(x=>x.role),['BACK ROOM','HOUSTON','EAGLE','COLUMBIA']);
assert.deepEqual(radio.update(state,{active:true}),[],'No repeated startup calls');
assert.deepEqual(radio.update({...state,t:20},{active:false}),[],'No periodic chatter while paused');
assert(radio.update({...state,t:20},{active:true}).some(x=>x.role==='COLUMBIA'));
assert(radio.update({...state,t:21,h:90},{active:true}).some(x=>x.text.startsWith('100 metres')));
assert(!radio.update({...state,t:22,h:80},{active:true}).some(x=>x.text.startsWith('100 metres')));
const overload=radio.update({...state,t:23,h:80,alarms:1,fuel:249},{active:true,protect:false});assert(overload.some(x=>x.text.includes('protection is disabled')));assert(overload.some(x=>x.text.includes('fuel is running low')));
assert(!radio.update({...state,t:24,h:80,alarms:2,fuel:249},{active:true}).some(x=>x.text.includes('overload')));
const landed=radio.update({...state,t:45,status:'landed',h:0,vy:-1.2},{active:false});assert.equal(landed.length,4);assert(landed.some(x=>x.role==='COLUMBIA'));assert.deepEqual(radio.update({...state,status:'landed'},{active:false}),[]);
radio.reset();radio.update(state,{active:true,hardware:true});const contact=radio.update({...state,status:'contact',vy:-22},{active:false,hardware:true});assert(contact.every(x=>!x.text.includes('Safe touchdown')),'Hardware contact must not claim a safe landing');
// Exercise lifecycle and the audio graph without requiring sound hardware.
class Element{
 constructor(){this.children=[];this.value='45';this.checked=true;this.gain=null;}
 append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}remove(){}setAttribute(k,v){this[k]=v;}
 get firstChild(){const parent=this;return {remove(){parent.children.shift();}};}
 querySelector(selector){this.elements??={};return this.elements[selector]??=(new Element());}
}
class Param{constructor(){this.value=0;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.threshold=new Param();this.ratio=new Param();}connect(){}disconnect(){}start(){}stop(){}}
class Context{
 constructor(){this.currentTime=0;this.sampleRate=1000;this.destination=new Node();}
 createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}
}
const listeners={},timers=new Map();let timerId=0,cancelled=0,spoken=[];
const document={hidden:false,addEventListener:(k,f)=>listeners[k]=f,createElement:()=>new Element(),createTextNode:t=>({textContent:t})};
const window={AudioContext:Context,performance:{now:()=>1000},addEventListener:(k,f)=>listeners[k]=f,SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:{getVoices:()=>[{lang:'en-US'},{lang:'en-GB'}],speak:u=>spoken.push(u),cancel:()=>cancelled++}};
const sandbox={window,document,setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId;},clearTimeout:id=>timers.delete(id),module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../dist/sound.js','file://'+__filename),'utf8'),sandbox);
const panel=new Element(),scene=new window.RopeAudio.Scene(panel);
scene.observe(state,{active:true});assert(panel.querySelector('[data-sound="transcript"]').children.length===4,'Captions when sound is off');
scene.reset();scene.toggle();assert(scene.enabled);scene.observe({...state,angle:10},{active:true});assert(scene.engine.gain.value>0);assert(scene.speaking);assert(scene.queue.length===3);
const speakTimer=[...timers.entries()].find(([,x])=>x.ms===100);timers.delete(speakTimer[0]);speakTimer[1].f();assert.equal(spoken.length,1);assert.equal(spoken[0].text,'Flight, guidance is ready. Descent display is live.');
scene.pause();assert.equal(scene.engine.gain.value,0);assert.equal(scene.rcs.gain.value,0);assert.equal(scene.queue.length,0);assert.equal(timers.size,0);assert(cancelled>0);
scene.observe({...state,t:1},{active:true});assert(scene.engine.gain.value>0);document.hidden=true;listeners.visibilitychange();assert.equal(scene.engine.gain.value,0);
document.hidden=false;scene.reset();scene.observe(state,{active:true,visible:false});assert.equal(scene.director.started,false,'No chatter in hidden flight panel');
scene.toggle();assert.equal(scene.enabled,false);assert.equal(scene.fx.gain.value,0);
const noAudio={...window,AudioContext:undefined,webkitAudioContext:undefined,speechSynthesis:undefined};const fallback={...sandbox,window:noAudio};vm.runInNewContext(fs.readFileSync(new URL('../dist/sound.js','file://'+__filename),'utf8'),fallback);const silent=new noAudio.RopeAudio.Scene(new Element());silent.toggle();assert.equal(silent.enabled,false);silent.observe(state,{active:true});assert(silent.el('transcript').children.length>0);
console.log('PASS: all four radio roles, telemetry-driven calls, pause and duplicate suppression, truthful contact wording, captions without audio, engine graph, mute/reset/visibility cleanup and speech cancellation. Audio quality and browser playback need listening QA.');
