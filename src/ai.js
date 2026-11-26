import {clamp,dist,trajectory} from './physics.js';
import {isFront,officialZone,receptionFormation,preferredPosition} from './tactics.js';
import {botSpeed,createTeamPlan,receptionBonus} from './tactical-play.js';
export {attackSpot,isFront,receptionFormation,rotationSlot,serverIndex} from './tactics.js';
export const roles=['Levantador','Central','Ponteiro','Oposto','Central','Ponteiro'];
export const tacticalFormation=preferredPosition;
export const serveReceiveFormation=receptionFormation;

export function makePlayers(){
 return [0,1].flatMap(team=>roles.map((role,index)=>{
  const p={id:team*6+index,team,role,baseRole:role,index,y:0,vy:0,anim:0,facing:0,action:'idle',cool:0};
  return {...p,...receptionFormation(p,0)};
 }));
}

export function chooseAIAttackTarget(team,difficulty,random=Math.random){
 const error=difficulty==='Fácil'?1.7:difficulty==='Difícil'?.35:.85;
 const deep=random()<.85;
 const x=(team?-1:1)*(deep?6+random()*2.5:4+random()*2);
 let z=(random()-.5)*(6+error);
 const miss=difficulty==='Fácil'?.17:difficulty==='Difícil'?.06:.1;
 if(random()<miss)z=(random()<.5?-1:1)*(4.7+random()*.9);
 return {x,z};
}
function interceptorChoices(own,path,team,rules,speed,serveReceive=false,plan=null){
 const touches=rules.side===team?rules.touches:0;
 const candidates=path.filter(q=>(team===0?q.x<-.24:q.x>.24)&&q.y<3.15&&q.y>.42);
 const choices=[];
 for(const p of own){
  if(p.id===rules.last||(serveReceive&&p.role==='Levantador'&&!isFront(p,rules.rotation[team])))continue;
  const rotation=rules.rotation[team],front=isFront(p,rotation);
  let best=null;
  for(const q of candidates){
   if(touches===2&&!front&&Math.abs(q.x)<3.05&&q.y>2.55)continue;
   if(touches!==2&&q.y>2.77)continue;
   const distance=dist(p,q);
   const travel=Math.max(0,distance-.67)/speed;
   const ready=Math.max(travel,(p.cool??0)-.07);
   const reachable=ready<=q.t+.11;
   const settingPenalty=touches===1?(p.role==='Levantador'?-.9:p.role==='Líbero'?-.24:.22):0;
   const defensePenalty=touches===0?(p.role==='Levantador'?1.4:p.role==='Líbero'?-.36:0):0;
   const servePenalty=serveReceive&&plan?receptionBonus(p,plan,q):0;
   const contactHeight=touches===2?.53*Math.abs(q.y-2.65):.16*Math.abs(q.y-1.8);
   const score=Math.max(0,ready-q.t)*4.8+q.t*.36+travel*.29+settingPenalty+defensePenalty+servePenalty+contactHeight;
   if(!best||Number(reachable)>Number(best.reachable)||(reachable===best.reachable&&score<best.score))
    best={player:p,target:q,score,reachable};
  }
  if(best)choices.push(best);
 }
 const backAvailable=touches===0&&!serveReceive&&choices.some(c=>Math.abs(c.player.x)>=4&&c.reachable);
 if(backAvailable)for(const c of choices)if(Math.abs(c.player.x)<4)c.score+=1.4;
 return choices.sort((a,b)=>Number(b.reachable)-Number(a.reachable)||a.score-b.score);
}
export function chooseInterceptor(own,path,team,rules,speed,serveReceive=false){
 return interceptorChoices(own,path,team,rules,speed,serveReceive)[0]||null;
}

export function coordinateInterceptor(state,eligible,path,team,rules,speed,serveReceive,assigned,active,dt,plan=null){
 const context=[active,rules.side,rules.touches,rules.last,serveReceive,assigned].join(':');
 if(state.context!==context){state.context=context;state.selection=null;state.timer=0}
 if(!active||!eligible.length){state.selection=null;state.timer=0;return null}
 state.timer-=dt;
 if(state.timer<=0){
  const choices=interceptorChoices(eligible,path,team,rules,speed,serveReceive,plan);
  const best=choices[0],current=state.selection&&choices.find(c=>c.player.id===state.selection.player.id);
  const hold=current&&best&&(!best.reachable||current.reachable)&&current.score<=best.score+.52;
  state.selection=hold?current:best;
  if(state.selection)state.selection={...state.selection,target:{...state.selection.target}};
  state.timer=.14;
 }else if(state.selection){state.selection.target.t=Math.max(0,state.selection.target.t-dt)}
 return state.selection;
}

function moveSmoothly(p,dest,speed,dt){
 if(p.navX===undefined){p.navX=p.x;p.navZ=p.z;p.moveVX=0;p.moveVZ=0;p.moving=false}
 let follow=1-Math.exp(-7*dt);p.navX+=(dest.x-p.navX)*follow;p.navZ+=(dest.z-p.navZ)*follow;
 let dx=p.navX-p.x,dz=p.navZ-p.z,d=Math.hypot(dx,dz),targetSpeed=d>.16?Math.min(speed,(d-.16)*5):0;
 let ax=d?dx/d*targetSpeed:0,az=d?dz/d*targetSpeed:0,smooth=1-Math.exp(-10*dt);
 p.moveVX+=(ax-p.moveVX)*smooth;p.moveVZ+=(az-p.moveVZ)*smooth;
 let vx=p.moveVX,vz=p.moveVZ,step=Math.hypot(vx,vz)*dt;
 if(step>d&&d<.3){p.x=p.navX;p.z=p.navZ;p.moveVX=0;p.moveVZ=0}else{p.x+=vx*dt;p.z+=vz*dt}
 let velocity=Math.hypot(p.moveVX,p.moveVZ);p.moving=p.moving?velocity>.24:velocity>.45;
 if(p.moving){let wanted=Math.atan2(p.moveVZ,p.moveVX),delta=Math.atan2(Math.sin(wanted-p.facing),Math.cos(wanted-p.facing));p.facing+=delta*(1-Math.exp(-7*dt));p.anim+=dt*velocity;p.action='run'}else p.action='idle';
}
function avoidTeammates(player,target,own,urgent){
 const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
 if(d<.23)return target;
 let sideStep=0;
 for(const mate of own){
  if(mate===player)continue;
  const mx=mate.x-player.x,mz=mate.z-player.z;
  const ahead=(mx*dx+mz*dz)/d,lateral=(mz*dx-mx*dz)/d;
  if(ahead<-.15||ahead>Math.min(1.7,d)||Math.abs(lateral)>.68)continue;
  const side=Math.abs(lateral)>.24?Math.sign(lateral):player.id<mate.id?1:-1;
  sideStep-=side*(.68-Math.abs(lateral))*(1-Math.max(0,ahead)/1.85);
 }
 sideStep=clamp(sideStep,-.7,.7)*(urgent?.45:1);
 return {x:clamp(target.x-dz/d*sideStep,player.team?.43:-10.4,player.team?10.4:-.43),
  z:clamp(target.z+dx/d*sideStep,-5.45,5.45)};
}

export function updateAI(game,dt){
 const {players,ball,rules}=game;
 const path=trajectory(ball,2.6,.045);
 if(game.debugTactics)game.prediction=path;
 for(const team of [0,1]){
  const own=players.slice(team*6,team*6+6),speed=botSpeed(game),rotation=rules.rotation[team];
  const state=game.teamTactics[team];
  const plan=createTeamPlan(game,own,path,speed);
  const assigned=game.setTarget?.team===team&&rules.side===team&&rules.touches===2?game.setTarget.playerId:null;
  const human=own.find(p=>p===game.controlled&&!game.liberoOff);
  const touches=rules.side===team?rules.touches:0;
  const humanReady=!!human&&!game.charge&&touches<2&&path.some((q,i)=>
   i>0&&q.t<=.3&&q.y<path[i-1].y&&q.y<2.55&&q.y>.5&&dist(human,q)<.6);
  const eligible=own.filter(p=>assigned!==null?p.id===assigned:p!==human||humanReady);
  const flight=game.flight;
  const fromOpponent=flight&&flight.team!==team;
  const reaction=game.difficulty==='Fácil'?.23:game.difficulty==='Difícil'?.12:.18;
  const waiting=fromOpponent&&flight.kind==='attack'&&game.clock-flight.started<reaction;
  const outside=fromOpponent&&['attack','serve','free','tip'].includes(flight.kind)&&
   (Math.abs(flight.target.x)>9.35||Math.abs(flight.target.z)>4.82);
  const active=ball.targetTeam===team&&!waiting&&!outside;
  const selection=coordinateInterceptor(state,eligible,path,team,rules,speed,plan.phase==='Recepção',assigned,active,dt,plan);
  const chosen=selection?.player;
  state.phase=plan.phase;
  state.next=chosen?.id??null;
  state.regions=plan.regions;
  state.blockers=plan.blockers.map(p=>p.id);
  state.settingGoal=plan.settingGoal;
  for(const p of own){
   const job=plan.jobs.get(p.id);
   const responsible=chosen===p;
   const target=selection?.target;
   const front=isFront(p,rotation);
   const keepingApproach=responsible&&assigned!==null&&target.t>.47&&Math.abs(target.x)<3;
   const entering=responsible&&touches===1&&p.role==='Levantador'&&target.t>.45&&job?.responsibility==='Organizar o segundo toque';
   let dest=(responsible&&!keepingApproach&&!entering)?target:job?.target??p;
   if(responsible&&touches===2&&!front&&p.y===0&&Math.abs(dest.x)<3.25&&target.y>2.35){
    dest={x:p.team?3.25:-3.25,z:dest.z};
   }
   p.officialZone=officialZone(p,rotation);
   p.frontRow=front;
   p.phase=plan.phase;
   p.responsibility=responsible?(touches===0?(plan.phase==='Recepção'?'Passador principal':'Defensor principal'):
    touches===1?(rules.last===own[0].id?'Levantador de apoio':'Segundo toque'):'Atacante acionado'):job?.responsibility??'Reorganizar';
   p.contactPriority=responsible?4:job?.priority??0;
   p.tacticalTarget=job?.target??{x:p.x,z:p.z};
   p.moveTarget={x:dest.x,z:dest.z};
   if(p===human)continue;
   const attack=responsible&&touches===2&&target.t<.32&&target.y>2.32&&dist(p,target)<1.45;
   const block=job?.jump==='block'&&!responsible&&game.hitLock<.5;
   if((block||(attack&&(front||Math.abs(p.x)>=3.08)))&&p.y===0&&p.vy===0&&p.jumpRecovery<=0){
    p.vy=block?6.35:7.25;p.takeoffX=p.x;
    p.actionPose=block?'block':'attack';p.actionTime=.55;p.jumpRecovery=.72;
   }
   const pace=p.y>.1?speed*.86:speed;
   moveSmoothly(p,avoidTeammates(p,dest,own,responsible||block),pace,dt);
  }
  if(chosen&&chosen!==human&&chosen.cool<=0&&ball.live&&(team===0?ball.x<=0:ball.x>=0)&&
    dist(chosen,ball)<(ball.y<.93&&touches===0?1.12:.9)&&ball.y<(touches===2?3.2:2.75)+chosen.y*.22&&ball.y>.43&&rules.last!==chosen.id){
   const closeToGround=ball.y<1.14;
   const descending=ball.vy<0;
   const emergency=closeToGround&&selection.target.t<.24;
   const atAttackHeight=touches===2&&ball.y>2.36&&selection.target.t<.28;
   if((descending&&(touches<2||selection.target.t<.24))||emergency||atAttackHeight){
    const dive=touches===0&&ball.y<.95&&dist(chosen,ball)>.72;
    if(game.aiHit(chosen)&&dive){chosen.actionPose='dive';chosen.actionTime=.55;}
   }
  }
 }
}
