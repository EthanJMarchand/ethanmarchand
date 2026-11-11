/* Small helpers the TFSA calculator, questionnaire, intake, and advanced case share.
   Load this before the page's own script. */
(function (root) {
  "use strict";

  // Failed submits and the advanced case's document step point here.
  const CONTACT_EMAIL = "ethan@marchandwealth.ca";

  const CONTACT_METHODS = ["Call", "Text", "Email"];
  const normalizePreferredContact = (value) => {
    const clean = String(value ?? "").trim().toLowerCase();
    return CONTACT_METHODS.find((m) => m.toLowerCase() === clean) || "";
  };

  function todayIso() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  // Standard PDF fonts only cover Latin-1, so typographic punctuation is flattened.
  const pdfSafe = (s) => String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");

  let jsPdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPdfLoading) {
      jsPdfLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/assets/vendor/jspdf.umd.min.js";
        script.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error("jsPDF missing")));
        script.onerror = () => {
          jsPdfLoading = null;
          reject(new Error("jsPDF failed to load"));
        };
        document.head.append(script);
      });
    }
    return jsPdfLoading;
  }

  async function loadLogo() {
    try {
      const res = await fetch("/assets/logo.png");
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // The "Next" arrow under the step a client is on. Creates it once per step,
  // then only updates its state. onClick is bound when the button is created.
  function syncNextArrowButton(el, ready, onClick) {
    let button = el.querySelector(":scope > .intake-next-arrow");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `
        <span class="intake-next-arrow-label"></span>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M5 8.5 L11 14.5 L17 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      button.addEventListener("click", onClick);
      el.append(button);
    }
    button.className = `intake-next-arrow${ready ? "" : " is-waiting"}`;
    button.setAttribute("aria-label", ready ? "Show the next question" : "Answer this question to continue");
    button.disabled = !ready;
    const label = button.querySelector(".intake-next-arrow-label");
    if (label) label.textContent = ready ? "Next" : "More below";
    return button;
  }

  root.MarchandShared = {
    CONTACT_EMAIL,
    CONTACT_METHODS,
    normalizePreferredContact,
    todayIso,
    pdfSafe,
    loadJsPdf,
    loadLogo,
    syncNextArrowButton,
  };
})(window);
