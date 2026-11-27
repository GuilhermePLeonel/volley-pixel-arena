// Portrait bounds [x, y, width, height] include the frame on equipe-referencia.png.
export const athletes = [
 {id:'thiago',name:'Thiago',role:'Central',skin:'#c68655',portrait:[35,141,245,283]},
 {id:'gaga',name:'Gaga',role:'Oposto',skin:'#d6a074',portrait:[301,141,233,283]},
 {id:'betinho',name:'Betinho',role:'Líbero',skin:'#8b5a39',portrait:[552,141,227,283]},
 {id:'joao',name:'João',role:'Levantador',skin:'#c08a62',portrait:[797,141,207,283]},
 {id:'ryan',name:'Ryan',role:'Central',skin:'#9b6a4c',portrait:[1023,141,226,283]},
 {id:'leonel',name:'Leonel',role:'Ponteiro',skin:'#c78a63',portrait:[1268,141,223,283]},
 {id:'gn',name:'GN',role:'Ponteiro',skin:'#c68655',portrait:[1516,141,233,283]},
 {id:'fabio',name:'Fabio',role:'Líbero',skin:'#d9a07a',portrait:[36,518,275,275]},
 {id:'bahia',name:'Bahia',role:'Levantador',skin:'#d3a077',portrait:[336,518,263,275]},
 {id:'felipe-potter',name:'Felipe Potter',role:'Levantador',skin:'#cc906b'},
 {id:'pele',name:'Pelé',role:'Ponteiro',skin:'#75472f'},
 {id:'ronan',name:'Ronan',role:'Oposto',skin:'#a86a46'},
 {id:'lucas',name:'Lucas',role:'Central',skin:'#966447'},
 {id:'gabe',name:'Gabe',role:'Líbero',skin:'#b57e57'},
 {id:'lionel',name:'Lionel',role:'Oposto',skin:'#a66f4e'},
];
export const coach={name:'Jefferson',role:'Técnico',portrait:[626,518,263,275]};
export const athleteById = id => athletes.find(a=>a.id===id);
export const athletesForRole = role => athletes.filter(a=>a.role===role);
export const startingLineup = ['joao','thiago','leonel','gaga','ryan','gn'];

export function assignAthletes(players, selectedId){
 const selected=athleteById(selectedId);
 const lineup=[...startingLineup];
 // Two players of the same position already have their own rotation slots.
 // Single-slot positions use the selected athlete in that slot.
 if(selected && selected.role!=='Líbero' && !lineup.includes(selected.id)){
  const i=lineup.findIndex(id=>athleteById(id).role===selected.role);
  if(i>=0)lineup[i]=selected.id;
 }
 for(const p of players){
  if(p.team!==0)continue;
  p.baseAthleteId=lineup[p.index];
  p.athleteId=p.baseAthleteId;
 }
 return selected?.role==='Líbero'?selected.id:'betinho';
}

export function drawRivalRoster(random=Math.random){
 const pool=athletes.map(athlete=>athlete.id);
 const draw=()=>pool.splice(Math.floor(random()*pool.length),1)[0];
 const lineup=Array.from({length:6},draw);
 return {lineup,libero:draw(),coach:draw()};
}
