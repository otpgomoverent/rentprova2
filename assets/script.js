// Utils
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const euro = (n) => (new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(n));

const daysBetween = (a,b) => {
  const start = new Date(a);
  const end = new Date(b);
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  const ms = end - start;
  const days = Math.ceil(ms / (1000*60*60*24));
  return days;
};

const seasonMultiplier = (d) => {
  const m = d.getMonth(); // 0-11
  if (m === 6 || m === 7) return 1.2;         // Luglio, Agosto
  if (m === 5 || m === 8) return 1.1;         // Giugno, Settembre
  return 1.0;
};

// Prezzi base per categoria (€/giorno)
const CATEGORY_PRICE = {
  city: 39,
  berlina: 45,
  suv: 59,
  scooter: 25,
  moto: 60
};

// Prezzi specifici modello (se presente, ha priorità)
const MODEL_PRICE = {
  "Fiat Panda": 40,
  "Smart ForFour (automatico)": 60,
  "Jeep Renegade": 60,
  "SYM Symphony 125": 30,
  "Honda X-ADV 750": 80
};

// Extra giornalieri (€/giorno)
const EXTRAS = {
  gps: 5,
  seggiolino: 4,
  second_driver: 6
};

// Sovrapprezzo/discount per età (percentuale)
function ageFactor(age){
  if (age < 21) return 1.20;       // +20% under 21
  if (age < 23) return 1.10;       // +10% 21-22
  if (age < 25) return 1.05;       // +5% 23-24
  if (age <= 70) return 1.00;      // standard
  if (age <= 75) return 1.08;      // +8% 71-75
  return 1.15;                     // +15% >75
}

// Sconti per durata (applicati sulla tariffa giornaliera finale)
function durationDiscount(days){
  if (days >= 14) return 0.15;
  if (days >= 7)  return 0.10;
  return 0;
}

function activePageHighlight(){
  const page = document.body.dataset.page;
  $$(".nav a").forEach(a => {
    const href = a.getAttribute("href") || "";
    if (href.includes(page)) a.classList.add("active");
  });
}

function updateYear(){
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}

function calcQuote(form){
  const start = $("#start").value;
  const end   = $("#end").value;
  const days  = daysBetween(start, end);
  if (days <= 0){
    return {error:"Intervallo non valido: la riconsegna deve essere successiva al ritiro."};
  }

  const category = $("#category").value;
  const model    = $("#model").value;
  const age      = parseInt($("#age").value, 10);

  // Prezzo base
  let daily = MODEL_PRICE[model] ?? CATEGORY_PRICE[category];

  // Stagionalità (moltiplicatore sul giornaliero)
  const mult = seasonMultiplier(new Date(start));
  daily *= mult;

  // Fattore età
  daily *= ageFactor(age);

  // Sconti per durata
  const disc = durationDiscount(days);
  daily = daily * (1 - disc);

  // Extra giornalieri
  const selectedExtras = $$(".extra:checked").map(x => x.dataset.key);
  const extrasDaily = selectedExtras.reduce((sum, k) => sum + (EXTRAS[k] || 0), 0);

  const imponibile = (daily + extrasDaily) * days;
  const iva = imponibile * 0.22;
  const totale = imponibile + iva;

  return {
    days, daily, extrasDaily, imponibile, iva, totale,
    mult, disc, age, category, model, selectedExtras
  };
}

function renderQuote(q){
  const box = $("#quoteResult");
  if (q.error){
    box.style.display = "block";
    box.innerHTML = `<p class="warn">${q.error}</p>`;
    return;
  }

  const rows = [];
  rows.push(`<tr><td>Giorni di noleggio</td><td class="num">${q.days}</td></tr>`);
  rows.push(`<tr><td>Tariffa giornaliera</td><td class="num">${euro(q.daily)}</td></tr>`);
  if (q.extrasDaily > 0){
    rows.push(`<tr><td>Extra (quota giornaliera)</td><td class="num">${euro(q.extrasDaily)}</td></tr>`);
  }
  rows.push(`<tr><td>Imponibile</td><td class="num">${euro(q.imponibile)}</td></tr>`);
  rows.push(`<tr><td>IVA (22%)</td><td class="num">${euro(q.iva)}</td></tr>`);
  rows.push(`<tr class="tot"><td>Totale</td><td class="num">${euro(q.totale)}</td></tr>`);

  const tag = (label,val) => `<span class="badge">${label}: <strong>${val}</strong></span>`;
  const tags = [
    tag("Stagionalità", `${(q.mult*100).toFixed(0)}%`),
    tag("Sconto durata", q.disc>0 ? `-${(q.disc*100).toFixed(0)}%` : "0%"),
    tag("Età", q.age)
  ].join(" ");

  box.style.display = "block";
  box.innerHTML = `
    <h3>Riepilogo preventivo</h3>
    <div class="tags">${tags}</div>
    <table class="smart-table">${rows.join("")}</table>
    <p class="muted">Stima non vincolante. Tariffe soggette a disponibilità e verifica documenti.</p>
  `;
}

function bindQuoteForm(){
  const f = $("#quoteForm");
  if (!f) return;
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = calcQuote(f);
    renderQuote(q);
  });
}

// Prenota (mock)
function bindBooking(){
  const btnCheck = $("#btnCheck");
  const badge = $("#availBadge");
  const btnSend = $("#btnSend");

  if (btnCheck){
    btnCheck.addEventListener("click", () => {
      const start = $("#b_start").value;
      const end   = $("#b_end").value;
      if (daysBetween(start,end) <= 0){
        badge.textContent = "Intervallo non valido";
        badge.className = "badge badge-warn";
        badge.style.display = "inline-block";
        return;
      }
      // Mock: disponibile
      badge.textContent = "Disponibile";
      badge.className = "badge badge-ok";
      badge.style.display = "inline-block";
    });
  }

  if (btnSend){
    btnSend.addEventListener("click", () => {
      alert("Richiesta inviata! Ti contatteremo a breve.");
    });
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  activePageHighlight();
  updateYear();
  bindQuoteForm();
  bindBooking();
});
