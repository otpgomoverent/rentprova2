(function(){
  // === Navigation / year / active link ===
  const toggle=document.getElementById('menuToggle');
  const menu=document.getElementById('menu');
  if(toggle && menu){ toggle.addEventListener('click', ()=>{ const o=menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(o)); }); }
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  const pageKey=document.body.getAttribute('data-page'); 
  if(pageKey){ document.querySelectorAll('nav.menu a').forEach(a=>{ if(a.dataset.active===pageKey) a.classList.add('active'); }); }
})();

// === Helpers (UNICI) ===
function euro(n){ return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'}); }
function daysBetween(s,e){ const ms=(new Date(e))-(new Date(s)); if(isNaN(ms)||ms<=0) return 0; const h=Math.ceil(ms/36e5); return Math.max(1, Math.ceil(h/24)); }
function seasonMultiplier(d){ d = (d instanceof Date)? d : new Date(d); const m=d.getMonth()+1; if(m===7||m===8) return 1.20; if(m===6||m===9) return 1.10; return 1.00; }

// Prezzi per modello e per categoria
const modelPrices={"Fiat Panda":40,"Smart ForFour (automatico)":60,"Jeep Renegade":60,"SYM Symphony 125":30,"Honda X-ADV 750":80};
function basePriceFor(category, vehicle){
  if(vehicle && modelPrices[vehicle]!=null) return modelPrices[vehicle];
  const map={city:29, berlina:45, suv:59, scooter:25, moto:60};
  const key=String(category||'city').toLowerCase();
  return map[key]||map.city;
}

// === MOTORE UNICO DI CALCOLO (usato ovunque) ===
/** data = { start:Date|str, end:Date|str, category:'city'|'berlina'|'suv'|'scooter'|'moto', vehicle?:string, gps?:bool, seat?:bool, add?:bool, kasko?:bool, days?:number } */
function calcQuote(data){
  const start = data.start instanceof Date ? data.start : new Date(data.start);
  const end   = data.end   instanceof Date ? data.end   : new Date(data.end);
  const days  = data.days || daysBetween(start, end);
  if(!days) return {days:0, items:[], imponibile:0, iva:0, totale:0};

  // Tariffa base + stagionalità + sconti (come index)
  let daily = basePriceFor(data.category, data.vehicle) * seasonMultiplier(start);
  if(days>=7)  daily *= 0.90;   // -10%
  if(days>=14) daily *= 0.85;   // -15% (sostituisce quella precedente)

  // Extra al giorno (allineati agli altri widget ma calcolati con motore unico)
  const extraGps   = data.gps   ? 5  : 0;
  const extraSeat  = data.seat  ? 4  : 0;
  const extraAdd   = data.add   ? 6  : 0;
  const extraKasko = data.kasko ? 15 : 0; // era 15 negli altri widget
  const extraPerDay = extraGps + extraSeat + extraAdd + extraKasko;

  let totale = (daily + extraPerDay) * days;

  // Breakdown
  const items=[
    {voce:`Tariffa base (${days} g x ${euro(daily)})`, importo: daily*days},
    data.gps   ? {voce:`Navigatore (${days} g x ${euro(5)})`, importo: 5*days} : null,
    data.seat  ? {voce:`Seggiolino bimbo (${days} g x ${euro(4)})`, importo: 4*days} : null,
    data.add   ? {voce:`Guidatore aggiuntivo (${days} g x ${euro(6)})`, importo: 6*days} : null,
    data.kasko ? {voce:`Kasko totale (${days} g x ${euro(15)})`, importo: 15*days} : null
  ].filter(Boolean);

  const imponibile = totale / 1.22;
  const iva        = totale - imponibile;
  return {days, daily, items, imponibile, iva, totale};
}

// === RENDER unico: consente un container diverso (index/mini/prenota) ===
function renderQuote(r, containerId='quoteResult'){
  const box=document.getElementById(containerId);
  if(!box) return;
  if(!r || !r.days){ box.innerHTML='<p class="muted">Seleziona date valide.</p>'; return; }
  const rows=r.items.map(i=>`<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`).join('');
  box.innerHTML=`<div class="card"><h3>Stima totale</h3><table class="breakdown"><thead><tr><th>Voce</th><th>Importo</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>Imponibile</th><th style="text-align:right">${euro(r.imponibile)}</th></tr><tr><th>IVA (22%)</th><th style="text-align:right">${euro(r.iva)}</th></tr><tr><th style="font-size:18px">Totale</th><th style="text-align:right;font-size:18px">${euro(r.totale)}</th></tr></tfoot></table><p class="muted" style="margin-top:8px">*Stima non vincolante.</p></div>`;
}

// === INDEX: handler principale ===
function handlePreventivo(e){
  e.preventDefault();
  const f=e.target;
  const start=new Date(f.start.value);
  const end=new Date(f.end.value);
  if(isNaN(start)||isNaN(end)||end<=start){ document.getElementById('quoteResult').innerHTML='<p class="muted">Controlla le date.</p>'; return; }
  const data={
    start,end,
    category:f.category.value,
    vehicle:(f.vehicle?.value||''),
    gps:document.getElementById('q_gps')?.checked,
    seat:document.getElementById('q_seat')?.checked,
    add:document.getElementById('q_add')?.checked,
    kasko:document.getElementById('q_kasko')?.checked
  };
  renderQuote(calcQuote(data),'quoteResult');
}
window.handlePreventivo = handlePreventivo;

// === MINI PREVENTIVO ===
function calcQuoteMini(){
  const start=document.getElementById('m_start')?.value;
  const end  =document.getElementById('m_end')?.value;
  const cat  =document.getElementById('m_cat')?.value||'city';
  const outId='miniOut';

  if(!start || !end){
    const o=document.getElementById('pvResult')||document.getElementById('quoteResult');
    if(o) o.innerHTML='<p class="muted">Seleziona ritiro e riconsegna.</p>';
    else { const m=document.getElementById(outId); if(m) m.textContent='Seleziona ritiro e riconsegna.'; }
    return;
  }
  const data={ start, end, category:String(cat).toLowerCase(), vehicle:'', gps:false, seat:false, add:false, kasko:false };
  const r=calcQuote(data);
  if(document.getElementById('pvResult')) renderQuote(r,'pvResult');
  else if(document.getElementById('quoteResult')) renderQuote(r,'quoteResult');
  else { const m=document.getElementById(outId); if(m) m.textContent=`Stima: ${euro(r.totale)} per ${r.days} giorno/i.`; }
}
window.calcQuoteMini = calcQuoteMini;
window.calcQuote = calcQuoteMini; // alias retrocompatibile

// === Utility link ===
function copyQuoteLink(){
  const u=new URL(window.location.href);
  const set=(k,v)=>{ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); };
  const get=id=>document.getElementById(id)?.value||'';
  set('start',get('q_start')); set('end',get('q_end'));
  set('cat',document.getElementById('q_category')?.value);
  set('age',document.getElementById('q_age')?.value);
  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{ if(document.getElementById(id)?.checked) u.searchParams.set(id,'1'); else u.searchParams.delete(id); });
  navigator.clipboard?.writeText(u.toString()).then(()=>alert('Link preventivo copiato!'));
}
window.copyQuoteLink = copyQuoteLink;

// === PRENOTA ===
function checkAvailability(){
  const p = document.getElementById('pr-pickup')?.value;
  const d = document.getElementById('pr-dropoff')?.value;
  const cat = document.getElementById('pr-cat')?.value||'city';
  const gps   = !!document.querySelector('.pr-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pr-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pr-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pr-extra[data-key="kasko"]')?.checked;

  if(!p || !d){
    const o=document.getElementById('prResult')||document.getElementById('quoteResult');
    if(o) o.innerHTML='<p class="muted">Seleziona ritiro e riconsegna.</p>';
    return;
  }

  const data={ start:p, end:d, category:String(cat).toLowerCase(), vehicle:'', gps, seat, add, kasko };
  const r=calcQuote(data);
  if(document.getElementById('prResult')) renderQuote(r,'prResult'); else renderQuote(r,'quoteResult');

  const statusCell = document.querySelector('#pr-result-rows tr:first-child td:last-child');
  if(statusCell) statusCell.innerHTML = '<span class="badge badge-ok">Disponibile</span>';
}
window.checkAvailability = checkAvailability;

function resetPrenota(){
  document.querySelectorAll('#prenota-title ~ table input').forEach(i=>{ if(i.type==='checkbox'){i.checked=false}else i.value='' });
  const statusCell = document.querySelector('#pr-result-rows tr:first-child td:last-child');
  if(statusCell) statusCell.innerHTML = '<span class="badge badge-warn">In attesa</span>';
  const o=document.getElementById('prResult'); if(o) o.innerHTML='';
}
window.resetPrenota = resetPrenota;

function sendBooking(){ alert('Richiesta inviata! Ti contatteremo per conferma.'); }
window.sendBooking = sendBooking;

// === Precaricamento da URL ===
(function preloadFromURL(){
  const p=new URLSearchParams(window.location.search);
  const vh=p.get('vehicle'), price=p.get('price'), c2=p.get('category');
  const msg=document.getElementById('vehicleChosen'); if(msg && vh) msg.textContent=`Veicolo selezionato: ${vh} — ${euro(Number(price))}/giorno`;
  const sel=document.getElementById('category'); if(sel && c2) sel.value=c2;
})();
