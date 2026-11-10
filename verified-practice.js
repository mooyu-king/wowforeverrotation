(() => {
 const board=document.querySelector('#combat'),R=window.ForeverRules;if(!board||!R)return;
 const key=board.dataset.spec.replace(/-rotation$/,''),cfg=R.specs[key];if(!cfg)return;
 const coach=document.querySelector('#combat-coach');let s=R.create(key),timer=null,last=0,selected=-1,hints=true,step=0,feedback='Inspect an ability, then start a walkthrough or continuous practice.';
 const icon=(path)=>'<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="'+path+'"/></svg>';
 const paths={start:'M8 5l11 7-11 7z',lesson:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z',pause:'M8 4v16m8-16v16',resume:'M8 5l11 7-11 7z',reset:'M3 10a9 9 0 1 1 2 9M3 4v6h6',cancel:'M6 6l12 12M18 6 6 18'};
 const button=(id,label)=>'<button type="button" class="action" data-control="'+id+'" title="'+label+'" aria-label="'+label+'">'+icon(paths[id]||paths.start)+label+'</button>';
 const classes={'retribution-paladin':'Retribution Paladin','arms-warrior':'Arms Warrior','frost-mage':'Frost Mage','combat-rogue':'Combat Rogue',...Object.fromEntries(Object.entries(R.specs).map(([k,c])=>[k,c.name]))};
 const nav=document.createElement('nav');nav.className='trainer-specs';nav.setAttribute('aria-label','Choose a specialization');
 Object.entries(classes).forEach(([slug,name])=>{const a=document.createElement('a');a.href='/'+slug+'-rotation/#practice';a.textContent=name;if(slug===key)a.setAttribute('aria-current','page');nav.append(a);});
 document.querySelector('#practice .training').before(nav);
 board.innerHTML='<div class="fighthead"><strong>Spell mechanics practice</strong><span id="time"></span></div><progress id="fight-clock" max="60" value="60" aria-label="Practice time remaining"></progress><p class="note">Source-linked base spell values · checked 10 Nov 2026. No damage simulation or automatic proc probability. Cost-reducing talents and gear bonuses are excluded. <a href="#mechanics-evidence">Profile and evidence ↓</a></p><details class="practice-profile"><summary>Character inputs and exercise limits</summary><p>These editable values define a practice scenario, not a level-60 character preset. Enter your character values for resource budgeting. Zero regeneration means recovery is not modeled; it does not mean your character cannot regenerate.</p><div class="profile-fields"><label>Starting mana<input id="starting-mana" type="number" min="1" max="100000" value="10000"></label><label>Base mana (before Intellect)<input id="base-mana" type="number" min="1" max="100000" value="1000"></label><label>Mana recovery per second (scenario input)<input id="mana-regen" type="number" min="0" max="1000" step="0.1" value="0"></label>'+(key==='feral-druid'?'<label>Energy recovery per second (scenario input)<input id="energy-regen" type="number" min="0" max="100" step="0.1" value="0"></label>':'')+'</div><p>Use observed resource recovery for your character; the tool does not infer Spirit, talents or the five-second rule. Cat Form/rear position, a reachable enemy and an active pet are assumed. Effects resolve without hit, dodge, resist or damage rolls. Hunter Auto Shot and movement are not scored.</p></details><div id="vitals"></div><div id="auras"></div><p id="cast-progress" role="status"></p><div class="hotbar"></div><p id="combat-feedback" role="status"></p><div class="fight-controls"></div><details class="scenario-events"><summary>Scenario controls · not character skills</summary><p>These controls supply an explicit situation. They do not claim that an event occurs at a fixed interval or with a particular chance.</p><div class="actions">'+(key==='enhancement-shaman'?'<button class="action" data-event="maelstrom">+ Melee hit procced Maelstrom</button>':key==='beast-mastery-hunter'?'<button class="action" data-event="target">⇄ Previous target removed</button>':'<button class="action" data-event="energy">↺ Reset scenario energy</button>')+'</div></details>';
 const el=x=>board.querySelector(x);
 coach.innerHTML='<label>Skill guide<select class="skill-reader"><option value="">Follow coach</option></select></label><h3 class="guide-action"></h3><p class="guide-why"></p><p class="guide-status"></p><a class="spell-source" target="_blank" rel="noopener noreferrer">Spell evidence ↗</a><p><a href="#opener">Read rotation priorities ↓</a></p>';
 const reader=coach.querySelector('select');
 const buttons=cfg.spells.map((a,i)=>{reader.add(new Option(a.name,String(i)));const b=document.createElement('button');b.type='button';b.dataset.ability=i;b.innerHTML='<kbd>'+(i+1)+'</kbd><i aria-hidden="true">◇</i><strong>'+a.name+'</strong><small></small>';el('.hotbar').append(b);return b;});
 const side=coach.parentNode,compact=window.matchMedia('(max-width: 900px)');
 function place(){if(compact.matches)el('#combat-feedback').after(coach);else side.append(coach);}place();compact.addEventListener?.('change',place);
 function profile(){
  const ids=['starting-mana','base-mana','mana-regen',...(key==='feral-druid'?['energy-regen']:[])];
  if(ids.some(id=>!el('#'+id).checkValidity()||el('#'+id).value===''))return null;
  return {mana:Number(el('#starting-mana').value),baseMana:Number(el('#base-mana').value),regen:Number(el('#mana-regen').value),energyRegen:Number(el('#energy-regen')?.value||0)};
 }
 function controls(){
  const phase=s.phase;
  el('.fight-controls').innerHTML=phase==='live'?button('pause','Pause')+button('cancel','Cancel cast'):phase==='paused'?button('resume','Resume')+button('reset','Start over'):phase==='lesson'?button('reset','Leave walkthrough'):phase==='learned'||phase==='done'?button('solo','Test without hints')+button('start','Practice with hints')+button('lesson','Review walkthrough'):button('lesson','Learn the mechanics')+button('start','60s practice');
  if(phase==='live')el('.fight-controls').insertAdjacentHTML('beforeend','<label><input id="show-hint" type="checkbox" '+(hints?'checked':'')+'> Coach hints</label>');
  board.querySelectorAll('.practice-profile input').forEach(x=>x.disabled=!['ready','done','learned'].includes(phase));
  board.querySelectorAll('[data-event]').forEach(x=>x.disabled=phase!=='live');
 }
 function draw(){
  const hint=R.hint(s),phase=s.phase;
  el('#time').textContent=phase==='lesson'?'Step '+(step+1)+' / '+cfg.lessons.length:phase==='learned'?'Walkthrough complete':phase==='done'?'Complete':Math.ceil(s.end-s.t)+'s';
  el('#fight-clock').value=s.end-s.t;el('#fight-clock').hidden=['lesson','learned'].includes(phase);
  el('#vitals').textContent=(key==='feral-druid'?'Energy '+s.energy.toFixed(1)+' / 100 · ':'')+'Mana '+s.mana.toFixed(0)+' (base '+s.baseMana+')';
  const states=Object.entries(s.auras).filter(([,end])=>end>s.t).map(([name,end])=>name+': '+R.remaining(s,end).toFixed(1)+'s');
  if(key==='feral-druid')states.unshift('Combo points: '+s.points+'/5');
  if(key==='beast-mastery-hunter')states.unshift('Pet: '+(s.pet?'on target':'awaiting command'),'Hawks: '+s.hawks.length+'/2');
  if(key==='enhancement-shaman')states.unshift('Maelstrom: '+s.stacks+'/5'+(s.stacks?' · '+R.remaining(s,s.stackExpiry).toFixed(1)+'s':''));
  el('#auras').replaceChildren(...states.map(text=>{const e=document.createElement('span');e.className='state-chip';e.textContent=text;return e;}));
  el('#cast-progress').textContent=s.pending?'Casting '+cfg.spells[s.pending.i].name+' · '+R.remaining(s,s.pending.end).toFixed(1)+'s remaining':'';
  buttons.forEach((b,i)=>{const why=R.reason(s,i);b.disabled=['paused','done','learned'].includes(phase);b.classList.toggle('recommended',phase==='lesson'?cfg.lessons[step]===i:phase==='live'&&hints&&hint===i);b.querySelector('small').textContent=phase==='ready'?'Inspect ability':why||R.cost(s,i).toFixed(0)+' '+(key==='feral-druid'&&i!==4?'Energy':'Mana');b.title=why||cfg.spells[i].why;});
  el('#combat-feedback').textContent=feedback;
  const i=selected>=0?selected:phase==='lesson'?cfg.lessons[step]:hint>=0?hint:0,a=cfg.spells[i];
  coach.querySelector('.guide-action').textContent=phase==='done'?'Session review':phase==='learned'?'Ready to practice':selected>=0?a.name:phase==='live'&&!hints?'Independent practice':hint<0&&phase==='live'?'Wait or inspect a skill':a.name;
  coach.querySelector('.guide-why').textContent=phase==='done'?review():phase==='learned'?'Try a continuous run. Legal but lower-priority actions remain available.':phase==='live'&&!hints&&selected<0?'Watch the visible resources, effects and cooldowns. Choose an action yourself; select a skill above only when you want to inspect its rules.':a.why;
  coach.querySelector('.guide-status').textContent=phase==='lesson'?'Prepared state. Press '+(i+1)+' to rehearse '+a.name+'.':selected>=0?'Current availability: '+(R.reason(s,i)||'available')+'.':phase==='live'&&!hints?'Read timers and conditions; recommendations are hidden.':hint<0?'No recommended action is currently available. Check cooldowns or resource inputs.':'Recommended, not mandatory: '+a.name+'.';
  const source=coach.querySelector('.spell-source');source.href=phase==='live'&&!hints&&selected<0?cfg.guide:a.url;source.textContent=(phase==='live'&&!hints&&selected<0?'Rotation reference':a.id?'Spell #'+a.id:'Pet command reference')+' ↗';
 }
 function review(){const miss=s.log.find(x=>x.expected&&x.expected!==x.name);return s.casts+' actions; '+s.matched+' matched the coach. '+s.blocked+' blocked attempts. '+(miss?'At '+miss.time.toFixed(1)+'s you chose '+miss.name+'; the coach preferred '+miss.expected+'. Review its priority, not its legality.':'Inspect the source-linked conditions, then try without hints.');}
 function stop(){clearInterval(timer);timer=null;}
 function pulse(){if(s.phase!=='live')return;const now=performance.now();R.advance(s,(now-last)/1000);last=now;if(s.phase==='done'){stop();feedback=review();controls();try{localStorage.setItem('fr.dummy.'+key,JSON.stringify({casts:s.casts,matched:s.matched}));}catch{}}draw();}
 function run(){s.phase='live';last=performance.now();stop();timer=setInterval(pulse,100);controls();draw();board.focus({preventScroll:true});}
 function pause(){if(s.phase!=='live')return;pulse();if(s.phase==='done')return;s.phase='paused';stop();controls();draw();}
 function checkpoint(){
  s=R.create(key,profile()||{});s.phase='lesson';selected=-1;reader.value='';
  const i=cfg.lessons[step];
  if(key==='feral-druid'){s.points=i===2||i===3?5:1;if(i===4)s.energy=30;if(i===3)s.auras.Rip=10;}
  if(key==='beast-mastery-hunter'){s.pet=step>1;if(step>0)s.auras['Hunter’s Mark']=120;}
  if(key==='enhancement-shaman'){if(step>0)s.auras['Magma Totem']=20;if(step>1)s.auras['Flame Shock']=12;if(i===3){s.stacks=5;s.stackExpiry=30;}}
  feedback='Prepared checkpoint: read the action’s real cast conditions and source. No time limit.';controls();draw();
 }
 function use(i){
  if(!cfg.spells[i])return;
  if(s.phase==='ready'){selected=i;reader.value=String(i);draw();return;}
  if(s.phase==='lesson'){
   if(i!==cfg.lessons[step]){feedback='This checkpoint is about '+cfg.spells[cfg.lessons[step]].name+'. A different action is not necessarily illegal in game.';draw();return;}
   step++;if(step===cfg.lessons.length){s.phase='learned';feedback='Walkthrough complete. Start continuous practice when ready.';controls();draw();}else checkpoint();return;
  }
  if(s.phase!=='live')return;pulse();if(s.phase!=='live')return;
  const result=R.cast(s,i);feedback=result.message;selected=result.ok?-1:i;reader.value=selected<0?'':String(i);draw();
 }
 reader.addEventListener('change',()=>{selected=reader.value===''?-1:Number(reader.value);draw();});
 board.addEventListener('change',e=>{if(e.target.id==='show-hint'){hints=e.target.checked;draw();}});
 board.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.ability!==undefined)return use(Number(b.dataset.ability));
  if(b.dataset.event&&s.phase==='live'){pulse();if(s.phase!=='live')return;feedback=R.event(s,b.dataset.event);draw();return;}
  const control=b.dataset.control;
  if(control==='lesson'){stop();step=0;checkpoint();return;}
  if(control==='reset'){stop();s=R.create(key,profile()||{});selected=-1;feedback='Choose a practice mode.';controls();draw();return;}
  if(control==='start'||control==='solo'){
   const p=profile();if(!p){feedback='Enter valid character inputs before starting.';el('.practice-profile').open=true;draw();return;}
   stop();s=R.create(key,p);selected=-1;hints=control!=='solo';feedback='Continuous practice started. Skill timers use the linked base spell values.';try{localStorage.setItem('fr.last',JSON.stringify(key+'-rotation'));}catch{}run();
  }
  if(control==='pause')pause();if(control==='resume'&&s.phase==='paused')run();
  if(control==='cancel'&&s.phase==='live'){pulse();if(s.pending){R.cancel(s);feedback='Cast cancelled. No effect or mana cost applied.';}draw();}
 });
 board.addEventListener('keydown',e=>{if(!e.target.closest('select,input,textarea,a,summary')&&!e.repeat&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&/^[1-6]$/.test(e.key)){e.preventDefault();use(Number(e.key)-1);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',()=>{pause();stop();});
 controls();draw();
})();
