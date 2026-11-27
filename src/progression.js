export const career = [
 {rivalTeam:'humanas',difficulty:'Fácil'},
 {rivalTeam:'phanters',difficulty:'Normal'},
 {rivalTeam:'aguias',difficulty:'Difícil'},
 {rivalTeam:'unissuam',difficulty:'Muito difícil'},
];

export function matchProgress(progress,{won,mode,quick}){
 if(mode==='training')return progress;
 const next={...progress};
 if(mode==='career'&&won)next.stage=Math.min(career.length,next.stage+1);
 if(won)next.xandao=false;
 if(mode==='match'&&quick){
  next.losses=won?0:Math.min(3,next.losses+1);
  if(!won&&next.losses===3)next.xandao=true;
 }else if(won){
  next.losses=0;
 }
 return next;
}
