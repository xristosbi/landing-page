# Αόρατος Γραμματέας — 24/7 Patient Concierge

Static landing page για το offer «24/7 Patient Concierge / Αόρατος Γραμματέας» (δερματολόγοι, πλαστικοί χειρουργοί, οδοντίατροι στην Ελλάδα).

Καθαρό static site — **χωρίς framework, χωρίς build step**.

```
index.html    → δομή & περιεχόμενο (το copy είναι A/B tested — μην το αλλάζεις χωρίς λόγο)
styles.css    → design system + animations
script.js     → calculator, scroll reveals, φόρμα (Formspree + Calendly)
netlify.toml  → config για Netlify
vercel.json   → config για Vercel
```

## Ρυθμίσεις integrations

### Formspree (φόρμα #apply) — ✅ ρυθμισμένο

Η φόρμα κάνει POST στο `https://formspree.io/f/xojgvojy` (πεδία: `name`, `specialty`, `missed_calls`, `email`, `phone`). Αν αλλάξεις form, ενημέρωσε το `action` της `#applyForm` στο `index.html`.

### Calendly (βήμα 2 μετά το submit) — ✅ ρυθμισμένο

Το inline widget δείχνει το `https://calendly.com/xristosbithizis/30min` (ορίζεται ως `CALENDLY_URL` στην κορυφή του `script.js`) και εμφανίζεται αυτόματα μετά το επιτυχές submit, χρωματισμένο στο design system της σελίδας (σκούρο background, gold accent).

### VSL video (section πάνω από το hero) — ✅ ρυθμισμένο

Το section `#vsl` κάνει embed το YouTube video `iX2CMTHUDOs` (lazy-loaded iframe μέσα στο `.vsl-frame`). Για αλλαγή video, άλλαξε το `src` του iframe στο `index.html`.

### Domain στα meta tags — ⛔ TODO

Στο `index.html` (στο `<head>`), αντικατέστησε το placeholder `https://example.com/` με το τελικό domain στα: `canonical`, `og:url`, `og:image`, `twitter:image` — μόλις αποφασιστεί το hosting.

Το `og-image.png` (1200×630) είναι placeholder — μπορείς να το αντικαταστήσεις με δικό σου visual όποτε θες, κρατώντας το ίδιο όνομα αρχείου.

## Τοπικό preview

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Άνοιγμα με διπλό κλικ στο index.html δουλεύει επίσης, αλλά μέσω server είναι πιο κοντά στο production.)

## Deploy

### Netlify

- **Μέσω Git:** New site from Git → επίλεξε το repo → Build command: *(κενό)* → Publish directory: `.` → Deploy.
- **Χωρίς Git:** σύρε τον φάκελο του project στο [app.netlify.com/drop](https://app.netlify.com/drop).

### Vercel

- Import το repo στο [vercel.com/new](https://vercel.com/new) → Framework Preset: **Other** → χωρίς build command → Deploy.

## Σημειώσεις υλοποίησης

- **Animations:** custom sliders με gradient fill + gold thumb glow, odometer count-up στο `#lossOutput` (rAF, ease-out, ~400ms), ambient breathing στο hero bleed-card, staggered scroll reveals ανά στοιχείο, hover lift + gold glow σε mechanism cards / proof cells.
- **prefers-reduced-motion:** όλα τα animations απενεργοποιούνται (CSS media query + gating στο JS).
- **Validation:** η φόρμα ελέγχει ειδικότητα, εκτίμηση κλήσεων και email/τηλέφωνο πριν το submit· τα λάθη εμφανίζονται inline στα ελληνικά.
- **Χωρίς JS** η φόρμα κάνει κανονικό POST στο Formspree (fallback στη σελίδα ευχαριστίας του Formspree).
