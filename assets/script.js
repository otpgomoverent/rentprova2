/* =========================================================
   Go Move Rent — script.js (versione consolidata)
   - Motore preventivo rinominato in computeQuote (no ricorsione)
   - Wrapper per Preventivo e Prenota
   - Render unico con outId opzionale
   - Funzioni utility: mini-quote, copy link, preload, reset, invio
   ========================================================= */

/* ====== UI base: menu, anno, attivo nav ====== */
(function(){
  const toggle = document.getElementById('menuToggle');
  const menu   = document.getElementById('menu');
  if (toggle) {
    toggle.addEventListener('click', ()=>{
      const o = menu?.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(!!o));
    });
  }
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // evidenzia voce nav se <a data-active="..."> corrisponde
  const pageKey = document.body.getAttribute('data-page');
  if (pageKey) {
    document.querySelectorAll('nav.menu a').forEach(a=>{
      if (a.dataset.active === pageKey) a.classList.add('active');
    });
  }
})();

/* ====== Utility economiche ====== */
function euro(n){ try { return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});} catch(e){ return String(n); } }
function daysBetween(s,e){
  const ms = e - s;
  if (ms <= 0) return 0;
  const h = Math.ceil(ms / 36e5);
  return Math.max(1, Math.ceil(h/24));
}
function seasonMultiplier(d){
  const m = (d instanceof Date ? d : new Date(d)).getMonth()+1;
  if (m===7 || m===8) return 1.20; // alta stagione
  if (m===6 || m===9) return 1.10; // media
  return 1.00;                      // bassa
}

// Prezzi di listino per modelli precisi (se passati da index → prenota)
const modelPrices = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 60,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

// Prezzi base per categoria (fallback)
function basePriceFor(category, vehicle){
  if (vehicle && modelPrices[vehicle] != null) return modelPrices[vehicle];
  const map = { city:29, berlina:45, suv:59, scooter:25, moto:60 };
  return map[category] || 0;
}

/* ====== MOTORE PREZZI (NO ricorsione) ====== */
function computeQuote(data){
  const days = Math.max(1, Number(data.days||0));
  let daily  = basePriceFor(data.category, data.vehicle) * seasonMultiplier(data.start);

  // sconti durata
  if (days >= 14)      daily *= 0.85;
  else if (days >= 7)  daily *= 0.90;

  let totale = daily * days;
  const items = [
    { voce: `Tariffa base (${days} g x ${euro(daily)})`, importo: daily * days }
  ];

  // extra per giorno
  const extras = [
    ['Navigatore',         data.gps   ?  5 : 0],
    ['Seggiolino bimbo',   data.seat  ?  4 : 0],
    ['Guidatore aggiuntivo',data.add   ?  7 : 0], // 7 come da HTML
    ['Kasko totale',       data.kasko ? 15 : 0]
  ];
  extras.forEach(([n, p])=>{
    if (p) {
      const add = p * days;
      items.push({ voce: `${n} (${days} g x ${euro(p)})`, importo: add });
      totale += add;
    }
  });

  // giovane conducente (<25) — se disponibile
  const ageNum = Number(data.age||0);
  if (ageNum && ageNum < 25){
    const addYoung = 12 * days;
    items.push({ voce: `Supplemento conducente giovane (${days} g x ${euro(12)})`, importo: addYoung });
    totale += addYoung;
  }

  const imponibile = totale / 1.22;
  const iva = totale - imponibile;

  return { days, daily, items, imponibile, iva, totale };
}

/* ====== RENDER PREVENTIVO (accetta outId opzionale) ====== */
function renderQuote(result, outId = 'quoteResult'){
  const box = document.getElementById(outId) || document.getElementById('quoteResult') || document.getElementById('pvResult');
  if (!box) return;

  const rows = (result.items || []).map(i =>
    `<tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>`
  ).join('');

  box.innerHTML = `
    <div class="card">
      <h3>Stima totale</h3>
      <table class="breakdown">
        <thead><tr><th>Voce</th><th>Importo</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><th>Imponibile</th><th style="text-align:right">${euro(result.imponibile)}</th></tr>
          <tr><th>IVA (22%)</th><th style="text-align:right">${euro(result.iva)}</th></tr>
          <tr><th style="font-size:18px">Totale</th><th style="text-align:right;font-size:18px">${euro(result.totale)}</th></tr>
        </tfoot>
      </table>
      <p class="muted" style="margin-top:8px">* Stima non vincolante.</p>
    </div>
  `;
}

/* ====== MINI-QUOTE (home) ====== */
function handleMiniQuote(e){
  e.preventDefault();
  const start = new Date(document.getElementById('m_start').value);
  const end   = new Date(document.getElementById('m_end').value);
  const cat   = document.getElementById('m_cat').value; // city/berlina/...
  const age   = Number(document.getElementById('m_age').value||0);
  const out   = document.getElementById('miniOut');

  if (isNaN(start) || isNaN(end) || end <= start){
    out.textContent = 'Controlla le date.';
    return;
  }

  const ds = daysBetween(start, end);
  let daily = basePriceFor(cat);
  if (ds >= 14)      daily *= 0.85;
  else if (ds >= 7)  daily *= 0.90;

  let tot = daily * ds;
  if (age && age < 25) tot += 12 * ds;

  out.textContent = `Stima: ${euro(tot)} per ${ds} giorno/i.`;
}
window.handleMiniQuote = handleMiniQuote;

/* ====== Copy link preventivo (preventivo.html) ====== */
function copyQuoteLink(){
  const u = new URL(window.location.href);

  const getCheckedVal = (name)=>{
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  };

  const pickup = document.getElementById('pv-pickup')?.value || '';
  const drop   = document.getElementById('pv-dropoff')?.value || '';
  const age    = document.getElementById('pv-age')?.value || '';
  const catLbl = getCheckedVal('pv-cat');

  // mappa label → slug usato dal motore
  const mapCat = (s)=>{
    s = String(s).toLowerCase();
    if (s.includes('berlina')) return 'berlina';
    if (s.includes('suv'))     return 'suv';
    if (s.includes('scooter')) return 'scooter';
    if (s.includes('moto'))    return 'moto';
    return 'city';
  };

  const gps   = !!document.querySelector('.pv-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pv-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pv-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pv-extra[data-key="kasko"]')?.checked;

  const set = (k,v)=>{ if(v) u.searchParams.set(k,v); else u.searchParams.delete(k); };
  set('start', pickup);
  set('end',   drop);
  set('cat',   mapCat(catLbl));
  set('age',   age);
  gps   ? u.searchParams.set('gps','1')   : u.searchParams.delete('gps');
  seat  ? u.searchParams.set('seat','1')  : u.searchParams.delete('seat');
  add   ? u.searchParams.set('add','1')   : u.searchParams.delete('add');
  kasko ? u.searchParams.set('kasko','1') : u.searchParams.delete('kasko');

  navigator.clipboard?.writeText(u.toString()).then(()=>alert('Link preventivo copiato!'));
}
window.copyQuoteLink = copyQuoteLink;

/* ====== Preload da URL (prenota.html: banner veicolo) ====== */
(function preloadFromURL(){
  const p   = new URLSearchParams(window.location.search);
  const vh  = p.get('vehicle');
  const prc = Number(p.get('price'));
  const cat = p.get('category'); // city/berlina/...

  const msg = document.getElementById('vehicleChosen');
  if (msg && vh) msg.textContent = `Veicolo selezionato: ${vh} — ${isNaN(prc)?'':euro(prc)}/giorno`;

  const sel = document.getElementById('pr-cat');
  if (sel && cat){
    // converti slug in label esatta
    const toLabel = (s)=>{
      switch(String(s).toLowerCase()){
        case 'city': return 'City Car';
        case 'berlina': return 'Berlina';
        case 'suv': return 'SUV';
        case 'scooter': return 'Scooter';
        case 'moto': return 'Moto';
        default: return '';
      }
    };
    const label = toLabel(cat);
    if (label){
      Array.from(sel.options).forEach(o=>{ if(o.textContent===label) sel.value = o.textContent; });
    }
  }
})();

/* ====== WRAPPER: Preventivo (pagina preventivo.html) ====== */
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

  if (!pickup || !drop){
    const box = document.getElementById(outId);
    if (box) box.innerHTML = '<p class="muted">Seleziona ritiro e riconsegna.</p>';
    return;
  }

  const mapCat = (s)=>{
    s = String(s).toLowerCase();
    if (s.includes('berlina')) return 'berlina';
    if (s.includes('suv'))     return 'suv';
    if (s.includes('scooter')) return 'scooter';
    if (s.includes('moto'))    return 'moto';
    return 'city';
  };

  const start = new Date(pickup);
  const end   = new Date(drop);

  const data = {
    start, end,
    category: mapCat(catLbl),
    vehicle: '',
    age: Number(document.getElementById('pv-age')?.value||0),
    gps, seat, add, kasko,
    days: daysBetween(start, end)
  };

  const result = computeQuote(data);
  renderQuote(result, outId);

  // Aggiorna mini-riepilogo a destra se presente
  const dEl = document.getElementById('pv-days');
  const bEl = document.getElementById('pv-base');
  const xEl = document.getElementById('pv-extras');
  const tEl = document.getElementById('pv-total');
  if (dEl) dEl.textContent = String(result.days);
  if (bEl) bEl.textContent = euro(result.items?.[0]?.importo || 0);
  if (xEl) {
    const extrasSum = (result.items || []).slice(1).reduce((a,c)=>a+(c.importo||0),0);
    xEl.textContent = euro(extrasSum);
  }
  if (tEl) tEl.textContent = euro(result.totale);
};

/* ====== WRAPPER: Prenota (pagina prenota.html) ====== */
window.checkAvailability = function(){
  const p    = document.getElementById('pr-pickup')?.value;
  const d    = document.getElementById('pr-dropoff')?.value;
  const catL = document.getElementById('pr-cat')?.value || 'City Car';

  const gps   = !!document.querySelector('.pr-extra[data-key="gps"]')?.checked;
  const seat  = !!document.querySelector('.pr-extra[data-key="seat"]')?.checked;
  const add   = !!document.querySelector('.pr-extra[data-key="add"]')?.checked;
  const kasko = !!document.querySelector('.pr-extra[data-key="kasko"]')?.checked;

  const outId = document.getElementById('quoteResult') ? 'quoteResult' : 'prResult';

  if (!p || !d){
    const box = document.getElementById(outId);
    if (box) box.innerHTML = '<p class="muted">Seleziona ritiro e riconsegna.</p>';
    return;
  }

  const mapCat = (s)=>{
    s = String(s).toLowerCase();
    if (s.includes('berlina')) return 'berlina';
    if (s.includes('suv'))     return 'suv';
    if (s.includes('scooter')) return 'scooter';
    if (s.includes('moto'))    return 'moto';
    return 'city';
  };

  const start = new Date(p);
  const end   = new Date(d);

  const data = {
    start, end,
    category: mapCat(catL),
    vehicle: '',
    age: Number(document.getElementById('pr-age')?.value||0),
    gps, seat, add, kasko,
    days: daysBetween(start, end)
  };

  const result = computeQuote(data);
  renderQuote(result, outId);

  // Aggiorna tabella disponibilità
  const rows = document.getElementById('pr-result-rows');
  if (rows){
    const daysCell  = rows.querySelector('#pr-days');
    const totalCell = rows.querySelector('#pr-total');
    if (daysCell)  daysCell.textContent  = String(result.days);
    if (totalCell) totalCell.textContent = euro(result.totale);
    const statusCell = rows.querySelector('tr:first-child td:last-child');
    if (statusCell) statusCell.innerHTML = '<span class="badge badge-ok">Disponibile</span>';
  }
};

/* ====== RESET Prenota ====== */
window.resetPrenota = function(){
  // svuota campi principali
  ['pr-pickup','pr-dropoff','pr-pickup-place','pr-drop-place','pr-name','pr-mail','pr-phone'].forEach(id=>{
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // deseleziona extra
  document.querySelectorAll('.pr-extra').forEach(ch=>{ ch.checked = false; });

  // pulisci risultati
  const q = document.getElementById('quoteResult'); if (q) q.innerHTML = '';
  const rows = document.getElementById('pr-result-rows');
  if (rows){
    rows.querySelector('#pr-days')?.replaceChildren(document.createTextNode('—'));
    rows.querySelector('#pr-total')?.replaceChildren(document.createTextNode('—'));
    const statusCell = rows.querySelector('tr:first-child td:last-child');
    if (statusCell) statusCell.innerHTML = '<span class="badge badge-warn">In attesa</span>';
  }
};

/* ====== INVIO Prenotazione (placeholder) ====== */
window.sendBooking = function(){
  // Raccogli dati essenziali (semplificato — qui faresti la submit reale)
  const payload = {
    pickupPlace: document.getElementById('pr-pickup-place')?.value || 'Ercolano (NA)',
    dropPlace:   document.getElementById('pr-drop-place')?.value || 'Ercolano (NA)',
    pickup:      document.getElementById('pr-pickup')?.value || '',
    dropoff:     document.getElementById('pr-dropoff')?.value || '',
    category:    document.getElementById('pr-cat')?.value || 'City Car',
    age:         document.getElementById('pr-age')?.value || '',
    name:        document.getElementById('pr-name')?.value || '',
    mail:        document.getElementById('pr-mail')?.value || '',
    phone:       document.getElementById('pr-phone')?.value || '',
    extras: {
      gps:   !!document.querySelector('.pr-extra[data-key="gps"]')?.checked,
      seat:  !!document.querySelector('.pr-extra[data-key="seat"]')?.checked,
      add:   !!document.querySelector('.pr-extra[data-key="add"]')?.checked,
      kasko: !!document.querySelector('.pr-extra[data-key="kasko"]')?.checked
    }
  };

  // Validazione minima
  if (!payload.pickup || !payload.dropoff){
    alert('Inserisci data/ora di ritiro e riconsegna.');
    return;
  }
  if (!payload.name || !payload.phone){
    alert('Inserisci Nome e Telefono per essere ricontattato.');
    return;
  }

  // Qui potresti fare una fetch() verso il tuo endpoint backend/email.
  console.log('Prenotazione inviata:', payload);
  alert('Grazie! La tua richiesta di prenotazione è stata inviata.\nTi ricontatteremo a breve.');
};
