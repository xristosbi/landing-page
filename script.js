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
      'now.weeklyCalls':       { min:5,   max:300,  step:5,   format:'int' },
      'now.missedPct':         { min:0,   max:60,   step:1,   format:'pct' },
      'now.avgValue':          { min:20,  max:1000, step:10,  format:'eur' },
      'now.secretarySalary':   { min:0,   max:3000, step:50,  format:'eur' },
      'now.hoursOnPhone':      { min:0,   max:60,   step:1,   format:'hours' },
      'now.doctorHourly':      { min:20,  max:500,  step:5,   format:'eurHour' },
      'now.doctorHoursMonth':  { min:0,   max:80,   step:1,   format:'hours' },

      'ideal.reductionPct':    { min:0,   max:100,  step:1,   format:'pct' },
      'ideal.ltvVisits':       { min:1,   max:10,   step:1,   format:'times' },
      'ideal.monthlyRetainer': { min:100, max:1500, step:50,  format:'eur' },
      'ideal.setupFee':        { min:500, max:3000, step:100, format:'eur' }
    };

    var fieldLabels = {
      'now.weeklyCalls': 'Συνολικές Κλήσεις/Εβδομάδα',
      'now.missedPct': '% Αναπάντητων Κλήσεων',
      'now.avgValue': 'Μέση Αξία Ασθενή (€)',
      'now.secretarySalary': 'Μηνιαίος Μισθός Γραμματέα (€)',
      'now.hoursOnPhone': 'Ώρες/Εβδομάδα στο Τηλέφωνο',
      'now.doctorHourly': 'Αξία της Ώρας σου (€/ώρα)',
      'now.doctorHoursMonth': 'Ώρες/Μήνα σε Διοικητικά/Τηλέφωνα',
      'ideal.reductionPct': '% Λιγότερων Χαμένων Κλήσεων',
      'ideal.ltvVisits': 'LTV — Επισκέψεις/Έτος ανά Ασθενή',
      'ideal.monthlyRetainer': 'Μηνιαίο Retainer (€)',
      'ideal.setupFee': 'Εφάπαξ Setup Fee (€)'
    };

    var state = {
      now:   { weeklyCalls:50, missedPct:25, avgValue:100, secretarySalary:900, hoursOnPhone:20, doctorHourly:80, doctorHoursMonth:10 },
      ideal: { reductionPct:100, ltvVisits:2, monthlyRetainer:300, setupFee:2000 }
    };
    var activeField = { now:'weeklyCalls', ideal:'reductionPct' };
    var freshEntry = { now:true, ideal:true };
    var activeScenario = 'ambitious';

    /* ---- formatting (Greek style: "." thousands, "," decimals; negatives as "−€X") ---- */
    function fmtEUR(n){
      var sign = n < 0 ? '−' : '';
      return sign + '€' + Math.round(Math.abs(n)).toLocaleString('el-GR');
    }
    function fmtX1(n){ return n.toLocaleString('el-GR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + 'x'; }
    function fmtInt(n){ return Math.round(n).toLocaleString('el-GR'); }
    function fmtPct(n){ return Math.round(n) + '%'; }
    function fmtHours(n){ var r = Math.round(n); return r.toLocaleString('el-GR') + (r === 1 ? ' ώρα' : ' ώρες'); }
    function fmtEurHour(n){ return fmtEUR(n) + '/ώρα'; }
    function fmtTimes(n){ var r = Math.round(n); return r + (r === 1 ? ' φορά' : ' φορές'); }
    function fmtMonths(n){
      if(n === null || !isFinite(n) || n < 0) return '—';
      return n.toFixed(1).replace('.', ',') + ' μήνες';
    }
    var formatters = { eur:fmtEUR, x1:fmtX1, int:fmtInt, pct:fmtPct, hours:fmtHours, eurHour:fmtEurHour, times:fmtTimes };
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
      var missedCallsPerWeek = s.weeklyCalls * s.missedPct / 100;
      var missedCallsPerMonth = missedCallsPerWeek * 4.3;
      var lostRevenueMonthly = missedCallsPerMonth * s.avgValue;
      var secretaryCostPerCall = s.secretarySalary / (s.weeklyCalls * 4.3);
      var doctorTimeCostMonthly = s.doctorHourly * s.doctorHoursMonth;
      var totalMonthlyCost = lostRevenueMonthly + s.secretarySalary + doctorTimeCostMonthly;
      var annualLostRevenue = totalMonthlyCost * 12;
      return { missedCallsPerWeek:missedCallsPerWeek, missedCallsPerMonth:missedCallsPerMonth, lostRevenueMonthly:lostRevenueMonthly, secretaryCostPerCall:secretaryCostPerCall, doctorTimeCostMonthly:doctorTimeCostMonthly, totalMonthlyCost:totalMonthlyCost, annualLostRevenue:annualLostRevenue };
    }

    function calcIdeal(cNow){
      var s = state.ideal;
      var recoveredCallsPerMonth = cNow.missedCallsPerMonth * s.reductionPct / 100;
      var recoveredRevenueMonthly = recoveredCallsPerMonth * state.now.avgValue;
      var netBenefitMonthly = recoveredRevenueMonthly - s.monthlyRetainer;
      var roi = (netBenefitMonthly * 12) / (s.setupFee + s.monthlyRetainer * 12);
      var ltvPerCustomer = state.now.avgValue * s.ltvVisits;
      var annualLtvValue = ltvPerCustomer * recoveredCallsPerMonth * 12;
      var paybackMonths = netBenefitMonthly > 0 ? s.setupFee / netBenefitMonthly : null;
      return { recoveredCallsPerMonth:recoveredCallsPerMonth, recoveredRevenueMonthly:recoveredRevenueMonthly, netBenefitMonthly:netBenefitMonthly, roi:roi, ltvPerCustomer:ltvPerCustomer, annualLtvValue:annualLtvValue, paybackMonths:paybackMonths };
    }

    function renderNow(c){
      setText('#missedCallsReadout', '≈ ' + fmtInt(c.missedCallsPerWeek) + ' χαμένες κλήσεις/εβδομάδα');
      setText('[data-stat="now.missedCallsPerMonth"]', fmtInt(c.missedCallsPerMonth));
      setText('[data-stat="now.lostRevenueMonthly"]', fmtEUR(c.lostRevenueMonthly));
      setText('[data-stat="now.secretaryCostPerCall"]', fmtEUR(c.secretaryCostPerCall));
      setText('[data-stat="now.doctorTimeCostMonthly"]', fmtEUR(c.doctorTimeCostMonthly));
      setText('[data-summary="now.totalMonthlyCost"]', fmtEUR(c.totalMonthlyCost));
      setText('[data-summary="now.annualLostRevenue"]', fmtEUR(c.annualLostRevenue));
    }

    function renderIdeal(c){
      setText('[data-preview="ideal.ltvPerCustomer"]', fmtEUR(c.ltvPerCustomer));
      setText('[data-stat="ideal.recoveredCallsPerMonth"]', fmtInt(c.recoveredCallsPerMonth));
      setText('[data-stat="ideal.recoveredRevenueMonthly"]', fmtEUR(c.recoveredRevenueMonthly));
      setText('[data-stat="ideal.netBenefitMonthly"]', fmtEUR(c.netBenefitMonthly));
      setText('[data-stat="ideal.roi"]', fmtX1(c.roi));
      setText('[data-summary="ideal.paybackMonths"]', fmtMonths(c.paybackMonths));
      setText('[data-summary="ideal.annualLtvValue"]', fmtEUR(c.annualLtvValue));
      /* readonly reflection of Tab1's doctor time-cost fields */
      setText('[data-readonly="ideal.doctorHourly"]', fmtEurHour(state.now.doctorHourly));
      setText('[data-readonly="ideal.doctorHoursMonth"]', fmtHours(state.now.doctorHoursMonth));
    }

    function renderCompare(cNow, cIdeal){
      var presentAnnual = cNow.annualLostRevenue;
      var idealAnnual = cIdeal.netBenefitMonthly * 12;
      var totalDiff = presentAnnual + idealAnnual;

      setText('[data-compare="presentAnnual"]', fmtEUR(presentAnnual));
      setText('[data-compare="idealAnnual"]', fmtEUR(idealAnnual));
      renderAnimated(document.getElementById('gapOutput'), totalDiff, fmtEUR);

      var afterMissedCalls = cNow.missedCallsPerMonth * (1 - state.ideal.reductionPct / 100);
      setText('[data-arrow="missedCalls"]', fmtInt(cNow.missedCallsPerMonth) + ' ➔ ' + fmtInt(afterMissedCalls));
      setText('[data-arrow="revenue"]', fmtEUR(cNow.lostRevenueMonthly) + ' ➔ ' + fmtEUR(cIdeal.recoveredRevenueMonthly));
      setText('[data-arrow="cost"]', fmtEUR(cNow.totalMonthlyCost) + ' ➔ ' + fmtEUR(state.ideal.monthlyRetainer));
      setText('[data-arrow="netResult"]', fmtEUR(-cNow.totalMonthlyCost) + ' ➔ ' + fmtEUR(cIdeal.netBenefitMonthly));

      setText('[data-summary="paybackMonths"]', fmtMonths(cIdeal.paybackMonths));
    }

    function recalcAll(){
      var cNow = calcNow();
      var cIdeal = calcIdeal(cNow);
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
      conservative: { reductionPct:70 },
      realistic:    { reductionPct:90 },
      ambitious:    { reductionPct:100 }
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
        var cNow = calcNow(), cIdeal = calcIdeal(cNow);
        var presentAnnual = cNow.annualLostRevenue;
        var idealAnnual = cIdeal.netBenefitMonthly * 12;
        var totalDiff = presentAnnual + idealAnnual;
        var html = '<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">' +
          '<title>Υπολογιστής Διαφευγόντων Κερδών — Αναφορά</title>' +
          '<style>body{font-family:Georgia,serif;background:#0e1b19;color:#f3efe2;padding:40px;max-width:720px;margin:0 auto;}' +
          'h1{color:#c9a227;} h2{color:#c9a227;border-bottom:1px solid #333;padding-bottom:8px;margin-top:36px;}' +
          'table{width:100%;border-collapse:collapse;margin-top:12px;} td{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);}' +
          'td:last-child{text-align:right;font-weight:bold;} .gap{color:#c2543c;font-size:28px;font-weight:bold;}</style></head><body>' +
          '<h1>Υπολογιστής Διαφευγόντων Κερδών</h1>' +
          '<h2>📍 Παρούσα Φάση</h2><table>' +
          '<tr><td>Κλήσεις/Εβδομάδα</td><td>' + fmtInt(state.now.weeklyCalls) + '</td></tr>' +
          '<tr><td>Αναπάντητες Κλήσεις</td><td>' + fmtPct(state.now.missedPct) + '</td></tr>' +
          '<tr><td>Χαμένες Κλήσεις/Μήνα</td><td>' + fmtInt(cNow.missedCallsPerMonth) + '</td></tr>' +
          '<tr><td>Χαμένα Έσοδα/Μήνα</td><td>' + fmtEUR(cNow.lostRevenueMonthly) + '</td></tr>' +
          '<tr><td>Κόστος Γραμματείας ανά Κλήση</td><td>' + fmtEUR(cNow.secretaryCostPerCall) + '</td></tr>' +
          '<tr><td>Κόστος Χρόνου Γιατρού/Μήνα</td><td>' + fmtEUR(cNow.doctorTimeCostMonthly) + '</td></tr>' +
          '<tr><td>Συνολικό Μηνιαίο Κόστος</td><td>' + fmtEUR(cNow.totalMonthlyCost) + '</td></tr>' +
          '<tr><td>Ετήσιο Χαμένο Έσοδο</td><td>' + fmtEUR(cNow.annualLostRevenue) + '</td></tr></table>' +
          '<h2>🎯 Ιδανική Φάση (με Voice Agent)</h2><table>' +
          '<tr><td>% Λιγότερων Χαμένων Κλήσεων</td><td>' + fmtPct(state.ideal.reductionPct) + '</td></tr>' +
          '<tr><td>Ανακτημένες Κλήσεις/Μήνα</td><td>' + fmtInt(cIdeal.recoveredCallsPerMonth) + '</td></tr>' +
          '<tr><td>Ανακτημένα Έσοδα/Μήνα</td><td>' + fmtEUR(cIdeal.recoveredRevenueMonthly) + '</td></tr>' +
          '<tr><td>Μηνιαίο Retainer</td><td>' + fmtEUR(state.ideal.monthlyRetainer) + '</td></tr>' +
          '<tr><td>Εφάπαξ Setup Fee</td><td>' + fmtEUR(state.ideal.setupFee) + '</td></tr>' +
          '<tr><td>Καθαρό Όφελος/Μήνα</td><td>' + fmtEUR(cIdeal.netBenefitMonthly) + '</td></tr>' +
          '<tr><td>ROI</td><td>' + fmtX1(cIdeal.roi) + '</td></tr>' +
          '<tr><td>Απόσβεση Setup Fee σε</td><td>' + fmtMonths(cIdeal.paybackMonths) + '</td></tr></table>' +
          '<h2>📊 Σύγκριση</h2><table>' +
          '<tr><td>Παρούσα Φάση (Ετήσιο Χαμένο Έσοδο)</td><td>' + fmtEUR(presentAnnual) + '</td></tr>' +
          '<tr><td>Με Voice Agent (Ετήσιο Καθαρό Όφελος)</td><td>' + fmtEUR(idealAnnual) + '</td></tr>' +
          '</table><p class="gap">Συνολική Ετήσια Διαφορά: ' + fmtEUR(totalDiff) + '</p></body></html>';
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
    setActiveField('now', 'weeklyCalls', true);
    setActiveField('ideal', 'reductionPct', true);
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
