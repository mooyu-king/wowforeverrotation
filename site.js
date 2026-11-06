'use strict';
const one = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const storage = {
  get(key){ try {return JSON.parse(localStorage.getItem('fr.'+key));} catch {return null;} },
  set(key,value){ try {localStorage.setItem('fr.'+key,JSON.stringify(value));return true;} catch {return false;} }
};
const tickerToggle=one('#ticker-toggle');
tickerToggle?.addEventListener('click',()=>{
 const paused=tickerToggle.closest('.bulletin').classList.toggle('ticker-paused');
 tickerToggle.setAttribute('aria-pressed',String(paused));
 tickerToggle.setAttribute('aria-label',paused?'Resume scrolling':'Pause scrolling');
 tickerToggle.title=tickerToggle.getAttribute('aria-label');
 tickerToggle.textContent=paused?'▷':'Ⅱ';
});
let nativeInstall=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault(); nativeInstall=e;});
const install=one('#install');
if(matchMedia('(display-mode: standalone)').matches || navigator.standalone) install.hidden=true;
addEventListener('appinstalled',()=>{install.hidden=true; nativeInstall=null;});
install.addEventListener('click',async()=>{
 if(nativeInstall){const event=nativeInstall;nativeInstall=null;try{await event.prompt();return;}catch{}}
 one('#install-copy').textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, open Share, tap Add to Home Screen, then choose Add.':'Open your browser menu and choose Install app or Add to home screen if available. You can also bookmark this page.';
 one('#install-dialog').showModal();
});
one('#install-dialog button').addEventListener('click',()=>one('#install-dialog').close());
if('serviceWorker' in navigator && window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
const resume=one('#resume');
if(resume){
 const slug=storage.get('last');
 const known=[...document.querySelectorAll('.classcard h3 a')].find(a=>a.pathname==='/'+slug+'/');
 if(known){const a=document.createElement('a');a.href=known.pathname+'#practice';a.textContent='Return to '+known.textContent+' practice →';resume.append(a);}
}
const config=one('#drill-data');
if(config)startTrainer(JSON.parse(config.textContent));
function startTrainer(data){
 const exercise=one('#exercise'), side=one('#step-info');
 const {questions,version,slug}=data;
 const initialSide=side.innerHTML;
 const recordKey='result.'+slug+'.'+version;
 const paths={start:'M8 5l11 7-11 7z',retry:'M3 10a9 9 0 1 1 2 9M3 4v6h6',next:'M4 12h15m-6-6 6 6-6 6',pause:'M8 5v14m8-14v14',resume:'M8 5l11 7-11 7z',peek:'m15 5-7 7 7 7',forward:'m9 5 7 7-7 7',back:'M8 6l-5 5 5 5m-5-5h11a5 5 0 0 1 0 10',clear:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15'};
 const btn=(act,label,primary=false)=>'<button type="button" class="action '+(primary?'gold':'')+'" data-act="'+act+'" title="'+label+'" aria-label="'+label+'"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[act]+'"/></svg>'+label+'</button>';
 let index=0, phase='ready', beforePause='ask', chosen=null, preview=null, guided=false;
 let first=[], corrected=new Set(), saved=false;
 function savedLine(){
  const record=storage.get(recordKey);
  return record && Number.isInteger(record.score)?'<p>Last run: '+record.score+' / '+questions.length+' on first attempts.</p>'+btn('clear','Clear saved result'):'';
 }
 exercise.insertAdjacentHTML('beforeend','<div id="previous">'+savedLine()+'</div>');
 function sidebar(){
   if(phase==='ready'||phase==='done'){side.innerHTML=initialSide;return;}
   const step=preview??index, q=questions[step];
   const hint=phase==='paused'?'Resume to continue this scenario.':(preview!==null && step!==index)?q.state:phase==='feedback'?q.why:guided?q.why:'Read the state above each answer. The explanation opens after you choose.';
   side.innerHTML='<h3>Step '+(step+1)+' of '+questions.length+'</h3><p>'+escapeHTML(hint)+'</p><div class="tools">'+(step>0?btn('peek','Previous note'):'')+(step<questions.length-1?btn('forward','Next note'):'')+(preview!==null?btn('back','Current step'):'')+'</div>';
 }
 function render(){
  if(phase==='done'){
   const score=first.filter((x,i)=>x===questions[i].answer).length;
   exercise.innerHTML='<div class="eyebrow">DRILL COMPLETE</div><h3>'+score+' / '+questions.length+' on first attempts</h3><p>'+corrected.size+' corrected on retry. '+(saved?'Result saved in this browser.':'Browser storage is unavailable.')+'</p><div class="tools">'+btn('start','Practice again',true)+'<a class="action" href="/#guides">Other classes →</a>'+(saved?btn('clear','Clear saved result'):'')+'</div>';
  }else if(phase==='paused'){
   exercise.innerHTML='<h3>Practice paused</h3><p>Your scenario is waiting.</p>'+btn('resume','Resume',true);
  }else{
   const q=questions[index],answered=phase==='feedback';
   exercise.innerHTML='<div class="eyebrow">SCENARIO '+(index+1)+' / '+questions.length+'</div><p class="state">'+escapeHTML(q.state)+'</p><h3 tabindex="-1">'+escapeHTML(q.prompt)+'</h3><details class="mobiletip"><summary>Step guide</summary><p>'+escapeHTML(answered||guided?q.why:'Use the state and timing above to choose your answer.')+'</p></details><div class="answers">'+q.options.map((opt,i)=>'<button class="answer" data-choice="'+i+'" '+(answered?'disabled':'')+' aria-pressed="'+(i===chosen)+'"><span class="key">'+(i+1)+'</span>'+escapeHTML(opt)+'</button>').join('')+'</div>'+(answered?'<div class="feedback" role="status"><strong>'+(chosen===q.answer?'Correct':'Review this decision')+'</strong> · '+escapeHTML(q.why)+'</div>':'')+'<div class="tools">'+(answered?btn('next',index===questions.length-1?'Finish':'Next scenario',true)+btn('retry','Retry step'):btn('pause','Pause'))+'</div>';
  }
  sidebar();
 }
 function answer(n){
   if(phase!=='ask'||!Number.isInteger(n)||n<0||n>=questions[index].options.length)return;
   if(first[index]===undefined)first[index]=n;else if(first[index]!==questions[index].answer&&n===questions[index].answer)corrected.add(index);
   chosen=n;preview=null;phase='feedback';render();exercise.querySelector('[data-act="next"]')?.focus({preventScroll:true});
 }
 function action(a){
   if(a==='clear'){try{localStorage.removeItem('fr.'+recordKey);}catch{};saved=false;if(phase==='ready')one('#previous').replaceChildren();else {exercise.querySelector('[data-act="clear"]')?.remove();exercise.querySelector('p').textContent=corrected.size+' corrected on retry. Saved result cleared.';}return;}
   if(a==='start'){
    guided=one('#guided')?.checked??guided;index=0;first=[];corrected=new Set();chosen=null;preview=null;phase='ask';storage.set('last',slug);
   }else if(a==='pause'&&phase==='ask'){beforePause=phase;phase='paused';}
   else if(a==='resume'&&phase==='paused')phase=beforePause;
   else if(a==='retry'&&phase==='feedback'){phase='ask';chosen=null;preview=null;}
   else if(a==='next'&&phase==='feedback'){
    preview=null;chosen=null;
    if(index===questions.length-1){phase='done';saved=storage.set(recordKey,{score:first.filter((v,i)=>v===questions[i].answer).length,answers:first});}
    else{index++;phase='ask';}
   }else if(a==='peek'||a==='forward'||a==='back'){
    preview=a==='back'?null:Math.max(0,Math.min(questions.length-1,(preview??index)+(a==='peek'?-1:1)));sidebar();return;
   }else return;
   render();(exercise.querySelector('h3[tabindex]')||exercise.querySelector('button'))?.focus({preventScroll:true});
 }
 exercise.querySelector('[data-act="start"]').insertAdjacentHTML('beforebegin','<label class="mode"><input id="guided" type="checkbox"> Show coaching hints before answering</label>');
 one('#knowledge').addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||b.disabled||e.detail>1)return;
   if(b.dataset.choice!==undefined)answer(Number(b.dataset.choice));else if(b.dataset.act)action(b.dataset.act);
 });
 document.addEventListener('keydown',e=>{
  if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||one('dialog[open]')||!exercise.contains(document.activeElement))return;
  if(/^[1-3]$/.test(e.key)){e.preventDefault();answer(Number(e.key)-1);}
 });
}
