export const homeTeam = {id:'financas', name:'Rino Finanças', shortName:'Rino Finanças', primary:'#f58324', secondary:'#17191d'};
export const opponents = [
 {id:'phanters', name:'Phanters', shortName:'Phanters', primary:'#42cf68', secondary:'#161b19'},
 {id:'unissuam', name:'Unissuam', shortName:'Unissuam', primary:'#255ec7', secondary:'#ff862e'},
 {id:'aguias', name:'Águias', shortName:'Águias', primary:'#234ba0', secondary:'#ffdc43'},
 {id:'humanas', name:'Humanas', shortName:'Humanas', primary:'#78c9ef', secondary:'#d9a536'},
];

export function matchTeams(rivalId) {
 const rival = opponents.find(team => team.id === rivalId) ?? opponents[0];
 return [homeTeam, rival];
}
