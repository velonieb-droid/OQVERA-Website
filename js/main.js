/* ============================================================
   SITE JS — nav, reveal, sticky CTA, analytics events, form wiring
   ============================================================ */

/* ---------- ANALYTICS (Stage 9) ----------
   GA4 events per build spec §60. Replace G-XXXXXXXXXX in the gtag
   snippet in <head> (see templates). track() is safe if GA absent. */
function track(eventName, params) {
  if (typeof gtag === "function") gtag("event", eventName, params || {});
  if (window.console && console.debug) console.debug("[event]", eventName, params || {});
}

/* Click events: any element with data-event fires that GA4 event.
   Used for: booking_click, messenger_click, phone_click, pricing_view links,
   service_view links, case_study_view, audit_request CTAs. */
document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-event]");
  if (el) track(el.getAttribute("data-event"), { label: el.getAttribute("data-label") || el.textContent.trim().slice(0, 60) });
});

/* Page-level view events (pricing_view, service_view, case_study_view)
   fire from a data attribute on <body>. */
(function () {
  var ev = document.body.getAttribute("data-page-event");
  if (ev) track(ev, { page: location.pathname });
})();

/* ---------- MOBILE NAV ---------- */
(function () {
  var btn = document.querySelector(".menu-btn");
  var menu = document.querySelector(".mobile-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();

/* ---------- SCROLL REVEAL ---------- */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
})();

/* ---------- STICKY MOBILE CTA (spec §33) ---------- */
(function () {
  var bar = document.querySelector(".sticky-cta");
  if (!bar) return;
  var shown = false;
  window.addEventListener("scroll", function () {
    var past = window.scrollY > window.innerHeight * 0.7;
    if (past !== shown) { shown = past; bar.classList.toggle("show", past); }
  }, { passive: true });
})();

/* ---------- FORMS (Stage 7: CRM wiring) ----------
   HOW TO CONNECT TO GOHIGHLEVEL — two options:

   OPTION A (recommended): replace each <form> with the GHL form embed
   iframe from Sites → Forms → Builder → Integrate. GHL then handles
   contact creation, tagging, and workflow triggers natively.

   OPTION B (keep this markup): set GHL_WEBHOOK below to an Inbound
   Webhook trigger URL from a GHL workflow ("Inbound Webhook" trigger).
   Field names here (name, business_name, phone, email, website,
   facebook_page, business_type, help_with, message) map 1:1 to the
   webhook payload — map them in the workflow to contact fields.

   Until wired, forms show an inline success state so pages are testable. */
var GHL_WEBHOOK = ""; // ← paste GHL inbound webhook URL here

document.querySelectorAll("form[data-form]").forEach(function (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.page = location.pathname;
    data.form_id = form.getAttribute("data-form");

    /* GA4 conversion events (spec §60) */
    var ev = form.getAttribute("data-form-event") || "contact_form_submit";
    track(ev, { form_id: data.form_id });

    var finish = function () {
      var redirect = form.getAttribute("data-redirect");
      if (redirect) { location.href = redirect; }
      else { form.classList.add("sent"); }
    };

    if (GHL_WEBHOOK) {
      fetch(GHL_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(finish).catch(finish);
    } else {
      finish();
    }
  });
});
