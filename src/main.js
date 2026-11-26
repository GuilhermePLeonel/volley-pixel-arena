import './style.css';
import {Game} from './game.js';
import {rotations} from './tactics.js';
import {installTacticalPanel} from './tactical-debug.js';
import {View} from './view.js';
import {clamp} from './physics.js';
import {courtAim,installTouchControls} from './touch-controls.js';
import {playExplosion} from './audio.js';
import {athletesForRole,athleteById} from './roster.js';
import {homeTeam,opponents} from './teams.js';
import teamReference from './assets/equipe-referencia.png';
import rinoIcon from './assets/volley-rino.png';
const app=document.querySelector('#app');
app.innerHTML=`<div id="stage"></div><div class="grain"></div><header class="topbar"><div class="brand"><img class="brand-mark" src="${rinoIcon}" alt=""><div><b>VOLLEY <em>RINO</em></b><small>ARENA · 2.5D</small></div></div><div class="top-right"><span class="live-dot"></span><span class="venue">QUADRA CENTRAL</span><span class="divider"></span> <button id="helpBtn">CONTROLES</button></div></header><main id="menu" class="menu"><div class="menu-intro"><div class="eyebrow"><span></span> O JOGO É SEU</div><h1>ENTRE<br><span class="title-line">EM <i>QUADRA.</i></span></h1><p>Monte sua jogada, encontre o espaço e faça a bola cair. Uma experiência de vôlei em 2.5D para jogar no navegador.</p></div><div class="menu-setup"><div class="team-selectors">
 <div class="fixed-team"><small>SEU TIME</small><strong>${homeTeam.name}</strong></div>
 <label>ADVERSÁRIO<select id="rivalTeam"></select></label>
</div><div class="menu-grid"><label>POSIÇÃO<select id="role"><option>Ponteiro</option><option>Levantador</option><option>Oposto</option><option>Central</option><option>Líbero</option></select></label><label>ATLETA<select id="athlete"></select></label><label>DIFICULDADE<select id="difficulty"><option>Normal</option><option>Fácil</option><option>Difícil</option></select></label></div><div class="athlete-card"><div id="athletePortrait" class="athlete-portrait" role="img"></div><div><small>ATLETA SELECIONADO</small><strong id="athleteName"></strong><span id="athletePosition"></span><span class="coach-name">TÉCNICO · JEFFERSON</span></div></div><div class="menu-actions"><button id="play" class="primary">JOGAR PARTIDA <span>↗</span></button><button id="train" class="secondary">TREINAR</button></div><label class="check"><input id="quick" type="checkbox" checked> PARTIDA RÁPIDA <span>· SET ATÉ 7 PONTOS</span></label><div class="menu-note"><b>01 / PROTÓTIPO JOGÁVEL</b><span>TECLADO + MOUSE</span></div></div></main><div id="hud" class="hud hidden">
 <div class="hud-top">
  <div class="scoreboard">
   <div class="score" aria-label="Placar">
    <div class="team"><span id="homeChip" class="team-chip"></span><div><small>SEU TIME</small><b id="homeName"></b></div></div>
    <strong id="scoreA">0</strong>
    <div class="score-mid"><small>SETS</small><b id="sets">0 : 0</b></div>
    <strong id="scoreB">0</strong>
    <div class="team rival"><div><small>ADVERSÁRIO</small><b id="rivalName"></b></div><span id="rivalChip" class="team-chip"></span></div>
   </div>
   <div class="match-meta"><span id="serve">● SAQUE RINO FINANÇAS</span><span id="touches">0 / 3 TOQUES</span><span id="rotation">ROTAÇÃO P1</span></div>
  </div>
  <button id="pauseTouch" class="pause-touch" type="button" aria-label="Opções da partida">Ⅱ</button>
  <div class="game-status">
   <div class="game-message" id="message" role="status"></div>
   <button id="playAgain" class="primary match-restart hidden" type="button">JOGAR DE NOVO</button>
  </div>
 </div>
 <div class="player-info"><span class="mini-label">VOCÊ EM QUADRA</span><strong id="playerRole">PONTEIRO</strong><span id="hint">Aproxime-se da bola para jogar</span></div>

 <div class="bottom-right"><span><kbd>W A S D</kbd> MOVER</span><span><kbd>SHIFT</kbd> CORRER</span><span><kbd>ESPAÇO</kbd> SALTAR</span><span><kbd>ESC</kbd> PAUSAR</span></div>
 <div class="mobile-controls" id="mobileControls">
  <div class="move-controls">
   <span class="move-help">MOVER · CORRER</span>
   <div id="joystick" class="joystick" role="application" aria-label="Analógico para andar e correr"><span class="joystick-cross"></span><span class="joystick-knob" id="joystickKnob"></span></div>
  </div>
  <div class="action-controls">
   <span class="touch-aim-help">ARRASTE PARA MIRAR</span>
   <div class="action-buttons">
    <button id="jumpTouch" class="touch-button jump-touch" type="button" aria-label="Pular ou mergulhar">PULAR</button>
    <button id="attackTouch" class="touch-button attack-touch" aria-label="Tocar na bola. Arraste para ajustar a mira"><span id="aimKnob" class="aim-knob"><span>TOCAR</span></span></button>
   </div>
  </div>
 </div>
</div><div class="corner-label">VOLLEY RINO <span>✳</span> TEMPORADA 01</div><div id="pause" class="modal hidden"><div><small>TEMPO TÉCNICO</small><h2>JOGO PAUSADO</h2><button id="resume" class="primary">CONTINUAR</button><button id="restart" class="secondary">NOVA PARTIDA</button><button id="back" class="textbtn">VOLTAR AO MENU</button></div></div><div id="help" class="modal hidden"><div><small>GUIA RÁPIDO</small><h2>COMO JOGAR</h2><p class="touch-guide">No celular, arraste o analógico à esquerda para andar ou correr. Toque em PULAR para saltar ou mergulhar como líbero. Toque no botão maior para bater ou arraste nele para ajustar a mira antes de soltar. Você também pode tocar na quadra para mirar.</p><p class="desktop-guide"><b>W A S D</b> movimenta em relação à câmera; <b>Shift</b> corre e <b>Espaço</b> salta ou mergulha.</p><p class="desktop-guide">Mire no chão com o mouse e clique com o botão esquerdo para tocar.</p><p>No chão, o toque para o outro lado sai como largada. No ar, a batida é média. Acerte a bola no topo do salto para a cortada máxima e o rastro de cometa. O aviso “Bata agora” indica esse momento. Para o saque viagem, pule antes de tocar na bola.</p><p>Nos dois primeiros contatos, a bola em queda sobe automaticamente quando entra no seu alcance. O terceiro toque é manual. O círculo verde marca o destino do levantamento e o rótulo identifica quem deve atacar.</p><button id="closeHelp" class="primary">ENTENDI</button></div></div>`;
let game=new Game({role:'Ponteiro',difficulty:'Normal',quick:true,training:false},()=>{});let view=new View(document.querySelector('#stage'),game.players);let active=false, audio=null;
function sound(type,position){if(type==='point')view.showCoachReaction(position?.team);if(type==='impact'){view.showImpact(position);if(audio)playExplosion(audio);return}if(!audio)return;let o=audio.createOscillator(),g=audio.createGain();let f={hit:190,pass:300,serve:240,point:520,whistle:900,net:120,jump:200,block:145}[type]||200;o.type=type==='whistle'?'sine':'triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.65,audio.currentTime+.12);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.14)}
const $=id=>document.getElementById(id);
function updateAthleteCard(){
 const athlete=athleteById($('athlete').value);
 if(!athlete)return;
 const portrait=$('athletePortrait');
 const [x,y,width,height]=athlete.portrait;
 const sheetWidth=1774,sheetHeight=887;
 portrait.style.aspectRatio=width+' / '+height;
 portrait.style.backgroundImage='url('+teamReference+')';
 portrait.style.backgroundSize=(sheetWidth/width)*100+'% '+(sheetHeight/height)*100+'%';
 portrait.style.backgroundPosition=x/(sheetWidth-width)*100+'% '+y/(sheetHeight-height)*100+'%';
 portrait.setAttribute('aria-label','Retrato de '+athlete.name);
 $('athleteName').textContent=athlete.name;
 $('athletePosition').textContent=athlete.role;
}
function updateAthleteChoices(){let list=athletesForRole($('role').value);$('athlete').replaceChildren(...list.map(a=>new Option(a.name,a.id)));updateAthleteCard()}
$('role').addEventListener('change',updateAthleteChoices);$('athlete').addEventListener('change',updateAthleteCard);updateAthleteChoices();
$('rivalTeam').replaceChildren(...opponents.map(team=>new Option(team.name,team.id)));

function showMatchTeams([home,rival]){
 for(const [prefix,team] of [['home',home],['rival',rival]]){
  const name=$(prefix+'Name');
  name.textContent=team.shortName;
  name.title=team.name;
  $(prefix+'Chip').style.background=team.primary;
 }
}

const touchLayout=window.matchMedia('(pointer: coarse), (max-width: 700px), (max-height: 500px) and (max-width: 900px)');

function start(training){
 touch.reset();
 if(!audio)audio=new AudioContext();
 audio.resume();
 game=new Game({role:$('role').value,athlete:$('athlete').value,difficulty:$('difficulty').value,
  quick:$('quick').checked,training,rivalTeam:$('rivalTeam').value},sound);
 view.resetMatchArt();
 showMatchTeams(game.teams);
 if(training){game.rules.server=1;game.serve();}
 active=true;
 tactics.sync();
 $('menu').classList.add('hidden');
 $('hud').classList.remove('hidden');
 $('pause').classList.add('hidden');
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
 updateHUD();
}
$('play').onclick=()=>start(false);
$('train').onclick=()=>start(true);
$('resume').onclick=()=>{game.paused=false;$('pause').classList.add('hidden')};
$('restart').onclick=$('playAgain').onclick=()=>start(game.training);
$('back').onclick=()=>{
 touch.reset();
 active=false;
 tactics.sync();
 game.paused=false;
 $('pause').classList.add('hidden');
 $('hud').classList.add('hidden');
 $('menu').classList.remove('hidden');
};
$('helpBtn').onclick=()=>{touch.reset();$('help').classList.remove('hidden');if(active)game.paused=true};
$('closeHelp').onclick=()=>{$('help').classList.add('hidden');if(active)game.paused=false};

function canPlay(){return active&&!game.paused&&!game.rules.over&&!game.liberoOff}
function setAim(x,y,mobile=false){
 const point=view.pointer(x,y);
 if(!point)return;
 game.aim=mobile?courtAim(point):{x:clamp(point.x,-12,12),z:clamp(point.z,-7,7)};
 }
function beginAim(){
 if(!canPlay())return false;
 game.aim=courtAim(game.aim);
 game.touchAiming=true;
 return true;
}
function cancelAim(){game.touchAiming=false}
function endAim(){
 if(!game.touchAiming)return;
 cancelAim();
 if(canPlay())game.userTouch();
}
function togglePause(){if(!active)return;game.paused=!game.paused;$('pause').classList.toggle('hidden',!game.paused)}
function moveAim(x,y,dt){
 const angle=game.cameraYaw||0;
 game.aim=courtAim({
  x:game.aim.x+(-y*Math.cos(angle)+x*Math.sin(angle))*18*dt,
  z:game.aim.z+(y*Math.sin(angle)+x*Math.cos(angle))*18*dt,
 });
 }
const touch=installTouchControls({stick:$('joystick'),knob:$('joystickKnob'),attack:$('attackTouch'),
 aimKnob:$('aimKnob'),jump:$('jumpTouch'),pause:$('pauseTouch'),canPlay,
 move:(x,y)=>{game.touchMove={x,y}},aim:moveAim,beginAim,endAim,cancelAim,onJump:()=>game.special(),onPause:togglePause});
const tactics=installTacticalPanel({getGame:()=>game,isActive:()=>active,resetInput:()=>{
 touch.reset();game.keys={};game.paused=false;$('pause').classList.add('hidden');
}});
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();game.keys[k]=true;const interactive=e.target instanceof Element&&e.target.closest('button,select,input');if(k==='escape'||(k===' '&&active&&!interactive))e.preventDefault();if(e.repeat)return;if(k===' '&&canPlay()&&!interactive)game.special();if(k==='escape'&&active){touch.reset();togglePause()}});
window.addEventListener('keyup',e=>game.keys[e.key.toLowerCase()]=false);
window.addEventListener('blur',()=>{game.keys={};touch.reset()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.keys={};touch.reset()}});
const canvas=view.renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'){
  if(e.buttons)setAim(e.clientX,e.clientY,true);
 }else if(!game.touchAiming)setAim(e.clientX,e.clientY);
});
canvas.addEventListener('pointerdown',e=>{
 if(!canPlay())return;
 if(e.pointerType==='touch'){
  e.preventDefault();
  setAim(e.clientX,e.clientY,true);
  canvas.setPointerCapture(e.pointerId);
 }else if(e.button===0){
  setAim(e.clientX,e.clientY);
  game.userTouch();
 }
});
function updateHUD(){
 const rules=game.rules;
 const player=[game.playerName(game.controlled),game.controlled.role].filter(Boolean).join(' · ');
 $('playerRole').textContent=(game.liberoOff?'LÍBERO · FORA':player.toUpperCase())+(game.training?' · TREINO':'');
 $('scoreA').textContent=rules.points[0];
 $('scoreB').textContent=rules.points[1];
 $('sets').textContent=rules.sets.join(' : ');
 $('serve').textContent='● SAQUE '+game.teams[rules.server].shortName.toUpperCase();
 $('touches').textContent=rules.touches+' / 3 TOQUES';
 $('rotation').textContent='ROTAÇÃO '+rotations[rules.rotation[0]].name;
 const message=rules.over?'Fim de jogo':game.awaitUserServe?'Seu saque':game.message;
 if($('message').textContent!==message)$('message').textContent=message;
 const hud=$('hud');
 if(rules.over&&!hud.classList.contains('is-ended'))touch.reset();
 hud.classList.toggle('is-ended',rules.over);
 $('playAgain').classList.toggle('hidden',!rules.over);
 hud.classList.toggle('apex-ready',canPlay()&&game.controlled.apexHold>0);
 $('hint').textContent=matchHint();
}

function matchHint(){
 if(game.rules.over)return '';
 if(game.liberoOff)return 'AGUARDE O RETORNO DO LÍBERO';
 if(!game.paused&&game.controlled.apexHold>0)return game.awaitUserServe?'BATA AGORA · SAQUE VIAGEM':'BATA AGORA · CORTADA MÁXIMA';
 if(touchLayout.matches){
  if(game.awaitUserServe)return 'TOQUE PARA SACAR · USE PULAR PARA SAQUE VIAGEM';
  return 'TOQUE PARA BATER · ARRASTE PARA MIRAR';
 }
 if(game.awaitUserServe)return 'CLIQUE PARA SACAR · ESPAÇO PARA SALTAR';
 if(!game.ball.live)return 'AGUARDE O SAQUE';
 const distance=Math.hypot(game.controlled.x-game.ball.x,game.controlled.z-game.ball.z);
 return distance<1.15?'CLIQUE PARA TOCAR':'APROXIME-SE DA BOLA';
}

let last=performance.now(),acc=0;
function frame(now){
 const dt=Math.min((now-last)/1000,.1);
 last=now;
 acc+=dt;
 while(acc>=1/60){
  if(active){touch.update(1/60);game.update(1/60);}
  acc-=1/60;
 }
 view.render(game);
 tactics.render(now);
 if(active)updateHUD();
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
