
(function(){ 
  const toggle=document.getElementById('menuToggle'); const menu=document.getElementById('menu'); 
  if(toggle) toggle.addEventListener('click', ()=> { const o=menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(o)); });
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  const pageKey=document.body.getAttribute('data-page'); 
  if(pageKey) { document.querySelectorAll('nav.menu a').forEach(a=>{ if(a.dataset.active===pageKey) a.classList.add('active'); }); }
})();

function euro(n){ return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'}); }
function daysBetween(s,e){ const ms=e-s; if(ms<=0) return 0; const h=Math.ceil(ms/36e5); return Math.max(1, Math.ceil(h/24)); }
function seasonMultiplier(d){ const m=d.getMonth()+1; if(m===7||m===8) return 1.2; if(m===6||m===9) return 1.1; return 1.0; }

const modelPrices = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 60,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

function basePriceFor(category, vehicleName){
  if(vehicleName && modelPrices[vehicleName] != null) return modelPrices[vehicleName];
  const map={ city:29, berlina:45, suv:59, furgone:70, scooter:25, moto:60 };
  return map[category] || 0;
}

function calcQuote(data){
  const days=data.days;
  let daily=basePriceFor(data.category, data.vehicle) * seasonMultiplier(data.start);
  if (days >= 7) daily *= 0.9;
  if (days >= 14) daily *= 0.85;
  let totale=daily*days;
  const items=[{voce:`Tariffa base (${days} g x ${euro(daily)})`, importo: daily*days}];
  const perDay=[['Navigatore', data.gps?5:0],['Seggiolino bimbo', data.seat?4:0],['Guidatore aggiuntivo', data.add?6:0],['Kasko totale', data.kasko?15:0]];
  perDay.forEach(([n,p])=>{ if(p){ const add=p*days; items.push({voce:`${n} (${days} g x ${euro(p)})`, importo:add}); totale+=add; } });
  const imponibile=totale/1.22, iva=totale-imponibile;
  return {days, daily, items, imponibile, iva, totale};
}

function renderQuote(result){
  const box=document.getElementById('quoteResult'); if(!box) return;
  const rows=result.items.map(i=>`<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`).join('');
  box.innerHTML=`<div class="card"><h3>Stima totale</h3>
    <table class="breakdown"><thead><tr><th>Voce</th><th>Importo</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><th>Imponibile</th><th style="text-align:right">${euro(result.imponibile)}</th></tr>
           <tr><th>IVA (22%)</th><th style="text-align:right">${euro(result.iva)}</th></tr>
           <tr><th style="font-size:18px">Totale</th><th style="text-align:right;font-size:18px">${euro(result.totale)}</th></tr></tfoot></table>
    <p class="muted" style="margin-top:8px">*Stima non vincolante.</p></div>`;
}

function handlePreventivo(e){
  e.preventDefault();
  const f=e.target; const start=new Date(f.start.value); const end=new Date(f.end.value);
  if(isNaN(start)||isNaN(end)||end<=start){ document.getElementById('quoteResult').innerHTML='<p class="muted">Controlla le date.</p>'; return; }
  const data={ pickup:f.pickup.value, dropoff:f.dropoff.value, start, end, category:f.category.value, vehicle:(f.vehicle?.value||''), age:Number(f.age?.value||0),
    gps:document.getElementById('q_gps')?.checked, seat:document.getElementById('q_seat')?.checked, add:document.getElementById('q_add')?.checked, kasko:document.getElementById('q_kasko')?.checked, days:daysBetween(start,end) };
  renderQuote(calcQuote(data));
}

function copyQuoteLink(){
  const u=new URL(window.location.href);
  const set=(k,v)=>{ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); };
  const get=id=>document.getElementById(id)?.value||'';
  set('start',get('q_start')); set('end',get('q_end'));
  set('cat',document.getElementById('q_category')?.value); set('age',document.getElementById('q_age')?.value);
  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{ if(document.getElementById(id)?.checked) u.searchParams.set(id,'1'); else u.searchParams.delete(id); });
  navigator.clipboard?.writeText(u.toString()).then(()=>alert('Link preventivo copiato!'));
}

(function preloadFromURL(){
  const p=new URLSearchParams(window.location.search);
  const set=(id,v)=>{ const el=document.getElementById(id); if(el && v) el.value=v; };
  const vh=p.get('vehicle'), price=p.get('price'), c2=p.get('category');
  const msg=document.getElementById('vehicleChosen'); if(msg && vh) msg.textContent=`Veicolo selezionato: ${vh} — ${euro(Number(price))}/giorno`;
  const sel=document.getElementById('category'); if(sel && c2) sel.value=c2;
})();

function handleBooking(e){
  e.preventDefault();
  const form=e.target; const start=new Date(form.start.value); const end=new Date(form.end.value);
  const status=document.getElementById('formStatus'); if(end<=start){ status.textContent='Controlla le date.'; return; }
  const hours=Math.ceil((end-start)/36e5); const days=Math.max(1, Math.ceil(hours/24));
  const urlParams=new URLSearchParams(window.location.search);
  let daily = (function(){ const vh=urlParams.get('vehicle'); if(vh && modelPrices[vh]!=null) return modelPrices[vh]; return basePriceFor(form.category.value); })();
  let totale=daily*days;
  if (document.getElementById('opt_gps')?.checked) totale+=5*days;
  if (document.getElementById('opt_seat')?.checked) totale+=4*days;
  if (document.getElementById('opt_add')?.checked) totale+=6*days;
  if (document.getElementById('opt_kasko')?.checked) totale+=15*days;
  const age=Number(form.age.value||0); if(age && age<25) totale+=12*days;
  status.textContent=`Disponibilità trovata! Stima: ${euro(totale)} per ${days} giorno/i. Sede: Ercolano (NA).`;
  form.reset();
}
