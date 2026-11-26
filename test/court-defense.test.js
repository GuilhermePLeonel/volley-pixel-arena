import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseAIAttackTarget,chooseInterceptor,coordinateInterceptor,makePlayers} from '../src/ai.js';
import {Game} from '../src/game.js';

test('defesa prefere atleta no fundo quando ele alcança a trajetória, nos dois lados',()=>{
 for(const team of [0,1]){
  let players=makePlayers().filter(p=>p.team===team),front=players[2],back=players[5],sign=team?1:-1;
  Object.assign(front,{x:sign*2,z:0});Object.assign(back,{x:sign*6,z:0});
  let path=[{x:sign*2,y:1.7,z:0,t:.1},{x:sign*4,y:1.4,z:0,t:.35},{x:sign*6,y:1,z:0,t:.7}];
  let rules={side:1-team,touches:3,last:team?2:8,rotation:[0,0]};
  assert.equal(chooseInterceptor([front,back],path,team,rules,3.7).player.id,back.id);
  // The preference also replaces a previously chosen front defender.
  let state={context:[true,rules.side,rules.touches,rules.last,false,null].join(':'),selection:{player:front,target:path[0],score:0},timer:0};
  assert.equal(coordinateInterceptor(state,[front,back],path,team,rules,3.7,false,null,true,1/60).player.id,back.id);
 }
});

test('atleta perto da rede cobre bola curta quando fundo não alcança',()=>{
 let [front,back]=[makePlayers()[2],makePlayers()[5]];
 Object.assign(front,{x:-2,z:0});Object.assign(back,{x:-8,z:4});
 let path=[{x:-2,y:1.4,z:0,t:.12}],rules={side:1,touches:3,last:8,rotation:[0,0]};
 assert.equal(chooseInterceptor([front,back],path,0,rules,3.7).player.id,front.id);
});

test('central de rede cobre bolas curtas e os especialistas assumem a defesa profunda',()=>{
 for(const team of [0,1]){
  const own=makePlayers().filter(p=>p.team===team);
  const sign=team?1:-1, front=own[1], back=own[4], outside=own[5];
  const rules={side:1-team,touches:3,last:null,rotation:[0,0]};
  Object.assign(front,{x:sign*3,z:0});
  Object.assign(back,{x:sign*6,z:0});
  Object.assign(outside,{x:sign*6,z:1.3});
  const deep=[{x:sign*6.6,y:1.5,z:0,t:.88}];
  const short=[{x:sign*3.05,y:1.4,z:0,t:.15}];
  assert.equal(chooseInterceptor([front],deep,team,rules,4.35),null);
  assert.equal(chooseInterceptor([front,back,outside],deep,team,rules,4.35).player,outside);
  assert.equal(chooseInterceptor([front,back],short,team,rules,4.35).player,front);
  assert.equal(chooseInterceptor([back],deep,team,rules,4.35).player,back);
 }
});

test('ataques de bots miram principalmente no fundo das duas quadras',()=>{
 let seed=12345,random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(const team of [0,1]){
  let targets=Array.from({length:1000},()=>chooseAIAttackTarget(team,'Normal',random));
  assert.ok(targets.filter(t=>Math.abs(t.x)>=6).length>800);
  assert.ok(targets.every(t=>team?t.x<0:t.x>0));
 }
});

test('travessia fora das antenas dá ponto mesmo acima ou distante da antena',()=>{
 for(const z of [4.49,4.7,5.8,-4.7,-5.8]){
  let g=new Game({role:'Ponteiro',difficulty:'Normal',quick:true},()=>{});
  Object.assign(g.ball,{x:-.05,y:4,z,vx:12,vy:0,vz:0,gravity:0,live:true,targetTeam:1,assistTarget:null,pendingFault:null});
  g.serveFlight=false;g.rules.side=0;g.rules.touches=2;g.hitLock=10;g.update(1/60);
  if(Math.abs(z)<4.5)assert.equal(g.ball.live,true);
  else{assert.equal(g.ball.live,false);assert.equal(g.rules.points[1],1);assert.match(g.message,/antenas/)}
 }
 let g=new Game({role:'Ponteiro',difficulty:'Normal',quick:true},()=>{});
 Object.assign(g.ball,{x:-.05,y:2,z:4.7,vx:12,vy:0,vz:0,gravity:0,live:true,targetTeam:1,assistTarget:null,pendingFault:null});
 g.serveFlight=false;g.rules.side=0;g.rules.touches=1;g.hitLock=10;g.update(1/60);
 assert.equal(g.ball.live,false);assert.equal(g.rules.points[1],1);
});

test('evento de ponto informa o time para a reação do técnico',()=>{
 let events=[],g=new Game({role:'Ponteiro',difficulty:'Normal',quick:true},(type,payload)=>events.push({type,payload}));
 g.ball.live=true;g.point(0,'teste');
 assert.deepEqual(events.find(e=>e.type==='point').payload,{team:0});
});
