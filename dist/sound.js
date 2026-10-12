/* Procedural sound and dramatised comms. No historical voice recordings. */
(function(root){
 'use strict';
 const ROLES={EAGLE:{pitch:0.9,rate:1.04},HOUSTON:{pitch:0.78,rate:1},COLUMBIA:{pitch:1.13,rate:1.03},'BACK ROOM':{pitch:1,rate:1.12}};
 class RadioDirector {
  constructor(){this.reset();}
  reset(){this.started=false;this.done=false;this.seen=new Set();this.nextReport=16;this.report=0;this.alarms=0;this.previousHeight=null;}
  update(s,{active=false,hardware=false,protect=true}={}){
   const lines=[],say=(role,text)=>lines.push({role,text,time:s.t});
   if(this.done)return lines;
   if(active&&!this.started){this.started=true;this.previousHeight=s.h;
    say('BACK ROOM',hardware?'Hardware test is live. Monitor the pulse counts.':'Flight, guidance is ready. Descent display is live.');
    say('HOUSTON',hardware?'Eagle, Houston. You are clear for the engine experiment.':'Eagle, Houston. You are clear for the training descent.');
    say('EAGLE',hardware?'Roger, Houston. Watching thrust and acceleration.':'Roger, Houston. Beginning descent.');
    say('COLUMBIA','Eagle, Columbia. I have you on the loop.');
   }
   if(!this.started)return lines;
   if(s.status==='landed'||s.status==='crashed'||s.status==='contact'){
    this.done=true;
    if(s.status==='landed'){say('EAGLE','Contact light. Engine off. We are on the surface.');say('HOUSTON','Copy, Eagle. Safe touchdown in the training run.');say('COLUMBIA','Nicely done, Eagle. Columbia is standing by.');say('BACK ROOM','Flight, guidance confirms contact. Someone put the kettle on.');}
    else{say('EAGLE','Surface contact. Engine off.');say('HOUSTON','Copy contact. Recorded vertical speed, '+Math.abs(s.vy).toFixed(1)+' metres per second. Review the run before repeating.');}
    return lines;
   }
   if(!active)return lines;
   if((s.alarms||0)>this.alarms){this.alarms=s.alarms;if(!this.seen.has('alarm')){this.seen.add('alarm');say('EAGLE','Houston, we have a simulated computer overload.');say('BACK ROOM',protect?'Flight, expendable work is being shed. Watch the guidance response.':'Flight, protection is disabled. Guidance commands may be held.');say('HOUSTON','Copy overload. Monitor the descent rate.');}}
   if(s.fuel<250&&!this.seen.has('fuel')){this.seen.add('fuel');say('EAGLE','Houston, fuel is running low.');say('HOUSTON','Copy. Keep the remaining fuel in sight.');}
   if(s.fuel<=0&&!this.seen.has('empty')){this.seen.add('empty');say('EAGLE','Fuel exhausted. No engine thrust.');}
   for(const altitude of [300,100,30])if(this.previousHeight>altitude&&s.h<=altitude&&!this.seen.has(altitude)){this.seen.add(altitude);say('EAGLE',altitude+' metres. Descending at '+Math.abs(s.vy).toFixed(1)+' metres per second.');if(altitude===100)say('HOUSTON','Copy one hundred. Watch the vertical speed.');}
   this.previousHeight=s.h;
   if(s.t>=this.nextReport){this.nextReport=s.t+18;this.report++;
    if(this.report%3===1){say('COLUMBIA','Eagle, Columbia. How does it look down there?');say('EAGLE','Height '+Math.round(s.h)+' metres. '+(s.vy<0?'Descending':'Climbing')+' at '+Math.abs(s.vy).toFixed(1)+' metres per second.');}
    else if(this.report%3===2){say('BACK ROOM','Flight, checking the telemetry. Thrust at '+Math.round(s.throttle*100)+' percent.');say('HOUSTON','Eagle, Houston. We are following your telemetry.');}
    else{say('EAGLE','Houston, Eagle. Fuel remaining '+Math.round(s.fuel)+' kilograms.');say('COLUMBIA','Copy, Eagle. Still listening.');}
   }
   return lines;
  }
 }
 class Scene {
  constructor(panel){
   this.panel=panel;this.enabled=false;this.comms=true;this.fxVolume=0.45;this.voiceVolume=0.8;this.roomVolume=0.2;this.director=new RadioDirector();this.queue=[];this.speaking=false;this.token=0;this.timers=new Set();this.previousAngle=0;this.lastBurst=-Infinity;this.sample={throttle:0,angle:0,active:false};
   panel.innerHTML='<div class="sound-heading"><div><div class="eyebrow">CABIN & RADIO SOUNDSTAGE</div><h2>Listen to the mission.</h2></div><button data-sound="enable" aria-pressed="false">ENABLE SOUND</button></div><div class="sound-controls"><label>Effects <input data-sound="effects" aria-label="Effects volume" type="range" min="0" max="100" value="45"></label><label>Radio <input data-sound="voices" aria-label="Radio volume" type="range" min="0" max="100" value="80"></label><label>Back room <input data-sound="room" aria-label="Back room ambience volume" type="range" min="0" max="100" value="20"></label><label class="sound-check"><input data-sound="comms" type="checkbox" checked> Spoken comms</label><button data-sound="test">RADIO CHECK</button></div><p data-sound="status">Sound is off. Enable it, then start the experiment.</p><div data-sound="transcript" class="radio-transcript" role="log" aria-label="Dramatised radio transcript" aria-live="polite"></div><p class="tiny">Dramatised training dialogue, not archival audio. Eagle: lander · Houston: Mission Control · Columbia: orbiter. Engine and thruster effects are a cabin sound interpretation. Speech uses available browser voices; captions work without them.</p>';
   this.el=name=>panel.querySelector('[data-sound="'+name+'"]');
   this.el('enable').onclick=()=>this.toggle();this.el('test').onclick=()=>{if(!this.enabled)this.toggle();this.transmit([{role:'HOUSTON',text:'Eagle and Columbia, Houston. Radio check.',time:0},{role:'EAGLE',text:'Houston, Eagle. Loud and clear.',time:0},{role:'COLUMBIA',text:'Columbia here. Reading you five by five.',time:0},{role:'BACK ROOM',text:'Flight, the back room is on the loop.',time:0}]);};
   for(const [name,key] of [['effects','fxVolume'],['voices','voiceVolume'],['room','roomVolume']])this.el(name).oninput=()=>{this[key]=+this.el(name).value/100;if(name==='voices'&&this.voiceVolume===0)this.clearSpeech();this.levels();};
   this.el('comms').onchange=()=>{this.comms=this.el('comms').checked;if(!this.comms)this.clearSpeech();};
   document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
   root.addEventListener('pagehide',()=>{this.pause();if(this.context)this.context.suspend().catch(()=>{});});
  }
  later(fn,ms){const id=setTimeout(()=>{this.timers.delete(id);fn();},ms);this.timers.add(id);return id;}
  toggle(){
   if(this.enabled){this.enabled=false;this.pause();this.updateButton();return;}
   try{
    const AudioContext=root.AudioContext||root.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser has no Web Audio support.');
    if(!this.context)this.build(new AudioContext());
    this.enabled=true;this.updateButton();this.context.resume().then(()=>{if(this.enabled)this.levels();}).catch(()=>{this.enabled=false;this.pause();this.updateButton('Audio could not start. Try enabling sound again.');});
   }catch(e){this.enabled=false;this.updateButton(e.message+' Captions remain available.');}
  }
  updateButton(message){this.el('enable').textContent=this.enabled?'MUTE SOUND':'ENABLE SOUND';this.el('enable').setAttribute('aria-pressed',String(this.enabled));this.el('status').textContent=message||(this.enabled?(root.speechSynthesis?'Sound on. Radio voices depend on this browser.':'Effects on; speech unavailable. Read the radio captions.'):'Sound off. Radio captions remain available.');}
  build(ctx){
   this.context=ctx;this.master=ctx.createDynamicsCompressor();this.master.threshold.value=-18;this.master.ratio.value=4;this.master.connect(ctx.destination);
   this.fx=ctx.createGain();this.fx.connect(this.master);this.ambient=ctx.createGain();this.ambient.connect(this.master);
   const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   this.noise=ctx.createBufferSource();this.noise.buffer=noise;this.noise.loop=true;
   const chain=(type,freq,bus)=>{const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=freq;const gain=ctx.createGain();gain.gain.value=0;this.noise.connect(filter);filter.connect(gain);gain.connect(bus);return gain;};
   this.engine=chain('lowpass',650,this.fx);this.rcs=chain('bandpass',2100,this.fx);this.radio=chain('bandpass',1300,this.fx);this.room=chain('lowpass',450,this.ambient);
   this.hum=ctx.createOscillator();this.hum.type='triangle';this.hum.frequency.value=55;this.humGain=ctx.createGain();this.humGain.gain.value=0;this.hum.connect(this.humGain);this.humGain.connect(this.fx);this.noise.start();this.hum.start();this.levels();
  }
  levels(){
   if(!this.context)return;const t=this.context.currentTime,a=this.enabled&&!document.hidden,live=a&&this.sample.active,thrust=live?Math.sqrt(Math.max(0,Math.min(1,this.sample.throttle))):0,duck=this.speaking?0.45:1;
   this.fx.gain.setTargetAtTime(a?this.fxVolume:0,t,0.03);this.ambient.gain.setTargetAtTime(live?this.roomVolume:0,t,0.08);this.engine.gain.setTargetAtTime(thrust*0.26*duck,t,0.04);this.humGain.gain.setTargetAtTime(thrust*0.065*duck,t,0.04);this.hum.frequency.setTargetAtTime(48+thrust*55,t,0.08);this.room.gain.setTargetAtTime(0.025,t,0.05);
  }
  burst(kind='rcs'){
   if(!this.enabled||!this.context||document.hidden)return;
   const t=this.context.currentTime,gain=(kind==='radio'?this.radio:this.rcs).gain;
   gain.cancelScheduledValues(t);gain.setValueAtTime(kind==='radio'?0.12:0.3,t);gain.exponentialRampToValueAtTime(0.0001,t+(kind==='radio'?0.08:0.16));
   if(kind==='radio'){const oscillator=this.context.createOscillator(),envelope=this.context.createGain();oscillator.frequency.value=1450;envelope.gain.setValueAtTime(0.015,t);envelope.gain.exponentialRampToValueAtTime(0.0001,t+0.05);oscillator.connect(envelope);envelope.connect(this.fx);oscillator.start(t);oscillator.stop(t+0.06);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};}
  }
  observe(s,options={}){
   const active=!!options.active&&!document.hidden&&options.visible!==false,angle=s.angle||0;
   this.sample={throttle:s.fuel>0?s.throttle:0,angle,active};
   const now=root.performance.now();if(active&&Math.abs(angle-this.previousAngle)>0.6&&now-this.lastBurst>300){this.burst();this.lastBurst=now;this.previousAngle=angle;}
   if(!active)this.previousAngle=angle;
   this.levels();if(options.visible!==false)this.transmit(this.director.update(s,{...options,active}));
  }
  caption(line){const row=document.createElement('p');const who=document.createElement('strong');who.textContent=line.time.toFixed(1)+' / '+line.role+'  ';row.append(who,document.createTextNode(line.text));const transcript=this.el('transcript');transcript.append(row);while(transcript.children.length>60)transcript.firstChild.remove();transcript.scrollTop=transcript.scrollHeight;}
  transmit(lines){
   if(!lines.length)return;
   if(!this.enabled||!this.comms||!root.speechSynthesis||!root.SpeechSynthesisUtterance||this.voiceVolume===0||document.hidden){for(const line of lines)this.caption(line);return;}
   if(this.director.done){for(const line of this.queue)this.caption(line);this.queue=[];}
   for(const line of lines){if(this.queue.length>=6)this.caption(this.queue.shift());this.queue.push(line);}this.pump();
  }
  pump(){
   if(this.speaking||!this.queue.length||!this.enabled||document.hidden)return;
   const line=this.queue.shift();this.caption(line);this.speaking=true;this.levels();this.burst('radio');const token=this.token;
   const speech=new root.SpeechSynthesisUtterance(line.text),role=ROLES[line.role];speech.lang='en-US';speech.pitch=role.pitch;speech.rate=role.rate;speech.volume=this.voiceVolume;
   const voices=root.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));const index=Object.keys(ROLES).indexOf(line.role);if(voices.length)speech.voice=voices[index%voices.length];
   let finished=false;
   const finish=()=>{if(finished||token!==this.token)return;finished=true;clearTimeout(watchdog);this.timers.delete(watchdog);this.speaking=false;this.levels();this.burst('radio');this.later(()=>this.pump(),250);};
   const watchdog=this.later(()=>{if(token!==this.token)return;root.speechSynthesis.cancel();this.el('status').textContent='Speech stalled in this browser; captions remain available.';finish();},Math.max(8000,line.text.length*110));
   speech.onend=finish;speech.onerror=finish;
   this.later(()=>{if(token!==this.token)return;try{root.speechSynthesis.speak(speech);}catch(e){finish();}},100);
  }
  clearSpeech(){this.token++;for(const id of this.timers)clearTimeout(id);this.timers.clear();for(const line of this.queue)this.caption(line);this.queue=[];if(this.speaking&&root.speechSynthesis)root.speechSynthesis.cancel();this.speaking=false;this.levels();}
  pause(){this.sample.active=false;this.clearSpeech();if(this.context){for(const node of [this.rcs,this.radio]){node.gain.cancelScheduledValues(this.context.currentTime);node.gain.setValueAtTime(0,this.context.currentTime);}}this.levels();}
  reset(){this.pause();this.director.reset();this.previousAngle=0;this.lastBurst=-Infinity;this.el('transcript').replaceChildren();}
 }
 root.RopeAudio={Scene,RadioDirector};if(typeof module!=='undefined')module.exports=root.RopeAudio;
})(typeof window!=='undefined'?window:globalThis);
