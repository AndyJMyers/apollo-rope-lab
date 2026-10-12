const track=document.getElementById('song');
const playerStatus=document.getElementById('audio-status');
function durationLabel(seconds){const n=Math.round(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
track.addEventListener('loadedmetadata',()=>{if(Number.isFinite(track.duration))playerStatus.textContent=durationLabel(track.duration)+' · Stereo · Andy J Myers';});
track.addEventListener('play',()=>{playerStatus.textContent='Playing · Hope, Hope, Hope (Burn, Baby, Burn)';});
track.addEventListener('pause',()=>{if(!track.ended)playerStatus.textContent='Paused · '+durationLabel(track.currentTime)+' / '+durationLabel(track.duration);});
track.addEventListener('ended',()=>{playerStatus.textContent='Hope, hope, hope. Ready to play again.';});
track.addEventListener('error',()=>{playerStatus.textContent='Audio could not load. Try the MP3 download link.';});
