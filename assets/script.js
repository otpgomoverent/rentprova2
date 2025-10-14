(function(){
  // === Nav toggle & active link ===
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
  const pageKey = document.body.getAttribute('data-page');
  if (pageKey) {
    document.querySelectorAll('nav.menu a').forEach(a => {
      if (a.dataset.active === pageKey) a.classList.add('active');
    });
  }
})();

// === Helpers ===
function euro(n){ return (n||0).toLocaleString('it-IT', { style:'currency', currency:'EUR' }); }
function daysBetween(start, end){
  if(!(start instanceof Date)) start = new Date(start);
  if(!(end instanceof Date)) end = new Date(end);
  const ms = end - start;
  if (isNaN(ms) || ms <= 0) return 0;
  const hours = Math.ceil(ms / 36e5);
  return Math.max(1, Math.ceil(hours / 24));
}
function seasonMultiplier(d){
  const m = d.getMonth() + 1;
  if (m === 7 || m === 8) return 1.20; // alta stagione
  if (m === 6 || m === 9) return 1.10; // medio-alta
  return 1.00; // bassa
}

// Tariffe per modello (selezione esplicita prevale sulla categoria)
const modelPrices = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 48,
  "Volkswagen Golf": 55,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

function basePriceFor(category, vehicle){
  if (vehicle && modelPrices[vehicle] != null) return modelPrices[vehicle];
  const map = { city:39, berlina:45, suv:59, scooter:25, moto:60 };
  return map[String(category||'').toLowerCase()] || 0;
}

// === Motore unico di preventivo (usato da: index, mini-preventivo, prenota) ===
/**
 * data: {
 *   start: Date, end: Date,
 *   category: 'city'|'berlina'|'suv'|'scooter'|'moto',
 *   vehicle: ''|<modello>,
 *   gps:boolean, seat:boolean, add:boolean, kasko:boolean
 * }
 */
function calcQuote(data){
  const start = data.start instanceof Date ? data.start : new Date(data.start);
  const end   = data.end   instanceof Date ? data.end   : new Date(data.end);
  const days  = daysBetween(start, end);
  if (!days) {
    return { items: [], imponibile:0, iva:0, totale:0, days:0 };
  }

  const cat   = data.category || 'city';
  const base  = basePriceFor(cat, data.vehicle);

  // Sconti durata (come index)
  let sconto = 0;
  if (days >= 14) sconto = 0.12;
  else if (days >= 7) sconto = 0.08;

  const stag = seasonMultiplier(start);
  const giornaliero = base * stag * (1 - sconto);

  // Extra per giorno
  const extraPerDay =
    (data.gps   ? 5 : 0) +
    (data.seat  ? 4 : 0) +
    (data.add   ? 6 : 0) +
    (data.kasko ? 10: 0);

  const imponibile = (giornaliero + extraPerDay) * days;
  const iva = imponibile * 0.22;
  const totale = imponibile + iva;

  const items = [
    { voce:`Tariffa base (${days} ${days===1?'giorno':'giorni'})`, importo: base * days },
    { voce:`Moltiplicatore stagionale (${stag.toFixed(2)}×)`, importo: (base*stag - base) * days },
    sconto ? { voce:`Sconto durata (${Math.round(sconto*100)}%)`, importo: - base * stag * sconto * days } : null,
    data.gps   ? { voce:'GPS', importo:  5 * days } : null,
    data.seat  ? { voce:'Seggiolino', importo: 4 * days } : null,
    data.add   ? { voce:'Conducente aggiuntivo', importo: 6 * days } : null,
    data.kasko ? { voce:'Kasko', importo: 10 * days } : null
  ].filter(Boolean);

  return { items, imponibile, iva, totale, days, giornaliero, base, sconto, stag };
}

// --- Render riutilizzabile (destinazione via containerId) ---
function renderQuote(r, containerId='quoteResult'){
  const box = document.getElementById(containerId);
  if(!box) return;
  if(!r || !r.days){
    box.innerHTML = '<p class="muted">Seleziona date valide.</p>';
    return;
  }
  const rows = r.items.map(i=>`<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`).join('');
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

// === INDEX (pagina principale) ===
// Assumiamo un form con id="form-index" ed un contenitore quoteResult
(function initIndex(){
  const f = document.getElementById('form-index');
  if(!f) return;
  const outId = 'quoteResult';
  const update = () => {
    const start = f.start?.value || f['start']?.value;
    const end   = f.end?.value   || f['end']?.value;
    const data = {
      start, end,
      category: (f.category?.value || 'city'),
      vehicle: (f.vehicle?.value || ''),
      gps: !!f.gps?.checked,
      seat: !!f.seat?.checked,
      add: !!f.add?.checked,
      kasko: !!f.kasko?.checked
    };
    const r = calcQuote(data);
    renderQuote(r, outId);
  };
  f.addEventListener('input', update);
  f.addEventListener('change', update);
  update();
})();

// === MINI PREVENTIVO (widget laterale) ===
window.calcQuoteMini = function(){
  const pickup = document.getElementById('pv-pickup')?.value;
  const drop   = document.getElementById('pv-dropoff')?.value;
  const catEl  = document.querySelector('input[name="pv-cat"]:checked');
  const cat    = catEl ? catEl.value : 'City';
  const gps    = !!document.querySelector('.pv-extra[data-key="gps"]')?.checked;
  const seat   = !!document.querySelector('.pv-extra[data-key="seat"]')?.checked;
  const add    = !!document.querySelector('.pv-extra[data-key="add"]')?.checked;
  const kasko  = !!document.querySelector('.pv-extra[data-key="kasko"]')?.checked;

  const data = {
    start: pickup, end: drop,
    category: String(cat).toLowerCase().includes('suv') ? 'suv'
            : String(cat).toLowerCase().includes('berlina') ? 'berlina'
            : String(cat).toLowerCase().includes('scooter') ? 'scooter'
            : String(cat).toLowerCase().includes('moto') ? 'moto'
            : 'city',
    vehicle: '',
    gps, seat, add, kasko
  };
  const r = calcQuote(data);
  renderQuote(r, 'pvResult');
};

window.copyQuoteLink = function(){
  const url = new URL(location.href);
  const params = new URLSearchParams({
    p: document.getElementById('pv-pickup')?.value || '',
    d: document.getElementById('pv-dropoff')?.value || '',
    cat: (document.querySelector('input[name="pv-cat"]:checked')||{}).value || 'City'
  });
  navigator.clipboard.writeText(url.origin + url.pathname + '?' + params.toString());
  alert('Link del preventivo copiato!');
};

// === PRENOTA (widget con disponibilità) ===
window.checkAvailability = function(){
  const p   = document.getElementById('pr-pickup')?.value;
  const d   = document.getElementById('pr-dropoff')?.value;
  const cat = document.getElementById('pr-cat')?.value || 'City';
  const gps   = !!document.querySelector('.pr-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pr-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pr-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pr-extra[data-key="kasko"]')?.checked;

  const data = {
    start:p, end:d,
    category: String(cat).toLowerCase().includes('suv') ? 'suv'
            : String(cat).toLowerCase().includes('berlina') ? 'berlina'
            : String(cat).toLowerCase().includes('scooter') ? 'scooter'
            : String(cat).toLowerCase().includes('moto') ? 'moto'
            : 'city',
    vehicle:'', gps, seat, add, kasko
  };

  const r = calcQuote(data);
  renderQuote(r, 'prResult');

  // Badge disponibilità (dummy)
  const statusCell = document.querySelector('#pr-result-rows tr:first-child td:last-child');
  if(statusCell) statusCell.innerHTML = '<span class="badge badge-ok">Disponibile</span>';
};

window.resetPrenota = function(){
  document.querySelectorAll('#prenota-title ~ table input').forEach(i=>{
    if(i.type==='checkbox'){ i.checked = false; } else { i.value = ''; }
  });
  const statusCell = document.querySelector('#pr-result-rows tr:first-child td:last-child');
  if(statusCell) statusCell.innerHTML = '<span class="badge badge-warn">In attesa</span>';
  const box = document.getElementById('prResult'); if(box) box.innerHTML = '';
};

window.sendBooking = function(){
  alert('Richiesta inviata! Ti contatteremo per conferma.');
};
