import './style.css';
import {Game} from './game.js';
import {View} from './view.js';
import {clamp} from './physics.js';
import {courtAim,installTouchControls} from './touch-controls.js';
import {playExplosion} from './audio.js';
import {athletesForRole,athleteById} from './roster.js';
import {homeTeam,opponents} from './teams.js';
import teamReference from './assets/equipe-referencia.png';
const app=document.querySelector('#app');
app.innerHTML=`<div id="stage"></div><div class="grain"></div><header class="topbar"><div class="brand"><span class="brand-mark">V<span>●</span></span><div><b>VOLLEY <em>PIXEL</em></b><small>ARENA · 2.5D</small></div></div><div class="top-right"><span class="live-dot"></span> QUADRA CENTRAL <span class="divider"></span> <button id="helpBtn">CONTROLES</button></div></header><main id="menu" class="menu"><div class="eyebrow"><span></span> O JOGO É SEU</div><h1>ENTRE<br>EM <i>QUADRA.</i></h1><p>Monte sua jogada, encontre o espaço e faça a bola cair. Uma experiência de vôlei em 2.5D para jogar no navegador.</p><div class="team-selectors">
 <div class="fixed-team"><small>SEU TIME</small><strong>${homeTeam.name}</strong></div>
 <label>ADVERSÁRIO<select id="rivalTeam"></select></label>
</div><div class="menu-grid"><label>POSIÇÃO<select id="role"><option>Ponteiro</option><option>Levantador</option><option>Oposto</option><option>Central</option><option>Líbero</option></select></label><label>ATLETA<select id="athlete"></select></label><label>DIFICULDADE<select id="difficulty"><option>Normal</option><option>Fácil</option><option>Difícil</option></select></label></div><div class="athlete-card"><div id="athletePortrait" class="athlete-portrait" role="img"></div><div><small>ATLETA SELECIONADO</small><strong id="athleteName"></strong><span id="athletePosition"></span><span class="coach-name">TÉCNICO · JEFFERSON</span></div></div><div class="menu-actions"><button id="play" class="primary">JOGAR PARTIDA <span>↗</span></button><button id="train" class="secondary">TREINAR</button></div><label class="check"><input id="quick" type="checkbox" checked> PARTIDA RÁPIDA <span>· SET ATÉ 7 PONTOS</span></label><div class="menu-note"><b>01 / PROTÓTIPO JOGÁVEL</b><span>TECLADO + MOUSE</span></div></main><div id="hud" class="hud hidden"><div class="score"><div class="team"><span id="homeChip" class="team-chip"></span><div><small>SEU TIME</small><b id="homeName"></b></div></div><strong id="scoreA">0</strong><div class="score-mid"><small>SETS <span id="sets">0 : 0</span></small><i>:</i></div><strong id="scoreB">0</strong><div class="team rival"><div><small>ADVERSÁRIO</small><b id="rivalName"></b></div><span id="rivalChip" class="team-chip"></span></div></div><div class="match-meta"><span id="serve">● SAQUE PIXEL</span><span id="touches">0 / 3 TOQUES</span><span id="rotation">ROTAÇÃO 1</span></div><div class="game-message" id="message"></div><div class="bottom-left"><span class="mini-label">VOCÊ EM QUADRA</span><strong id="playerRole">PONTEIRO</strong><span id="hint">Aproxime-se da bola para jogar</span></div><div class="power-wrap"><div><span>FORÇA DO TOQUE</span><b id="powerText">0%</b></div><div class="power-track"><div id="power"></div></div></div><div class="bottom-right"><kbd>W A S D</kbd> MOVER <kbd>SHIFT</kbd> CORRER <kbd>ESPAÇO</kbd> SALTAR <kbd>ESC</kbd> PAUSAR</div><div class="mobile-controls" id="mobileControls"><div id="joystick" class="joystick" role="application" aria-label="Analógico de movimento; toque para saltar"><span class="joystick-cross"></span><span class="joystick-knob" id="joystickKnob"><span>↑</span></span></div><span class="move-help">MOVER · TOQUE PARA PULAR</span><button id="attackTouch" class="touch-button attack-touch" aria-label="Segure para carregar, mova para mirar e solte para tocar"><span id="chargeFill" class="charge-fill"></span><span id="aimKnob" class="aim-knob"><span id="chargeValue">0%</span></span></button><button id="tipTouch" class="touch-button tip-touch" aria-label="Segure e arraste para dar uma largada">LARGADA</button><button id="pauseTouch" class="pause-touch" aria-label="Pausar partida">Ⅱ</button><span class="touch-aim-help">CARREGUE E MOVA PARA MIRAR</span></div></div><div class="corner-label">VOLLEY PIXEL ARENA <span>✳</span> TEMPORADA 01</div><div id="pause" class="modal hidden"><div><small>TEMPO TÉCNICO</small><h2>JOGO PAUSADO</h2><button id="resume" class="primary">CONTINUAR</button><button id="restart" class="secondary">NOVA PARTIDA</button><button id="back" class="textbtn">VOLTAR AO MENU</button></div></div><div id="help" class="modal hidden"><div><small>GUIA RÁPIDO</small><h2>COMO JOGAR</h2><p class="touch-guide">No celular, arraste o analógico à esquerda para mover ou dê um toque rápido nele para pular. À direita, segure o círculo para carregar o toque e mova o dedo dentro dele para deslocar a mira; solte para bater. O botão LARGADA faz uma jogada precisa. Você também pode tocar diretamente na quadra para ajustar a mira.</p><p class="desktop-guide"><b>W A S D</b> movimenta em relação à câmera; <b>Shift</b> corre e <b>Espaço</b> salta ou mergulha.</p><p class="desktop-guide">Mire no chão com o mouse. Segure e solte o <b>botão esquerdo</b> para recepcionar, levantar ou atacar. O <b>direito</b> faz uma largada precisa. Para atacar curto com o esquerdo, é preciso saltar. Quando você for sacar, clique para o saque parado ou salte e carregue para o saque viagem.</p><p>Nos dois primeiros toques, posicione-se sob a bola em queda para realizar um passe automático na direção do mouse. O terceiro toque é manual. A partir de 70%, o ataque ganha velocidade; em 100%, há impacto máximo. Na recepção, seu jogador se reposiciona enquanto você não usa WASD. O círculo verde indica o destino do levantamento; o nome acima do atleta mostra quem deve atacar.</p><button id="closeHelp" class="primary">ENTENDI</button></div></div>`;
let game=new Game({role:'Ponteiro',difficulty:'Normal',quick:true,training:false},()=>{});let view=new View(document.querySelector('#stage'),game.players);let active=false, audio=null;
function sound(type,position){if(type==='point')view.showCoachReaction(position?.team);if(type==='impact'){view.showImpact(position);if(audio)playExplosion(audio);return}if(!audio)return;let o=audio.createOscillator(),g=audio.createGain();let f={hit:190,pass:300,serve:240,point:520,whistle:900,net:120,jump:200}[type]||200;o.type=type==='whistle'?'sine':'triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.65,audio.currentTime+.12);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.14)}
const $=id=>document.getElementById(id);
function updateAthleteCard(){let a=athleteById($('athlete').value);if(!a)return;let portrait=$('athletePortrait');portrait.style.backgroundImage=`url(${teamReference})`;portrait.style.backgroundPosition=`-${a.portrait[0]*.32}px -${a.portrait[1]*.32}px`;portrait.setAttribute('aria-label','Retrato de '+a.name);$('athleteName').textContent=a.name;$('athletePosition').textContent=a.role}
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

function start(training){touch.reset();if(!audio)audio=new AudioContext();audio.resume();game=new Game({role:$('role').value,athlete:$('athlete').value,difficulty:$('difficulty').value,quick:$('quick').checked,training,rivalTeam:$('rivalTeam').value},sound);view.resetMatchArt();showMatchTeams(game.teams);if(training){game.rules.server=1;game.serve()}active=true;$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('pause').classList.add('hidden');$('playerRole').textContent=game.controlled.role.toUpperCase()+(training?' · TREINO':'');}
$('play').onclick=()=>start(false);$('train').onclick=()=>start(true);$('resume').onclick=()=>{game.paused=false;$('pause').classList.add('hidden')};$('restart').onclick=()=>start(game.training);$('back').onclick=()=>{touch.reset();active=false;game.paused=false;$('pause').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden')};$('helpBtn').onclick=()=>{touch.reset();$('help').classList.remove('hidden');if(active)game.paused=true};$('closeHelp').onclick=()=>{$('help').classList.add('hidden');if(active)game.paused=false};
function canPlay(){return active&&!game.paused&&!game.liberoOff}
function setAim(x,y,mobile=false){
 const point=view.pointer(x,y);
 if(!point)return;
 game.aim=mobile?courtAim(point):{x:clamp(point.x,-12,12),z:clamp(point.z,-7,7)};
 }
function beginShot(button,mobile=false){
 if(!canPlay()||game.charge)return false;
 if(mobile)game.aim=courtAim(game.aim);
 game.charge={start:performance.now(),button,mobile};
 return true;
 }
function cancelShot(){game.charge=null}
function finishShot(){if(!game.charge||!canPlay()){cancelShot();return}let power=clamp((performance.now()-game.charge.start)/game.chargeTime(),.12,1);let target={...game.aim},button=game.charge.button;if(button===2&&target.x<.5)target.x=Math.max(1,Math.abs(target.x));if(game.awaitUserServe)game.userServe(target,power);else game.contact(game.controlled,target,power,false,null,button);cancelShot()}
function togglePause(){if(!active)return;game.paused=!game.paused;$('pause').classList.toggle('hidden',!game.paused)}
function moveAim(x,y,dt){
 const angle=game.cameraYaw||0;
 game.aim=courtAim({
  x:game.aim.x+(-y*Math.cos(angle)+x*Math.sin(angle))*18*dt,
  z:game.aim.z+(y*Math.sin(angle)+x*Math.cos(angle))*18*dt,
 });
 }
const touch=installTouchControls({stick:$('joystick'),knob:$('joystickKnob'),attack:$('attackTouch'),aimKnob:$('aimKnob'),chargeFill:$('chargeFill'),chargeValue:$('chargeValue'),tip:$('tipTouch'),pause:$('pauseTouch'),canPlay,move:(x,y)=>{game.touchMove={x,y}},aim:moveAim,beginShot:button=>beginShot(button,true),endShot:finishShot,cancelShot,onJump:()=>game.special(),onPause:togglePause});
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();game.keys[k]=true;if([' ','escape'].includes(k))e.preventDefault();if(e.repeat)return;if(k===' '&&canPlay())game.special();if(k==='escape'&&active){touch.reset();togglePause()}});
window.addEventListener('keyup',e=>game.keys[e.key.toLowerCase()]=false);
window.addEventListener('blur',()=>{game.keys={};touch.reset()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.keys={};touch.reset()}});
const canvas=view.renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){if(e.buttons)setAim(e.clientX,e.clientY,true)}else if(!game.charge?.mobile)setAim(e.clientX,e.clientY)});
canvas.addEventListener('pointerdown',e=>{if(!canPlay())return;if(e.pointerType==='touch'){e.preventDefault();setAim(e.clientX,e.clientY,true);canvas.setPointerCapture(e.pointerId);return}if((e.button===0||e.button===2)&&beginShot(e.button))canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='touch'&&!game.charge?.mobile)finishShot()});
canvas.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch'&&!game.charge?.mobile)cancelShot()});
let last=performance.now(),acc=0;function frame(now){let dt=Math.min((now-last)/1000,.1);last=now;acc+=dt;while(acc>=1/60){if(active){touch.update(1/60);game.update(1/60)}acc-=1/60}view.render(game);if(active){let r=game.rules;$('playerRole').textContent=(game.liberoOff?'LÍBERO · FORA':[game.playerName(game.controlled),game.controlled.role].filter(Boolean).join(' · ').toUpperCase())+(game.training?' · TREINO':'');$('scoreA').textContent=r.points[0];$('scoreB').textContent=r.points[1];$('sets').textContent=r.sets.join(' : ');$('serve').textContent='● SAQUE '+game.teams[r.server].shortName.toUpperCase();$('touches').textContent=r.touches+' / 3 TOQUES';$('rotation').textContent='ROTAÇÃO '+(r.rotation[0]+1);$('message').textContent=r.over?'FIM DE JOGO · ESC PARA REINICIAR':game.message;let power=game.charge?clamp((now-game.charge.start)/game.chargeTime(),0,1):0;$('power').style.width=(power*100)+'%';$('power').style.background=power>=1?'#fff0a1':power>=.7?'#ff994e':'#dfff69';$('powerText').textContent=Math.round(power*100)+'%';touch.setPower(power);let mobile=window.matchMedia('(pointer: coarse)').matches||window.innerWidth<=700;$('hint').textContent=mobile?(game.liberoOff?'AGUARDE O RETORNO DO LÍBERO':game.awaitUserServe?'TOQUE PARA SACAR · PULE PARA SAQUE VIAGEM':'SEGURE E MOVA PARA MIRAR'):game.liberoOff?'AGUARDE O RETORNO DO LÍBERO':game.awaitUserServe?'CLIQUE PARA SACAR · ESPAÇO PARA SALTAR':game.ball.live&&game.shortAttackInvalid()?'BOLA CURTA: SALTE OU USE O BOTÃO DIREITO':game.ball.live?(Math.hypot(game.controlled.x-game.ball.x,game.controlled.z-game.ball.z)<1.15?'SOLTE O BOTÃO PARA TOCAR':'APROXIME-SE DA BOLA'):'AGUARDE O SAQUE'}requestAnimationFrame(frame)}requestAnimationFrame(frame);






