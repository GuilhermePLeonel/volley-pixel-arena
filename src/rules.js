export class Rules {
 constructor(quick=true){this.quick=quick;this.reset()}
 reset(){this.points=[0,0];this.sets=[0,0];this.server=0;this.rotation=[0,0];this.touches=0;this.side=-1;this.last=null;this.lastTouchTeam=null;this.over=false;}
 contact(team,id){if(this.side!==team){this.side=team;this.touches=0;this.last=null}if(this.last===id)return 'Dois toques consecutivos';this.touches++;this.last=id;this.lastTouchTeam=team;if(this.touches>3)return 'Quatro toques';return null}
 block(team){this.side=team;this.touches=0;this.last=null;this.lastTouchTeam=team;}
 point(winner){this.points[winner]++;if(this.server!==winner){this.server=winner;this.rotation[winner]=(this.rotation[winner]+1)%6}let limit=this.quick?7:(this.sets[0]===2&&this.sets[1]===2?15:25);let set=false;if(this.points[winner]>=limit&&this.points[winner]-this.points[1-winner]>=2){this.sets[winner]++;this.points=[0,0];set=true;if(this.sets[winner]>=(this.quick?1:3))this.over=true}this.side=-1;this.touches=0;this.last=null;this.lastTouchTeam=null;return set}
}
