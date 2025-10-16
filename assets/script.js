<script>
(function(){
  // --- UI: toggle menu, anno, attivo nav
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const o = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(o));
    });
  }
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const pageKey = document.body?.getAttribute('data-page');
  if (pageKey) {
    document.querySelectorAll('nav.menu a').forEach(a => {
      if (a.dataset.active === pageKey) a.classList.add('active');
    });
  }
})();

// --- Util
function euro(n){ return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'}); }
function daysBetween(s,e){
  const ms = e - s;
  if (ms <= 0) return 0;
  const h = Math.ceil(ms / 36e5);
  return Math.max(1, Math.ceil(h/24));
}
function seasonMultiplier(d){
  const m = d.getMonth()+1;
  if (m===7 || m===8) return 1.2;
  if (m===6 || m===9) return 1.1;
  return 1.0;
}

// --- Prezzi
const modelPrices = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 60,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

// Prezzi per categoria (esempio: adatta alle tue categorie reali)
const categoryPrices = {
  auto_small: 40,
  auto_suv: 60,
  scooter_125: 30,
  moto_adv: 80
};

// Restituisce la tariffa base giornaliera
function basePriceFor(category, vehicle){
  if (vehicle && modelPrices[vehicle] != null) return modelPrices[vehicle];
  return categoryPrices[category] ?? 45; // fallback
}

// --- Calcolo preventivo completo
function calcQuote(data){
  const days = data.days;
  let daily = basePriceFor(data.category, data.vehicle) * seasonMultiplier(data.start);

  // sconti long-rental
  if (days >= 14) daily *= 0.85;
  else if (days >= 7) daily *= 0.9;

  let totale = daily * days;
  const items = [
    { voce: `Tariffa base (${days} g x ${euro(daily)})`, importo: daily * days }
  ];

  // extra giornalieri
  const extras = [
    ['Navigatore', data.gps ? 5 : 0],
    ['Seggiolino bimbo', data.seat ? 4 : 0],
    ['Guidatore aggiuntivo', data.add ? 6 : 0],
    ['Kasko totale', data.kasko ? 15 : 0]
  ];
  extras.forEach(([n, p]) => {
    if (p) {
      const add = p * days;
      items.push({ voce: `${n} (${days} g x ${euro(p)})`, importo: add });
      totale += add;
    }
  });

  // sovrapprezzo under 25 (giornaliero, come nel mini preventivo)
  if (data.age && data.age < 25) {
    const under = 12 * days;
    items.push({ voce: `Sovrapprezzo < 25 anni (${days} g x ${euro(12)})`, importo: under });
    totale += under;
  }

  // IVA 22% inclusa in totale
  const imponibile = totale / 1.22;
  const iva = totale - imponibile;
  return { days, daily, items, imponibile, iva, totale };
}

function renderQuote(r){
  const box = document.getElementById('quoteResult');
  if (!box) return;
  const rows = r.items.map(i=>`
    <tr><td>${i.voce}</td><td style="text-align:right">${euro(i.importo)}</td></tr>
  `).join('');
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

// --- Form preventivo completo (#q_* IDs)
function handlePreventivo(e){
  e.preventDefault();
  const f = e.target;

  const start = new Date(f.start.value || document.getElementById('q_start')?.value);
  const end   = new Date(f.end.value   || document.getElementById('q_end')?.value);

  if (isNaN(start) || isNaN(end) || end <= start){
    const qbox = document.getElementById('quoteResult');
    if (qbox) qbox.innerHTML = '<p class="muted">Controlla le date.</p>';
    return;
  }

  const data = {
    start,
    end,
    category: f.category?.value || document.getElementById('q_category')?.value || '',
    vehicle:  f.vehicle?.value  || '',
    age: Number(f.age?.value || document.getElementById('q_age')?.value || 0),
    gps:   document.getElementById('q_gps')?.checked || false,
    seat:  document.getElementById('q_seat')?.checked || false,
    add:   document.getElementById('q_add')?.checked || false,
    kasko: document.getElementById('q_kasko')?.checked || false,
    days:  daysBetween(start, end)
  };

  renderQuote(calcQuote(data));
}

// --- Mini preventivo (#m_* IDs)
function handleMiniQuote(e){
  e.preventDefault();
  const start = new Date(document.getElementById('m_start').value);
  const end   = new Date(document.getElementById('m_end').value);
  const cat   = document.getElementById('m_cat').value;
  const age   = Number(document.getElementById('m_age').value || 0);
  const out   = document.getElementById('miniOut');

  if (isNaN(start) || isNaN(end) || end <= start){
    if (out) out.textContent = 'Controlla le date.';
    return;
  }

  let days  = daysBetween(start, end);
  let daily = basePriceFor(cat);
  if (days >= 14)      daily *= 0.85;
  else if (days >= 7)  daily *= 0.9;

  let tot = daily * days;
  if (age && age < 25) tot += 12 * days;

  if (out) out.textContent = `Stima: ${euro(tot)} per ${days} giorno/i.`;
}

// --- Link condivisibile del preventivo (coerente con preload)
function copyQuoteLink(){
  const u = new URL(window.location.href);
  const set = (k,v)=>{ if(v!=null && v!=='') u.searchParams.set(k,v); else u.searchParams.delete(k); };

  const get = id => document.getElementById(id)?.value || '';

  set('start', get('q_start'));
  set('end',   get('q_end'));
  set('category', document.getElementById('q_category')?.value);
  set('age',      document.getElementById('q_age')?.value);

  ['q_gps','q_seat','q_add','q_kasko'].forEach(id=>{
    if (document.getElementById(id)?.checked) u.searchParams.set(id.replace('q_',''), '1');
    else u.searchParams.delete(id.replace('q_',''));
  });

  navigator.clipboard?.writeText(u.toString())
    .then(()=>alert('Link preventivo copiato!'));
}

// --- Precaricamento da URL
(function preloadFromURL(){
  const p = new URLSearchParams(window.location.search);

  // Veicolo e prezzo (facoltativi) per pagina dettaglio veicolo
  const vh    = p.get('vehicle');
  const price = p.get('price');
  const msg   = document.getElementById('vehicleChosen');
  if (msg && vh) msg.textContent = `Veicolo selezionato: ${vh} — ${euro(Number(price))}/giorno`;

  // Campi preventivo completo
  const qs = (id,val)=>{ const el = document.getElementById(id); if (el && val) el.value = val; };
  qs('q_start', p.get('start'));
  qs('q_end',   p.get('end'));
  qs('q_category', p.get('category'));
  qs('q_age', p.get('age'));

  const setCheck = (id, key)=>{ const el = document.getElementById(id); if (el) el.checked = p.get(key) === '1'; };
  setCheck('q_gps','gps');
  setCheck('q_seat','seat');
  setCheck('q_add','add');
  setCheck('q_kasko','kasko');
})();

// --- Prenotazione (pagina veicolo o form booking)
function handleBooking(e){
  e.preventDefault();
  const form = e.target;
  const start = new Date(form.start.value);
  const end   = new Date(form.end.value);
  const status = document.getElementById('formStatus');

  if (isNaN(start) || isNaN(end) || end <= start){
    if (status) status.textContent = 'Controlla le date.';
    return;
  }

  const hours = Math.ceil((end - start)/36e5);
  const days  = Math.max(1, Math.ceil(hours/24));

  const urlParams = new URLSearchParams(window.location.search);
  let daily = (()=>{
    const vh = urlParams.get('vehicle');
    if (vh && modelPrices[vh] != null) return modelPrices[vh];
    return basePriceFor(form.category.value);
  })();

  let totale = daily * days;
  if (document.getElementById('opt_gps')?.checked)   totale += 5  * days;
  if (document.getElementById('opt_seat')?.checked)  totale += 4  * days;
  if (document.getElementById('opt_add')?.checked)   totale += 6  * days;
  if (document.getElementById('opt_kasko')?.checked) totale += 15 * days;

  const age = Number(form.age.value || 0);
  if (age && age < 25) totale += 12 * days;

  if (status) status.textContent = `Disponibilità trovata! Stima: ${euro(totale)} per ${days} giorno/i. Sede: Ercolano (NA).`;

  form.reset();
}
</script>
