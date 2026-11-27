export const career = [
 {rivalTeam:'humanas',difficulty:'Fácil'},
 {rivalTeam:'phanters',difficulty:'Normal'},
 {rivalTeam:'aguias',difficulty:'Difícil'},
 {rivalTeam:'unissuam',difficulty:'Muito difícil'},
];

export const isQuickMatch=(mode,quick)=>mode==='match'&&quick;

export function matchProgress(progress,{won,mode,quick}){
 if(mode==='career'&&won){
  return {...progress,stage:Math.min(career.length,progress.stage+1)};
 }
 if(!isQuickMatch(mode,quick))return progress;
 const losses=won?0:Math.min(3,progress.losses+1);
 return {...progress,losses,xandao:!won&&(progress.xandao||losses===3)};
}
