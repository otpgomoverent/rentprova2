(function(){
  // === Nav / year / active link ===
  const toggle=document.getElementById('menuToggle');
  const menu=document.getElementById('menu');
  if(toggle && menu){
    toggle.addEventListener('click', ()=>{
      const o=menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(o));
    });
  }
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  const pageKey=document.body.getAttribute('data-page');
  if(pageKey){
    document.querySelectorAll('nav.menu a').forEach(a=>{
      if(a.dataset.active===pageKey) a.classList.add('active');
    });
  }
})();

// ===== Helpers (unici) =====
function euro(n){ return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'}); }
function daysBetween(a,b){
  const start = (a instanceof Date)? a : new Date(a);
  const end   = (b instanceof Date)? b : new Date(b);
  const ms = end - start;
  if (isNaN(ms) || ms<=0) return 0;
  const hours = Math.ceil(ms/36e5);
  return Math.max(1, Math.ceil(hours/24));
}
function seasonMultiplier(d){
  const dt = (d instanceof Date)? d : new Date(d);
  const m = dt.getMonth()+1;
  if(m===7||m===8) return 1.20;
  if(m===6||m===9) return 1.10;
  return 1.00;
}

// Prezzi per modello e fallback per categoria
const modelPrices={
  "Fiat Panda":40,
  "Smart ForFour (automatico)":60,
  "Jeep Renegade":60,
  "SYM Symphony 125":30,
  "Honda X-ADV 750":80
};
function basePriceFor(category, vehicle){
  if(vehicle && modelPrices[vehicle]!=null) return modelPrices[vehicle];
  const map={city:29, berlina:45, suv:59, scooter:25, moto:60};
  const key=String(category||'city').toLowerCase();
  return map[key] ?? map.city;
}

// ===== Motore unico di calcolo =====
function calcQuoteEngine(data){
  const days = data.days || daysBetween(data.start, data.end);
  if(!days) return {days:0, daily:0, items:[], imponibile:0, iva:0, totale:0};

  let daily = basePriceFor(data.category, data.vehicle) * seasonMultiplier(data.start);
  if (days >= 14) daily *= 0.85;        // sconto 14+ prevale
  else if (days >= 7) daily *= 0.90;    // sconto 7+

  let totale = daily * days;
  const items=[{voce:`Tariffa base (${days} g x ${euro(daily)})`, importo: daily*days}];

  const extras = [
    ['Navigatore', data.gps ? 5 : 0],
    ['Seggiolino bimbo', data.seat ? 4 : 0],
    ['Guidatore aggiuntivo', data.add ? 6 : 0],
    ['Kasko totale', data.kasko ? 15 : 0]
  ];
  extras.forEach(([name, perDay])=>{
    if(perDay){
      const add = perDay * days;
      items.push({voce:`${name} (${days} g x ${euro(perDay)})`, importo:add});
      totale += add;
    }
  });

  const imponibile = totale/1.22;
  const iva = totale - imponibile;
  return {days, daily, items, imponibile, iva, totale};
}

// ===== Render unico (riutilizzabile ovunque) =====
function renderQuote(r, containerId='quoteResult'){
  const box = document.getElementById(containerId);
  if(!box) return;
  if(!r || !r.days){
    box.innerHTML = '<p class="muted">Seleziona date valide.</p>';
    return;
  }
  const rows=(r.items||[]).map(i=>`<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`).join('');
  box.innerHTML = `
    <div class="card">
      <h3>Stima totale</h3>
      <table class="breakdown">
        <thead><tr><th>Voce</th><th>Importo</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><th>Imponibile</th><th style="text-align:right">${euro(r.imponibile)}</th></tr>
          <tr><th>IVA (22%)</th><th style="text-align:right">${euro(r.iva)}</th></tr>
          <tr><th style="font-size:18px">Totale</th><th style="text-align:right;font-size:18px">${euro(r.totale)}</th></tr>
        </tfoot>
      </table>
      <p class="muted" style="margin-top:8px">*Stima non vincolante.</p>
    </div>`;
}

// ===== Index: handler del form principale (robusto ai tuoi id/name) =====
function handlePreventivo(e){
  e && e.preventDefault && e.preventDefault();

  const form = (e && e.target) || document.getElementById('quoteForm') || document;

  const val = (n, ...ids) => (
    (form && form[n] && form[n].value) ||
    ids.map(id => document.getElementById(id)?.value).find(Boolean) ||
    ''
  );

  // supporta sia name="start|end|category" che id="q_start|q_end|q_category" o "start|end|category"
  const startStr = val('start', 'q_start', 'start');
  const endStr   = val('end',   'q_end',   'end');
  const catStr   = (val('category', 'q_category', 'category') || 'city');

  const start = new Date(startStr);
  const end   = new Date(endStr);

  const box = document.getElementById('quoteResult');
  if (isNaN(start) || isNaN(end) || end <= start){
    if (box) box.innerHTML = '<p class="muted">Controlla le date.</p>';
    return;
  }

  const data = {
    start, end,
    category: String(catStr).toLowerCase(),
    vehicle: (form && form.vehicle && form.vehicle.value) || document.getElementById('vehicle')?.value || '',
    gps:   document.getElementById('q_gps')?.checked || false,
    seat:  document.getElementById('q_seat')?.checked || false,
    add:   document.getElementById('q_add')?.checked  || false,
    kasko: document.getElementById('q_kasko')?.checked|| false
  };

  renderQuote(calcQuoteEngine(data), 'quoteResult');
}
window.handlePreventivo = handlePreventivo;

// Auto-bind nel caso la form non abbia onsubmit
document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('quoteForm') || document.querySelector('form[data-quote-form]') || null;
  if (f && !f._binded) {
    f.addEventListener('submit', handlePreventivo);
    // Assicura che il bottone faccia submit
    const btn = f.querySelector('button[type="submit"], button:not([type])');
    if (btn) btn.type = 'submit';
    f._binded = true;
  }
});

// ===== Mini preventivo (pagina preventivo) =====
window.calcQuote = function(){
  const pickup = document.getElementById('pv-pickup')?.value;
  const drop   = document.getElementById('pv-dropoff')?.value;
  const catEl  = document.querySelector('input[name="pv-cat"]:checked');
  const catLbl = catEl ? catEl.value : 'City Car';

  const gps   = !!document.querySelector('.pv-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pv-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pv-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pv-extra[data-key="kasko"]')?.checked;

  const outId = document.getElementById('pvResult') ? 'pvResult' : 'quoteResult';

  if(!pickup || !drop){
    const box = document.getElementById(outId);
    if(box) box.innerHTML = '<p class="muted">Seleziona ritiro e riconsegna.</p>';
    return;
  }

  const mapCat = (s)=>{
    s = String(s).toLowerCase();
    if(s.includes('berlina')) return 'berlina';
    if(s.includes('suv')) return 'suv';
    if(s.includes('scooter')) return 'scooter';
    if(s.includes('moto')) return 'moto';
    return 'city';
  };

  const start = new Date(pickup), end = new Date(drop);
  const data = {
    start, end,
    category: mapCat(catLbl),
    vehicle: '',
    gps, seat, add, kasko,
    days: daysBetween(start, end)
  };

  const result = calcQuoteEngine(data);
  renderQuote(result, outId);
};

// ===== Prenota (pagina prenota) =====
window.checkAvailability = function(){
  const p   = document.getElementById('pr-pickup')?.value;
  const d   = document.getElementById('pr-dropoff')?.value;
  const cat = document.getElementById('pr-cat')?.value || 'City Car';

  const gps   = !!document.querySelector('.pr-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pr-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pr-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pr-extra[data-key="kasko"]')?.checked;

  const outId = document.getElementById('prResult') ? 'prResult' : 'quoteResult';

  if(!p || !d){
    const box = document.getElementById(outId);
    if(box) box.innerHTML = '<p class="muted">Seleziona ritiro e riconsegna.</p>';
    return;
  }

  const mapCat = (s)=>{
    s = String(s).toLowerCase();
    if(s.includes('berlina')) return 'berlina';
    if(s.includes('suv')) return 'suv';
    if(s.includes('scooter')) return 'scooter';
    if(s.includes('moto')) return 'moto';
    return 'city';
  };

  const start = new Date(p), end = new Date(d);
  const data = {
    start, end,
    category: mapCat(cat),
    vehicle: '',
    gps, seat, add, kasko,
    days: daysBetween(start, end)
  };

  const result = calcQuoteEngine(data);
  renderQuote(result, outId);

  const statusCell = document.querySelector('#pr-result-rows tr:first-child td:last-child');
  if(statusCell) statusCell.innerHTML = '<span class="badge-ok">Disponibile</span>';
};

// ===== Utility =====
function copyQuoteLink(){
  const u=new URL(window.location.href);
  const set=(k,v)=>{ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); };
  const get=id=>document.getElementById(id)?.value||'';
  set('start',get('q_start')); set('end',get('q_end'));
  set('cat',document.getElementById('q_category')?.value);
  set('age',document.getElementById('q_age')?.value);
  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{
    if(document.getElementById(id)?.checked) u.searchParams.set(id,'1');
    else u.searchParams.delete(id);
  });
  navigator.clipboard?.writeText(u.toString()).then(()=>alert('Link preventivo copiato!'));
}
window.copyQuoteLink = copyQuoteLink;

(function preloadFromURL(){
  const p=new URLSearchParams(window.location.search);
  const vh=p.get('vehicle'), price=p.get('price'), c2=p.get('category');
  const msg=document.getElementById('vehicleChosen');
  if(msg && vh) msg.textContent=`Veicolo selezionato: ${vh} — ${euro(Number(price))}/giorno`;
  const sel=document.getElementById('category'); if(sel && c2) sel.value=c2;
})();
