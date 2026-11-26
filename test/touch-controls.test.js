import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickVector,installTouchControls} from '../src/touch-controls.js';
import {Game} from '../src/game.js';

test('direcional tem zona morta, limite circular e movimento proporcional',()=>{
 assert.deepEqual(joystickVector(4,0,50),{x:0,y:0});
 const middle=joystickVector(25,0,50),edge=joystickVector(100,100,50);
 assert.ok(middle.x>0&&middle.x<1);
 assert.ok(Math.abs(Math.hypot(edge.x,edge.y)-1)<1e-9);
 assert.equal(edge.x,edge.y);
});

function element(){
 const listeners={};
 return {style:{},classList:{add(){},remove(){}},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},emit(type,values={}){for(const fn of listeners[type]||[])fn({pointerId:1,clientX:50,clientY:50,preventDefault(){},...values})}};
}
test('movimento e toque simultâneos usam dedos separados e cancelamento não bate',()=>{
 const stick=element(),knob=element(),jump=element(),attack=element(),tip=element(),pause=element(),moves=[],aims=[],shots=[];
 const controls=installTouchControls({stick,knob,jump,attack,tip,pause,canPlay:()=>true,move:(x,y)=>moves.push([x,y]),aim:(x,y)=>aims.push([x,y]),beginShot:b=>(shots.push(['begin',b]),true),endShot:()=>shots.push(['end']),cancelShot:()=>shots.push(['cancel']),onJump:()=>shots.push(['jump']),onPause:()=>shots.push(['pause'])});
 stick.emit('pointerdown',{pointerId:1,clientX:90});
 attack.emit('pointerdown',{pointerId:2,clientX:300,clientY:600});
 attack.emit('pointermove',{pointerId:2,clientX:220,clientY:240});
 assert.ok(moves.at(-1)[0]>0);assert.deepEqual(aims.at(-1),[220,240]);
 attack.emit('pointerup',{pointerId:2,clientX:220,clientY:240});
 assert.deepEqual(shots,[['begin',0],['end']]);
 stick.emit('pointerup',{pointerId:1});assert.deepEqual(moves.at(-1),[0,0]);
 tip.emit('pointerdown',{pointerId:3});tip.emit('pointercancel',{pointerId:3});
 assert.deepEqual(shots.slice(-2),[['begin',2],['cancel']]);
 controls.reset();assert.deepEqual(moves.at(-1),[0,0]);
});

test('o direcional móvel movimenta o atleta proporcionalmente',()=>{
 function step(strength){const g=new Game({role:'Ponteiro',athlete:'leonel',difficulty:'Normal',quick:true},()=>{});g.ball.live=true;g.ball.targetTeam=1;g.ball.x=4;g.ball.y=3;g.controlled.x=-5;g.controlled.z=0;g.touchMove={x:strength,y:0};g.update(1/60);return Math.abs(g.controlled.z)}
 const slow=step(.3),fast=step(1);
 assert.ok(slow>0&&fast>slow);
});
