import {clamp,dist,launch,shotDuration,shotGravity,stepBall,MAX_SPIKE_SPEED} from './physics.js';
import {Rules} from './rules.js';
import {makePlayers,updateAI,chooseAIAttackTarget} from './ai.js';
import {attackOption,isFront,legalReception,officialZone,orient,receptionFormation,rotations,serverIndex,servingFormation,settingZone} from './tactics.js';
import {selectSetPlay} from './tactical-play.js';
import {assignAthletes,athleteById,drawRivalRoster} from './roster.js';
import {matchTeams} from './teams.js';

const groundHeight=.24;
const spinByTouch={serve:2.5,attack:3.8,block:2.8,set:1.6,pass:1.7};

export class Game{
 constructor(options,notify){this.options=options;this.notify=notify;this.rules=new Rules(options.quick);this.players=makePlayers();
  this.teams=matchTeams(options.rivalTeam);
  this.rivalRoster=drawRivalRoster();
  this.liberoAthletes=[assignAthletes(this.players,options.athlete),this.rivalRoster.libero];
  for(const player of this.players){
   if(player.team===1)player.baseAthleteId=this.rivalRoster.lineup[player.index];
  }
  this.controlled=options.role==='Líbero'?this.players[4]:this.players.find(p=>p.team===0&&p.athleteId===options.athlete)||this.players.find(p=>p.team===0&&p.role===options.role)||this.players[2];this.liberoOff=false;this.ball={x:0,y:1,z:0,vx:0,vy:0,vz:0,live:false};this.aim={x:5,z:0};this.keys={};this.touchMove={x:0,y:0};this.charge=null;this.difficulty=options.difficulty;this.paused=false;this.timer=1.5;this.message='Prepare-se para o saque';this.training=options.training;this.lastHit='';this.hitLock=0;this.clock=0;this.recentSetTargets=[[],[]];this.debugTactics=false;this.serve();}
 applyLibero(){
  const players=this.players;
  this.liberoOff=false;
  for(const p of players){p.role=p.baseRole;p.athleteId=p.baseAthleteId;}
  for(const team of [0,1]){
   const rotation=this.rules.rotation[team];
   const back=players.find(p=>p.team===team&&p.baseRole==='Central'&&!isFront(p,rotation));
   const serving=this.rules.server===team&&back.index===serverIndex(rotation);
   const humanCentral=team===0&&this.options.role==='Central'&&back===this.controlled;
   if(!serving&&!humanCentral){
    back.role='Líbero';back.athleteId=this.liberoAthletes[team];
   }
   if(team===0&&this.options.role==='Líbero'){
    this.controlled=back;this.liberoOff=serving;
   }
  }
 }
 serve(){
  this.setTarget=null;this.serveFlight=false;this.flight=null;this.firstAttackTeam=null;
  this.groundBounce=null;
  this.rallyEnded=false;this.liberoOverhand=false;this.prediction=[];
  this.teamTactics=[{phase:'Pré-saque',entryIndex:0},{phase:'Pré-saque',entryIndex:0}];
  this.applyLibero();
  const team=this.rules.server;
  for(const player of this.players){
   const rotation=this.rules.rotation[player.team], serving=player.team===team;
   const position=serving?servingFormation(player,rotation):receptionFormation(player,rotation);
   const server=serving&&player.index===serverIndex(rotation);
   Object.assign(player,position,{y:0,vy:0,navX:undefined,navZ:undefined,moveVX:0,moveVZ:0,
    moving:false,action:'idle',actionTime:0,cool:0,jumpRecovery:0,
    facing:player.team?Math.PI:0,spriteBack:player.team===0,spriteMirror:false,officialZone:officialZone(player,rotation),
    frontRow:isFront(player,rotation),phase:'Pré-saque',tacticalTarget:{...position},moveTarget:{...position},
    contactPriority:server?1:0,responsibility:server?'Sacar':serving?'Formação de saque':'Formação de recepção'});
  }
  const server=this.players[team*6+serverIndex(this.rules.rotation[team])];
  server.action='serve-ready';
  Object.assign(this.ball,{x:server.x,z:server.z,y:1.8,vx:0,vy:0,vz:0,live:false,comet:false,pendingFault:null,
   assistTarget:null,targetTeam:1-team,angle:0,spin:0,spinDirection:1});
  this.awaitUserServe=server===this.controlled&&!this.liberoOff;
  this.timer=1.5;
  this.message=this.awaitUserServe?'Seu saque · clique ou salte para sacar':team===0?'Seu time vai sacar':'Saque adversário';
  this.notify('whistle');
 }
 trackFlight(kind,p,target){
  const b=this.ball;
  b.spinDirection*=-1;
  b.spin=b.spinDirection*(spinByTouch[kind]??1.4);
  this.flight={kind,team:p.team,playerId:p.id,started:this.clock,origin:{x:b.x,y:b.y,z:b.z},target:{...target}};
 }
 debugSetup(rotation,server){
  this.rules.rotation=[rotation,rotation];this.rules.server=server;
  this.rules.side=-1;this.rules.touches=0;this.rules.last=null;this.rules.lastTouchTeam=null;
  this.rules.over=false;this.charge=null;this.lastHit='';this.serve();this.timer=3;
 }
 debugAttack(zone){
  this.debugSetup(this.rules.rotation[0],1);
  const rotation=this.rules.rotation[1], z=zone===4?3.18:zone===2?-3.18:0;
  const attacker=this.players.slice(6).filter(p=>p.frontRow&&p.role!=='Levantador').sort((a,b)=>
   Math.abs((attackOption(a,rotation,false)?.spot.z??0)-z)-Math.abs((attackOption(b,rotation,false)?.spot.z??0)-z))[0];
  const setter=this.players[6];const duration=zone===3?1.02:1.52;
  Object.assign(attacker,{x:2.1,z,navX:undefined,navZ:undefined});
  Object.assign(this.ball,{...settingZone(1),y:2.15,live:true,comet:false,targetTeam:1});
  Object.assign(this.rules,{side:1,touches:2,last:setter.id,lastTouchTeam:1});
  const target={x:1.82,z,y:2.37};
  this.hitLock=.2;
  this.setTarget={team:1,playerId:attacker.id,x:target.x,z,tempo:zone===3?'Rápida de meio':'Bola alta',time:this.clock+duration};
  this.trackFlight('set',setter,target);
  launch(this.ball,target,duration);
  this.message='Simulação · ataque adversário P'+zone;
 }
 planServeShot(target,power,jumping){let b=this.ball,team=this.rules.server;let x=team?Math.min(-.5,target.x):Math.max(.5,target.x);let destination={x,z:target.z,y:.35};let gravity=jumping?16:9.8;let duration=jumping?1.2-.55*power:1.55-.32*power;let fraction=-b.x/(destination.x-b.x);let baseline=b.y+(destination.y-b.y)*fraction;let clearance=(2.83-baseline)/(.5*gravity*fraction*(1-fraction));if(clearance>0)duration=Math.max(duration,Math.sqrt(clearance));return {destination,duration:clamp(duration,.35,2.3),gravity,waypoint:null}}
 chargeTime(){
  const duration=this.awaitUserServe?750:1100;
  return this.charge?.mobile?Math.round(duration*.49):duration;
 }
 playerName(player){return player.team===0?athleteById(player.athleteId)?.name:undefined}
 userServe(target,power){if(!this.awaitUserServe||this.ball.live||this.paused||this.rules.over)return false;let jumping=this.controlled.y>.1;this.doServe({target,power:clamp(power,.12,1),jumping});return true}
 doServe(manual=null){
  const team=this.rules.server, receiving=1-team, rotation=this.rules.rotation[team];
  const server=this.players[team*6+serverIndex(rotation)];
  const b=this.ball;
  b.live=true;
  if(!legalReception(this.players,receiving,this.rules.rotation[receiving])){
   this.point(team,'Falta de posição na recepção');return;
  }
  const onCourt=this.players.slice(team*6,team*6+6).every(p=>
   p===server||(Math.abs(p.x)<=9.05&&Math.abs(p.z)<=4.55));
  if(!onCourt){this.point(receiving,'Jogador fora da quadra no saque');return;}
  Object.assign(b,{x:server.x,z:server.z,y:1.8+(manual?server.y:0),
   pendingFault:null,assistTarget:null,comet:false,targetTeam:receiving});
  server.action='serve';server.actionPose='serve';server.actionTime=.55;
  this.awaitUserServe=false;this.serveFlight=true;this.firstAttackTeam=receiving;this.hitLock=.25;
  Object.assign(this.rules,{side:team,touches:1,last:server.id,lastTouchTeam:team});
  let shot;
  if(manual)shot=this.planServeShot(manual.target,manual.power,manual.jumping);
  else{
   const target=orient(team,5.8+Math.random()*2.05,(Math.random()-.5)*7.15);
   shot=this.planServeShot(target,.38,false);
  }
  this.trackFlight('serve',server,shot.destination);
  launch(b,shot.destination,shot.duration,shot.gravity);
  this.message=manual?(manual.jumping?'Saque viagem':'Saque parado'):'Rally em andamento';
  this.notify('serve');
 }
 shortAttackInvalid(){if(!this.charge||this.awaitUserServe||this.charge.button===2)return false;let p=this.controlled,other=p.team===0?this.aim.x>0:this.aim.x<0;return other&&p.y<=.2&&Math.abs(this.aim.x)<3&&Math.abs(this.aim.z)<=4.5}
 aimValid(){return Math.abs(this.aim.x)<=9&&Math.abs(this.aim.z)<=4.5&&!this.shortAttackInvalid()}
 contact(p,target,power,forced=false,intendedId=null,button=0,setPlan=null){
  const b=this.ball;
  if(this.hitLock>0)return false;
  if(!b.live||(p.team===0?b.x>.05:b.x<-.05)||dist(p,b)>1.15||b.y>3.35+p.y||b.y<.25){
   if(p===this.controlled)this.message='Aproxime-se da bola para tocar';
   return false;
  }
  const assistedByLibero=this.rules.side===p.team&&this.liberoOverhand;
  const fault=this.rules.contact(p.team,p.id);
  if(fault){this.point(1-p.team,fault);return false;}
  const shot=this.planShot(p,target,power,this.rules.touches,button);
  const {other,attack,kind,destination,waypoint,blockedAngle}=shot;
  if(forced&&attack&&power>=.72&&power<1&&b.y>=2.95&&waypoint===null&&b.x*destination.x<0){
   const fraction=-b.x/(destination.x-b.x), gravity=12;
   const clearance=2.87-(b.y+(destination.y-b.y)*fraction);
   const minimum=clearance>0?Math.sqrt(2*clearance/(gravity*fraction*(1-fraction))):0;
   const range=Math.hypot(destination.x-b.x,destination.y-b.y,destination.z-b.z);
   const duration=Math.max(minimum,range/(11+7.1*power),.24);
   if(duration<shot.duration){shot.gravity=gravity;shot.duration=duration;}
  }
  const rotation=this.rules.rotation[p.team];
  this.setTarget=null;
  if(kind==='Levantamento'){
   const receiver=this.selectSetRecipient(p,target,intendedId);
   if(setPlan&&receiver){
    destination.y=setPlan.height;
    shot.duration=setPlan.time;
   }
   if(receiver&&setPlan){
    const history=this.recentSetTargets[p.team];
    history.push(receiver.id);
    if(history.length>6)history.shift();
   }
   if(receiver)this.setTarget={team:p.team,playerId:receiver.id,x:destination.x,z:destination.z,
    tempo:setPlan?.kind,back:!isFront(receiver,rotation),time:this.clock+shot.duration};
  }
  const frontZone=Math.abs(p.y>.01?(p.takeoffX??p.x):p.x)<3;
  const aboveNet=b.y>2.81;
  const reason=p.role==='Líbero'?'Ataque irregular do líbero':
   !isFront(p,rotation)&&frontZone?'Ataque irregular do fundo':
   assistedByLibero?'Ataque após levantamento de toque do líbero na zona de frente':null;
  b.pendingFault=other&&aboveNet&&reason?{team:p.team,reason}:null;
  this.liberoOverhand=!other&&kind==='Levantamento'&&p.role==='Líbero'&&frontZone&&b.y>=1.72&&!setPlan?.forearm;
  b.assistTarget=waypoint&&!blockedAngle?destination:null;
  b.comet=attack&&power>=1;
  this.trackFlight(blockedAngle?'net':setPlan?.kind==='Bola de segurança'?'free':kind==='Largada'?'tip':attack?'attack':other?'free':
   kind==='Levantamento'?'set':'pass',p,destination);
  launch(b,waypoint||destination,shot.duration,shot.gravity);
  this.serveFlight=false;
  if(other){
   this.teamTactics[p.team].entryIndex=0;
   if(!blockedAngle&&this.firstAttackTeam===p.team)this.firstAttackTeam=null;
  }
  if(b.comet)this.notify('impact',{x:b.x,y:b.y,z:b.z});
  b.targetTeam=other?1-p.team:p.team;
  this.hitLock=.2;p.cool=.45;p.action=kind;
  p.actionPose=other?(attack?'attack':'pass'):(this.rules.touches===1||p.role==='Líbero'&&!this.liberoOverhand?'pass':'set');
  p.actionTime=.55;p.anim+=.5;
  const recipient=this.setTarget&&this.players.find(a=>a.id===this.setTarget.playerId);
  const label=setPlan?.kind??kind;
  this.message=recipient?(recipient===this.controlled&&!this.liberoOff?'Levantamento para você':
   'Levantamento para '+(this.playerName(recipient)||recipient.role+' #'+(recipient.index+1))) :
   label+' · '+this.rules.touches+'º toque';
  this.lastHit=kind;
  this.notify(other?'hit':'pass');return true;
 }
 selectSetRecipient(p,target,intendedId=null){
  const rotation=this.rules.rotation[p.team], first=this.firstAttackTeam===p.team;
  const options=this.players.filter(a=>a.team===p.team&&a.id!==p.id)
   .flatMap(player=>{
    const option=attackOption(player,rotation,first);
    return option?[{player,option}]:[];
   });
  return (options.find(a=>a.player.id===intendedId)||
   options.sort((a,b)=>dist(a.option.spot,target)-dist(b.option.spot,target))[0])?.player??null;
 }
 planShot(p,target,power,touches,button=0){let b=this.ball;let other=p.team===0?target.x>0:target.x<0;if(touches===3&&!other){target={x:p.team?-5:5,z:target.z};other=true}let jumping=p.y>.2,tip=other&&button===2,blockedAngle=other&&!tip&&!jumping&&Math.abs(target.x)<3;let attack=other&&!tip&&!blockedAngle&&b.y>2.35;let shotKind=other?(attack?'attack':'free'):(touches===1?'pass':'set');let kind=blockedAngle?'Ataque sem ângulo':tip?'Largada':shotKind==='attack'?'Ataque':shotKind==='free'?'Bola enviada':shotKind==='pass'?'Recepção':'Levantamento';let destination={x:target.x,z:target.z,y:other?.3:1.35};let waypoint=null,gravity=shotGravity(shotKind,power),duration;if(blockedAngle){let fraction=-b.x/(destination.x-b.x);waypoint={x:p.team?-.15:.15,y:1.45,z:b.z+(destination.z-b.z)*fraction};gravity=9.8;duration=.38}else{if(attack&&power>=1&&b.x*destination.x<0){let fraction=-b.x/(destination.x-b.x),netY=b.y+(destination.y-b.y)*fraction,netZ=b.z+(destination.z-b.z)*fraction;if(netY<2.86&&Math.abs(netZ)<4.5)waypoint={x:p.team?-.12:.12,y:2.98,z:netZ}}duration=shotDuration(b,waypoint||destination,shotKind,power)}return {other,attack,kind,destination,waypoint,duration,gravity,blockedAngle}}
 previewShot(){if(!this.charge)return null;let target={...this.aim};if(this.charge.button===2&&target.x<.5)target.x=Math.max(1,Math.abs(target.x));let power=clamp((performance.now()-this.charge.start)/this.chargeTime(),.12,1);if(this.awaitUserServe)return this.planServeShot(target,power,this.controlled.y>.1);let touches=this.rules.side===this.controlled.team?this.rules.touches+1:1;return this.planShot(this.controlled,target,power,touches,this.charge.button)} aiHit(p){
  const {rules,ball}=this, team=p.team, n=rules.side===team?rules.touches:0;
  if(n===0){
   const setter=this.players[team*6], ideal=settingZone(team);
   const stretched=dist(p,ball);
   const floorSave=ball.y<1&&stretched>.75;
   const tempo=Math.hypot(ball.vx,ball.vz);
   const drift=clamp((stretched-.38)*1.5+Math.max(0,tempo-11)*.11+(floorSave?1.55:0),0,3.2);
   const target=setter===this.controlled&&!this.liberoOff&&dist(setter,ideal)>3.7?
    {x:ideal.x*.67+setter.x*.33,z:ideal.z*.67+setter.z*.33}:
    {x:ideal.x+(team?drift:-drift),z:ideal.z*(.92-.11*drift)+ball.z*(.08+.11*drift)};
   return this.contact(p,target,.45,true);
  }
  if(n===1){
   const play=selectSetPlay(this,p);
   if(play.tip)return this.contact(p,play.tip,.35,true,null,2,play);
   if(play.safe)return this.contact(p,play.safe,.25,true,null,2,play);
   if(p.role==='Líbero'&&Math.abs(p.x)<3&&ball.y>=1.72){
    const target={...play.spot,x:play.back?play.spot.x:play.spot.x+(team?.75:-.75)};
    return this.contact(p,target,.35,true,play.player.id,0,{...play,height:1.5,time:1.6,forearm:true});
   }
   return this.contact(p,play.spot,.5,true,play.player.id,0,play);
  }
  const target=this.aiAttackAim(team);
  const strongChance=this.difficulty==='Fácil'?.09:this.difficulty==='Difícil'?.32:.24;
  const power=Math.random()<strongChance?1:.68+Math.random()*.27;
  if(ball.y<1.75||p.role==='Líbero'||!isFront(p,rules.rotation[team])&&
     Math.abs(p.y>.01?(p.takeoffX??p.x):p.x)<3&&ball.y>2.81){
   const safe={kind:'Bola de segurança'};
   return this.contact(p,{...target,x:team?-6.6:6.6},.24,true,null,2,safe);
  }
  const short=orient(team,2.15,clamp(ball.z*.6,-2.9,2.9)*(team?-1:1));
  const unguarded=this.players.every(a=>a.team===team||dist(a,short)>2.35);
  if(unguarded&&power<1&&Math.random()<.12)return this.contact(p,short,.33,true,null,2);
  return this.contact(p,target,power,true);
 }
 aiAttackAim(team){
  const target=chooseAIAttackTarget(team,this.difficulty);
  if(Math.abs(target.z)>4.5||Math.abs(target.x)<6||this.difficulty==='Fácil')return target;
  const defense=this.players.slice((1-team)*6,(1-team)*6+6);
  const openSpace=q=>Math.min(...defense.map(p=>dist(q,p)));
  const choices=[target,...[.36,-.36].map(offset=>({x:target.x,z:clamp(target.z+offset*4.4,-3.95,3.95)}))];
  return choices.reduce((best,q)=>openSpace(q)>openSpace(best)+.24?q:best);
 }
 tryBlock(attackingTeam,crossY,crossZ){
  const attack=this.flight;
  if(this.hitLock>=.5||!['attack','tip'].includes(attack?.kind)||crossY<2.57)return false;
  const team=1-attackingTeam;
  const blockers=this.players.slice(team*6,team*6+6).filter(p=>
   isFront(p,this.rules.rotation[team])&&p.role!=='Líbero'&&p.y>.17&&
   (p.actionPose==='block'||p===this.controlled)&&Math.abs(p.x)<1.13&&
   Math.abs(p.z-crossZ)<.68&&crossY<2.47+p.y);
  if(!blockers.length)return false;
  const defender=blockers.reduce((a,b)=>Math.abs(a.z-crossZ)<Math.abs(b.z-crossZ)?a:b);
  const direction=attackingTeam?1:-1, b=this.ball;
  const pace=Math.hypot(b.vx,b.vz);
  Object.assign(b,{x:direction*.035,y:crossY,z:crossZ,comet:false,pendingFault:null,assistTarget:null,
   targetTeam:attackingTeam});
  const destination={x:direction*clamp(2.75+pace*.12,2.75,4.8),y:.34,z:clamp(crossZ+b.vz*.13,-4.35,4.35)};
  this.trackFlight('block',defender,destination);
  this.flight.cover=attack;
  launch(b,destination,.76);
  this.rules.block(team);this.liberoOverhand=false;this.setTarget=null;
  this.hitLock=.12;defender.actionPose='block';defender.actionTime=.5;
  this.message='Bloqueio · bola em jogo';this.notify('block');
  return true;
 }
 point(team,reason){
  if(!this.ball.live)return;
  this.ball.live=false;this.ball.comet=false;this.awaitUserServe=false;
  if(!this.groundBounce)this.ball.spin=0;
  this.setTarget=null;this.rallyEnded=true;
  this.rules.point(team);
  for(const state of this.teamTactics){
   Object.assign(state,{phase:'Final do ponto',next:null,blockers:[],regions:[],settingGoal:null});
  }
  for(const p of this.players){
   p.phase='Final do ponto';
   p.responsibility='Aguardar o próximo ponto';
   p.contactPriority=0;
   p.moveTarget={x:p.x,z:p.z};
  }
  this.message=(team===0?'Ponto seu':'Ponto adversário')+' · '+reason;
  this.notify('point',{team});this.timer=2.3;
  if(this.training){
   this.rules.points=[0,0];this.rules.sets=[0,0];this.rules.over=false;this.rules.server=1;
  }
 }
 autoContact(){let p=this.controlled,b=this.ball;if(!p||this.liberoOff||this.charge||!b.live||b.targetTeam!==p.team||b.vy>=0||b.y<.45||b.y>2.65+p.y||dist(p,b)>.78||this.hitLock>0||this.rules.last===p.id)return false;let touches=this.rules.side===p.team?this.rules.touches:0;if(touches>=2)return false;let target={...this.aim},other=p.team===0?target.x>0:target.x<0;if(this.contact(p,target,.45,false,null,other?2:0)){this.message=(other?'Devolução automática':touches===0?'Recepção automática':'Levantamento automático');return true}return false}
 special(){if(this.liberoOff)return;let p=this.controlled;if(p.role!=='Líbero'&&!isFront(p,this.rules.rotation[p.team])&&Math.abs(p.x)<3){this.message='Jogador de fundo: salte atrás da linha de ataque';return}if(p.y===0&&p.cool<=0){p.takeoffX=p.x;p.vy=p.role==='Líbero'?3.2:8.3;p.action=this.awaitUserServe?'serve-ready':p.role==='Líbero'?'Mergulho':'Salto';p.actionPose=this.awaitUserServe?'serve-ready':p.role==='Líbero'?'dive':p.role==='Levantador'?'set':'attack';p.actionTime=.5;p.cool=.35;this.notify('jump')}}
 update(dt){
  if(this.paused)return;
  this.clock+=dt;
  this.hitLock=Math.max(0,this.hitLock-dt);
  const ball=this.ball;
  const spin=Math.sign(ball.spin)*Math.max(0,Math.abs(ball.spin)-dt*2.8);
  ball.angle+=(ball.spin+spin)*.5*dt;
  ball.spin=spin;
  for(const q of this.players){
   q.cool=Math.max(0,q.cool-dt);
   q.jumpRecovery=Math.max(0,q.jumpRecovery-dt);
   q.actionTime=Math.max(0,(q.actionTime||0)-dt);
   q.vy-=16*dt;
   q.y=Math.max(0,q.y+q.vy*dt);
   if(q.y===0&&q.vy<0)q.vy=0;
  }
  const player=this.controlled;
  if(!ball.live){
   this.updateGroundBounce(dt);
   if(this.awaitUserServe){
    ball.y=1.8+player.y;
    return;
   }
   this.timer-=dt;
   if(this.timer<=0&&!this.rules.over){
    if(this.rallyEnded)this.serve();
    else this.doServe();
   }
   return;
  }
  if(player&&!this.liberoOff){
   let dx=(this.keys.d?1:0)-(this.keys.a?1:0), dz=(this.keys.s?1:0)-(this.keys.w?1:0);
   const keyboard=!!(dx||dz);
   if(!keyboard){dx=this.touchMove.x;dz=this.touchMove.y;}
   const length=Math.hypot(dx,dz);
   if(length){
    const strength=Math.min(1,length);
    const speed=keyboard?(this.keys.shift?5.2:3.4):(3.4+1.8*strength)*strength*1.1;
    const angle=this.cameraYaw||0;
    const mx=(-dz*Math.cos(angle)+dx*Math.sin(angle))/length;
    const mz=(dz*Math.sin(angle)+dx*Math.cos(angle))/length;
    player.x=clamp(player.x+mx*speed*dt,-10.4,-.45);
    player.z=clamp(player.z+mz*speed*dt,-5.6,5.6);
    player.anim+=dt*speed;player.facing=Math.atan2(mz,mx);player.action='run';
   }else player.action='idle';
  }
  this.autoContact();
  updateAI(this,dt);
  if(ball.live)this.updateBall(dt);
 }
 updateGroundBounce(dt){
  const bounce=this.groundBounce;
  if(!bounce)return;
  stepBall(bounce,dt);
  const ball=this.ball;
  ball.x=bounce.x;ball.z=bounce.z;
  ball.y=Math.max(groundHeight,bounce.y);
  if(bounce.y>groundHeight)return;
  bounce.remaining--;
  if(!bounce.remaining){
   this.groundBounce=null;
   ball.spin=0;
   return;
  }
  bounce.y=groundHeight;
  bounce.vy=Math.max(.55,-bounce.vy*.52);
  bounce.vx*=.55;bounce.vz*=.55;
 }
 updateBall(dt){
  const b=this.ball,oldX=b.x,oldY=b.y,oldZ=b.z;
  stepBall(b,dt);
  if(oldX!==0&&oldX*b.x<=0){
   const side=oldX<0?0:1;
   const fraction=-oldX/(b.x-oldX);
   const crossY=oldY+(b.y-oldY)*fraction;
   const crossZ=oldZ+(b.z-oldZ)*fraction;
   if(Math.abs(crossZ)>=4.5){
    this.notify('net');this.point(1-side,'Bola fora das antenas');return;
   }
   if(crossY<2.55){
    this.notify('net');
    if(this.serveFlight||this.rules.side===side&&this.rules.touches>=3){
     this.point(1-side,this.serveFlight?'Saque na rede':'Terceiro toque na rede');return;
    }
    Object.assign(b,{x:oldX,vx:b.vx*-.35,vy:Math.max(2.6,Math.abs(b.vy)*.4),gravity:9.8,
     assistTarget:null,comet:false,pendingFault:null,targetTeam:side});
    this.setTarget=null;
    if(this.flight)this.flight.kind='net';
    this.message='Bola na rede · ainda pode recuperar';
   }else{
    if(b.pendingFault){
     const {team,reason}=b.pendingFault;b.pendingFault=null;
     this.point(1-team,reason);return;
    }
    if(this.tryBlock(side,crossY,crossZ))return;
    if(b.assistTarget){
     const dest=b.assistTarget;b.assistTarget=null;
     launch(b,dest,Math.hypot(dest.x-b.x,dest.y-b.y,dest.z-b.z)/MAX_SPIKE_SPEED,0);
    }
   }
  }
  if(b.y<=groundHeight){
   b.y=groundHeight;
   const drift=Math.min(.28,3.4/(Math.hypot(b.vx,b.vz)||1));
   this.groundBounce={x:b.x,y:b.y,z:b.z,vx:b.vx*drift,vz:b.vz*drift,
    vy:clamp(-b.vy*.34,1.55,3.35),gravity:12,remaining:3};
   const inside=Math.abs(b.x)<=9&&Math.abs(b.z)<=4.5;
   const winner=inside?(b.x<0?1:0):(this.rules.lastTouchTeam===null?0:1-this.rules.lastTouchTeam);
   this.point(winner,inside?'Bola no chão':'Bola fora');
  }
 }
}
