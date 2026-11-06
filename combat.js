// Deterministic teaching encounters. Time, costs and proc cadence are scaled for practice.
(() => {
 const board=document.querySelector('#combat');
 if(!board)return;
 const spec=board.dataset.spec.replace(/-rotation$/,'');
 const coach=document.querySelector('#combat-coach');
 const setups={
  'arms-warrior':{
   resource:'Rage',initial:20,theme:'ember',names:['Battle Stance','Rend','Overpower','Mortal Strike'],
   costs:[0,10,5,30], cooldowns:[0,0,5,6],
   objective:'Maintain Rend, react to Bloodthrill and reserve rage for Mortal Strike.',
   effect(s,i){
    if(i===0)s.stance=true;
    if(i===1)s.bleed=21;
    if(i===2)s.proc=0;
   },
   block(s,i){if(!i&&s.stance)return 'Battle Stance is already active.';if(i&&!s.stance)return 'Enter Battle Stance before attacking.';if(i===2&&!s.proc)return 'Wait for a Bloodthrill opening from a main-hand attack against your bleeding target.';},
   tick(s){if(s.stance&&s.t%3===0){s.power+=10;if(s.bleed>0&&Math.random()<0.20){s.proc=6;return 'Bloodthrill triggered on a main-hand attack. Overpower is available.';}}},
   hint(s){return !s.stance?0:s.proc&&s.power>=5?2:s.bleed<=1&&s.power>=10?1:s.power>=30&&!s.cd[3]?3:-1;},
   state:s=>[s.stance?'Battle Stance':'No stance','Rend: '+s.bleed+'s','Overpower window: '+s.proc+'s']
  },
  'frost-mage':{
   resource:'Mana',initial:100,theme:'frost',names:['Frostbolt','Ice Lance','Cone of Cold','Fire Blast'],
   costs:[8,5,14,9],cooldowns:[2,2,6,2],
   objective:'Build Winter’s Chill on the dummy, react to Fingers of Frost and spend your stacks.',
   effect(s,i){if(s.proc>0)s.proc--;if(i===0||i===1)s.stacks=Math.min(5,s.stacks+1);if(i===2)s.stacks=0;if(i===1)s.cd[3]=2;if((i===0||i===2)&&Math.random()<0.15)s.proc=2;if(i===3)s.cd[1]=2;},
   block(s,i){if(i===1&&!s.proc)return 'This drill uses Ice Lance during Fingers of Frost.';},
   tick(s){s.power+=4;},
   hint(s){return s.stacks===5&&!s.cd[2]?2:s.proc&&!s.cd[1]?1:!s.cd[0]?0:-1;},
   state:s=>['Winter’s Chill: '+s.stacks+'/5','Fingers of Frost charges: '+s.proc,'Target in cone range']
  },
  'combat-rogue':{
   resource:'Energy',initial:100,theme:'venom',names:['Sinister Strike','Slice and Dice','Eviscerate','Pool Energy'],
   costs:[35,20,25,0],cooldowns:[0,0,0,2],
   objective:'Build combo points, maintain Slice and Dice and spend points before they cap.',
   effect(s,i){if(i===0)s.stacks=Math.min(5,s.stacks+1);if(i===1)s.buff=8+4*s.stacks;if(i===1||i===2)s.stacks=0;if(i!==3)s.poised=false;},
   block(s,i){if((i===1||i===2)&&!s.stacks)return 'Build a combo point first.';},
   tick(s){s.power+=10;},
   hint(s){return s.stacks&&s.buff<=3&&s.power>=20?1:s.stacks>=4&&s.power>=25?2:s.power>=35?0:3;},
   state:s=>['Combo points: '+s.stacks+'/5','Slice and Dice: '+s.buff+'s',s.poised?'Poised ready':'In melee']
  },
  'retribution-paladin':{
   resource:'Mana',initial:100,theme:'holy',names:['Seal of Command','Seal of Righteousness','Melee swing','Judgement'],
   costs:[5,5,0,12],cooldowns:[0,0,2,6],
   objective:'Store Command, switch seals and land a swing to release the stored charges.',
   effect(s,i){if(i<2)s.seal=i===0?'Command':'Righteousness';if(i===2){if(s.seal==='Command'){s.stacks=Math.min(3,s.stacks+1);s.buff=15;}else{s.stacks=0;s.buff=0;}}},
   block(s,i){if(i===0&&s.seal==='Command'||i===1&&s.seal==='Righteousness')return 'That seal is already active.';if(i>=2&&!s.seal)return 'Activate a seal first.';},
   tick(s){s.power+=3;if(!s.buff)s.stacks=0;},
   hint(s){return !s.seal?0:s.seal==='Command'&&s.stacks===3?1:s.seal==='Righteousness'&&!s.stacks?0:!s.cd[2]?2:!s.cd[3]?3:-1;},
   state:s=>['Active seal: '+(s.seal||'None'),'Stored Command: '+s.stacks+'/3','Stored time: '+s.buff+'s']
  }
 };
 const cfg=setups[spec];if(!cfg)return;
 const notes={
  'arms-warrior':[
   'Set your stance before the pull. Once Battle Stance is active, apply Rend to the dummy.',
   'Keep the bleed on the dummy. Main-hand hits against a target with your Rend can open a six-second Bloodthrill window.',
   'Use the opening before it expires. In this drill, keep Rend active and watch for Bloodthrill between swings.',
   'Reserve 30 Rage for this strike. While it recovers, watch your bleed and any Overpower opening.'
  ],
  'frost-mage':[
   'Build Winter’s Chill on the current target. Watch for Fingers of Frost as you cast.',
   'Spend a Fingers of Frost charge to add a Winter’s Chill stack. Ice Lance shares a cooldown with Fire Blast.',
   'When Winter’s Chill reaches five stacks, face the target in cone range and spend the stacks.',
   'Check Ice Lance before using Fire Blast. The shared cooldown can delay an empowered lance.'
  ],
  'combat-rogue':[
   'Build one combo point. Check the Slice and Dice timer before spending points on damage.',
   'Spend your combo points to keep the attack-speed buff running. Build again after the finisher.',
   'Spend points on damage while Slice and Dice has time left. Refresh the buff first if it is about to expire.',
   'Let Energy regenerate before spending again. Keep an eye on the buff timer while waiting.'
  ],
  'retribution-paladin':[
   'Activate Command, then land melee swings to store charges. Watch their remaining time.',
   'Switch after building stored Command charges. The switch alone keeps the charges; a landed swing releases them.',
   'Swing under Command to build charges. Under Righteousness, a landed swing releases stored Command.',
   'Use with an active seal when available. Keep watching the swing and stored-charge timers.'
  ]
 }[spec];
 const classes={'arms-warrior':'Arms Warrior','combat-rogue':'Combat Rogue','frost-mage':'Frost Mage','retribution-paladin':'Retribution Paladin'};
 const switcher=document.createElement('nav');
 switcher.className='trainer-specs';switcher.setAttribute('aria-label','Choose a specialization');
 for(const [slug,name] of Object.entries(classes)){
  const link=document.createElement('a');link.href='/'+slug+'-rotation/#practice';link.textContent=name;
  if(slug===spec)link.setAttribute('aria-current','page');
  switcher.append(link);
 }
 document.querySelector('#practice .training').before(switcher);
 const beginner={
  'arms-warrior':'Start in Battle Stance (1), then use Rend (2). Rend makes the target bleed. Watch for a short Overpower window before pressing 3.',
  'frost-mage':'Start with Frostbolt (1). Watch the target’s Winter’s Chill count grow. At five stacks, use Cone of Cold (3) to spend them.',
  'combat-rogue':'Use Sinister Strike (1) to earn a combo point, then Slice and Dice (2) to spend it on faster attacks. Build points again while the buff lasts.',
  'retribution-paladin':'Activate Seal of Command (1). Use Melee swing (3) to store charges. At three charges, switch seals (2), then land another swing (3) to release them.'
 }[spec];
 const total=60;let timer=null,lastTick=0;
 let phase='ready',s,message='',assisted=true;
 const fresh=()=>({t:0,power:cfg.initial,stacks:0,stance:false,seal:'',poised:true,buff:0,proc:0,bleed:0,cd:[0,0,0,0],global:0,casts:0,matched:0,blocked:0,lesson:null,log:[]});
 s=fresh();board.classList.add(cfg.theme);
 const episode=['arms-warrior','combat-rogue'].includes(spec)?'Cb8r05IXiyI':'LqlOlbvaTsc';
 const chapter={'arms-warrior':[17,121],'combat-rogue':[218,326],'frost-mage':[114,242],'retribution-paladin':[242,368]}[spec];
 const spells=[2457,11574,11585,21553];
 const warrior=spec==='arms-warrior';
 board.innerHTML='<div class="fighthead"><strong>Training dummy</strong><span id="time"></span></div><progress id="fight-clock" max="60" value="60" aria-label="Encounter time remaining"></progress><p><a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v='+episode+'">Blizzard class highlights ↗</a> · Pre-launch footage</p><div id="film-caption"></div><p>Decision drill with scaled resources and timing. Character animation for these actions has not been verified against the launch client.</p><div id="vitals"></div><div id="auras"></div><p id="first-moves"></p><div class="hotbar"></div><p id="combat-feedback" role="status"></p><div class="fight-controls"></div>';
 const el=selector=>board.querySelector(selector);
 el('#first-moves').textContent='Before starting, tap a skill to read about it. During the fight, use keys 1–4 or tap the same buttons to act.';
 const sourcePanel=el('a[href*="youtube.com"]').parentElement;
 const watch=sourcePanel.querySelector('a');
 watch.href+='&t='+chapter[0]+'s';
 watch.textContent='Open chapter on YouTube ↗';
 const loadFilm=document.createElement('button');
 loadFilm.type='button';loadFilm.className='action';loadFilm.textContent='▷ Watch Blizzard class footage';
 const video=document.createElement('details');
 const summary=document.createElement('summary');summary.textContent='Class video reference';
 video.append(summary,loadFilm,sourcePanel);board.append(video);
 video.addEventListener('toggle',()=>{
  if(!video.open){video.querySelector('iframe')?.remove();loadFilm.hidden=false;}
 });
 loadFilm.addEventListener('click',()=>{
  pause();
  const player=document.createElement('iframe');
  player.title=cfg.names[0]+' class reference: pre-launch Blizzard highlights';
  player.src='https://www.youtube-nocookie.com/embed/'+episode+'?start='+chapter[0]+'&end='+chapter[1];
  player.allowFullscreen=true;
  player.referrerPolicy='strict-origin-when-cross-origin';
  player.style.cssText='width:100%;aspect-ratio:16/9;display:block;border:0';
  loadFilm.hidden=true;loadFilm.after(player);
 });
 function showEffect(i){
  const caption=el('#film-caption');
  caption.textContent=cfg.names[i];
  if(!warrior)return;
  const id=spells[i];
  caption.replaceChildren();
  const image=document.createElement('img');
  image.src='/warrior-skills/'+id+(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'.webp':'.gif');
  image.alt=cfg.names[i]+' effect timeline';image.width=584;image.height=160;
  image.style.cssText='width:100%;max-width:584px;height:auto;display:block;margin:12px 0';
  const source=document.createElement('a');
  source.href='https://www.wowhead.com/forever/spell='+id;
  source.target='_blank';source.rel='noopener noreferrer';
  source.textContent=cfg.names[i]+' · Forever spell details ↗';
  caption.append(image,source);
 }
  const glyphs={
  'arms-warrior':['⚔','╱','⚒','⚔'],
  'frost-mage':['❄','✧','❆','✹'],
  'combat-rogue':['⚔','✶','✦','◐'],
  'retribution-paladin':['✥','☼','⚒','✴']
 };
 const buttons=cfg.names.map((name,i)=>{
  const b=document.createElement('button');b.type='button';b.dataset.ability=i;
  b.innerHTML='<kbd>'+(i+1)+'</kbd><i aria-hidden=true>'+glyphs[spec][i]+'</i><strong>'+name+'</strong><small></small>';if(warrior){const icon=document.createElement('img');icon.src='/warrior-skills/'+spells[i]+'.jpg';icon.alt='';icon.width=30;icon.height=30;icon.style.margin='auto';b.querySelector('i').replaceWith(icon);}el('.hotbar').append(b);return b;
 });
 // Each checkpoint supplies a specific encounter state. Reading time does not consume it.
 const lessons={
  'arms-warrior':[
   [0,{},'Prepare to attack','You are about to pull. Enter the stance used in this drill.'],
   [1,{stance:true},'Apply the bleed','The dummy has no Rend. A bleeding target can give your main-hand hits an Overpower opening.'],
   [2,{stance:true,bleed:14,proc:6},'React to the opening','On this swing Bloodthrill triggered. Spend the opening before its six seconds run out.']
  ],
  'frost-mage':[
   [0,{},'Build your first stack','Begin on a fresh target. Use your main frost spell to start Winter’s Chill.'],
   [1,{stacks:3,proc:2},'Spend a charge','After several casts, Fingers of Frost is active. Use an empowered Ice Lance.'],
   [2,{stacks:5},'Spend the stacks','The same target now has five stacks and is in front of you, within cone range.']
  ],
  'combat-rogue':[
   [0,{},'Earn a combo point','You have full energy but no points to spend. Use your builder.'],
   [1,{stacks:1,power:75},'Set up faster swings','You have one point. Apply the attack-speed buff before building again.'],
   [2,{stacks:5,buff:14},'Spend on damage','Later in the fight you have five points and plenty of time left on Slice and Dice.']
  ],
  'retribution-paladin':[
   [0,{},'Prepare the seal','Choose the seal whose charges you will store.'],
   [2,{seal:'Command'},'Store a charge','Command is active. Land a melee swing to store a charge.'],
   [1,{seal:'Command',stacks:3,buff:8},'Switch before expiry','After further swings, three Command charges remain. Change to the other seal.'],
   [2,{seal:'Righteousness',stacks:3,buff:7},'Release the charges','The switch kept all three charges. A successful melee hit under the new seal releases them.']
  ]
 }[spec];
 let checkpoint=0;
 const shapes={start:'M8 5l11 7-11 7z',pause:'M8 5v14m8-14v14',resume:'M8 5l11 7-11 7z',lesson:'M3 4l9 2 9-2v14l-9 2-9-2zM12 6v14',solo:'M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6zm0 0M4 3l16 18',retry:'M3 10a9 9 0 1 1 2 9M3 4v6h6',leave:'M14 4H5v16h9m-3-8h10m-4-4 4 4-4 4'};
 function controlButton(key,label,primary=false){
  const icon=key==='start'&&phase==='done'?'retry':key;
  return '<button type="button" class="action '+(primary?'gold':'')+'" data-control="'+key+'" title="'+label+'" aria-label="'+label+'"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+shapes[icon]+'"/></svg>'+label+'</button>';
 }
 function controls(){
  let html='';
  if(phase==='ready')html=controlButton('lesson','Learn the opener',true)+controlButton('start','60s practice');
  if(phase==='lesson')html=controlButton('leave','Leave walkthrough');
  if(phase==='live')html=controlButton('pause','Pause');
  if(phase==='paused')html=controlButton('resume','Resume',true);
  if(phase==='done'||phase==='learned')html=controlButton('solo','Test without hints',true)+controlButton('start','Practice with hints')+controlButton('lesson','Review opener');
  if(phase==='ready'||phase==='live')html+='<label><input type="checkbox" id="show-hint" '+(assisted?'checked':'')+'> Coach hints</label>';
  el('.fight-controls').innerHTML=html;
 }
 function loadCheckpoint(){
  s=Object.assign(fresh(),lessons[checkpoint][1]);
  reader.value='';
  showEffect(lessons[checkpoint][0]);
  draw();
 }
 function cost(i){return Math.max(0,cfg.costs[i]-(spec==='combat-rogue'&&s.poised&&i!==3?10:0));}
 function unavailable(i){
  if(s.global)return 'Wait one beat after your last action.';
  if(s.cd[i])return 'Ready in '+s.cd[i]+'s.';
  return cfg.block(s,i)||(s.power<cost(i)?'Need '+(cost(i)-s.power)+' more '+cfg.resource.toLowerCase()+'.':'');
 }
 coach.innerHTML='<label>Skill guide <select class="skill-reader"><option value="">Follow current step</option></select></label><h3 class="guide-action"></h3><p class="guide-why"></p><p class="guide-status"></p><a href="#opener">Read the opener →</a>';
 const reader=coach.querySelector('select');
 cfg.names.forEach((name,i)=>reader.add(new Option(name,String(i))));
 reader.addEventListener('change',()=>{if(reader.value!=='')showEffect(Number(reader.value));draw();});
 function updateGuide(hint){
  const pinned=reader.value!=='';
  const i=pinned?Number(reader.value):hint;
  if(!pinned&&(phase==='lesson'||phase==='learned')){
   const done=phase==='learned';
   coach.querySelector('.guide-action').textContent=done?'Ready to try it yourself?':lessons[checkpoint][2];
   coach.querySelector('.guide-why').textContent=done?'Use the same skills in a 60-second encounter. Try it without highlights, or keep the coach on.':lessons[checkpoint][3];
   coach.querySelector('.guide-status').textContent=done?'Choose a practice mode below the skills.':'Tap '+cfg.names[lessons[checkpoint][0]]+' or press '+(lessons[checkpoint][0]+1)+'.';
   return;
  }
  coach.querySelector('.guide-action').textContent=pinned?cfg.names[i]:phase==='ready'?'Your first moves':phase==='done'?'Session review':phase==='paused'?'Practice paused':phase==='live'&&!assisted?'Independent practice':i<0?(s.global?'Recovering':'Wait for an opening'):cfg.names[i];
  coach.querySelector('.guide-why').textContent=pinned?notes[i]:phase==='ready'?beginner:phase==='done'?(s.lesson||(!s.casts?beginner:'Try again with Coach hints off and watch for the same openings.')):phase==='paused'?'Inspect any skill above. Resume when you are ready.':!assisted?cfg.objective:i<0?(s.global?'Your last move is recovering. The next suggestion appears when you can act.':'Watch cooldowns and resources. Your next action will appear when its conditions are met.'):notes[i];
  coach.querySelector('.guide-status').textContent=pinned?('Current state: '+(unavailable(i)||'requirements met.')+' Reading a skill does not spend resources.'):(phase==='live'&&assisted&&i>=0?'Press '+(i+1)+' or tap '+cfg.names[i]+'.':phase==='done'?'Choose Test without hints to check your decisions, or review the opener.':phase==='ready'?'Choose Learn the opener for untimed steps, or 60s practice for a live encounter.':'Choose a skill above to look up its conditions.');
 }
 function suggested(){
  const wanted=cfg.hint(s);
  return wanted>=0&&!unavailable(wanted)?wanted:-1;
 }
 function draw(){
  const hint=suggested();
  el('#first-moves').hidden=phase!=='ready';
  el('#time').textContent=phase==='lesson'?'Step '+(checkpoint+1)+' / '+lessons.length:phase==='learned'?'Opener complete':phase==='done'?'Complete':(total-s.t)+'s';
  el('#fight-clock').hidden=phase==='lesson'||phase==='learned';
  el('#fight-clock').value=total-s.t;
  el('#vitals').textContent=cfg.resource+' '+s.power+' / 100';
  el('#auras').textContent=cfg.state(s).join('   ·   ');
  buttons.forEach((b,i)=>{
   b.disabled=phase==='paused'||phase==='done'||phase==='learned';
   b.classList.toggle('recommended',(phase==='live'&&assisted&&hint===i)||(phase==='lesson'&&lessons[checkpoint][0]===i));
   const reason=unavailable(i);b.title=reason||notes[i];b.querySelector('small').textContent=phase==='ready'?'Inspect action':reason|| (cost(i)?cost(i)+' '+cfg.resource:'Free');
  });
  if(el('#combat-feedback').textContent!==message)el('#combat-feedback').textContent=message;
  updateGuide(hint);
 }
 // Move the same reader into the play area on narrow screens to preserve selection and focus order.
 const compact=window.matchMedia('(max-width: 900px)');
 const side=coach.parentNode;
 function placeGuide(){if(compact.matches)el('#combat-feedback').after(coach);else side.append(coach);}
 placeGuide();compact.addEventListener?.('change',placeGuide);
 function stop(){clearInterval(timer);timer=null;}
 function tick(){
  if(phase!=='live')return;
  const now=performance.now();const elapsed=Math.floor((now-lastTick)/1000);
  if(!elapsed)return;
  lastTick+=elapsed*1000;
  for(let n=0;n<elapsed&&s.t<total;n++){
   s.t++;s.global=Math.max(0,s.global-1);
   for(const k of (spec==='frost-mage'?['buff','bleed']:['buff','proc','bleed']))s[k]=Math.max(0,s[k]-1);
   s.cd=s.cd.map(v=>Math.max(0,v-1));const event=cfg.tick(s);if(event)message=event;s.power=Math.min(100,s.power);
  }
  if(s.t===total){
   phase='done';reader.value='';stop();controls();
   message=s.casts?'Session complete. '+s.matched+' of '+s.casts+' actions matched the coach. '+s.blocked+' attempts were unavailable.':'Time is up. No skills were used. Start another fight and try the first move below.';
   try{localStorage.setItem('fr.dummy.'+spec,JSON.stringify({casts:s.casts,matched:s.matched}));}catch{}
  }
  draw();
 }
 function live(){phase='live';lastTick=performance.now();timer=setInterval(tick,200);controls();draw();board.focus({preventScroll:true});}
 function pause(){if(phase!=='live')return;tick();if(phase!=='live')return;phase='paused';stop();controls();draw();}
 function cast(i){
  if(phase==='lesson'){
   const [wanted,,goal,why]=lessons[checkpoint];
   reader.value='';
   if(i!==wanted){message=cfg.names[i]+' does not complete this step. '+why;draw();return;}
   checkpoint++;
   message=goal+' complete · '+cfg.names[i]+'.';
   if(checkpoint===lessons.length){phase='learned';controls();draw();el('[data-control="solo"]').focus({preventScroll:true});}
   else loadCheckpoint();
   return;
  }
  if(phase==='ready'){reader.value=String(i);showEffect(i);message='Action · '+cfg.names[i]+'. Start the fight to use the action bar.';draw();return;}
  if(phase!=='live')return;tick();if(phase!=='live')return;
  const reason=unavailable(i);
  if(reason){if(!s.global){s.blocked++;s.lesson='Try this next time: '+cfg.names[i]+' was unavailable. '+reason+' '+notes[i];}message=cfg.names[i]+' · '+reason;reader.value=String(i);showEffect(i);draw();return;}
  const expected=suggested();
  if(expected===i)s.matched++;
  else if(expected>=0)s.lesson='At '+s.t+'s you used '+cfg.names[i]+'. The coach preferred '+cfg.names[expected]+'. '+notes[expected];
  s.casts++;s.power-=cost(i);s.cd[i]=cfg.cooldowns[i];
  cfg.effect(s,i);s.global=1;reader.value='';showEffect(i);
  s.log.push(cfg.names[i]);message=s.log.slice(-3).join(' → ');draw();
 }
 board.addEventListener('change',e=>{if(e.target.id==='show-hint'){assisted=e.target.checked;draw();}});
 board.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.ability!==undefined){cast(Number(b.dataset.ability));return;}
  if(b.dataset.control==='lesson'){stop();video.open=false;phase='lesson';checkpoint=0;message='Walkthrough: each step shows a prepared combat state. Take your time.';controls();loadCheckpoint();board.focus({preventScroll:true});return;}
  if(b.dataset.control==='leave'){phase='ready';s=fresh();reader.value='';message='Choose a walkthrough or timed practice.';el('#film-caption').textContent='Training action bar';controls();draw();return;}
  if(b.dataset.control==='start'||b.dataset.control==='solo'){if(phase==='done'||phase==='learned')assisted=b.dataset.control!=='solo';stop();video.open=false;s=fresh();reader.value='';message=cfg.objective;el('#film-caption').textContent='Encounter started';try{localStorage.setItem('fr.last',JSON.stringify(spec+'-rotation'));}catch{}live();}
  if(b.dataset.control==='pause')pause();
  if(b.dataset.control==='resume'&&phase==='paused')live();
 });
 board.addEventListener('keydown',e=>{if(!e.target.closest('select,input,textarea,a,summary')&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&/^[1-4]$/.test(e.key)){e.preventDefault();cast(Number(e.key)-1);}});
 document.querySelector('.quizpanel')?.addEventListener('toggle',e=>{if(e.currentTarget.open)pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 window.addEventListener('pagehide',()=>{pause();stop();});
 if(warrior)showEffect(0);else el('#film-caption').textContent='Training action bar';
 message='Start with the walkthrough if these skills are new to you.';
  controls();draw();
})();
