/* Procedural effects, transcript-informed live comms and NASA touchdown audio. */
(function(root){
 'use strict';
 const ROLES={EAGLE:{rate:1.1},HOUSTON:{rate:1.08},COLUMBIA:{rate:1.08},'BACK ROOM':{rate:1.13}};
 const maleVoice=voice=>/^en[-_]/i.test(voice.lang)&&/\b(david|mark|guy|ryan|christopher|eric|brian|andrew|roger|alex|daniel|fred|thomas|gordon|reed|aaron|arthur|lee|rishi|evan|oliver|george|james|male)\b/i.test(voice.name||'');
 const SETTINGS_KEY='apollo-rope-lab.audio.v1';
 function readSettings(){try{const value=JSON.parse(root.localStorage.getItem(SETTINGS_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
 const volume=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?value:fallback;
 class RadioDirector {
  constructor(){this.reset();}
  reset(){this.started=false;this.done=false;this.seen=new Set();this.nextReport=16;this.report=0;this.alarms=0;this.previousHeight=null;}
  update(s,{active=false,hardware=false,protect=true,go=false}={}){
   const lines=[],say=(role,text)=>lines.push({role,text,time:s.t});
   if(this.done)return lines;
   if(active&&!this.started){this.started=true;this.previousHeight=s.h;
    say('BACK ROOM',hardware?'Flight, instrumentation. Ready.':'Flight, guidance. Ready.');
    say('HOUSTON',hardware?'Eagle, Houston. Go for the engine check.':'Eagle, Houston. Go for descent.');
    say('EAGLE','Roger.');
    say('COLUMBIA','Columbia. Standing by.');
   }
   if(!this.started)return lines;
   if(s.status==='landed'||s.status==='crashed'||s.status==='contact'){
    this.done=true;
    if(s.status==='landed'){
     say('EAGLE','Contact light. Engine stop.');say('HOUSTON','We copy you down, Eagle.');
     say('EAGLE','Houston, Tranquility Base here. The Eagle has landed.');lines[lines.length-1].clip='eagle-landed';
     say('HOUSTON','Roger, Tranquility. We copy you on the ground. We can breathe again. Thank you.');lines[lines.length-1].landed=true;
     say('COLUMBIA','Well done, Eagle.');lines[lines.length-1].landed=true;
    }
    else if(s.status==='crashed'){
     say('HOUSTON','The lander has crashed. Neil and Buzz have perished. Our thoughts are with their loved ones.');
     lines[lines.length-1].sombre=true;
    }
    else{say('EAGLE','Contact. Engine stop.');say('HOUSTON','Copy. Vertical rate at contact, '+Math.abs(s.vy).toFixed(1)+' metres per second.');}
    return lines;
   }
   if(!active)return lines;
   if((s.alarms||0)>this.alarms){this.alarms=s.alarms;if(!this.seen.has('alarm')){this.seen.add('alarm');say('EAGLE','Program alarm. One two zero two.');say('BACK ROOM',go?'Flight, guidance. Go on that alarm.':protect?'Flight, guidance. Checking the restart.':'Flight, guidance. Commands held.');say('HOUSTON',go?'Roger. We are go on that alarm.':'Roger. Stand by.');}}
   if(s.fuel<250&&!this.seen.has('fuel')){this.seen.add('fuel');say('EAGLE','Fuel, '+Math.round(s.fuel)+' kilograms.');say('HOUSTON','Roger.');}
   if(s.fuel<=0&&!this.seen.has('empty')){this.seen.add('empty');say('EAGLE','Fuel depleted. Thrust zero.');}
   for(const altitude of [300,100,30])if(this.previousHeight>altitude&&s.h<=altitude&&!this.seen.has(altitude)){this.seen.add(altitude);say('EAGLE',altitude+' metres. '+Math.abs(s.vy).toFixed(1)+(s.vy<0?' down.':' up.'));}
   this.previousHeight=s.h;
   if(s.t>=this.nextReport){this.nextReport=s.t+18;this.report++;
    say('EAGLE',Math.round(s.h)+' metres. '+Math.abs(s.vy).toFixed(1)+(s.vy<0?' down.':' up.')+' Thrust, '+Math.round(s.throttle*100)+'.');
    if(this.report%2===0)say('HOUSTON','Roger.');
   }
   return lines;
  }
 }
 class Scene {
  constructor(panel,{bench=false}={}){
   this.bench=bench;this.shortEffects=new Set();Scene.instances.add(this);
   const saved=readSettings(),prefs=saved[bench?'bench':'flight']||{};
   this.panel=panel;this.enabled=typeof saved.enabled==='boolean'?saved.enabled:true;this.comms=typeof prefs.comms==='boolean'?prefs.comms:true;this.fxVolume=volume(prefs.fxVolume,bench?0.3:0.45);this.voiceVolume=volume(prefs.voiceVolume,0.8);this.roomVolume=volume(prefs.roomVolume,bench?0.12:0.2);this.director=new RadioDirector();this.queue=[];this.speaking=false;this.token=0;this.timers=new Set();this.previousAngle=0;this.lastBurst=-Infinity;this.sample={throttle:0,angle:0,active:false};
   panel.innerHTML='<div class="sound-heading"><div><div class="eyebrow">CABIN & RADIO SOUNDSTAGE</div><h2>Listen to the mission.</h2></div><button data-sound="enable" aria-pressed="false">ENABLE SOUND</button></div><div class="sound-controls"><label>Effects <input data-sound="effects" aria-label="Effects volume" type="range" min="0" max="100" value="45"></label><label>Radio <input data-sound="voices" aria-label="Radio volume" type="range" min="0" max="100" value="80"></label><label>Back room <input data-sound="room" aria-label="Back room ambience volume" type="range" min="0" max="100" value="20"></label><label class="sound-check"><input data-sound="comms" type="checkbox" checked> Spoken comms</label><button data-sound="test">RADIO CHECK</button></div><label class="sound-voice">Radio voice <select data-sound="voice" aria-label="Radio voice; choose an installed male voice"><option value="auto">Automatic male voice</option></select></label><p data-sound="status">Sound is off. Enable it, then start the experiment.</p><div data-sound="transcript" class="radio-transcript" role="log" aria-label="Dramatised radio transcript" aria-live="polite"></div><p class="tiny">Apollo 11 transcript-informed dialogue; live callouts use simulator metres, not mission feet. Eagle: lander · Houston: Mission Control · Columbia: orbiter. Successful touchdown includes Neil Armstrong’s original NASA recording. Other calls use male browser voices and captions. <a href="audio/README.md">Sources & audio notes ↗</a></p>';
   this.el=name=>panel.querySelector('[data-sound="'+name+'"]');
   if(bench){panel.querySelector('.eyebrow').textContent='ORIGINAL AGC / CONTROL ROOM';panel.querySelector('h2').textContent='Listen to the bench.';this.el('effects').value='30';this.el('room').value='12';panel.querySelector('.tiny').textContent='Interpretive DSKY key clicks, quiet room ambience and dramatised male procedure comms. Validation cues are lab feedback, not historical AGC warning tones. No sounds are generated by CPU instructions or annunciator changes.';this.el('status').textContent='Sound is off. Enable it, then boot the computer or try a procedure.';this.el('test').textContent='LOOP CHECK';}
   this.el('enable').onclick=()=>this.toggle();this.el('test').onclick=()=>{if(!this.enabled)this.toggle();this.transmit(bench?[{role:'HOUSTON',text:'Eagle, Houston. Bench loop check.',time:0},{role:'EAGLE',text:'Roger. Reading you clearly.',time:0}]:[{role:'HOUSTON',text:'Eagle and Columbia, Houston. Radio check.',time:0},{role:'EAGLE',text:'Houston, Eagle. Loud and clear.',time:0},{role:'COLUMBIA',text:'Columbia here. Reading you five by five.',time:0},{role:'BACK ROOM',text:'Flight, the back room is on the loop.',time:0}]);};
   for(const [name,key] of [['effects','fxVolume'],['voices','voiceVolume'],['room','roomVolume']]){this.el(name).value=String(Math.round(this[key]*100));this.el(name).oninput=()=>{this[key]=+this.el(name).value/100;if(name==='voices'&&this.voiceVolume===0)this.clearSpeech();this.saveSettings();this.levels();};}
   this.voiceChoice=typeof prefs.voiceChoice==='string'?prefs.voiceChoice:'auto';this.refreshVoices();this.el('voice').onchange=()=>{this.voiceChoice=this.el('voice').value;this.clearSpeech();this.saveSettings();};if(root.speechSynthesis&&root.speechSynthesis.addEventListener)root.speechSynthesis.addEventListener('voiceschanged',()=>this.refreshVoices());
   this.el('comms').checked=this.comms;this.el('comms').onchange=()=>{this.comms=this.el('comms').checked;if(!this.comms)this.clearSpeech();this.saveSettings();};
   const unlock=()=>{if(this.enabled&&!document.hidden&&!this.panel.closest('[hidden]'))this.ensureAudio();};
   document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('click',unlock);
   this.updateButton();
   document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
   root.addEventListener('pagehide',()=>{this.pause();if(this.context)this.context.suspend().catch(()=>{});});
  }
  later(fn,ms){const id=setTimeout(()=>{this.timers.delete(id);fn();},ms);this.timers.add(id);return id;}
  saveSettings(){const saved=readSettings();saved.enabled=this.enabled;saved[this.bench?'bench':'flight']={fxVolume:this.fxVolume,voiceVolume:this.voiceVolume,roomVolume:this.roomVolume,comms:this.comms,voiceChoice:this.voiceChoice};try{root.localStorage.setItem(SETTINGS_KEY,JSON.stringify(saved));}catch{/* Keep working when browser storage is unavailable. */}}
  refreshVoices(){
   const select=this.el('voice'),choice=this.voiceChoice||'auto';select.replaceChildren();
   const automatic=document.createElement('option');automatic.value='auto';automatic.textContent='Automatic male voice';select.append(automatic);
   this.voices=root.speechSynthesis?root.speechSynthesis.getVoices().filter(maleVoice):[];
   for(const v of this.voices){const option=document.createElement('option');option.value=v.voiceURI||v.name;option.textContent=v.name;select.append(option);}select.value=choice;
  }
  chooseVoice(role){
   if(!root.speechSynthesis)return null;const all=root.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));
   if(this.voiceChoice!=='auto')return all.find(v=>(v.voiceURI||v.name)===this.voiceChoice)||null;
   const males=all.filter(maleVoice),natural=males.filter(v=>/natural|online/i.test(v.name));
   const candidates=(natural.length?natural:males).sort((a,b)=>(/^en-US/i.test(b.lang)?1:0)-(/^en-US/i.test(a.lang)?1:0));
   return candidates.length?candidates[Object.keys(ROLES).indexOf(role)%candidates.length]:null;
  }
  playArchive(){
   this.speaking=true;this.levels();const token=this.token;let finished=false;
   const finish=()=>{if(finished||token!==this.token)return;finished=true;clearTimeout(watchdog);this.timers.delete(watchdog);if(this.clipSource){this.clipSource.disconnect();this.clipSource=null;}this.speaking=false;this.levels();this.later(()=>this.pump(),200);};
   const watchdog=this.later(finish,10000);
   this.archivePromise.then(buffer=>{if(finished||token!==this.token)return;if(!buffer){this.el('status').textContent='NASA clip could not load; its transcript remains visible.';finish();return;}
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.voiceBus);this.clipSource=source;source.onended=finish;source.start();
   }).catch(finish);
  }
  toggle(){
   const enabled=!this.enabled;for(const scene of Scene.instances){scene.enabled=enabled;if(!enabled)scene.pause();scene.updateButton();}this.saveSettings();if(document.dispatchEvent&&root.CustomEvent)document.dispatchEvent(new root.CustomEvent('rope-audio-preference',{detail:{enabled}}));if(enabled)this.ensureAudio();
  }
  ensureAudio(){
   if(!this.enabled||document.hidden||this.panel.closest('[hidden]'))return;
   try{
    const AudioContext=root.AudioContext||root.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser has no Web Audio support.');
    if(!this.context)this.build(new AudioContext());
    if(Scene.active!==this){if(Scene.active)Scene.active.pause();Scene.active=this;}
    this.context.resume().then(()=>{if(this.enabled&&Scene.active===this){this.levels();this.pump();this.updateButton();}}).catch(()=>{this.pause();this.updateButton('Sound is enabled. Click or press a key to allow playback.');});
   }catch(e){this.updateButton(e.message+' Captions remain available.');}
  }
  updateButton(message){this.el('enable').textContent=this.enabled?'MUTE SOUND':'ENABLE SOUND';this.el('enable').setAttribute('aria-pressed',String(this.enabled));this.el('status').textContent=message||(this.enabled?(!this.context?'Sound enabled. Playback starts with your first click or keypress.':root.speechSynthesis?'Sound on. Transcript-style comms; automatic selection uses known male voices.':'Effects on; speech unavailable. Read the radio captions.'):'Sound off. Radio captions remain available.');}
  build(ctx){
   this.context=ctx;this.master=ctx.createDynamicsCompressor();this.master.threshold.value=-18;this.master.ratio.value=4;this.master.connect(ctx.destination);
   this.fx=ctx.createGain();this.fx.connect(this.master);this.ambient=ctx.createGain();this.ambient.connect(this.master);
   const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   this.noise=ctx.createBufferSource();this.noise.buffer=noise;this.noise.loop=true;
   const chain=(type,freq,bus)=>{const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=freq;const gain=ctx.createGain();gain.gain.value=0;this.noise.connect(filter);filter.connect(gain);gain.connect(bus);return gain;};
   this.engine=chain('lowpass',650,this.fx);this.rcs=chain('bandpass',2100,this.fx);this.radio=chain('bandpass',1300,this.fx);this.keyNoise=chain('bandpass',1800,this.fx);this.room=chain('lowpass',450,this.ambient);
   this.hum=ctx.createOscillator();this.hum.type='triangle';this.hum.frequency.value=55;this.humGain=ctx.createGain();this.humGain.gain.value=0;this.hum.connect(this.humGain);this.humGain.connect(this.fx);this.noise.start();this.hum.start();this.voiceBus=ctx.createGain();this.voiceBus.connect(this.master);this.archivePromise=!this.bench&&root.fetch&&ctx.decodeAudioData?root.fetch('audio/eagle-landed.mp3').then(r=>{if(!r.ok)throw new Error('Archive unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(()=>null):null;this.levels();
  }
  levels(){
   if(!this.context)return;const t=this.context.currentTime,a=this.enabled&&!document.hidden,live=a&&this.sample.active,thrust=live&&!this.bench?Math.sqrt(Math.max(0,Math.min(1,this.sample.throttle))):0,duck=this.speaking?0.45:1;
   this.voiceBus.gain.setTargetAtTime(a&&this.comms?this.voiceVolume:0,t,0.03);this.fx.gain.setTargetAtTime(a?this.fxVolume:0,t,0.03);this.ambient.gain.setTargetAtTime(live?this.roomVolume:0,t,0.08);this.engine.gain.setTargetAtTime(thrust*0.26*duck,t,0.04);this.humGain.gain.setTargetAtTime(thrust*0.065*duck,t,0.04);this.hum.frequency.setTargetAtTime(48+thrust*55,t,0.08);this.room.gain.setTargetAtTime(0.025,t,0.05);
  }
  burst(kind='rcs'){
   if(!this.enabled||!this.context||document.hidden)return;
   const t=this.context.currentTime,gain=(kind==='radio'?this.radio:this.rcs).gain;
   gain.cancelScheduledValues(t);gain.setValueAtTime(kind==='radio'?0.12:0.3,t);gain.exponentialRampToValueAtTime(0.0001,t+(kind==='radio'?0.08:0.16));
   if(kind==='radio'){const oscillator=this.context.createOscillator(),envelope=this.context.createGain();oscillator.frequency.value=1450;envelope.gain.setValueAtTime(0.015,t);envelope.gain.exponentialRampToValueAtTime(0.0001,t+0.05);oscillator.connect(envelope);envelope.connect(this.fx);this.shortEffects.add(oscillator);oscillator.start(t);oscillator.stop(t+0.06);oscillator.onended=()=>{this.shortEffects.delete(oscillator);oscillator.disconnect();envelope.disconnect();};}
  }
  setBenchActive(active){this.sample={throttle:0,angle:0,active:!!active};this.levels();}
  keyClick(){
   if(!this.enabled||!this.context||document.hidden||this.panel.closest('[hidden]'))return;
   const t=this.context.currentTime,g=this.keyNoise.gain;g.cancelScheduledValues(t);g.setValueAtTime(0.2,t);g.exponentialRampToValueAtTime(0.0001,t+0.018);
  }
  labCue(passed){
   if(!this.enabled||!this.context||document.hidden||this.panel.closest('[hidden]'))return;
   const ctx=this.context;
   for(const [i,freq] of (passed?[600,820]:[350]).entries()){const oscillator=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*0.16;oscillator.frequency.value=freq;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.045,t+0.005);gain.gain.exponentialRampToValueAtTime(0.0001,t+0.1);oscillator.connect(gain);gain.connect(this.fx);this.shortEffects.add(oscillator);oscillator.start(t);oscillator.stop(t+0.11);oscillator.onended=()=>{this.shortEffects.delete(oscillator);oscillator.disconnect();gain.disconnect();};}
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
   if(!this.enabled||!this.context||!this.comms||this.voiceVolume===0||document.hidden){for(const line of lines)this.caption(line);return;}
   if(this.director.done){for(const line of this.queue)this.caption(line);this.queue=[];}
   for(const line of lines){if(this.queue.length>=6)this.caption(this.queue.shift());this.queue.push(line);}this.pump();
  }
  pump(){
   if(this.speaking||!this.queue.length||!this.enabled||!this.context||document.hidden||this.panel.closest('[hidden]')||Scene.active!==this)return;
   const line=this.queue.shift();this.caption(line);if(line.clip&&this.archivePromise){this.playArchive(line);return;}const voice=this.chooseVoice(line.role);if(!voice||!root.SpeechSynthesisUtterance){this.el('status').textContent='No recognised male voice available. Choose an installed male voice above; captions and NASA touchdown audio remain available.';this.pump();return;}this.speaking=true;this.levels();this.burst('radio');const token=this.token;
   const speech=new root.SpeechSynthesisUtterance(line.text),role=ROLES[line.role];speech.lang='en-US';speech.pitch=1;speech.rate=line.sombre?1:line.landed?1.02:role.rate;speech.volume=this.voiceVolume;
   speech.voice=voice;
   let finished=false;
   const finish=()=>{if(finished||token!==this.token)return;finished=true;clearTimeout(watchdog);this.timers.delete(watchdog);this.speaking=false;this.levels();this.burst('radio');this.later(()=>this.pump(),250);};
   const watchdog=this.later(()=>{if(token!==this.token)return;root.speechSynthesis.cancel();this.el('status').textContent='Speech stalled in this browser; captions remain available.';finish();},Math.max(8000,line.text.length*110));
   speech.onend=finish;speech.onerror=finish;
   this.later(()=>{if(token!==this.token)return;try{root.speechSynthesis.speak(speech);}catch(e){finish();}},100);
  }
  clearSpeech(){this.token++;if(this.clipSource){this.clipSource.stop();this.clipSource.disconnect();this.clipSource=null;}for(const id of this.timers)clearTimeout(id);this.timers.clear();for(const line of this.queue)this.caption(line);this.queue=[];if(this.speaking&&root.speechSynthesis)root.speechSynthesis.cancel();this.speaking=false;this.levels();}
  pause(){this.sample.active=false;this.clearSpeech();for(const oscillator of this.shortEffects)oscillator.stop();this.shortEffects.clear();if(this.context){for(const node of [this.rcs,this.radio,this.keyNoise]){node.gain.cancelScheduledValues(this.context.currentTime);node.gain.setValueAtTime(0,this.context.currentTime);}}this.levels();}
  reset(){this.pause();this.director.reset();this.previousAngle=0;this.lastBurst=-Infinity;this.el('transcript').replaceChildren();}
 }
 Scene.instances=new Set();
 root.RopeAudio={Scene,RadioDirector,isEnabled:()=>{const scene=Scene.instances.values().next().value;return scene?scene.enabled:readSettings().enabled!==false;}};if(typeof module!=='undefined')module.exports=root.RopeAudio;
})(typeof window!=='undefined'?window:globalThis);
