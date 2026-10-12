/* Held-key flight controls, independent of operating-system repeat speed. */
(function(root){
 function attach({throttle,tilt,available,beforeChange=()=>{},onChange=()=>{}},doc=root.document){
  const held=new Set(),credit={throttle:0,tilt:0};
  const mapping={w:['throttle',1],s:['throttle',-1],a:['tilt',-1],d:['tilt',1]};
  const editable=target=>target&&(target.isContentEditable||['TEXTAREA','SELECT'].includes(target.tagName)||(target.tagName==='INPUT'&&target.type!=='range'));
  function change(axis,delta){const input=axis==='throttle'?throttle:tilt;if(!available()||input.disabled)return;beforeChange(axis);const value=Math.max(+input.min,Math.min(+input.max,+input.value+delta));if(value!==+input.value){input.value=String(value);onChange(axis);}}
  function clear(){held.clear();credit.throttle=credit.tilt=0;}
  doc.addEventListener('keydown',e=>{const key=e.key.toLowerCase(),command=mapping[key];if(!command||e.ctrlKey||e.metaKey||e.altKey||editable(e.target)||!available())return;const input=command[0]==='throttle'?throttle:tilt;
   // Auto guidance may hand control to the user. FLATOUT's disabled throttle
   // stays owned by the original command; A/D can still change its tilt.
   if(input.disabled&&command[0]==='throttle'&&!beforeChange.canTakeOver)return;
   e.preventDefault();if(held.has(key)||e.repeat)return;beforeChange(command[0]);if(input.disabled)return;held.add(key);change(command[0],command[1]);
  });
  doc.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(held.delete(key))e.preventDefault();});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});root.addEventListener('blur',clear);
  return {clear,tick(dt){if(!available()){clear();return;}dt=Math.max(0,Math.min(0.1,dt));for(const axis of ['throttle','tilt']){const direction=axis==='throttle'?(held.has('w')?1:0)-(held.has('s')?1:0):(held.has('d')?1:0)-(held.has('a')?1:0);if(!direction){credit[axis]=0;continue;}credit[axis]+=direction*dt*(axis==='throttle'?25:15);const steps=Math.trunc(credit[axis]);if(steps){credit[axis]-=steps;change(axis,steps);}}}};
 }
 root.RopeKeys={attach};if(typeof module!=='undefined')module.exports=root.RopeKeys;
})(typeof window!=='undefined'?window:globalThis);
