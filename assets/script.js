(function(){
  // --- UI: toggle menu, anno, attivo nav
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var o = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(o));
    });
  }
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var bodyEl = document.body;
  var pageKey = bodyEl ? bodyEl.getAttribute('data-page') : null;
  if (pageKey) {
    var links = document.querySelectorAll('nav.menu a');
    for (var i=0;i<links.length;i++){
      var a = links[i];
      if (a.dataset && a.dataset.active === pageKey) a.classList.add('active');
    }
  }
})();

// --- Util
function euro(n){ return (n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'}); }
function daysBetween(s,e){
  var ms = e - s;
  if (ms <= 0) return 0;
  var h = Math.ceil(ms / 36e5);
  return Math.max(1, Math.ceil(h/24));
}
function seasonMultiplier(d){
  var m = d.getMonth()+1;
  if (m===7 || m===8) return 1.2;
  if (m===6 || m===9) return 1.1;
  return 1.0;
}

// --- Prezzi
var modelPrices = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 60,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

// Prezzi per categoria (adatta alle tue categorie reali)
var categoryPrices = {
  auto_small: 40,
  auto_suv: 60,
  scooter_125: 30,
  moto_adv: 80
};

// Restituisce la tariffa base giornaliera
function basePriceFor(category, vehicle){
  if (vehicle && modelPrices[vehicle] != null) return modelPrices[vehicle];
  return (categoryPrices.hasOwnProperty(category) ? categoryPrices[category] : 45);
}

// --- Calcolo preventivo completo
function calcQuote(data){
  var days = data.days;
  var daily = basePriceFor(data.category, data.vehicle) * seasonMultiplier(data.start);

  // sconti long-rental
  if (days >= 14) daily *= 0.85;
  else if (days >= 7) daily *= 0.9;

  var totale = daily * days;
  var items = [
    { voce: 'Tariffa base ('+days+' g x '+euro(daily)+')', importo: daily * days }
  ];

  // extra giornalieri
  var extras = [
    ['Navigatore', data.gps ? 5 : 0],
    ['Seggiolino bimbo', data.seat ? 4 : 0],
    ['Guidatore aggiuntivo', data.add ? 6 : 0],
    ['Kasko totale', data.kasko ? 15 : 0]
  ];
  for (var i=0;i<extras.length;i++){
    var n = extras[i][0], p = extras[i][1];
    if (p) {
      var add = p * days;
      items.push({ voce: n+' ('+days+' g x '+euro(p)+')', importo: add });
      totale += add;
    }
  }

  // sovrapprezzo under 25 (giornaliero)
  if (data.age && data.age < 25) {
    var under = 12 * days;
    items.push({ voce: 'Sovrapprezzo < 25 anni ('+days+' g x '+euro(12)+')', importo: under });
    totale += under;
  }

  var imponibile = totale / 1.22;
  var iva = totale - imponibile;
  return { days:days, daily:daily, items:items, imponibile:imponibile, iva:iva, totale:totale };
}

function renderQuote(r){
  var box = document.getElementById('quoteResult');
  if (!box) return;
  var rows = '';
  for (var i=0;i<r.items.length;i++){
    var it = r.items[i];
    rows += '<tr><td>'+it.voce+'</td><td style="text-align:right">'+euro(it.importo)+'</td></tr>';
  }
  box.innerHTML =
    '<div class="card">'+
      '<h3>Stima totale</h3>'+
      '<table class="breakdown">'+
        '<thead><tr><th>Voce</th><th>Importo</th></tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
        '<tfoot>'+
          '<tr><th>Imponibile</th><th style="text-align:right">'+euro(r.imponibile)+'</th></tr>'+
          '<tr><th>IVA (22%)</th><th style="text-align:right">'+euro(r.iva)+'</th></tr>'+
          '<tr><th style="font-size:18px">Totale</th><th style="text-align:right;font-size:18px">'+euro(r.totale)+'</th></tr>'+
        '</tfoot>'+
      '</table>'+
      '<p class="muted" style="margin-top:8px">*Stima non vincolante.</p>'+
    '</div>';
}

// --- Form preventivo completo (#q_* IDs)
function handlePreventivo(e){
  e.preventDefault();
  var f = e.target;

  var qs = document.getElementById('q_start');
  var qe = document.getElementById('q_end');

  var start = new Date(f.start && f.start.value ? f.start.value : (qs ? qs.value : ''));
  var end   = new Date(f.end && f.end.value ? f.end.value : (qe ? qe.value : ''));

  if (isNaN(start) || isNaN(end) || end <= start){
    var qbox = document.getElementById('quoteResult');
    if (qbox) qbox.innerHTML = '<p class="muted">Controlla le date.</p>';
    return;
  }

  var categoryEl = (f.category && f.category.value) ? f.category : document.getElementById('q_category');
  var ageEl = (f.age && f.age.value) ? f.age : document.getElementById('q_age');

  var data = {
    start: start,
    end: end,
    category: categoryEl ? categoryEl.value : '',
    vehicle:  (f.vehicle && f.vehicle.value) ? f.vehicle.value : '',
    age: Number(ageEl && ageEl.value ? ageEl.value : 0),
    gps:   !!(document.getElementById('q_gps') && document.getElementById('q_gps').checked),
    seat:  !!(document.getElementById('q_seat') && document.getElementById('q_seat').checked),
    add:   !!(document.getElementById('q_add') && document.getElementById('q_add').checked),
    kasko: !!(document.getElementById('q_kasko') && document.getElementById('q_kasko').checked),
    days:  daysBetween(start, end)
  };

  renderQuote(calcQuote(data));
}

// --- Mini preventivo (#m_* IDs)
function handleMiniQuote(e){
  e.preventDefault();
  var start = new Date(document.getElementById('m_start').value);
  var end   = new Date(document.getElementById('m_end').value);
  var cat   = document.getElementById('m_cat').value;
  var age   = Number(document.getElementById('m_age').value || 0);
  var out   = document.getElementById('miniOut');

  if (isNaN(start) || isNaN(end) || end <= start){
    if (out) out.textContent = 'Controlla le date.';
    return;
  }

  var days  = daysBetween(start, end);
  var daily = basePriceFor(cat);
  if (days >= 14)      daily *= 0.85;
  else if (days >= 7)  daily *= 0.9;

  var tot = daily * days;
  if (age && age < 25) tot += 12 * days;

  if (out) out.textContent = 'Stima: ' + euro(tot) + ' per ' + days + ' giorno/i.';
}

// --- Link condivisibile del preventivo (coerente con preload)
function copyQuoteLink(){
  var u = new URL(window.location.href);
  function set(k,v){ if(v!=null && v!=='') u.searchParams.set(k,v); else u.searchParams.delete(k); }
  function get(id){ var el=document.getElementById(id); return el?el.value:''; }

  set('start', get('q_start'));
  set('end',   get('q_end'));
  var qcat = document.getElementById('q_category');
  var qage = document.getElementById('q_age');
  set('category', qcat ? qcat.value : '');
  set('age',      qage ? qage.value : '');

  var ids = ['q_gps','q_seat','q_add','q_kasko'];
  for (var i=0;i<ids.length;i++){
    var el = document.getElementById(ids[i]);
    var key = ids[i].replace('q_','');
    if (el && el.checked) u.searchParams.set(key,'1'); else u.searchParams.delete(key);
  }

  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(u.toString()).then(function(){ alert('Link preventivo copiato!'); });
  } else {
    // fallback
    window.prompt('Copia il link:', u.toString());
  }
}

// --- Precaricamento da URL
(function preloadFromURL(){
  var p = new URLSearchParams(window.location.search);

  // Veicolo e prezzo (facoltativi) per pagina dettaglio veicolo
  var vh    = p.get('vehicle');
  var price = p.get('price');
  var msg   = document.getElementById('vehicleChosen');
  if (msg && vh) msg.textContent = 'Veicolo selezionato: ' + vh + ' — ' + euro(Number(price)) + '/giorno';

  // Campi preventivo completo
  function qs(id,val){
    var el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  qs('q_start', p.get('start'));
  qs('q_end',   p.get('end'));
  qs('q_category', p.get('category'));
  qs('q_age', p.get('age'));

  function setCheck(id, key){
    var el = document.getElementById(id);
    if (el) el.checked = (p.get(key) === '1');
  }
  setCheck('q_gps','gps');
  setCheck('q_seat','seat');
  setCheck('q_add','add');
  setCheck('q_kasko','kasko');
})();

// --- Prenotazione (pagina veicolo o form booking)
function handleBooking(e){
  e.preventDefault();
  var form = e.target;
  var start = new Date(form.start.value);
  var end   = new Date(form.end.value);
  var status = document.getElementById('formStatus');

  if (isNaN(start) || isNaN(end) || end <= start){
    if (status) status.textContent = 'Controlla le date.';
    return;
  }

  var hours = Math.ceil((end - start)/36e5);
  var days  = Math.max(1, Math.ceil(hours/24));

  var urlParams = new URLSearchParams(window.location.search);
  var daily = (function(){
    var vh = urlParams.get('vehicle');
    if (vh && modelPrices[vh] != null) return modelPrices[vh];
    return basePriceFor(form.category.value);
  })();

  var totale = daily * days;
  if (document.getElementById('opt_gps') && document.getElementById('opt_gps').checked)   totale += 5  * days;
  if (document.getElementById('opt_seat') && document.getElementById('opt_seat').checked) totale += 4  * days;
  if (document.getElementById('opt_add') && document.getElementById('opt_add').checked)   totale += 6  * days;
  if (document.getElementById('opt_kasko') && document.getElementById('opt_kasko').checked) totale += 15 * days;

  var age = Number(form.age.value || 0);
  if (age && age < 25) totale += 12 * days;

  if (status) status.textContent = 'Disponibilità trovata! Stima: ' + euro(totale) + ' per ' + days + ' giorno/i. Sede: Ercolano (NA).';

  form.reset();
}
