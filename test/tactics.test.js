import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {trajectory,launch,dist} from '../src/physics.js';
import {updateAI,chooseInterceptor} from '../src/ai.js';
import {attackOption,isFront,legalReception,officialZone,orient,receptionFormation,rotations,serverIndex,servingFormation,settingZone} from '../src/tactics.js';
import {botSpeed,createTeamPlan,receptionUnit,selectSetPlay} from '../src/tactical-play.js';

function match(role='Ponteiro',events=[]){
 return new Game({role,difficulty:'Normal',quick:true,training:false},event=>events.push(event));
}
const team=(g,index)=>g.players.slice(index*6,index*6+6);
const step=(g,n)=>{for(let i=0;i<n;i++)g.update(1/60)};
const plan=(g,index)=>createTeamPlan(g,team(g,index),trajectory(g.ball),botSpeed(g));
const nameList=['P1','P6','P5','P4','P3','P2'];
const roles=['Ponteiro','Levantador','Oposto','Central','Líbero'];

for(const [rotation,{name,cover}] of rotations.entries()){
 test(name+' · saque, recepção e posição inicial das cinco funções',()=>{
  for(const role of roles)for(const server of [0,1]){
   const g=match(role);
   g.debugSetup(rotation,server);
   const receiving=1-server, own=team(g,receiving);
   assert.equal(officialZone(team(g,0)[0],rotation),Number(nameList[rotation][1]));
   assert.ok(legalReception(own,receiving,rotation),name);
   const passers=receptionUnit(own,rotation);
   assert.equal(passers.length,3);
   assert.ok(passers.every(p=>p.role!=='Levantador'));
   const player=g.controlled, expected=(server===0?servingFormation:receptionFormation)(player,rotation);
   assert.deepEqual({x:player.x,z:player.z},expected);
   const middle=team(g,0).find(p=>p.baseRole==='Central'&&!isFront(p,rotation));
   const out=role==='Central'&&player===middle||server===0&&middle.index===serverIndex(rotation);
   assert.equal(team(g,0).filter(p=>p.role==='Líbero').length,out?0:1);
   g.doServe();
   assert.equal(g.rules.last,server*6+serverIndex(rotation));
   const receiverPlan=plan(g,receiving);
   assert.equal(receiverPlan.phase,'Recepção');
   assert.equal(receiverPlan.regions.length,3);
   assert.notEqual(receiverPlan.jobs.get(team(g,receiving)[0].id).responsibility,'Passador principal');
   const zones=g.players.map(p=>p.officialZone);
   const underManualControl=!g.liberoOff;
   step(g,40);
   assert.deepEqual(g.players.map(p=>p.officialZone),zones);
   if(underManualControl)assert.deepEqual({x:player.x,z:player.z},expected,'o usuário permanece no local até usar os controles');
  }
 });

 test(name+' · passe bom, passe afastado e segundo toque alternativo',()=>{
  const g=match('Oposto');
  g.debugSetup(rotation,1);
  const own=team(g,0),setter=own[0],ideal=settingZone(0);
  Object.assign(g.rules,{side:0,touches:1,last:own[5].id});
  const pass=(q)=>{
   g.flight={kind:'pass',team:0,origin:{x:-6,y:1.65,z:-2},target:q};
   Object.assign(g.ball,{x:-6,y:1.65,z:-2,live:true,targetTeam:0});
   launch(g.ball,{...q,y:1.54},1.6);
   g.teamTactics[0].entryIndex=0;
   return plan(g,0);
  };
  const clean=pass(ideal);
  const wide=pass({x:-6.4,z:-3.25});
  assert.ok(dist(clean.settingGoal,ideal)<1);
  assert.ok(dist(wide.settingGoal,ideal)>5);
  assert.equal(clean.jobs.get(setter.id).responsibility,'Organizar o segundo toque');
  assert.equal(clean.phase,isFront(setter,rotation)?'Levantamento':'Infiltração');
  g.rules.last=setter.id;
  assert.equal(plan(g,0).phase,'Contra-ataque');
  updateAI(g,1/60);
  assert.ok(g.teamTactics[0].next!==null&&g.teamTactics[0].next!==setter.id);
  assert.match(g.players[g.teamTactics[0].next].responsibility,/apoio/);
 });

 test(name+' · ataque de entrada, meio e saída, defesa e cobertura',()=>{
  const g=match('Oposto');
  g.debugSetup(rotation,0);
  for(const zone of [4,3,2]){
   g.debugSetup(rotation,1);
   g.debugAttack(zone);
   const lane=zone===4?3.18:zone===2?-3.18:0;
   const rival=team(g,1);
   const attack=g.setTarget;
   assert.ok(isFront(g.players[attack.playerId],rotation));
   assert.equal(attack.z,lane);
   const offensive=plan(g,1);
   assert.match(offensive.phase,/Aproximação|Ataque/);
   assert.equal([...offensive.jobs.values()].filter(j=>j.responsibility==='Cobertura próxima').length,cover);
   assert.equal([...offensive.jobs.values()].filter(j=>j.responsibility==='Cobertura profunda').length,5-cover);
   assert.equal(offensive.jobs.get(attack.playerId).responsibility,'Atacante acionado');
   const defense=plan(g,0);
   assert.ok(defense.blockers.length>0);
   assert.ok(defense.blockers.every(p=>isFront(p,rotation)&&p.role!=='Líbero'));
   if(zone===3)assert.equal(defense.blockers[0].role,'Central');
   assert.ok([...defense.jobs.values()].some(j=>j.responsibility==='Paralela'));
   assert.ok([...defense.jobs.values()].some(j=>j.responsibility==='Diagonal'));
   assert.ok(rival.some(p=>p.id===attack.playerId));
   step(g,120);
   assert.notEqual(g.lastHit,'','o levantamento da simulação gera um toque real');
  }
  const options=team(g,0).map(p=>attackOption(p,rotation,false)).filter(o=>o?.back);
  assert.ok(options.length>0);
  assert.ok(options.every(o=>Math.abs(o.spot.x)>3&&o.kind.match(/Pipe|Fundo/)));
 });

 test(name+' · bola de graça, defesa forte, bloqueio e contra-ataque',()=>{
  const events=[], g=match('Oposto',events);
  g.debugSetup(rotation,1);
  const blockers=team(g,0).filter(p=>isFront(p,rotation)&&p!==g.controlled);
  const blocker=blockers[0], source=team(g,1).find(p=>isFront(p,rotation)&&p.role!=='Levantador');
  const state=(kind)=>{
   Object.assign(g.rules,{side:1,touches:3,last:source.id,lastTouchTeam:1});
   g.firstAttackTeam=null;
   Object.assign(g.ball,{x:2.7,y:3.9,z:0,vx:-12,vy:-2,vz:0,gravity:0,live:true,targetTeam:0});
   g.trackFlight(kind,source,{x:-7,z:0});
   g.hitLock=0;
  };
  state('free');
  assert.equal(plan(g,0).phase,'Bola de graça');
  state('attack');
  const defenders=team(g,0).filter(p=>!isFront(p,rotation)&&p!==g.controlled);
  defenders[0].x=-6.4;defenders[0].z=0;
  const save=chooseInterceptor(team(g,0),trajectory(g.ball),0,g.rules,botSpeed(g));
  assert.ok(save&&Math.abs(save.player.x)>4);
  Object.assign(blocker,{x:-.64,z:0,y:1,actionPose:'block'});
  Object.assign(g.ball,{x:.04,y:3.21,z:0,vx:-13,vy:0,vz:0,gravity:0});
  step(g,1);
  assert.equal(g.flight.kind,'block');
  assert.equal(g.rules.touches,0);
  assert.equal(g.rules.lastTouchTeam,0);
  assert.ok(events.includes('block'));
  assert.equal(plan(g,1).phase,'Cobertura');
  const recover=team(g,1).find(p=>p!==source);
  recover.x=g.ball.x;recover.z=g.ball.z;g.ball.y=1.6;g.hitLock=0;
  assert.ok(g.aiHit(recover));
  assert.equal(g.rules.touches,1);
  assert.equal(g.rules.side,1);
  assert.equal(g.flight.kind,'pass');
  assert.ok(['Infiltração','Levantamento','Contra-ataque'].includes(plan(g,1).phase));
 });
}

test('P1 mantém ponteiro na saída e oposto na entrada na primeira bola e inverte em saque próprio',()=>{
 const g=match(),own=team(g,0),outside=own[2],opposite=own[3];
 assert.deepEqual(own.map(p=>p.officialZone),[1,3,2,4,6,5]);
 assert.ok(attackOption(outside,0,true).spot.z>0&&attackOption(opposite,0,true).spot.z<0);
 assert.ok(outside.z<0&&opposite.z>0);
 g.debugSetup(0,1);
 const positions=own.map(p=>({x:p.x,z:p.z}));
 g.doServe();
 assert.equal(g.firstAttackTeam,0);
 assert.ok(outside.x<-5&&outside.z>0);
 assert.ok(own[0].x<outside.x);
 assert.deepEqual(own.map(p=>({x:p.x,z:p.z})),positions);
 assert.ok(attackOption(outside,0,false).spot.z<0&&attackOption(opposite,0,false).spot.z>0);
});

test('planos do levantador variam por qualidade do passe, disponibilidade e bloqueio',()=>{
 const g=match('Oposto'), own=team(g,0), setter=own[0];
 g.debugSetup(0,1);
 g.firstAttackTeam=0;
 for(const p of own){
  const option=attackOption(p,0,true);
  if(option)Object.assign(p,option.spot);
 }
 for(const p of team(g,1)){p.x=6;p.z=-4;}
 Object.assign(g.ball,{...settingZone(0),y:2.25});
 const quick=selectSetPlay(g,setter,()=>0);
 assert.equal(quick.kind,'Rápida de meio');
 Object.assign(g.ball,{x:-5.8,y:1.65,z:-3.7});
 const wide=selectSetPlay(g,setter,()=>0);
 assert.doesNotMatch(wide.kind,/Rápida|Chutada/);
 assert.ok(wide.time>quick.time);
 Object.assign(g.ball,{...settingZone(0),y:2.25});
 team(g,1).filter(p=>p.frontRow).forEach((p,i)=>Object.assign(p,{x:1.7,z:[-.25,0,.25][i]}));
 assert.notEqual(selectSetPlay(g,setter,()=>0).player?.id,quick.player.id);
});

test('levantador alterna atacantes disponíveis e aciona tanto pipe quanto fundo pela saída',()=>{
 const previousRandom=Math.random;
 let seed=3450;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try{
  for(const rotation of [0,3]){
   const g=match('Oposto'),own=team(g,0),setter=own[0];
   g.debugSetup(rotation,1);
   g.firstAttackTeam=0;
   const counts=new Map(),kinds=new Set();
   for(const p of own){
    const option=attackOption(p,rotation,true);
    if(option){Object.assign(p,option.spot);counts.set(p.id,0);}
   }
   for(const p of team(g,1))Object.assign(p,{x:7,z:4});
   Object.assign(setter,settingZone(0));
   for(let i=0;i<100;i++){
    Object.assign(g.ball,{x:setter.x,z:setter.z,y:2.2,live:true,targetTeam:0});
    Object.assign(g.rules,{side:0,touches:1,last:own[4].id});
    g.hitLock=0;
    assert.ok(g.aiHit(setter));
    const {playerId,tempo}=g.setTarget;
    counts.set(playerId,counts.get(playerId)+1);
    kinds.add(tempo);
   }
   assert.equal(counts.size,4);
   assert.ok([...counts.values()].every(n=>n>=12&&n<=40),JSON.stringify([...counts]));
   assert.ok(kinds.has('Pipe (P6)'));
   if(rotation===3)assert.ok(kinds.has('Fundo (P1)'));
   const history=[...g.recentSetTargets[0]];
   assert.equal(history.length,6);
   g.serve();
   assert.deepEqual(g.recentSetTargets[0],history);
  }
 }finally{Math.random=previousRandom;}
});

test('faltas de recepção, fundo e líbero respeitam fase e lado do contato',()=>{
 const g=match();
 g.debugSetup(0,1);
 const right=team(g,0).find(p=>p.officialZone===2);
 right.z=-4.3;
 assert.equal(legalReception(g.players,0,0),false);
 g.doServe();
 assert.match(g.message,/Falta de posição/);
 g.debugSetup(0,1);
 const libero=team(g,0).find(p=>p.role==='Líbero');
 Object.assign(g.rules,{side:0,touches:1,last:g.players[5].id});
 Object.assign(libero,{x:-1.7,z:.4});
 Object.assign(g.ball,{x:libero.x,z:libero.z,y:2,live:true,targetTeam:0});
 g.hitLock=0;
 assert.ok(g.contact(libero,{x:-2.1,z:.4},.45));
 assert.equal(g.liberoOverhand,true);
 const next=g.players[1];
 Object.assign(next,{x:-1.85,z:.4,y:.7});
 Object.assign(g.ball,{x:-1.85,z:.4,y:3.16});
 g.hitLock=0;
 assert.ok(g.contact(next,{x:7,z:.4},.75));
 assert.match(g.ball.pendingFault.reason,/líbero/);
 g.flight.kind='serve';
 assert.equal(g.tryBlock(0,3.1,0),false);
});

test('bloqueio pode ser simples, duplo ou triplo conforme a janela e os jogadores de rede',()=>{
 const g=match('Oposto'), own=team(g,0);
 g.debugSetup(0,1);
 g.debugAttack(3);
 const front=own.filter(p=>p.frontRow);
 const central=front.find(p=>p.role==='Central');
 front.filter(p=>p!==central).forEach((p,i)=>Object.assign(p,{x:-5,z:[-3.25,3.25][i]}));
 Object.assign(central,{x:-1.7,z:0});
 assert.equal(plan(g,0).blockers.length,1);
 g.setTarget.time=g.clock+1.5;
 g.setTarget.tempo='Bola alta';
 front.filter(p=>p!==central).forEach((p,i)=>Object.assign(p,{x:-.95,z:[-1,1][i]}));
 Object.assign(central,{x:-.95,z:0});
 const timedPath=[{x:2.2,z:0,y:3.15,t:1},{x:2.1,z:0,y:2.75,t:1.25}];
 assert.equal(createTeamPlan(g,own,timedPath,botSpeed(g)).blockers.length,3);
 front.find(p=>p!==central).x=-8.6;
 assert.equal(createTeamPlan(g,own,timedPath,botSpeed(g)).blockers.length,2);
});

test('seis rotações e rallies prolongados mantêm movimento limitado e ordem de saque',()=>{
 const original=Math.random;
 let rng=31212;
 Math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 try{
  for(let rotation=0;rotation<6;rotation++){
   const events=[],g=match('Ponteiro',events);
   g.debugSetup(rotation,1);
   // A match with both teams automated keeps the ordinary serve and rally paths.
   g.controlled=null;
   const counts=new Set();
   let longest=0, rally=0, last=0;
   for(let i=0;i<21600&&!g.rules.over;i++){
    const live=g.ball.live,positions=g.players.map(p=>({x:p.x,z:p.z}));
    g.update(1/60);
    if(live){
     for(const p of g.players)assert.ok(dist(p,positions[p.id])<.19,'movimento contínuo');
     if(g.rules.last!==null&&last!==g.rules.last){rally++;last=g.rules.last}
     longest=Math.max(longest,rally);
    }else{last=null;rally=0;}
    if(g.ball.live)counts.add(g.flight?.kind);
   }
   assert.ok(events.filter(e=>e==='point').length>=6,rotations[rotation].name);
   assert.ok(counts.has('set')&&counts.has('attack'),[...counts].join(', '));
   assert.ok(longest>=7,'rally com continuidade: '+longest);
  }
 }finally{Math.random=original}
});
