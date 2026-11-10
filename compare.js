(() => {
 const panels=[...document.querySelectorAll('[data-option]')];
 const chooser=document.querySelector('.pick-pair');
 const comparePath='/compare-rotations/';
 const key='fr.compare.pair';
 const supported=['retribution-paladin-rotation','arms-warrior-rotation','frost-mage-rotation','combat-rogue-rotation','feral-druid-rotation','beast-mastery-hunter-rotation','enhancement-shaman-rotation'];
 const valid=pair=>pair.length===2&&pair[0]!==pair[1]&&pair.every(value=>supported.includes(value));
 if(!chooser){
  const practice=document.querySelector('#practice');
  if(!practice)return;
  let pair=(new URLSearchParams(location.search).get('compare')||'').split(',');
  if(!valid(pair)){try{pair=(sessionStorage.getItem(key)||'').split(',');}catch{}}
  const link=document.createElement('a');link.className='link';link.href=comparePath;
  link.textContent='Compare rotation playstyles →';
  if(valid(pair)&&pair.includes(location.pathname.split('/')[1])){
   link.href+='?pair='+pair.join(',');link.textContent='← Return to your comparison';
  }
  practice.append(link);return;
 }
 const selects=[...chooser.querySelectorAll('select')];
 let pair=(new URLSearchParams(location.search).get('pair')||'').split(',');
 if(!valid(pair))pair=supported.slice(0,2);
 function render(){
  selects.forEach((sel,i)=>{sel.value=pair[i];});
  const grid=document.querySelector('.compare-grid');
  const selected=pair.map(slug=>panels.find(panel=>panel.dataset.option===slug));
  const table=document.createElement('table');table.className='pair-table';
  const caption=table.createCaption();caption.textContent='Level 60 · Single-target PvE';
  const headings=table.createTHead().insertRow();
  selected.forEach(panel=>{
   const th=document.createElement('th');th.scope='col';th.append(panel.querySelector('img').cloneNode(true),panel.querySelector('h2').cloneNode(true));headings.append(th);
  });
  const body=table.createTBody();
  for(const [i,term] of [...selected[0].querySelectorAll('dt')].entries()){
   const label=document.createElement('th');label.colSpan=2;label.scope='rowgroup';label.textContent=term.textContent;body.insertRow().append(label);
   const row=body.insertRow();selected.forEach(panel=>row.insertCell().textContent=panel.querySelectorAll('dd')[i].textContent);
  }
  const links=body.insertRow();
  selected.forEach(panel=>{
   const a=panel.querySelector('[data-try]').cloneNode(true);
   a.href='/'+panel.dataset.option+'/?compare='+pair.join(',')+'#practice';links.insertCell().append(a);
  });
  grid.replaceChildren(table);
  try{sessionStorage.setItem(key,pair.join(','));}catch{}
  history.replaceState(null,'',comparePath+'?pair='+pair.join(',')+location.hash);
 }
 selects.forEach((sel,i)=>sel.addEventListener('change',()=>{
  const other=1-i;if(sel.value===pair[other])pair[other]=pair[i];
  pair[i]=sel.value;render();
 }));
 chooser.hidden=false;render();
})();
