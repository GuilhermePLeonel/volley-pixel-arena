export const teams = [
 {id:'financas', name:'Atlética de Finanças UFRRJ', shortName:'Finanças', primary:'#f58324', secondary:'#17191d'},
 {id:'phanters', name:'Phanters', shortName:'Phanters', primary:'#42cf68', secondary:'#161b19'},
 {id:'unissuam', name:'Unissuam', shortName:'Unissuam', primary:'#255ec7', secondary:'#ff862e'},
 {id:'aguias', name:'Águias', shortName:'Águias', primary:'#234ba0', secondary:'#ffdc43'},
 {id:'humanas', name:'Humanas', shortName:'Humanas', primary:'#78c9ef', secondary:'#d9a536'},
];

export function matchTeams(homeId, rivalId) {
 const home = teams.find(team => team.id === homeId) ?? teams[0];
 const opponents = teams.filter(team => team !== home);
 const rival = opponents.find(team => team.id === rivalId) ?? opponents[0];
 return [home, rival];
}

export const hasNamedRoster = team => team.id === 'financas';
