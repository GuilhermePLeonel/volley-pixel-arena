import test from 'node:test';
import assert from 'node:assert/strict';
import {career,matchProgress} from '../src/progression.js';

test('a carreira avança apenas com vitórias e termina após Unissuam',()=>{
 const win={won:true,mode:'career',quick:true};
 let progress={stage:0,losses:0,xandao:false};
 assert.deepEqual(career.map(stage=>stage.rivalTeam),['humanas','phanters','aguias','unissuam']);
 assert.equal(new Set(career.map(stage=>stage.difficulty)).size,4);
 for(let stage=0;stage<career.length;stage++){
  assert.equal(matchProgress(progress,{...win,won:false}).stage,stage);
  progress=matchProgress(progress,win);
  assert.equal(progress.stage,stage+1);
 }
 assert.equal(matchProgress(progress,win).stage,career.length);
});

test('Xandão assume na terceira derrota rápida e sai após uma vitória em partida',()=>{
 const loss={won:false,mode:'match',quick:true};
 let progress={stage:0,losses:0,xandao:false};
 for(let streak=1;streak<=3;streak++){
  assert.equal(matchProgress(progress,{...loss,quick:false}).losses,streak-1);
  assert.equal(matchProgress(progress,{...loss,mode:'career'}).losses,streak-1);
  progress=matchProgress(progress,loss);
  assert.equal(progress.losses,streak);
  assert.equal(progress.xandao,streak===3);
 }
 assert.equal(matchProgress(progress,{...loss,mode:'training',won:true}),progress);
 assert.deepEqual(matchProgress(progress,{...loss,quick:false,won:true}),{stage:0,losses:0,xandao:false});
});
