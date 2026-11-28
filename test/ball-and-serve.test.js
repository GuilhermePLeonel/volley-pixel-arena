import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';

const makeGame=(role='Ponteiro',notify=()=>{})=>
 new Game({role,difficulty:'Normal',quick:true,training:false},notify);
const frame=1/60;

test('o giro começa no contato, inverte nos toques seguintes e para sozinho',()=>{
 const g=makeGame(), b=g.ball;
 g.update(frame);
 assert.equal(b.angle,0);
 g.doServe();
 const serveSpin=b.spin;
 assert.notEqual(serveSpin,0);

 const receiver=g.players[8], setter=g.players[6];
 for(const player of [receiver,setter]){
  const previous=b.spin;
  Object.assign(b,{x:player.x,y:1.7,z:player.z});
  g.hitLock=0;
  assert.ok(g.contact(player,{x:2.2,z:0},.45));
  assert.equal(Math.sign(b.spin),-Math.sign(previous));
 }
 Object.assign(b,{vx:0,vy:0,vz:0,gravity:0});
 g.hitLock=10;
 for(let i=0;i<120;i++)g.update(frame);
 assert.equal(Math.abs(b.spin),0);
 assert.notEqual(b.angle,0);
 const angle=b.angle;
 g.update(frame);
 assert.equal(b.angle,angle);
});

test('o ponto final é marcado uma vez e a bola termina três quiques decrescentes',()=>{
 const events=[], g=makeGame('Ponteiro',event=>events.push(event));
 g.rules.points[1]=6;
 Object.assign(g.ball,{x:-5,y:.27,z:0,vx:-4,vy:-10,vz:1,gravity:9.8,live:true,targetTeam:0,spin:2});
 g.hitLock=10;
 g.update(frame);
 assert.equal(g.rules.over,true);
 assert.deepEqual(g.rules.sets,[0,1]);
 assert.equal(g.ball.live,false);
 assert.equal(g.ball.y,.24);

 const peaks=[];
 let peak=.24;
 for(let i=0;i<120;i++){
  g.update(frame);
  if(g.ball.y>.24)peak=Math.max(peak,g.ball.y);
  else if(peak>.24){peaks.push(peak);peak=.24;}
 }
 assert.equal(peaks.length,3);
 assert.ok(peaks[0]>peaks[1]&&peaks[1]>peaks[2]);
 assert.equal(g.ball.y,.24);
 assert.equal(g.ball.spin,0);
 assert.equal(events.filter(event=>event==='point').length,1);
 const position=[g.ball.x,g.ball.z];
 g.update(frame);
 assert.deepEqual([g.ball.x,g.ball.z],position);
});

test('a formação volta a encarar a rede e o saque usa sua pose própria',()=>{
 const g=makeGame('Levantador');
 for(const player of g.players){player.spriteBack=player.team===1;player.spriteMirror=true;}
 g.serve();
 for(const player of g.players){
  assert.equal(player.spriteBack,player.team===0);
  assert.equal(player.spriteMirror,false);
 }
 assert.equal(g.controlled.action,'serve-ready');
 g.special();
 g.update(frame);
 assert.equal(g.controlled.actionPose,'serve-ready');
 assert.ok(g.userServe({x:6,z:0},.7));
 assert.equal(g.controlled.actionPose,'serve');
});

test('o mesmo toque dá largada no chão, cortada média no ar e impacto máximo no topo',()=>{
 const resultingSpeed={};
 for(const phase of ['ground','ascending','peak','descending']){
  const events=[],g=makeGame('Ponteiro',event=>events.push(event)),p=g.controlled;
  Object.assign(p,{x:-1.6,z:0});
  if(phase!=='ground'){
   g.special();
   for(let i=0;i<9;i++)g.update(frame);
   if(phase==='peak'||phase==='descending'){
    while(p.apexPending)g.update(frame);
    if(phase==='descending')while(p.apexHold>0)g.update(frame);
   }
  }
  Object.assign(g.ball,{x:p.x,y:2.9,z:p.z,live:true});
  Object.assign(g.rules,{side:0,touches:2,last:5});
  g.aim={x:7,z:0};
  g.hitLock=0;
  assert.ok(g.userTouch());
  assert.equal(g.lastHit,phase==='ground'?'Largada':'Ataque');
  assert.equal(g.ball.comet,phase==='peak');
  assert.equal(events.includes('impact'),phase==='peak');
  resultingSpeed[phase]=g.ball.vx;
 }
 assert.ok(resultingSpeed.ground<resultingSpeed.ascending);
 assert.equal(resultingSpeed.ascending,resultingSpeed.descending);
 assert.ok(resultingSpeed.peak>resultingSpeed.ascending);
});

test('a janela no topo dura cerca de 280 ms e congela o atleta até a descida',()=>{
 const g=makeGame(),p=g.controlled;
 Object.assign(p,{x:-2,z:0});
 Object.assign(g.ball,{live:true,x:5,y:5,gravity:0,targetTeam:1});
 g.hitLock=5;
 g.special();
 while(p.apexPending)g.update(frame);
 const peak={x:p.x,y:p.y,z:p.z};
 const remaining=p.apexHold;
 assert.ok(remaining>=.28-frame&&remaining<=.28);
 g.touchMove={x:1,y:0};
 for(let i=0;i<15;i++){
  g.update(frame);
  assert.deepEqual({x:p.x,y:p.y,z:p.z},peak);
  assert.equal(g.touchStyle().power,1);
 }
 while(p.apexHold>0)g.update(frame);
 g.update(frame);
 assert.ok(p.y<peak.y);
 assert.ok(p.z>peak.z);
 assert.equal(g.touchStyle().power,.65);
});

test('sacar no ápice acelera a bola, mantém altura de rede e ativa o rastro',()=>{
 function serve(atPeak){
  const impacts=[];
  const g=new Game({role:'Levantador',difficulty:'Normal',quick:true,training:false},(type,data)=>{
   if(type==='impact')impacts.push(data);
  });
  g.aim={x:7,z:1};
  g.special();
  for(let i=0;i<20;i++)g.update(frame);
  if(atPeak)while(g.controlled.apexPending)g.update(frame);
  g.touchAiming=true;
  const preview=g.previewShot();
  assert.ok(g.userTouch());
  assert.ok(Math.abs(g.ball.vx-(preview.destination.x-preview.origin.x)/preview.duration)<1e-9);
  const t=-g.ball.x/g.ball.vx;
  assert.ok(g.ball.y+g.ball.vy*t-.5*g.ball.gravity*t*t>=2.83-1e-9);
  assert.equal(g.ball.comet,atPeak);
  assert.equal(impacts.length,atPeak?1:0);
  assert.equal(g.message,atPeak?'Saque viagem potente':'Saque viagem');
  return g.ball.vx;
 }
 assert.ok(serve(true)>serve(false)*1.25);
});
