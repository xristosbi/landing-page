(function(){
  'use strict';

  /* ============================================================
     CONFIG — άλλαξε αυτά τα δύο πριν το deploy (δες README.md)
     ============================================================ */
  var CALENDLY_URL = 'https://calendly.com/xristosbithizis/30min';
  // Το Formspree endpoint ορίζεται στο action της φόρμας μέσα στο index.html.

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function(item){
    item.querySelector('.faq-q').addEventListener('click', function(){
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
      if(!wasOpen) item.classList.add('open');
    });
  });

  /* ---------- Calculator tabs (shared by all 3 panels) ---------- */
  var calcTabs = document.querySelectorAll('.calc-tab');
  calcTabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      calcTabs.forEach(function(t){
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.calc-panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });

  /* ---------- Υπολογιστής Διαφευγόντων Κερδών ---------- */
  (function calculatorTool(){
    var toolRoot = document.querySelector('.calc-tool');
    if(!toolRoot) return;

    var fieldDefs = {
      'now.yearlyRevenue':   { min:10000, max:10000000, step:10000, format:'eur' },
      'now.roas':            { min:0,     max:20,       step:0.1,   format:'x1' },
      'now.adSpend':         { min:0,     max:20000,    step:50,    format:'eur' },
      'now.agencyFee':       { min:0,     max:10000,    step:50,    format:'eur' },
      'now.hourlyValue':     { min:10,    max:1000,     step:5,     format:'eurHour' },
      'now.hoursPerMonth':   { min:0,     max:160,      step:1,     format:'hours' },

      'ideal.targetAOV':       { min:10, max:5000,  step:10,  format:'eur' },
      'ideal.targetCustomers': { min:0,  max:10000, step:1,   format:'int' },
      'ideal.ltv':              { min:1,  max:50,    step:1,   format:'x0' },
      'ideal.profitMargin':    { min:0,  max:100,   step:1,   format:'pct' },
      'ideal.adSpend':          { min:0,  max:20000, step:50,  format:'eur' },
      'ideal.agencyFee':        { min:0,  max:10000, step:50,  format:'eur' },
      'ideal.setupFee':         { min:0,  max:10000, step:100, format:'eur' },
      'ideal.hourlyValue':      { min:10, max:1000,  step:5,   format:'eurHour' },
      'ideal.hoursPerMonth':    { min:0,  max:160,   step:1,   format:'hours' }
    };

    var fieldLabels = {
      'now.yearlyRevenue': 'Συνολικός Ετήσιος Τζίρος (€)',
      'now.roas': 'Τρέχον ROAS Διαφημίσεων',
      'now.adSpend': 'Μηνιαίο Ad Spend (Budget)',
      'now.agencyFee': 'Μηνιαία Αμοιβή Agency/Freelancer',
      'now.hourlyValue': 'Αξία της ώρας σου (€/ώρα)',
      'now.hoursPerMonth': 'Ώρες/μήνα που τρώει το Marketing',
      'ideal.targetAOV': 'Στόχος AOV (Μέση Αξία)',
      'ideal.targetCustomers': 'Στόχος Παραπάνω Πελατών',
      'ideal.ltv': 'LTV (Επαναλαμβανόμενες Αγορές)',
      'ideal.profitMargin': 'Ποσοστό Κέρδους (%)',
      'ideal.adSpend': 'Μηνιαίο Ad Spend (Budget)',
      'ideal.agencyFee': 'Μηνιαία Αμοιβή Agency/Freelancer',
      'ideal.setupFee': 'Εφάπαξ Χρέωση Εγκατάστασης (Setup Fee)',
      'ideal.hourlyValue': 'Αξία της ώρας σου (€/ώρα)',
      'ideal.hoursPerMonth': 'Ώρες/μήνα που τρώει το Marketing'
    };

    var state = {
      now:   { yearlyRevenue:10000, roas:4.5, adSpend:0, agencyFee:0, hourlyValue:10, hoursPerMonth:0 },
      ideal: { targetAOV:10, targetCustomers:0, ltv:1, profitMargin:0, adSpend:0, agencyFee:0, setupFee:0, hourlyValue:10, hoursPerMonth:0 }
    };
    var activeField = { now:'yearlyRevenue', ideal:'targetAOV' };
    var freshEntry = { now:true, ideal:true };
    var activeScenario = null;

    /* ---- formatting (Greek style: "." thousands, "," decimals; negatives as "−€X") ---- */
    function fmtEUR(n){
      var sign = n < 0 ? '−' : '';
      return sign + '€' + Math.round(Math.abs(n)).toLocaleString('el-GR');
    }
    function fmtX1(n){ return n.toLocaleString('el-GR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + 'x'; }
    function fmtX0(n){ return Math.round(n).toLocaleString('el-GR') + 'x'; }
    function fmtInt(n){ return Math.round(n).toLocaleString('el-GR'); }
    function fmtPct(n){ return Math.round(n) + '%'; }
    function fmtHours(n){ var r = Math.round(n); return r.toLocaleString('el-GR') + (r === 1 ? ' ώρα' : ' ώρες'); }
    function fmtEurHour(n){ return fmtEUR(n) + '/ώρα'; }
    var formatters = { eur:fmtEUR, x1:fmtX1, x0:fmtX0, int:fmtInt, pct:fmtPct, hours:fmtHours, eurHour:fmtEurHour };
    function formatValue(key, val){ return formatters[fieldDefs[key].format](val); }

    /* Odometer count-up: rAF + ease-out cubic, ~400ms — ένα state ανά στοιχείο */
    function renderAnimated(el, target, format){
      if(!el) return;
      if(el._displayed === undefined || reducedMotion){
        el._displayed = target;
        el.textContent = format(target);
        return;
      }
      if(el._raf) cancelAnimationFrame(el._raf);
      var from = el._displayed;
      var start = performance.now();
      var DUR = 400;
      function frame(now){
        var p = Math.min((now - start) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(from + (target - from) * eased);
        if(p < 1){ el._raf = requestAnimationFrame(frame); } else { el._raf = null; }
      }
      el._displayed = target;
      el._raf = requestAnimationFrame(frame);
    }

    function updateFill(slider){
      var min = parseFloat(slider.min), max = parseFloat(slider.max);
      var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
      slider.style.setProperty('--fill', pct + '%');
    }

    function setText(sel, text){
      var el = document.querySelector(sel);
      if(el) el.textContent = text;
    }

    function syncField(tab, field){
      var key = tab + '.' + field;
      var val = state[tab][field];
      var slider = document.querySelector('[data-slider="' + key + '"]');
      var badge = document.querySelector('[data-badge="' + key + '"]');
      if(slider){ slider.value = val; updateFill(slider); }
      if(badge){ badge.textContent = formatValue(key, val); }
      if(activeField[tab] === field){
        var label = document.querySelector('[data-keypad-label="' + tab + '"]');
        if(label) label.textContent = fieldLabels[key];
      }
    }

    function setActiveField(tab, field, fresh){
      activeField[tab] = field;
      freshEntry[tab] = fresh !== false;
      document.querySelectorAll('.calc-field[data-tab="' + tab + '"]').forEach(function(c){
        c.classList.toggle('active', c.dataset.field === field);
      });
      var label = document.querySelector('[data-keypad-label="' + tab + '"]');
      if(label) label.textContent = fieldLabels[tab + '.' + field];
    }

    function setVal(tab, field, val, skipMinClamp){
      var def = fieldDefs[tab + '.' + field];
      /* Το keypad χτίζει αριθμό ψηφίο-ψηφίο (π.χ. "5" → "50"), οπότε τα
         ενδιάμεσα βήματα μπορεί προσωρινά να είναι κάτω από το min του
         πεδίου· skipMinClamp αφήνει το keypad να «γράψει» ελεύθερα, ενώ
         ο τελικός αριθμός παραμένει φραγμένος πάνω (max) πάντα. */
      var lo = skipMinClamp ? -Infinity : def.min;
      val = Math.min(def.max, Math.max(lo, val));
      state[tab][field] = val;
      if(tab === 'ideal' && activeScenario){
        activeScenario = null;
        document.querySelectorAll('.scenario-btn').forEach(function(b){ b.classList.remove('active'); });
      }
      syncField(tab, field);
      recalcAll();
    }

    /* ---- derived values ---- */
    function calcNow(){
      var s = state.now;
      var monthlyAdRevenue = s.adSpend > 0 ? s.adSpend * s.roas : s.yearlyRevenue / 12;
      var monthlyTimeCost = s.hourlyValue * s.hoursPerMonth;
      var totalInvestment = s.adSpend + s.agencyFee + monthlyTimeCost;
      var netProfit = monthlyAdRevenue - totalInvestment;
      var combinedRoas = totalInvestment > 0 ? monthlyAdRevenue / totalInvestment : 0;
      var zone = s.roas < 1 ? 'low' : (s.roas <= 3 ? 'mid' : 'high');
      return { roas:s.roas, zone:zone, monthlyAdRevenue:monthlyAdRevenue, monthlyTimeCost:monthlyTimeCost, totalInvestment:totalInvestment, netProfit:netProfit, combinedRoas:combinedRoas };
    }

    function calcIdeal(){
      var s = state.ideal;
      var ltvPerCustomer = s.targetAOV * s.ltv;
      var monthlyRevenueLtv = s.targetAOV * s.targetCustomers * s.ltv;
      var monthlyTimeCost = s.hourlyValue * s.hoursPerMonth;
      var marketingInvestment = s.adSpend + s.agencyFee;
      var totalInvestment = marketingInvestment + monthlyTimeCost;
      var adRoasLtv = marketingInvestment > 0 ? monthlyRevenueLtv / marketingInvestment : 0;
      var combinedRoas = totalInvestment > 0 ? monthlyRevenueLtv / totalInvestment : 0;
      var netProfit = monthlyRevenueLtv - totalInvestment;
      var breakEvenCustomers = ltvPerCustomer > 0 ? Math.ceil(totalInvestment / ltvPerCustomer) : 0;
      return { ltvPerCustomer:ltvPerCustomer, monthlyRevenueLtv:monthlyRevenueLtv, monthlyTimeCost:monthlyTimeCost, totalInvestment:totalInvestment, adRoasLtv:adRoasLtv, combinedRoas:combinedRoas, netProfit:netProfit, breakEvenCustomers:breakEvenCustomers, totalLtvValue:monthlyRevenueLtv, ltv:s.ltv };
    }

    function renderNow(c){
      setText('[data-stat="now.adRoas"]', fmtX1(c.roas));
      var statusText = c.zone === 'low' ? 'Ζώνη Χαμηλής Απόδοσης' : (c.zone === 'high' ? 'Ζώνη Υψηλής Κερδοφορίας 🔥' : 'Ζώνη Νεκρού Σημείου');
      var statusEl = document.querySelector('[data-stat="now.roasStatus"]');
      if(statusEl){ statusEl.textContent = statusText; statusEl.className = 'stat-status zone-' + c.zone; }
      setText('[data-stat="now.monthlyAdRevenue"]', fmtEUR(c.monthlyAdRevenue));
      setText('[data-stat="now.monthlyTimeCost"]', fmtEUR(c.monthlyTimeCost));
      setText('[data-stat="now.combinedRoas"]', fmtX1(c.combinedRoas));
      setText('[data-summary="now.totalInvestment"]', fmtEUR(c.totalInvestment));
      var netEl = document.querySelector('[data-summary="now.netProfit"]');
      if(netEl){ netEl.textContent = fmtEUR(c.netProfit); netEl.className = 'summary-value ' + (c.netProfit >= 0 ? 'teal' : 'coral'); }
    }

    function renderIdeal(c){
      setText('[data-preview="ideal.ltvPerCustomer"]', fmtEUR(c.ltvPerCustomer));
      setText('[data-stat="ideal.adRoasLtv"]', fmtX1(c.adRoasLtv));
      setText('[data-stat="ideal.monthlyRevenueLtv"]', fmtEUR(c.monthlyRevenueLtv));
      setText('[data-stat="ideal.monthlyTimeCost"]', fmtEUR(c.monthlyTimeCost));
      setText('[data-stat="ideal.combinedRoas"]', fmtX1(c.combinedRoas));
      setText('[data-summary="ideal.breakEvenCustomers"]', fmtInt(c.breakEvenCustomers));
      setText('[data-summary-label="breakEvenCustomers"]', 'Πελάτες για Break-Even (με LTV ' + fmtX0(c.ltv) + ')');
      setText('[data-summary="ideal.totalLtvValue"]', fmtEUR(c.totalLtvValue));
    }

    function renderCompare(cNow, cIdeal){
      var presentYearly = state.now.yearlyRevenue;
      var idealYearly = presentYearly + (cIdeal.monthlyRevenueLtv * 12);
      var gap = idealYearly - presentYearly;

      setText('[data-compare="presentYearly"]', fmtEUR(presentYearly));
      setText('[data-compare="presentMonthly"]', '/μήνα: ' + fmtEUR(presentYearly / 12));
      setText('[data-compare="idealYearly"]', fmtEUR(idealYearly));
      setText('[data-compare="idealMonthly"]', '/μήνα: ' + fmtEUR(idealYearly / 12));
      renderAnimated(document.getElementById('gapOutput'), gap, fmtEUR);

      setText('[data-arrow="roas"]', fmtX1(cNow.roas) + ' ➔ ' + fmtX1(cIdeal.adRoasLtv));
      setText('[data-arrow="monthlyRevenue"]', fmtEUR(cNow.monthlyAdRevenue) + ' ➔ ' + fmtEUR(cIdeal.monthlyRevenueLtv));
      setText('[data-arrow="monthlyInvestment"]', fmtEUR(cNow.totalInvestment) + ' ➔ ' + fmtEUR(cIdeal.totalInvestment));
      setText('[data-arrow="netProfit"]', fmtEUR(cNow.netProfit) + ' ➔ ' + fmtEUR(cIdeal.netProfit));

      var netGapMonthly = cIdeal.netProfit - cNow.netProfit;
      setText('[data-summary="netGapMonthly"]', fmtEUR(netGapMonthly));
      setText('[data-summary="netGapYearly"]', fmtEUR(netGapMonthly * 12));
    }

    function recalcAll(){
      var cNow = calcNow();
      var cIdeal = calcIdeal();
      renderNow(cNow);
      renderIdeal(cIdeal);
      renderCompare(cNow, cIdeal);
    }

    /* ---- sliders ---- */
    Object.keys(fieldDefs).forEach(function(key){
      var slider = document.querySelector('[data-slider="' + key + '"]');
      if(!slider) return;
      var parts = key.split('.'), tab = parts[0], field = parts[1];
      slider.addEventListener('input', function(){
        setActiveField(tab, field, true);
        setVal(tab, field, parseFloat(slider.value));
      });
      slider.addEventListener('pointerdown', function(){ slider.classList.add('dragging'); });
      ['pointerup','pointercancel','blur'].forEach(function(ev){
        slider.addEventListener(ev, function(){ slider.classList.remove('dragging'); });
      });
    });

    /* ---- clickable field-cards → set keypad target ---- */
    document.querySelectorAll('.calc-field[data-tab]').forEach(function(card){
      var tab = card.dataset.tab, field = card.dataset.field;
      card.addEventListener('click', function(){ setActiveField(tab, field, true); });
      card.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); setActiveField(tab, field, true); }
      });
    });

    /* ---- keypad: πρώτο ψηφίο μετά την επιλογή αντικαθιστά, τα επόμενα προσθέτουν ---- */
    document.querySelectorAll('.keypad').forEach(function(pad){
      var tab = pad.dataset.keypad;
      pad.querySelectorAll('.keypad-key').forEach(function(btn){
        btn.addEventListener('click', function(){
          var field = activeField[tab];
          var def = fieldDefs[tab + '.' + field];
          var k = btn.dataset.key;
          if(k === 'C'){
            setVal(tab, field, def.min);
            freshEntry[tab] = true;
            return;
          }
          if(k === 'back'){
            var str = String(Math.round(state[tab][field])).slice(0, -1);
            setVal(tab, field, str === '' ? def.min : parseInt(str, 10), true);
            freshEntry[tab] = false;
            return;
          }
          var current = freshEntry[tab] ? '' : String(Math.round(state[tab][field]));
          setVal(tab, field, parseInt(current + k, 10), true);
          freshEntry[tab] = false;
        });
      });
    });

    /* ---- scenario presets (Tab 2 — γεμίζουν όλα τα πεδία μαζί) ---- */
    var scenarios = {
      A:          { targetAOV:80,  targetCustomers:50,  ltv:2, profitMargin:30, adSpend:1000, agencyFee:500,  setupFee:500 },
      B:          { targetAOV:150, targetCustomers:200, ltv:3, profitMargin:35, adSpend:4000, agencyFee:1200, setupFee:1000 },
      breakeven:  { targetAOV:100, targetCustomers:7,   ltv:1, profitMargin:20, adSpend:500,  agencyFee:200,  setupFee:0 }
    };
    document.querySelectorAll('.scenario-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var preset = scenarios[btn.dataset.scenario];
        activeScenario = btn.dataset.scenario;
        document.querySelectorAll('.scenario-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
        Object.keys(preset).forEach(function(field){
          var def = fieldDefs['ideal.' + field];
          var slider = document.querySelector('[data-slider="ideal.' + field + '"]');
          if(slider && preset[field] > parseFloat(slider.max)){
            slider.max = preset[field];
            def.max = preset[field];
          }
          state.ideal[field] = preset[field];
          syncField('ideal', field);
        });
        recalcAll();
      });
    });

    /* ---- mini marketing-package presets (Tab 2, col 2 only) ---- */
    var miniPresets = {
      A: { adSpend:800,  agencyFee:400,  setupFee:300 },
      B: { adSpend:3000, agencyFee:1000, setupFee:800 }
    };
    document.querySelectorAll('.mini-preset-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var p = miniPresets[btn.dataset.miniPreset];
        Object.keys(p).forEach(function(field){ setVal('ideal', field, p[field]); });
      });
    });

    /* ---- stat-card reveal toggle ---- */
    document.querySelectorAll('.reveal-toggle').forEach(function(btn){
      var tab = btn.dataset.revealToggle;
      var row = document.querySelector('.stats-row[data-stats="' + tab + '"]');
      if(!row) return;
      btn.addEventListener('click', function(){
        var revealed = row.classList.toggle('reveal-all');
        btn.textContent = revealed ? '🔒 Απόκρυψη' : '👁️ Εμφάνιση Όλων';
      });
    });

    /* ---- export report (Tab 3, client-side Blob download) ---- */
    var exportBtn = document.getElementById('exportReport');
    if(exportBtn){
      exportBtn.addEventListener('click', function(){
        var cNow = calcNow(), cIdeal = calcIdeal();
        var presentYearly = state.now.yearlyRevenue;
        var idealYearly = presentYearly + cIdeal.monthlyRevenueLtv * 12;
        var gap = idealYearly - presentYearly;
        var html = '<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">' +
          '<title>Υπολογιστής Διαφευγόντων Κερδών — Αναφορά</title>' +
          '<style>body{font-family:Georgia,serif;background:#0e1b19;color:#f3efe2;padding:40px;max-width:720px;margin:0 auto;}' +
          'h1{color:#c9a227;} h2{color:#c9a227;border-bottom:1px solid #333;padding-bottom:8px;margin-top:36px;}' +
          'table{width:100%;border-collapse:collapse;margin-top:12px;} td{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);}' +
          'td:last-child{text-align:right;font-weight:bold;} .gap{color:#c2543c;font-size:28px;font-weight:bold;}</style></head><body>' +
          '<h1>Υπολογιστής Διαφευγόντων Κερδών</h1>' +
          '<h2>📍 Παρούσα Φάση</h2><table>' +
          '<tr><td>Ετήσιος Τζίρος</td><td>' + fmtEUR(state.now.yearlyRevenue) + '</td></tr>' +
          '<tr><td>ROAS</td><td>' + fmtX1(cNow.roas) + '</td></tr>' +
          '<tr><td>Μηνιαίος Τζίρος από Διαφημίσεις</td><td>' + fmtEUR(cNow.monthlyAdRevenue) + '</td></tr>' +
          '<tr><td>Συνολική Μηνιαία Επένδυση</td><td>' + fmtEUR(cNow.totalInvestment) + '</td></tr>' +
          '<tr><td>Καθαρό Μηνιαίο Κέρδος</td><td>' + fmtEUR(cNow.netProfit) + '</td></tr></table>' +
          '<h2>🎯 Ιδανική Φάση</h2><table>' +
          '<tr><td>Στόχος AOV</td><td>' + fmtEUR(state.ideal.targetAOV) + '</td></tr>' +
          '<tr><td>Στόχος Νέων Πελατών</td><td>' + fmtInt(state.ideal.targetCustomers) + '</td></tr>' +
          '<tr><td>LTV</td><td>' + fmtX0(state.ideal.ltv) + '</td></tr>' +
          '<tr><td>Ad ROAS (με LTV)</td><td>' + fmtX1(cIdeal.adRoasLtv) + '</td></tr>' +
          '<tr><td>Μηνιαίος Τζίρος (με LTV)</td><td>' + fmtEUR(cIdeal.monthlyRevenueLtv) + '</td></tr>' +
          '<tr><td>Καθαρό Μηνιαίο Κέρδος</td><td>' + fmtEUR(cIdeal.netProfit) + '</td></tr></table>' +
          '<h2>📊 Σύγκριση</h2><table>' +
          '<tr><td>Παρούσα Φάση (Ετήσιος Τζίρος)</td><td>' + fmtEUR(presentYearly) + '</td></tr>' +
          '<tr><td>Ιδανική Φάση (Στόχος Έτους)</td><td>' + fmtEUR(idealYearly) + '</td></tr>' +
          '</table><p class="gap">Ετήσια Διαφεύγοντα Κέρδη: ' + fmtEUR(gap) + '</p></body></html>';
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ypologistis-diafeygonton-kerdon.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    /* ---- init ---- */
    document.querySelectorAll('[data-slider]').forEach(function(s){ updateFill(s); });
    setActiveField('now', 'yearlyRevenue', true);
    setActiveField('ideal', 'targetAOV', true);
    recalcAll();
  })();

  /* ---------- Staggered scroll reveals ---------- */
  (function setupReveals(){
    if(reducedMotion || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var section = entry.target;
        section.classList.add('in-view');
        io.unobserve(section);
        /* όταν ολοκληρωθεί το reveal, καθάρισε classes/delays ώστε
           τα hover transitions των cards να μην κληρονομούν delay */
        var els = section.querySelectorAll('.reveal');
        var maxDelayMs = 0;
        els.forEach(function(el){
          var d = el.style.transitionDelay || '0ms';
          var v = parseFloat(d) || 0;
          if(d.indexOf('ms') === -1) v *= 1000; /* "0.36s" → 360 */
          maxDelayMs = Math.max(maxDelayMs, v);
        });
        setTimeout(function(){
          els.forEach(function(el){
            el.classList.remove('reveal');
            el.style.transitionDelay = '';
          });
        }, maxDelayMs + 750);
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('section:not(.hero)').forEach(function(section){
      var wrap = section.querySelector(':scope > .wrap');
      if(!wrap) return;
      var items = [];
      Array.prototype.forEach.call(wrap.children, function(child){
        if(child.matches('.pain-grid, .mech-grid, .proof-strip, .timeline')){
          Array.prototype.push.apply(items, child.children);
        } else {
          items.push(child);
        }
      });
      items.forEach(function(el, i){
        el.classList.add('reveal');
        el.style.transitionDelay = Math.min(i * 90, 540) + 'ms';
      });
      io.observe(section);
    });
  })();

  /* ---------- Apply form: validation + Formspree + Calendly step 2 ---------- */
  var form = document.getElementById('applyForm');
  var successBlock = document.getElementById('applySuccess');

  function clearErrors(){
    form.querySelectorAll('.field-error').forEach(function(e){ e.remove(); });
    form.querySelectorAll('.invalid').forEach(function(e){ e.classList.remove('invalid'); });
    var note = form.querySelector('.form-note');
    note.hidden = true;
    note.textContent = '';
  }

  function fieldError(field, message){
    field.classList.add('invalid');
    var msg = document.createElement('p');
    msg.className = 'field-error';
    msg.textContent = message;
    field.insertAdjacentElement('afterend', msg);
  }

  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  /* Ελληνικό τηλέφωνο: 10 ψηφία, με προαιρετικό πρόθεμα +30 */
  function isValidGreekPhone(v){
    var digits = v.replace(/[\s\-().]/g, '');
    return /^(\+30)?\d{10}$/.test(digits);
  }

  function validate(){
    clearErrors();
    var ok = true;
    var name = form.elements.name;
    var specialty = form.elements.specialty;
    var missed = form.elements.missed_calls;
    var email = form.elements.email;
    var phone = form.elements.phone;
    if(!name.value.trim()){ fieldError(name, 'Συμπλήρωσε το όνομά σου και το όνομα του ιατρείου.'); ok = false; }
    if(!specialty.value){ fieldError(specialty, 'Επίλεξε ειδικότητα.'); ok = false; }
    if(!missed.value){ fieldError(missed, 'Επίλεξε μια εκτίμηση.'); ok = false; }
    if(!email.value.trim() || !isValidEmail(email.value.trim())){
      fieldError(email, 'Γράψε ένα έγκυρο email.'); ok = false;
    }
    if(!phone.value.trim() || !isValidGreekPhone(phone.value.trim())){
      fieldError(phone, 'Γράψε ένα έγκυρο ελληνικό τηλέφωνο (10 ψηφία, προαιρετικά με +30).'); ok = false;
    }
    return ok;
  }

  function loadCalendly(){
    var container = document.getElementById('calendlyEmbed');
    var url = CALENDLY_URL +
      (CALENDLY_URL.indexOf('?') === -1 ? '?' : '&') +
      'hide_gdpr_banner=1&background_color=16302d&text_color=f3efe2&primary_color=c9a227';
    function init(){
      if(window.Calendly){
        window.Calendly.initInlineWidget({ url: url, parentElement: container });
      }
    }
    if(window.Calendly){ init(); return; }
    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }

  function showSuccess(){
    form.hidden = true;
    successBlock.hidden = false;
    loadCalendly();
    if(!reducedMotion){
      successBlock.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
    }
  }

  form.addEventListener('submit', function(event){
    event.preventDefault();
    if(!validate()) return;

    var btn = form.querySelector('.btn');
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Αποστολή...';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if(res.ok){
        showSuccess();
      } else {
        return res.json().catch(function(){ return {}; }).then(function(data){
          throw new Error((data.errors && data.errors.map(function(e){ return e.message; }).join(', ')) || 'submit failed');
        });
      }
    }).catch(function(){
      btn.disabled = false;
      btn.textContent = originalText;
      var note = form.querySelector('.form-note');
      note.textContent = 'Κάτι πήγε στραβά κατά την αποστολή. Δοκίμασε ξανά σε λίγο.';
      note.hidden = false;
    });
  });
})();
