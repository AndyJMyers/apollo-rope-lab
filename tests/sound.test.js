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
assert(radio.update({...state,t:20},{active:true}).some(x=>x.role==='EAGLE'));
assert(radio.update({...state,t:21,h:90},{active:true}).some(x=>x.text.startsWith('100 metres')));
assert(!radio.update({...state,t:22,h:80},{active:true}).some(x=>x.text.startsWith('100 metres')));
const overload=radio.update({...state,t:23,h:80,alarms:1,fuel:249},{active:true,protect:false});assert(overload.some(x=>x.text.includes('Commands held')));assert(overload.some(x=>x.text.includes('249 kilograms')));
assert(!radio.update({...state,t:24,h:80,alarms:2,fuel:249},{active:true}).some(x=>x.text.includes('overload')));
const landed=radio.update({...state,t:45,status:'landed',h:0,vy:-1.2},{active:false});assert.equal(landed.length,5);assert(landed.some(x=>x.clip==='eagle-landed'));assert(landed.some(x=>x.role==='COLUMBIA'));assert.deepEqual(radio.update({...state,status:'landed'},{active:false}),[]);
radio.reset();radio.update(state,{active:true,hardware:true});const contact=radio.update({...state,status:'contact',vy:-22},{active:false,hardware:true});assert(contact.every(x=>!x.text.includes('Safe touchdown')),'Hardware contact must not claim a safe landing');
radio.reset();radio.update(state,{active:true});const crash=radio.update({...state,status:'crashed',h:0,vy:-20},{active:false});assert.deepEqual(crash.map(x=>x.role),['HOUSTON']);assert.equal(crash[0].text,'The lander has crashed. Neil and Buzz have perished. Our thoughts are with their loved ones.');assert(crash.every(x=>!x.clip&&!x.landed&&!x.text.includes('Engine stop')));assert.deepEqual(radio.update({...state,status:'crashed'},{active:false}),[],'Crash announcement occurs once');
// Exercise lifecycle and the audio graph without requiring sound hardware.
class Element{
 constructor(){this.children=[];this.value='45';this.checked=true;this.gain=null;}
 append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}remove(){}closest(){return this.hidden?this:null;}setAttribute(k,v){this[k]=v;}
 get firstChild(){const parent=this;return {remove(){parent.children.shift();}};}
 querySelector(selector){this.elements??={};return this.elements[selector]??=(new Element());}
}
class Param{constructor(){this.value=0;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}linearRampToValueAtTime(v){this.value=v;}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.threshold=new Param();this.ratio=new Param();}connect(){}disconnect(){}start(){}stop(){}}
class Context{
 constructor(){this.currentTime=0;this.sampleRate=1000;this.destination=new Node();}
 createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}
}
const listeners={},timers=new Map();let timerId=0,cancelled=0,spoken=[];
const document={hidden:false,addEventListener:(k,f)=>listeners[k]=f,createElement:()=>new Element(),createTextNode:t=>({textContent:t})};
const window={AudioContext:Context,performance:{now:()=>1000},addEventListener:(k,f)=>listeners[k]=f,SpeechSynthesisUtterance:class{constructor(t){this.text=t;}},speechSynthesis:{getVoices:()=>[{lang:'en-US',name:'Microsoft David',voiceURI:'david'},{lang:'en-US',name:'Microsoft Zira',voiceURI:'zira'}],speak:u=>spoken.push(u),cancel:()=>cancelled++}};
const sandbox={window,document,setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId;},clearTimeout:id=>timers.delete(id),module:{exports:{}}};vm.runInNewContext(fs.readFileSync(new URL('../dist/sound.js','file://'+__filename),'utf8'),sandbox);
const panel=new Element(),scene=new window.RopeAudio.Scene(panel);
scene.observe(state,{active:true});assert(panel.querySelector('[data-sound="transcript"]').children.length===4,'Captions when sound is off');
scene.reset();scene.ensureAudio();assert(scene.enabled);scene.observe({...state,angle:10},{active:true});assert(scene.engine.gain.value>0);assert(scene.speaking);assert(scene.queue.length===3);
const speakTimer=[...timers.entries()].find(([,x])=>x.ms===100);timers.delete(speakTimer[0]);speakTimer[1].f();assert.equal(spoken.length,1);assert.equal(spoken[0].text,'Flight, guidance. Ready.');
scene.pause();assert.equal(scene.engine.gain.value,0);assert.equal(scene.rcs.gain.value,0);assert.equal(scene.queue.length,0);assert.equal(timers.size,0);assert(cancelled>0);
scene.observe({...state,t:1},{active:true});assert(scene.engine.gain.value>0);document.hidden=true;listeners.visibilitychange();assert.equal(scene.engine.gain.value,0);
document.hidden=false;scene.reset();scene.observe(state,{active:true,visible:false});assert.equal(scene.director.started,false,'No chatter in hidden flight panel');
scene.toggle();assert.equal(scene.enabled,false);assert.equal(scene.fx.gain.value,0);
assert.equal(scene.chooseVoice('EAGLE').name,'Microsoft David');assert.equal(spoken[0].pitch,1,'No artificial pitch shifting');
const noAudio={...window,AudioContext:undefined,webkitAudioContext:undefined,speechSynthesis:undefined};const fallback={...sandbox,window:noAudio};vm.runInNewContext(fs.readFileSync(new URL('../dist/sound.js','file://'+__filename),'utf8'),fallback);const silent=new noAudio.RopeAudio.Scene(new Element());silent.ensureAudio();assert.equal(silent.enabled,true);silent.observe(state,{active:true});assert(silent.el('transcript').children.length>0);
scene.enabled=true;window.RopeAudio.Scene.active=scene;scene.archivePromise=Promise.resolve({duration:3.589});scene.queue=[{role:'EAGLE',text:'Archival landing announcement.',time:45,clip:'eagle-landed'}];scene.pump();
Promise.resolve().then(()=>{assert(scene.clipSource,'NASA clip enters the Web Audio graph');scene.pause();assert.equal(scene.clipSource,null);assert.equal(timers.size,0);const previous=window.speechSynthesis.getVoices;window.speechSynthesis.getVoices=()=>[{lang:'en-US',name:'Microsoft Zira'}];assert.equal(scene.chooseVoice('HOUSTON'),null,'Never silently default to a female voice');window.speechSynthesis.getVoices=previous;const bench=new window.RopeAudio.Scene(new Element(),{bench:true});bench.ensureAudio();bench.setBenchActive(true);assert.equal(bench.engine.gain.value,0);assert(bench.ambient.gain.value>0);assert.equal(bench.archivePromise,null);assert.equal(scene.enabled,true,'Stage changes preserve the sound preference');assert.equal(window.RopeAudio.Scene.active,bench);bench.keyClick();assert.equal(bench.keyNoise.gain.value,0.0001);bench.labCue(true);assert.equal(bench.shortEffects.size,2);bench.pause();assert.equal(bench.shortEffects.size,0);assert.equal(bench.ambient.gain.value,0);bench.panel.hidden=true;bench.keyNoise.gain.value=0;bench.keyClick();assert.equal(bench.keyNoise.gain.value,0,'No key effects in a hidden panel');bench.enabled=false;bench.panel.hidden=false;bench.keyClick();assert.equal(bench.keyNoise.gain.value,0);});
console.log('PASS: all four radio roles, telemetry-driven calls, pause and duplicate suppression, truthful contact wording, captions without audio, engine graph, mute/reset/visibility cleanup and speech cancellation. Audio quality and browser playback need listening QA.');

// Settings survive a fresh page instance; autoplay permission is separate.
const stored=new Map(),storage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
function freshAudio(settings,bench=false){const page={...window,localStorage:settings},env={...sandbox,window:page};vm.runInNewContext(fs.readFileSync(new URL('../dist/sound.js','file://'+__filename),'utf8'),env);return new page.RopeAudio.Scene(new Element(),{bench});}
const firstVisit=freshAudio(storage);assert.equal(firstVisit.enabled,true);assert.equal(firstVisit.context,undefined,'Do not attempt autoplay before interaction');firstVisit.el('effects').value='23';firstVisit.el('effects').oninput();firstVisit.el('comms').checked=false;firstVisit.el('comms').onchange();firstVisit.el('voice').value='david';firstVisit.el('voice').onchange();firstVisit.toggle();assert.equal(firstVisit.enabled,false);
const reloaded=freshAudio(storage);assert.equal(reloaded.enabled,false);assert.equal(reloaded.fxVolume,.23);assert.equal(reloaded.comms,false);assert.equal(reloaded.voiceChoice,'david');reloaded.reset();assert.equal(reloaded.enabled,false);reloaded.toggle();assert.equal(reloaded.enabled,true);
const nextPage=freshAudio(storage);assert.equal(nextPage.enabled,true);assert.equal(nextPage.fxVolume,.23);nextPage.reset();assert.equal(nextPage.fxVolume,.23);
const benchPrefs=freshAudio(storage,true);assert.equal(benchPrefs.enabled,true);assert.equal(benchPrefs.fxVolume,.3,'Independent quieter bench defaults');
const unavailable={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const privatePage=freshAudio(unavailable);assert.equal(privatePage.enabled,true);privatePage.toggle();assert.equal(privatePage.enabled,false);
const malformed=freshAudio({getItem:()=>'{broken',setItem(){}});assert.equal(malformed.enabled,true);
console.log('PASS: sound defaults enabled, lazy playback activation, persisted mute/volume/comms/voice, reset preservation, bench profile and blocked/corrupt storage fallback.');
