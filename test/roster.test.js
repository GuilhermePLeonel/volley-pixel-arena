import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';

test('partida com elenco genérico ignora atleta do menu e Finanças pode jogar do outro lado',()=>{
 const game=new Game({role:'Central',athlete:'leonel',homeTeam:'humanas',rivalTeam:'financas',quick:true},()=>{});
 assert.deepEqual(game.teams.map(team=>team.id),['humanas','financas']);
 assert.equal(game.controlled.role,'Central');
 assert.equal(game.playerName(game.controlled),undefined);
 assert.equal(game.playerName(game.players[8]),'Leonel');
 const rivalLibero=game.players.find(player=>player.team===1&&player.role==='Líbero');
 assert.equal(game.playerName(rivalLibero),'Betinho');
});
import {athletes,athletesForRole,coach} from '../src/roster.js';
import {transformSpritePixels} from '../src/sprite-variants.js';

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
