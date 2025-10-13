const $ = (s,ctx=document)=>ctx.querySelector(s);
const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));
const euro = (n)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);

function updateYear(){ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }

const daysBetween=(a,b)=>{ const A=new Date(a), B=new Date(b); if(isNaN(A)||isNaN(B)||B<=A) return 0; return Math.ceil((B-A)/(1000*60*60*24)); }
const seasonMultiplier=(d)=>{ const m=(new Date(d)).getMonth(); if(m===6||m===7) return 1.2; if(m===5||m===8) return 1.1; return 1.0; };

const CATEGORY_PRICE={city:39, berlina:45, suv:59, scooter:25, moto:60};
const MODEL_PRICE={ "Fiat Panda":40, "Smart ForFour (automatico)":60, "Jeep Renegade":60, "SYM Symphony 125":30, "Honda X-ADV 750":80 };
const EXTRAS={ gps:5, seggiolino:4, second_driver:6 };

function ageFactor(age){
  if (age < 21) return 1.20;
  if (age < 23) return 1.10;
  if (age < 25) return 1.05;
  if (age <= 70) return 1.00;
  if (age <= 75) return 1.08;
  return 1.15;
}
function durationDiscount(days){
  if (days >= 14) return 0.15;
  if (days >= 7)  return 0.10;
  return 0;
}

function calcQuote(){
  const start=$("#start").value, end=$("#end").value;
  const days=daysBetween(start,end);
  if (days<=0) return {error:"Intervallo non valido: la riconsegna deve essere successiva al ritiro."};

  const category=$("#category").value;
  const model=$("#model").value;
  const age=parseInt($("#age").value,10);

  let daily = MODEL_PRICE[model] ?? CATEGORY_PRICE[category];
  daily *= seasonMultiplier(start);
  daily *= ageFactor(age);
  daily *= (1 - durationDiscount(days));

  const extrasDaily = $$(".extra:checked").reduce((s,x)=>s+(EXTRAS[x.dataset.key]||0),0);

  const imponibile = (daily + extrasDaily) * days;
  const iva = imponibile * 0.22;
  const totale = imponibile + iva;

  return {days,daily,extrasDaily,imponibile,iva,totale,
          mult:seasonMultiplier(start), disc:durationDiscount(days), age, category, model};
}

function renderQuote(q){
  const box=$("#quoteResult");
  box.style.display="block";
  if (q.error){ box.innerHTML=`<p class="warn">${q.error}</p>`; return; }

  const tag=(l,v)=>`<span class="pill">${l}: <strong>${v}</strong></span>`;
  const tags=[ tag("Stagionalità", `${(q.mult*100).toFixed(0)}%`),
               tag("Sconto durata", q.disc>0?`-${(q.disc*100).toFixed(0)}%`:"0%"),
               tag("Età", q.age) ].join(" ");

  const rows=[
    `<tr><td>Giorni di noleggio</td><td class="num">${q.days}</td></tr>`,
    `<tr><td>Tariffa giornaliera</td><td class="num">${euro(q.daily)}</td></tr>`,
    q.extrasDaily>0?`<tr><td>Extra (quota giornaliera)</td><td class="num">${euro(q.extrasDaily)}</td></tr>`:"",
    `<tr><td>Imponibile</td><td class="num">${euro(q.imponibile)}</td></tr>`,
    `<tr><td>IVA (22%)</td><td class="num">${euro(q.iva)}</td></tr>`,
    `<tr class="tot"><td>Totale</td><td class="num">${euro(q.totale)}</td></tr>`
  ].join("");

  box.innerHTML=`
    <h3>Riepilogo preventivo</h3>
    <div class="tags">${tags}</div>
    <table class="smart-table">${rows}</table>
    <p class="muted">Stima non vincolante. Tariffe soggette a disponibilità e verifica documenti.</p>`;
}

function bindQuote(){
  const f=$("#quoteForm"); if(!f) return;
  f.addEventListener("submit", e=>{ e.preventDefault(); renderQuote(calcQuote()); });
}

// Booking mock
function bindBooking(){
  const btnCheck=$("#btnCheck"), badge=$("#availBadge"), btnSend=$("#btnSend");
  if (btnCheck){
    btnCheck.addEventListener("click", ()=>{
      const start=$("#b_start").value, end=$("#b_end").value;
      if (daysBetween(start,end)<=0){ badge.textContent="Intervallo non valido"; badge.className="pill pill-warn"; badge.style.display="inline-block"; return; }
      badge.textContent="Disponibile"; badge.className="pill"; badge.style.display="inline-block";
    });
  }
  if (btnSend){ btnSend.addEventListener("click", ()=> alert("Richiesta inviata! Ti contatteremo a breve.")); }
}

document.addEventListener("DOMContentLoaded", ()=>{ updateYear(); bindQuote(); bindBooking(); });
