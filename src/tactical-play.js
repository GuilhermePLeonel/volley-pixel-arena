import {clamp,dist} from './physics.js';
import {approachFor,attackOption,infiltrationTarget,isFront,officialZone,orient,preferredPosition,receptionFormation,rotations,settingZone} from './tactics.js';

export const botSpeed=game=>game.difficulty==='Muito difícil'?5.65:game.difficulty==='Fácil'?3.65:game.difficulty==='Difícil'?5.05:4.35;
const local=(team,q)=>orient(team,q.x,q.z);
const ownHalf=(q,team)=>team?q.x>.15:q.x<-.15;
const isHuman=(game,p)=>game.controlled===p&&!game.liberoOff;
const playerSetShare=.7;
const defensiveSkill={Líbero:1,Ponteiro:.83,Oposto:.57,Central:.44,Levantador:.32};

export function receptionUnit(own,rotation){
 const rolePriority={'Líbero':3,'Ponteiro':2};
 return [...own].filter(p=>p.role!=='Levantador').sort((a,b)=>
  (rolePriority[b.role]??0)-(rolePriority[a.role]??0) ||
  Number(isFront(a,rotation))-Number(isFront(b,rotation))).slice(0,3)
  .sort((a,b)=>local(a.team,receptionFormation(a,rotation)).z-local(b.team,receptionFormation(b,rotation)).z);
}

function put(plan,p,target,responsibility,priority=0){
 const spot=local(p.team,target);
 plan.jobs.set(p.id,{target:orient(p.team,clamp(spot.x,-9.85,-.43),clamp(spot.z,-5.25,5.25)),responsibility,priority});
}

function receive(plan,own,rotation,path,team){
 const passers=receptionUnit(own,rotation);
 const landing=path.filter(q=>ownHalf(q,team)).at(-1);
 const shift=landing?clamp(local(team,landing).z*.22,-.85,.85):0;
 plan.passers=passers;
 const names=['Passe da esquerda','Passe central','Passe da direita'];
 passers.forEach((p,i)=>{
  const initial=local(team,receptionFormation(p,rotation));
  const z=clamp(initial.z+shift,-3.85,3.85);
  put(plan,p,orient(team,initial.x,z),names[i]);
  plan.regions.push({team,x0:-8.85,x1:-3.7,z0:-4.35+i*2.9,z1:-1.45+i*2.9});
 });
 for(const p of own.filter(p=>!passers.includes(p))){
  put(plan,p,receptionFormation(p,rotation),p.role==='Levantador'?'Aguardar o passe':'Apoio curto');
 }
}

function attackContext(game,team,path){
 const opposingSet=game.setTarget?.team===1-team?game.setTarget:null;
 const relevant=game.flight?.team===1-team?game.flight:null;
 const attacking=relevant?.kind==='attack'||relevant?.kind==='tip';
 if(!opposingSet&&!attacking)return null;
 if(opposingSet?.back || (attacking&&Math.abs(relevant.origin.x)>3.5))return null;
 const source=opposingSet??relevant.origin;
 const lane=local(team,source).z;
 if(opposingSet&&Math.abs(source.x)>3.55)return null;
 const sample=opposingSet?path.find((q,i)=>i>0&&q.y<path[i-1].y&&q.y<=2.85&&q.y>=1.7&&dist(q,source)<1):
  path.find(q=>ownHalf(q,team));
 const remaining=sample?.t??(attacking?Math.abs(game.ball.x)/(Math.abs(game.ball.vx)||1):Math.max(0,(opposingSet.time??game.clock)-game.clock));
 if(attacking&&ownHalf(game.ball,team))return null;
 return {lane:clamp(lane,-3.95,3.95),remaining,attacking,tempo:opposingSet?.tempo};
}

function block(plan,own,rotation,context,speed){
 if(!context)return [];
 const {lane,remaining,attacking,tempo}=context,team=own[0].team;
 const middle=Math.abs(lane)<1.45;
 const front=own.filter(p=>isFront(p,rotation)&&p.role!=='Líbero');
 const homeLane=p=>local(team,preferredPosition(p,rotation,'defense')).z;
 const candidates=front.map(p=>{
  const principal=middle?p.role==='Central':Math.sign(homeLane(p))===Math.sign(lane)&&p.role!=='Central';
  const target=orient(team,-.63,lane);
  return {p,principal,reach:dist(p,target)/speed,home:homeLane(p)};
 }).sort((a,b)=>Number(b.principal)-Number(a.principal)||a.reach-b.reach);
 const leader=candidates.find(c=>c.principal&&c.reach<remaining+.48)??candidates.find(c=>c.reach<remaining+.3);
 if(!leader)return [];
 const blockers=[leader.p];
 put(plan,leader.p,orient(team,-.61,lane),'Bloqueio principal',2);
 const desired=middle&&remaining>.64&&!tempo?.includes('Rápida')?3:2;
 for(const c of candidates.filter(c=>c!==leader).sort((a,b)=>
  Number(!middle&&b.p.role==='Central')-Number(!middle&&a.p.role==='Central')||a.reach-b.reach)){
  if(blockers.length>=desired)break;
  if(!middle&&c.p.role!=='Central')continue;
  const inward=Math.sign(c.home-lane)||(lane>0?-1:1);
  const z=clamp(lane+inward*.68*Math.ceil(blockers.length/2),-4.15,4.15);
  const spot=orient(team,-.57,z);
  if(c.p.y>.15||dist(c.p,spot)/speed<=remaining+.16){
   if(blockers.some(p=>dist(plan.jobs.get(p.id).target,spot)<.42))continue;
   blockers.push(c.p);
   put(plan,c.p,spot,'Fechar o bloqueio',2);
  }
 }
 for(const p of blockers){
  const job=plan.jobs.get(p.id);
  job.jump=(remaining<(attacking?.31:.22)||p.y>.05)&&dist(p,job.target)<.78?'block':null;
 }
 plan.blockers=blockers;
 return blockers;
}

function defend(plan,game,own,rotation,path,speed){
 const team=own[0].team;
 const context=attackContext(game,team,path);
 const origin=context?.lane??local(team,game.flight?.origin??game.ball).z;
 const blockers=block(plan,own,rotation,context,speed);
 const profile=rotations[rotation], dx=profile.deep, side=origin>=0?1:-1;
 const remaining=own.filter(p=>!blockers.includes(p));
 const back=remaining.filter(p=>!isFront(p,rotation)).sort((a,b)=>
  local(team,preferredPosition(a,rotation,'defense')).z-local(team,preferredPosition(b,rotation,'defense')).z ||
  local(team,a).z-local(team,b).z);
 const zones=[{z:-3.05+origin*.13,role:side<0?'Paralela':'Diagonal'},
  {z:origin*.26,role:'Fundo e desvios'},{z:3.05+origin*.13,role:side>0?'Paralela':'Diagonal'}];
 const human=back.find(p=>isHuman(game,p));
 if(human&&dist(human,orient(team,dx[1],zones[back.indexOf(human)].z))>2.4){
  const q=local(team,human);
  if(q.x<-3&&Math.abs(q.z)<5){
   const nearest=zones.reduce((best,z,i)=>Math.abs(q.z-z.z)<Math.abs(q.z-zones[best].z)?i:best,0);
   back.splice(back.indexOf(human),1);
   back.splice(nearest,0,human);
  }
 }
 back.forEach((p,i)=>{
  const zone=zones[i], left=i===0?-4.4:(zones[i-1].z+zone.z)/2,right=i===2?4.4:(zones[i+1].z+zone.z)/2;
  const depth=p.role==='Central'?-4.15:dx[i]+(zone.role==='Diagonal'?-.28:0);
  put(plan,p,orient(team,depth,zone.z),p.role==='Central'?'Cobertura intermediária':zone.role);
  plan.regions.push({team,x0:-9,x1:-3,z0:left,z1:right});
 });
 const front=remaining.filter(p=>!back.includes(p)).sort((a,b)=>
  local(team,preferredPosition(a,rotation,'defense')).z-local(team,preferredPosition(b,rotation,'defense')).z);
 front.forEach((p,i)=>{
  const depth=blockers.length?profile.short[Math.min(i,1)]:-1.45;
  const z=blockers.length?clamp(origin*.4+(i-(front.length-1)/2)*2.3,-3.55,3.55):
   (i-(front.length-1)/2)*3.05;
  put(plan,p,orient(team,depth,z),blockers.length?'Cobrir largada':'Preparar bloqueio');
 });
 return blockers.length?'Bloqueio':context||game.flight?.kind==='attack'?'Defesa':'Transição defensiva';
}

function cover(plan,own,rotation,origin,attacker,state){
 const team=own[0].team, localHit=local(team,origin), fromBack=Math.abs(localHit.x)>3;
 const depthRow=rotations[rotation].cover;
 if(state.coverOrigin!==origin){
  state.coverOrigin=origin;
  const keepsShort=p=>p.role==='Central'&&isFront(p,rotation);
  state.coverRank=own.filter(p=>p.id!==attacker).sort((a,b)=>
   Number(keepsShort(b))-Number(keepsShort(a))||coverScore(a,origin,rotation)-coverScore(b,origin,rotation));
 }
 const rank=state.coverRank;
 const sign=localHit.z>0?-1:1;
 const spots=[
  [fromBack?-2.45:-3.05,localHit.z+sign*.95],
  [fromBack?-3.35:-3.6,localHit.z-sign*.86],
  [-4.45,localHit.z+sign*2.15],
  [-6.15,localHit.z+sign*2.8],
  [-7.1,localHit.z*.64-sign*.25],
 ];
 if(depthRow===2)spots[2]=[-6.55,localHit.z*.21];
 rank.forEach((p,i)=>{
  const [x,z]=spots[i];
  put(plan,p,orient(team,x,clamp(z,-4,4)),i<depthRow?'Cobertura próxima':'Cobertura profunda');
 });
}
function coverScore(p,q,r){
 return dist(p,q)+(isFront(p,r)?0:1)-(p.role==='Líbero'?.55:0);
}

export function createTeamPlan(game,own,path,speed){
 const team=own[0].team, {rules,ball,flight}=game, rotation=rules.rotation[team];
 const state=game.teamTactics[team], plan={jobs:new Map(),regions:[],blockers:[],phase:'Reorganização'};
 const set=game.setTarget?.team===team?game.setTarget:null;
 const incoming=ball.targetTeam===team;
 const hasBall=rules.side===team;
 const firstAttack=game.firstAttackTeam===team;
 const setter=own.find(p=>p.role==='Levantador');
 const serving=flight?.kind==='serve'&&flight.team===team;
 const receiving=(flight?.kind==='serve'||game.serveFlight)&&incoming;
 if(receiving){
  plan.phase='Recepção';
  receive(plan,own,rotation,path,team);
 }else if(hasBall&&incoming&&rules.touches===1){
  plan.phase=isFront(setter,rotation)?'Levantamento':'Infiltração';
  const ideal=settingZone(team);
  const candidates=path.filter(q=>ownHalf(q,team)&&q.t>=.18&&q.y>1.35&&q.y<3.3);
  const arrival=candidates.filter(q=>q.y>1.8).at(-1)??candidates.at(-1)??ideal;
  const point=local(team,arrival);
  const goal=orient(team,clamp(point.x,-9.5,-.64),clamp(point.z,-4.55,4.55));
  plan.ideal=ideal;
  plan.settingGoal=goal;
  for(const p of own){
   if(p===setter&&rules.last!==p.id){
    const target=infiltrationTarget(p,rotation,state,goal);
    put(plan,p,target,'Organizar o segundo toque',2);
   }else{
    const option=attackOption(p,rotation,firstAttack);
    put(plan,p,option?approachFor(p,option,1.15):preferredPosition(p,rotation),option?'Disponível para atacar':'Apoio ao levantamento');
   }
  }
  if(rules.last===setter.id)plan.phase='Contra-ataque';
 }else if(hasBall&&incoming&&rules.touches===2&&set){
  const attacker=own.find(p=>p.id===set.playerId);
  const option=attackOption(attacker,rotation,firstAttack);
  const q=path.find((q,i)=>i>0&&q.y<path[i-1].y&&dist(q,set)<.9&&q.y<3.1&&q.y>1.55);
  const seconds=q?.t??0;
  plan.phase=seconds<.3?'Ataque':'Aproximação ofensiva';
  cover(plan,own,rotation,set,attacker.id,state);
  put(plan,attacker,option?approachFor(attacker,{...option,spot:set},seconds):set,'Atacante acionado',3);
 }else if(!incoming&&hasBall&&['attack','tip'].includes(flight?.kind)&&Math.abs(ball.x)<3){
  plan.phase='Cobertura';
  cover(plan,own,rotation,flight.origin,flight.playerId,state);
  const hitter=own.find(p=>p.id===flight.playerId);
  if(hitter)put(plan,hitter,preferredPosition(hitter,rotation,'defense',ball.z),'Desembarcar e reorganizar');
 }else if(incoming&&flight?.kind==='block'&&!hasBall&&flight.cover?.team===team){
  plan.phase='Cobertura';
  cover(plan,own,rotation,flight.cover.origin,flight.cover.playerId,state);
  const hitter=own.find(p=>p.id===flight.cover.playerId);
  if(hitter)put(plan,hitter,preferredPosition(hitter,rotation),'Recuperar após o ataque');
 }else{
  plan.phase=defend(plan,game,own,rotation,path,speed);
  if(serving)plan.phase=Math.abs(ball.x)>8?'Saque':'Transição defensiva';
  else if(incoming&&flight?.kind==='free'){
   plan.phase='Bola de graça';
   put(plan,setter,orient(team,isFront(setter,rotation)?-1.35:-3.2,1.75),'Preparar o contra-ataque',1);
  }
  else if(incoming&&hasBall)plan.phase='Contra-ataque';
  else if(!incoming&&hasBall&&rules.touches===3&&Math.abs(ball.x)>5.5)plan.phase='Reorganização';
 }
 return plan;
}

export function receptionBonus(p,plan,q){
 const lane=plan.jobs.get(p.id)?.target?.z??p.z;
 return (plan.passers?.includes(p)?-.6:0)-(defensiveSkill[p.role]??.4)*.48+Math.min(1.3,Math.abs(q.z-lane)*.14);
}

export function selectSetPlay(game,setter,random=Math.random){
 const team=setter.team, rotation=game.rules.rotation[team], speed=botSpeed(game);
 const ideal=settingZone(team), b=game.ball;
 const quality=clamp(1-dist(b,ideal)*.14-Math.max(0,1.8-b.y)*.4,0,1);
 const first=game.firstAttackTeam===team;
 const history=game.recentSetTargets[team];
 const enemy=game.players.filter(p=>p.team!==team);
 const blockers=enemy.filter(p=>isFront(p,game.rules.rotation[p.team])&&Math.abs(p.x)<3.1);
 const timeToSpare=(player,option)=>{
  const approach=approachFor(player,option,option.time);
  const travel=(dist(player,option.spot)*.7+dist(player,approach)*.3)/speed;
  return option.time-travel;
 };
 const attack=game.players.filter(p=>p.team===team&&p.id!==setter.id).flatMap(player=>{
  let option=attackOption(player,rotation,first,quality);
  if(!option)return [];
  let available=timeToSpare(player,option);
  if(!option.back&&option.time<1.5&&available<.2){
   option=attackOption(player,rotation,first,Math.min(quality,.6));
   available=timeToSpare(player,option);
  }
  if(available<-.15)return [];
  const screen=blockers.reduce((total,p)=>total+Math.max(0,1-Math.abs(p.z-option.spot.z)/1.8),0);
  const bonus=option.kind.includes('Rápida')?.28:option.back?(quality>.5?-.1:-.27):0;
  const frequent=history.filter(id=>id===player.id).length*.26;
  const repeat=history.at(-1)===player.id?.38:0;
  const score=Math.min(.54,available)*1.6-screen*.48+bonus-frequent-repeat;
  return [{...option,player,available,score}];
 }).sort((a,b)=>b.score-a.score);
 const controlled=attack.find(option=>isHuman(game,option.player));
 const sample=controlled?random():null;
 if(controlled&&sample<playerSetShare)return controlled;
 const options=controlled?attack.filter(option=>option!==controlled):attack;
 const best=options[0];
 if(!best&&controlled)return controlled;
 const tip=orient(team,1.75,-1.75);
 const safe=enemy.every(p=>dist(p,tip)>2.05);
 if(setter.role==='Levantador'&&isFront(setter,rotation)&&quality>.66&&b.y>2.55&&safe&&
  (best?.available??0)<.5)return {kind:'Bola de segunda',tip};
 if(!best)return {kind:'Bola de segurança',safe:orient(team,6.4,0)};
 // Draw from reachable options, with quality and recent use affecting the odds.
 const weights=options.map(option=>Math.exp((option.score-best.score)*1.7));
 const randomShare=controlled?(sample-playerSetShare)/(1-playerSetShare):random();
 let draw=randomShare*weights.reduce((sum,weight)=>sum+weight,0);
 for(const [i,option] of options.entries()){
  draw-=weights[i];
  if(draw<0)return option;
 }
 return options.at(-1);
}
