
(function(){
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  toggle && toggle.addEventListener('click', () => menu.classList.toggle('open'));
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();

function euro(n){ return (n||0).toLocaleString('it-IT', { style:'currency', currency:'EUR' }); }
function daysBetween(start, end){ const ms=end-start; if(ms<=0) return 0; const hours=Math.ceil(ms/36e5); return Math.max(1, Math.ceil(hours/24)); }
function seasonMultiplier(d){ const m=d.getMonth()+1; if(m===7||m===8) return 1.2; if(m===6||m===9) return 1.1; return 1.0; }

function calcQuote(data){
  const base = { city: 29, berlina: 45, suv: 59, furgone: 70 };
  const days = data.days;
  let daily = (base[data.category]||0) * seasonMultiplier(data.start);
  if (days >= 7) daily *= 0.9;
  if (days >= 14) daily *= 0.85;
  let totale = daily * days;
  const items = [{voce:`Tariffa base (${days} g x ${euro(daily)})`, importo: daily*days}];
  const perDay=[['Navigatore', data.gps?5:0],['Seggiolino bimbo', data.seat?4:0],['Guidatore aggiuntivo', data.add?6:0],['Kasko totale', data.kasko?15:0]];
  perDay.forEach(([name, price])=>{ if(price){ const add=price*days; items.push({voce:`${name} (${days} g x ${euro(price)})`, importo:add}); totale+=add; }});
  if (data.pickup && data.dropoff && data.pickup.trim().toLowerCase() !== data.dropoff.trim().toLowerCase()) { items.push({voce:'Riconsegna in altra sede', importo:29}); totale+=29; }
  if (data.age && data.age < 25){ const young = 12*days; items.push({voce:`Conducente <25 anni (${days} g x ${euro(12)})`, importo: young}); totale+=young; }
  const imponibile=totale/1.22, iva=totale-imponibile;
  return { days, daily, items, imponibile, iva, totale };
}

function renderQuote(result){
  const box = document.getElementById('quoteResult'); if(!box) return;
  const rows = result.items.map(i=>`<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`).join('');
  box.innerHTML = `<div class="card"><h3>Stima totale</h3>
    <table class="breakdown">
      <thead><tr><th>Voce</th><th>Importo</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><th>Imponibile</th><th style="text-align:right">${euro(result.imponibile)}</th></tr>
        <tr><th>IVA (22%)</th><th style="text-align:right">${euro(result.iva)}</th></tr>
        <tr><th style="font-size:18px">Totale</th><th style="text-align:right; font-size:18px">${euro(result.totale)}</th></tr>
      </tfoot>
    </table>
    <p class="muted" style="margin-top:8px">*Stima non vincolante. Tariffe soggette a disponibilità e verifica documenti.</p>
  </div>`;
}

function handlePreventivo(e){
  if(!e) return; e.preventDefault();
  const f=e.target;
  const start=new Date(f.start.value), end=new Date(f.end.value);
  if (isNaN(start)||isNaN(end)||end<=start){ const qr=document.getElementById('quoteResult'); if(qr) qr.innerHTML='<p class="muted">Controlla le date.</p>'; return; }
  const data={ pickup:f.pickup.value, dropoff:f.dropoff.value, start, end, category:f.category.value, age:Number(f.age.value||0),
    gps:document.getElementById('q_gps')?.checked, seat:document.getElementById('q_seat')?.checked, add:document.getElementById('q_add')?.checked, kasko:document.getElementById('q_kasko')?.checked, days:daysBetween(start,end) };
  renderQuote(calcQuote(data));
}

function copyQuoteLink(){
  const u = new URL(window.location.href);
  const set=(k,v)=>{ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); };
  const get=id=>document.getElementById(id)?.value||'';
  set('pickup', get('q_pickup')); set('dropoff', get('q_dropoff')); set('start', get('q_start')); set('end', get('q_end'));
  set('cat', document.getElementById('q_category')?.value); set('age', document.getElementById('q_age')?.value);
  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{ if(document.getElementById(id)?.checked) u.searchParams.set(id,'1'); else u.searchParams.delete(id); });
  navigator.clipboard?.writeText(u.toString()).then(()=>alert('Link preventivo copiato!'));
}

(function preloadFromURL(){
  const p = new URLSearchParams(window.location.search);
  const set=(id,v)=>{ const el=document.getElementById(id); if(el && v) el.value=v; };
  set('q_pickup', p.get('pickup')); set('q_dropoff', p.get('dropoff')); set('q_start', p.get('start')); set('q_end', p.get('end'));
  const cat=p.get('cat'); if(cat && document.getElementById('q_category')) document.getElementById('q_category').value=cat;
  set('q_age', p.get('age'));
  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{ const el=document.getElementById(id); if(el && p.get(id)==='1') el.checked=true; });
  // Prenota prefill
  const vh=p.get('vehicle'), price=p.get('price'), c2=p.get('category');
  const msg=document.getElementById('vehicleChosen');
  if(msg && vh){ msg.textContent=`Veicolo selezionato: ${vh} — ${euro(Number(price))}/giorno`; }
  const sel=document.getElementById('category'); if(sel && c2){ sel.value=c2; }
})();

function handleBooking(e){
  if(!e) return; e.preventDefault();
  const form=e.target; const start=new Date(form.start.value); const end=new Date(form.end.value);
  const status=document.getElementById('formStatus');
  if (end<=start){ if(status) status.textContent='Controlla le date: la riconsegna deve essere successiva al ritiro.'; return; }
  const hours=Math.ceil((end-start)/36e5); const days=Math.max(1, Math.ceil(hours/24));
  const base={ city:29, berlina:45, suv:59, furgone:70 }; let totale=(base[form.category.value]||0)*days;
  if (document.getElementById('opt_gps')?.checked) totale+=5*days;
  if (document.getElementById('opt_seat')?.checked) totale+=4*days;
  if (document.getElementById('opt_add')?.checked) totale+=6*days;
  if (document.getElementById('opt_kasko')?.checked) totale+=15*days;
  const age=Number(form.age.value||0); if(age && age<25) totale+=12*days;
  if(status) status.textContent = `Disponibilità trovata! Stima: ${euro(totale)} per ${days} giorno/i.`;
  form.reset();
}
