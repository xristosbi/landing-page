(function(){
  'use strict';

  /* ============================================================
     CONFIG — άλλαξε αυτά τα δύο πριν το deploy (δες README.md)
     ============================================================ */
  var CALENDLY_URL = 'https://calendly.com/chris-bivl2/new-meeting';
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

  /* ---------- Missed-call calculator ---------- */
  var callsSlider = document.getElementById('calls');
  var valueSlider = document.getElementById('value');
  var callsVal = document.getElementById('callsVal');
  var valueVal = document.getElementById('valueVal');
  var lossOutput = document.getElementById('lossOutput');

  function formatEUR(n){
    return '€' + Math.round(n).toLocaleString('el-GR');
  }

  function updateFill(slider){
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }

  /* Odometer count-up: rAF + ease-out cubic, ~400ms */
  var displayedLoss = null;
  var lossRaf = null;
  function renderLoss(target){
    if(displayedLoss === null || reducedMotion){
      displayedLoss = target;
      lossOutput.textContent = formatEUR(target);
      return;
    }
    if(lossRaf) cancelAnimationFrame(lossRaf);
    var from = displayedLoss;
    var start = performance.now();
    var DUR = 400;
    function frame(now){
      var p = Math.min((now - start) / DUR, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = from + (target - from) * eased;
      lossOutput.textContent = formatEUR(current);
      if(p < 1){
        lossRaf = requestAnimationFrame(frame);
      } else {
        displayedLoss = target;
        lossRaf = null;
      }
    }
    displayedLoss = target;
    lossRaf = requestAnimationFrame(frame);
  }

  function recalc(){
    var calls = parseInt(callsSlider.value, 10);
    var val = parseInt(valueSlider.value, 10);
    callsVal.textContent = calls;
    valueVal.textContent = formatEUR(val);
    updateFill(callsSlider);
    updateFill(valueSlider);
    var monthlyLoss = calls * 0.5 * val * 4.3;
    renderLoss(monthlyLoss);
  }

  [callsSlider, valueSlider].forEach(function(slider){
    slider.addEventListener('input', recalc);
    /* glow στο thumb όσο σέρνεις */
    slider.addEventListener('pointerdown', function(){ slider.classList.add('dragging'); });
    ['pointerup','pointercancel','blur'].forEach(function(ev){
      slider.addEventListener(ev, function(){ slider.classList.remove('dragging'); });
    });
  });
  recalc();

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

  function isValidContact(v){
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var phone = /^\+?\d{10,14}$/;
    return email.test(v) || phone.test(v.replace(/[\s\-().]/g, ''));
  }

  function validate(){
    clearErrors();
    var ok = true;
    var name = form.elements.name;
    var specialty = form.elements.specialty;
    var missed = form.elements.missed_calls;
    var contact = form.elements.contact;
    if(!name.value.trim()){ fieldError(name, 'Συμπλήρωσε το όνομά σου και το όνομα του ιατρείου.'); ok = false; }
    if(!specialty.value){ fieldError(specialty, 'Επίλεξε ειδικότητα.'); ok = false; }
    if(!missed.value){ fieldError(missed, 'Επίλεξε μια εκτίμηση.'); ok = false; }
    if(!contact.value.trim() || !isValidContact(contact.value.trim())){
      fieldError(contact, 'Γράψε ένα έγκυρο email ή τηλέφωνο.'); ok = false;
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
