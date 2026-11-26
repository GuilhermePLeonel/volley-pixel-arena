import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {athletes,athletesForRole,coach,drawRivalRoster} from '../src/roster.js';
import {transformSpritePixels} from '../src/sprite-variants.js';

test('somente Rino Finanças é jogável e adversários têm elenco sem repetição',()=>{
 const game=new Game({role:'Ponteiro',athlete:'gn',homeTeam:'phanters',rivalTeam:'humanas',quick:true},()=>{});
 assert.deepEqual(game.teams.map(team=>team.name),['Rino Finanças','Humanas']);
 assert.equal(game.playerName(game.controlled),'GN');
 const {lineup,libero,coach}=game.rivalRoster;
 assert.equal(new Set([...lineup,libero,coach]).size,8);
 assert.ok(athletes.some(athlete=>athlete.id===coach));
 const rivals=game.players.filter(player=>player.team===1);
 assert.equal(game.playerName(rivals[0]),undefined);
 for(let rotation=0;rotation<6;rotation++){
  game.rules.rotation[1]=rotation;
  game.rules.server=0;
  game.serve();
  for(const player of rivals){
   assert.equal(player.athleteId,player.role==='Líbero'?libero:lineup[player.index]);
  }
 }
 assert.notDeepEqual(drawRivalRoster(()=>0),drawRivalRoster(()=>.99));
});

test('cada atleta pode ser escolhido em sua posição',()=>{
 for(const athlete of athletes){
  assert.ok(athletesForRole(athlete.role).includes(athlete));
  const game=new Game({role:athlete.role,athlete:athlete.id,difficulty:'Normal',quick:true},()=>{});
  assert.equal(game.controlled.athleteId,athlete.id,athlete.name);
  assert.equal(game.controlled.role,athlete.role,athlete.name);
 }
 assert.equal(coach.role,'Técnico');
});

test('o líbero escolhido volta com sua identidade nas rotações',()=>{
 const game=new Game({role:'Líbero',athlete:'fabio',difficulty:'Normal',quick:true},()=>{});
 for(let rotation=0;rotation<6;rotation++){
  game.rules.rotation[0]=rotation;
  game.rules.server=1;
  game.serve();
  assert.equal(game.controlled.athleteId,'fabio');
  assert.equal(game.controlled.role,'Líbero');
  assert.equal(game.players.filter(p=>p.team===0&&p.athleteId==='fabio').length,1);
 }
});

test('uniforme branco não recolore amostras do cabelo nem da pele',()=>{
 const pixels=new Uint8ClampedArray(80*80*4);
 function set(x,y,rgb){pixels.set([...rgb,255],(y*80+x)*4)}
 function get(x,y){return [...pixels.slice((y*80+x)*4,(y*80+x)*4+3)]}
 set(35,16,[35,42,60]);set(30,34,[48,51,73]);set(39,28,[249,227,183]);
 transformSpritePixels(pixels,null,true,80);
 assert.deepEqual(get(35,16),[35,42,60]);
 assert.deepEqual(get(39,28),[249,227,183]);
 assert.ok(get(30,34)[0]>180);
});
