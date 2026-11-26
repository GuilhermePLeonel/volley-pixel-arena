// Portrait positions correspond to the reference image supplied by the user.
export const athletes = [
 {id:'thiago',name:'Thiago',role:'Central',skin:'#c68655',portrait:[40,145]},
 {id:'gaga',name:'Gaga',role:'Oposto',skin:'#d6a074',portrait:[304,145]},
 {id:'betinho',name:'Betinho',role:'Líbero',skin:'#8b5a39',portrait:[556,145]},
 {id:'joao',name:'João',role:'Levantador',skin:'#c08a62',portrait:[801,145]},
 {id:'ryan',name:'Ryan',role:'Central',skin:'#9b6a4c',portrait:[1027,145]},
 {id:'leonel',name:'Leonel',role:'Ponteiro',skin:'#c78a63',portrait:[1259,145]},
 {id:'gn',name:'GN',role:'Ponteiro',skin:'#c68655',portrait:[1519,145]},
 {id:'fabio',name:'Fabio',role:'Líbero',skin:'#d9a07a',portrait:[40,523]},
 {id:'bahia',name:'Bahia',role:'Levantador',skin:'#d3a077',portrait:[340,523]},
];
export const coach={name:'Jefferson',role:'Técnico',portrait:[630,523]};
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
