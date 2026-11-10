// Source-linked base spell profiles. No damage, hit rolls or guessed proc probabilities.
(() => {
 const db=id=>'https://db.icy-veins.com/wow-forever/spells/'+id;
 const wh=id=>'https://www.wowhead.com/forever/spell='+id;
 const spell=(name,id,cost,cd,gcd,cast,duration,url,why)=>({name,id,cost,cd,gcd,cast,duration,url,why});
 const specs={
  'feral-druid':{name:'Feral Druid',resource:'Energy',guide:'https://www.icy-veins.com/wow-forever/feral-druid-melee-dps-and-tank-pve-rotation-cooldowns-abilities',official:'https://news.blizzard.com/en-gb/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid',
   spells:[
    spell('Rake',9904,40,0,1,0,9,db(9904),'Applies a 9-second bleed and awards one combo point. The displayed cost is the base Rank 4 cost, before talents.'),
    spell('Shred',9830,60,0,1,0,0,db(9830),'Requires the target’s rear. Awards one point. Base Rank 5 cost is 60 Energy; Shredding Attacks is not selected in this base-cost profile.'),
    spell('Rip',9896,30,0,1,0,12,db(9896),'Consumes 1–5 points. The guide recommends five, but fewer points are legal. Rank 6 lasts 12 seconds before modifiers.'),
    spell('Ferocious Bite',31018,35,0,1,0,0,db(31018),'Consumes 1–5 points and 35 Energy. This profile includes Predatory Discipline, the official prerequisite for Shifting Power, so extra Energy is preserved.'),
    spell('Shifting Power',1322605,{base:.55},8,1,0,0,db(1322605),'Restores 40 Energy for 55% of base mana. Unavailable at full Energy under the official update. Above 50 but below 100 it remains legal; avoid wasting recovery.')
   ],lessons:[0,1,2,4,3]},
  'beast-mastery-hunter':{name:'Beast Mastery Hunter',resource:'Mana',guide:'https://www.icy-veins.com/wow-forever/beast-mastery-hunter-ranged-dps-pve-rotation-cooldowns-abilities',official:'https://news.blizzard.com/en-gb/article/24301515/world-of-warcraft-forever-class-deep-dives-hunter-and-druid',
   spells:[
    spell('Hunter’s Mark',14325,60,0,1.5,0,120,db(14325),'Marks the target for 120 seconds. Reapplying is permitted, though normally unnecessary.'),
    spell('Pet Attack',null,0,0,0,0,0,'https://www.icy-veins.com/wow-forever/beast-mastery-hunter-ranged-dps-pve-rotation-cooldowns-abilities','A pet command, not a player spell. Reissuing is permitted. The exercise assumes the pet can reach the selected target.'),
    spell('Serpent Sting',25295,250,0,1.5,0,15,db(25295),'Rank 9 maintains a 15-second target effect. This profile uses the base 250 Mana cost.'),
    spell('Summon Hawk',1293241,80,6,1.5,0,18,db(1293241),'Summons an 18-second hawk; at most two are active. Its cooldown is shared with Arcane Shot. Refresh behavior at the cap is not modeled.'),
    spell('Aimed Shot',20904,310,6,1.5,2,0,db(20904),'Rank 6 has a 2-second cast and a 6-second cooldown, shared with Multi-Shot. Those other shots and Auto Shot timing are outside this exercise.'),
    spell('Bestial Wrath',19574,{base:.12},120,0,0,18,db(19574),'Requires an active pet. A connected attacking pet is a recommendation, not a cast restriction. Base cooldown 120 seconds; duration 18 seconds.')
   ],lessons:[0,1,2,3,4,5]},
  'enhancement-shaman':{name:'Enhancement Shaman',resource:'Mana',guide:'https://www.wowhead.com/forever/guide/classes/shaman/enhancement/rotation-cooldowns-pve-dps',official:'https://news.blizzard.com/en-gb/article/24302097/world-of-warcraft-forever-class-deep-dives-mage-and-shaman',
   spells:[
    spell('Magma Totem',10587,650,0,1,0,20,wh(10587),'The referenced spell lasts 20 seconds, costs 650 Mana and has a 1-second global cooldown. The target is assumed within its area.'),
    spell('Flame Shock',29228,410,6,1.5,0,12,wh(29228),'Rank 6 has a 12-second effect and a 6-second shock cooldown. Earth Shock shares this cooldown.'),
    spell('Stormstrike',17364,{base:.08},6,1.5,0,12,wh(17364),'Costs 8% of base mana. Its 12-second effect buffs the next Lightning Bolt, Chain Lightning or Earth Shock; it does not guarantee Maelstrom stacks.'),
    spell('Lightning Bolt',15208,220,0,1.5,2.5,0,wh(15208),'Base cast 2.5 seconds, cost 220 Mana. With the referenced full-rank Maelstrom talent, each charge reduces both by 20%; five makes it instant and free.'),
    spell('Earth Shock',10414,450,6,1.5,0,0,wh(10414),'Base cost 450 Mana and cooldown 6 seconds. Check Flame Shock before spending their shared recovery window.'),
    spell('Fire Nova',408345,375,10,1.5,0,0,wh(408345),'Costs 375 Mana; cooldown 10 seconds. The explosion is centered on your active fire totem, which must be present.')
   ],lessons:[0,1,2,3,4]}
 };
 function create(key,profile={}){
  return {key,t:0,end:60,phase:'ready',energy:100,mana:profile.mana??10000,maxMana:profile.mana??10000,baseMana:profile.baseMana??1000,regen:profile.regen??0,energyRegen:profile.energyRegen??0,
   points:0,rear:true,cat:true,petActive:true,pet:false,hawks:[],auras:{},cd:{},gcd:0,pending:null,stacks:0,stackExpiry:0,log:[],casts:0,matched:0,blocked:0};
 }
 const remaining=(s,time)=>Math.max(0,(time||0)-s.t);
 const active=(s,name)=>remaining(s,s.auras[name]);
 function cost(s,i){const a=specs[s.key].spells[i];let c=typeof a.cost==='number'?a.cost:a.cost.base*s.baseMana;if(s.key==='enhancement-shaman'&&i===3)c*=1-.2*s.stacks;return Math.max(0,c);}
 function castTime(s,i){const a=specs[s.key].spells[i];return a.cast*(s.key==='enhancement-shaman'&&i===3?Math.max(0,1-.2*s.stacks):1);}
 function reason(s,i){
  const cfg=specs[s.key],a=cfg.spells[i];if(!a)return 'Unknown action.';
  if(s.pending&&a.id)return 'This trainer does not evaluate overlapping spell casts. Finish or cancel the current cast first.';
  if(a.gcd&&remaining(s,s.gcd))return 'Global cooldown: '+remaining(s,s.gcd).toFixed(1)+'s.';
  if(remaining(s,s.cd[i]))return 'Cooldown: '+remaining(s,s.cd[i]).toFixed(1)+'s.';
  if(s.key==='feral-druid'){
   if(!s.cat)return 'Requires Cat Form.';if(i===1&&!s.rear)return 'Shred requires the target’s rear.';
   if((i===2||i===3)&&!s.points)return 'Requires at least one combo point.';
   if(i===4&&s.energy>=100)return 'Shifting Power cannot be used at full Energy (official update).';
  }
  if(s.key==='beast-mastery-hunter'){
   if((i===1||i===5)&&!s.petActive)return 'Requires an active pet.';
   if(i===3&&s.hawks.length===2)return 'Not evaluated at two hawks: refresh behavior needs verification. This is a tool limit, not a game prohibition.';
  }
  if(s.key==='enhancement-shaman'&&i===5&&!active(s,'Magma Totem'))return 'Requires an active fire totem.';
  const energy=s.key==='feral-druid'&&i!==4;
  if((energy?s.energy:s.mana)+1e-7<cost(s,i))return 'Not enough '+(energy?'Energy':'Mana')+'.';
  return '';
 }
 function finish(s,i){
  const a=specs[s.key].spells[i];
  if(s.key==='feral-druid'){
   if(i===0||i===1)s.points=Math.min(5,s.points+1);
   if(i===2||i===3)s.points=0;
   if(i===4)s.energy=Math.min(100,s.energy+40);
  }
  if(s.key==='beast-mastery-hunter'){
   if(i===1)s.pet=true;
   if(i===3)s.hawks.push(s.t+18);
  }
  if(s.key==='enhancement-shaman'&&(i===3||i===4))delete s.auras.Stormstrike;
  if(a.duration)s.auras[a.name]=s.t+a.duration;
  if(a.cd)s.cd[i]=s.t+a.cd;
  if(s.key==='enhancement-shaman'&&(i===1||i===4))s.cd[1]=s.cd[4]=s.t+6;
 }
 function cast(s,i){
  const blocked=reason(s,i);if(blocked){s.blocked++;return {ok:false,message:blocked};}
  const cfg=specs[s.key],a=cfg.spells[i],expected=hint(s),duration=castTime(s,i),spent=cost(s,i);
  if(!duration){if(s.key==='feral-druid'&&i!==4)s.energy-=spent;else s.mana-=spent;}
  if(a.gcd)s.gcd=s.t+a.gcd;
  const stacks=s.stacks,stackExpiry=s.stackExpiry;
  if(s.key==='enhancement-shaman'&&i===3){s.stacks=0;s.stackExpiry=0;}
  s.casts++;if(expected===i)s.matched++;
  s.log.push({time:s.t,name:a.name,expected:expected<0?null:cfg.spells[expected].name,cost:spent,cast:duration});
  if(duration)s.pending={i,end:s.t+duration,cost:spent,stacks,stackExpiry};else finish(s,i);
  return {ok:true,message:duration?'Casting '+a.name+' · '+duration.toFixed(1)+'s':a.name+' used.'};
 }
 function advance(s,dt){
  if(s.phase!=='live'||!Number.isFinite(dt)||dt<0)return;
  const next=Math.min(s.end,s.t+dt);
  // Split at a cast completion so its cooldown does not start at a late UI tick.
  if(s.pending&&s.pending.end<=next){const p=s.pending;const part=p.end-s.t;s.energy=Math.min(100,s.energy+part*s.energyRegen);s.mana=Math.min(s.maxMana,s.mana+part*s.regen)-p.cost;s.t=p.end;s.pending=null;finish(s,p.i);}
  const part=next-s.t;s.energy=Math.min(100,s.energy+part*s.energyRegen);s.mana=Math.min(s.maxMana,s.mana+part*s.regen);s.t=next;
  s.hawks=s.hawks.filter(t=>t>s.t);if(s.stackExpiry&&s.stackExpiry<=s.t){s.stacks=0;s.stackExpiry=0;}
  if(s.t>=s.end){s.phase='done';s.pending=null;}
 }
 function hint(s){
  let order;
  if(s.key==='feral-druid')order=[s.points===5&&!active(s,'Rip')?2:-1,!active(s,'Rake')?0:-1,s.energy<=50?4:-1,s.points===5&&active(s,'Rip')>=3&&s.energy>=70?3:-1,s.points<5?1:-1];
  if(s.key==='beast-mastery-hunter')order=[!active(s,'Hunter’s Mark')?0:-1,!s.pet?1:-1,!active(s,'Serpent Sting')?2:-1,s.hawks.length<2?3:-1,s.pet?5:-1,4];
  if(s.key==='enhancement-shaman')order=[!active(s,'Magma Totem')?0:-1,!active(s,'Flame Shock')?1:-1,2,s.stacks===5?3:-1,active(s,'Flame Shock')>6?4:-1,5];
  return order.find(i=>i>=0&&!reason(s,i))??-1;
 }
 function event(s,kind){
  // Explicit scenario controls, never a claim about automatic proc rates or regen.
  if(s.pending)return 'Finish or cancel the cast before changing the scenario.';
  if(kind==='maelstrom'&&s.key==='enhancement-shaman'){s.stacks=Math.min(5,s.stacks+1);s.stackExpiry=s.t+30;return 'Scenario: a melee hit procced Maelstrom (+1). No proc probability is simulated.';}
  if(kind==='target'&&s.key==='beast-mastery-hunter'){delete s.auras['Hunter’s Mark'];delete s.auras['Serpent Sting'];s.pet=false;s.hawks=[];return 'Scenario: previous target removed. Select the new enemy and redirect the pet.';}
  if(kind==='energy'&&s.key==='feral-druid'){s.energy=100;return 'Scenario resource reset to 100 Energy; not a spell or regeneration event.';}
  return '';
 }
 function cancel(s){if(!s.pending)return;const p=s.pending;if(s.key==='enhancement-shaman'&&p.i===3&&p.stackExpiry>s.t){s.stacks=p.stacks;s.stackExpiry=p.stackExpiry;}s.pending=null;}
 window.ForeverRules={specs,create,cost,castTime,reason,cast,advance,hint,event,remaining,active,cancel};
})();
