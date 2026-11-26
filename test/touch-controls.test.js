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
 return {style:{},classList:{add(){},remove(){}},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},emit(type,values={}){for(const fn of listeners[type]||[])fn({pointerId:1,clientX:50,clientY:50,timeStamp:0,preventDefault(){},...values})}};
}
test('direcional distingue toque rápido para pular, arraste e toque cancelado',()=>{
 const stick=element(),knob=element(),attack=element(),aimKnob=element(),chargeFill=element(),chargeValue=element(),tip=element(),pause=element(),moves=[],jumps=[];
 installTouchControls({stick,knob,attack,aimKnob,chargeFill,chargeValue,tip,pause,canPlay:()=>true,move:(x,y)=>moves.push([x,y]),aim:()=>{},beginShot:()=>true,endShot:()=>{},cancelShot:()=>{},onJump:()=>jumps.push('jump'),onPause:()=>{}});
 stick.emit('pointerdown',{timeStamp:100});stick.emit('pointerup',{timeStamp:200});assert.equal(jumps.length,1);
 stick.emit('pointerdown',{timeStamp:400});stick.emit('pointermove',{clientX:90,timeStamp:450});assert.ok(moves.at(-1)[0]>0);
 stick.emit('pointerup',{clientX:90,timeStamp:500});assert.equal(jumps.length,1);assert.deepEqual(moves.at(-1),[0,0]);
 stick.emit('pointerdown',{timeStamp:600});stick.emit('pointerup',{timeStamp:1000});assert.equal(jumps.length,1);
 stick.emit('pointerdown',{timeStamp:1100});stick.emit('pointercancel',{timeStamp:1110});assert.equal(jumps.length,1);
});
test('dois dedos permitem movimento e mira analógica com carga circular e cancelamento seguro',()=>{
 const stick=element(),knob=element(),attack=element(),aimKnob=element(),chargeFill=element(),chargeValue=element(),tip=element(),pause=element(),moves=[],aims=[],shots=[];
 const controls=installTouchControls({stick,knob,attack,aimKnob,chargeFill,chargeValue,tip,pause,canPlay:()=>true,move:(x,y)=>moves.push([x,y]),aim:(x,y,dt)=>aims.push([x,y,dt]),beginShot:b=>(shots.push(['begin',b]),true),endShot:()=>shots.push(['end']),cancelShot:()=>shots.push(['cancel']),onJump:()=>shots.push(['jump']),onPause:()=>shots.push(['pause'])});
 stick.emit('pointerdown',{pointerId:1,clientX:50});stick.emit('pointermove',{pointerId:1,clientX:90});
 attack.emit('pointerdown',{pointerId:2,clientX:300,clientY:600});
 attack.emit('pointermove',{pointerId:2,clientX:320,clientY:600});controls.update(.1);
 assert.ok(moves.at(-1)[0]>0);assert.ok(aims.at(-1)[0]>.8);assert.equal(aims.at(-1)[1],0);assert.equal(aims.at(-1)[2],.1);
 controls.setPower(.7);assert.equal(chargeValue.textContent,'70%');assert.notEqual(chargeFill.style.transform,'translate(-50%,-50%) scale(0.3)');
 controls.setPower(1);assert.equal(chargeValue.textContent,'100%');assert.equal(chargeFill.style.transform,'translate(-50%,-50%) scale(1)');
 attack.emit('pointerup',{pointerId:2,clientX:320,clientY:600});assert.equal(chargeValue.textContent,'0%');
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
