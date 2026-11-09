(function () {
  "use strict";

  const PROVINCES = [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
    ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
    ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ];
  const STEPS = ["consent", "life", "people", "bridge", "companies", "close"];
  const STEP_LABELS = ["Consent", "The life", "The people", "The bridge", "Companies", "The question"];
  const INPUT = "mt-2 w-full rounded-sm border border-line bg-white/90 px-3.5 py-3 text-base shadow-sm focus:border-gold focus:outline-none";

  const PDF = {
    navydeep: [13, 35, 42], gold: [97, 137, 134], golddim: [77, 115, 111],
    ink: [13, 35, 42], inksoft: [62, 85, 88], line: [213, 222, 220],
  };

  const pdfSafe = (s) => String(s)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");

  function todayIso() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function formatDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return iso || "";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  }

  function uid() {
    return Math.random().toString(36).slice(2, 8);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function filled(value) {
    return String(value ?? "").trim() !== "";
  }

  function provinceName(code) {
    return (PROVINCES.find(([value]) => value === code) || [code, code])[1];
  }

  function blankPerson(role) {
    return {
      id: uid(),
      role,
      name: "",
      dob: "",
      province: "AB",
      relationship: role === "client" ? "Client" : "",
      taxResident: "yes",
      citizenship: "",
      citizenshipCountry: "",
      workStatus: role === "dependant" ? "" : "working",
      email: "",
      mobile: "",
      salaryLast: "", salaryThis: "",
      eligLast: "", eligThis: "",
      nonEligLast: "", nonEligThis: "",
      otherLast: "", otherThis: "",
      rrspRoom: "", rrspNoticeYear: "", rrspContributed: "",
      tfsaRoom: "", tfsaBalance: "", tfsaContributed: "", tfsaWithdrawn: "",
      pension: "",
      ownsProperty: "",
      reNames: "", reCost: "", reValue: "", reMortgage: "", reRate: "", reRenewal: "", reOccupied: "", reNotes: "",
      reRent: "", reRentOn: "",
      schoolCost: "", schoolYears: "",
      companyRole: "",
      nonregValue: "", nonregCost: "",
      personalDebt: "",
      insurance: "",
      will: "", poa: "", directive: "",
      shares: "",
      worksIn: "",
    };
  }

  function blankCompany() {
    return {
      id: uid(),
      legalName: "",
      yearEnd: "",
      does: "",
      provinceInc: "AB",
      operates: "",
      associated: "",
      associatedWith: "",
      revenue: "", expenses: "", profit: "",
      forecast: "",
      operatingCash: "", surplusCash: "",
      investments: "", investmentCost: "",
      passiveIncome: "",
      gainsSold: "", gainsUnsold: "",
      debt: "",
      shareholderLoans: "",
      corpIns: "",
      corpInsDetail: "",
      saleWindow: "", successor: "", valuation: "", buyerWants: "", purify: "",
      sha: "", shaBuySell: "", shaFunded: "",
    };
  }

  function blankHome() {
    return { names: "", value: "", mortgage: "", rate: "", renewal: "" };
  }

  function blankModel() {
    return {
      date: todayIso(),
      viewers: [],
      viewersOther: "",
      life: {
        loved: "", need: "", want: "", stop: "", cash: "", cashName: "",
        gifts: "", changes: "",
      },
      home: blankHome(),
      spousalRrsp: "",
      lcge: "",
      people: [blankPerson("client")],
      companies: [],
      succession: "",
      goals: [],
    };
  }

  let model = blankModel();

  function clientPerson() {
    return model.people.find((person) => person.role === "client") || model.people[0];
  }

  function displayName(person, index) {
    return person.name.trim() || (person.role === "client" ? "Client" : `Person ${index + 1}`);
  }

  function companyTitle(company, index) {
    return company.legalName.trim() || `Company ${index + 1}`;
  }

  function noted(value) {
    const text = String(value ?? "").trim();
    if (!text) return false;
    return !/^(0+(\.0+)?|none\b.*|no\.?|n\/a|not yet\.?|unknown)$/i.test(text);
  }

  function pdfText(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (/^(0+(\.0+)?|none\b.*|n\/a|not yet\.?|unknown)$/i.test(text)) return "";
    return text;
  }

  function zeroAmount(value) {
    return /^0+(\.0+)?$/.test(String(value ?? "").replace(/[$,\s]/g, ""));
  }

  const SALE_WINDOWS = ["1–3 years", "3–7 years", "7–15 years"];

  function selling(company) {
    return SALE_WINDOWS.includes(company.saleWindow);
  }

  function documentGroups(source) {
    const adults = [];
    const companies = [];
    const agreements = [];
    const insurance = [];
    const investments = [];
    (source.people || []).forEach((person, index) => {
      if (person.role === "dependant") return;
      const who = displayName(person, index);
      adults.push(`${who}: last T1 and notice of assessment`);
      if (noted(person.insurance)) insurance.push(`Insurance summary for ${who}`);
      if ([person.tfsaBalance, person.nonregValue, person.pension].some(noted)) {
        investments.push(`Investment or pension statement for ${who}`);
      }
    });
    (source.companies || []).forEach((company, index) => {
      const who = companyTitle(company, index);
      const named = noted(company.legalName);
      const hasFigures = [company.revenue, company.expenses, company.profit, company.forecast, company.does].some(noted);
      if (named || hasFigures) companies.push(`${who}: last T2`);
      if (company.sha === "yes") agreements.push(`Shareholder agreement for ${who}`);
      if (company.corpIns === "yes" || noted(company.corpInsDetail)) insurance.push(`Insurance summary for ${who}`);
      if (noted(company.investments)) investments.push(`Investment statement for ${who}`);
    });
    const groups = [];
    if (adults.length) groups.push({ heading: "Adults", items: adults });
    if (companies.length) groups.push({ heading: "Companies", items: companies });
    if (agreements.length) groups.push({ heading: "Shareholder agreement", items: agreements });
    if (insurance.length) groups.push({ heading: "Insurance", items: insurance });
    if (investments.length) groups.push({ heading: "Investments and pensions", items: investments });
    return groups;
  }

  function sections(source) {
    const out = [];
    const push = (title, pairs) => {
      const kept = pairs
        .map(([label, value]) => [label, pdfText(value)])
        .filter(([, value]) => value);
      if (kept.length) out.push({ title, pairs: kept });
    };
    const yesNo = (value) => (value === "yes" ? "Yes" : value === "no" ? "No" : "");
    const consentOn = typeof document !== "undefined" && document.getElementById("ac-consent")?.checked;
    if (consentOn) push("Consent", [["Understands this prepares a conversation", "Yes"]]);
    push("Who may see this file", [
      ["Spouse", source.viewers.includes("Spouse") ? "Yes" : ""],
      ["Accountant", source.viewers.includes("Accountant") ? "Yes" : ""],
      ["Bookkeeper", source.viewers.includes("Bookkeeper") ? "Yes" : ""],
      ["Anyone else", source.viewersOther],
    ]);
    const life = source.life || {};
    push("The life", [
      ["A life you love", life.loved],
      ["After-tax spending needed each year", life.need],
      ["After-tax spending wanted", life.want],
      ["When you want to stop working", life.stop],
      ["Cash kept aside", life.cash],
      ["Whose name the cash is in", life.cashName],
      ["Legacy", life.gifts],
      ["Anything that changes the plan", life.changes],
    ]);
    const home = source.home || {};
    push("Household", [
      ["Home, whose names", home.names],
      ["Home, rough value", home.value],
      ["Home mortgage", home.mortgage],
      ["Home mortgage rate", home.rate],
      ["Home mortgage renewal", home.renewal],
      ["Spousal RRSP", source.spousalRrsp],
      ["Lifetime capital gains exemption", source.lcge],
    ]);
    (source.people || []).forEach((person, index) => {
      const title = displayName(person, index);
      const role = person.role === "client" ? "Client" : person.role === "spouse" ? "Spouse or partner" : "Child or other dependant";
      const identity = [
        ["Who is this?", person.role === "client" ? "" : role],
        ["Name", person.name],
        ["Date of birth", person.dob],
        ["Province of residence", provinceName(person.province)],
        ["Relationship", person.role === "dependant" ? (person.relationship || role) : ""],
        ["Canadian resident for tax", person.taxResident === "yes" ? "Yes" : person.taxResident === "no" ? "No" : ""],
        ["Working, retired, student, or at home", workLabel(person.workStatus)],
        ["Email", person.role === "client" ? person.email : ""],
        ["Mobile", person.role === "client" ? person.mobile : ""],
      ];
      const citizenship = person.role !== "dependant" && person.citizenship === "other"
        ? [["Citizenship", person.citizenshipCountry]]
        : [];
      const adult = person.role === "dependant" ? [] : [
        ["Salary last year", person.salaryLast],
        ["Salary expected this year", person.salaryThis],
        ["Non-eligible dividends last year", zeroAmount(person.nonEligLast) ? "" : person.nonEligLast],
        ["Non-eligible dividends expected this year", zeroAmount(person.nonEligThis) ? "" : person.nonEligThis],
        ["Eligible dividends last year", person.eligLast],
        ["Eligible dividends expected this year", person.eligThis],
        ["Other income last year", person.otherLast],
        ["Other income expected this year", person.otherThis],
        ["TFSA contribution room available", person.tfsaRoom],
        ["TFSA balance", person.tfsaBalance],
        ["TFSA contributions this year", person.tfsaContributed],
        ["TFSA withdrawals this year", person.tfsaWithdrawn],
        ["RRSP contribution room available", person.rrspRoom],
        ["Year of the RRSP Notice of Assessment", person.rrspNoticeYear],
        ["RRSP contributions already made this year", person.rrspContributed],
        ["Old-job pension", person.pension],
      ];
      const property = person.role !== "dependant" && person.ownsProperty === "yes" ? [
        ["Other real estate, whose name", person.reNames],
        ["Other real estate, what they paid", person.reCost],
        ["Other real estate, rough value", person.reValue],
        ["Other real estate mortgage", person.reMortgage],
        ["Other real estate rate", person.reRate],
        ["Other real estate renewal", person.reRenewal],
        ["Does anyone live in it", yesNo(person.reOccupied)],
        ["Other real estate notes", person.reNotes],
        ["Net rent received last year", person.reRent],
        ["Whose return the rent is on", person.reRentOn],
      ] : [];
      const owned = person.role === "dependant" ? [] : [
        ["Non-registered investments, value", person.nonregValue],
        ["Non-registered investments, what they paid", person.nonregCost],
        ["Personal debt that is not a mortgage", person.personalDebt],
        ["Personal insurance", person.insurance],
        ["Will", yesNo(person.will)],
        ["Power of attorney", yesNo(person.poa)],
        ["Personal directive", yesNo(person.directive)],
      ];
      const school = person.role === "dependant" && person.workStatus === "student" ? [
        ["School, about how much per year", person.schoolCost],
        ["School, for how many years", person.schoolYears],
      ] : [];
      const bridge = (person.role !== "dependant" || person.companyRole === "yes" || noted(person.shares) || noted(person.worksIn)) ? [
        ["Shares owned", person.shares],
        ["Work in a company", person.worksIn],
      ] : [];
      push(title, [...identity.slice(0, 6), ...citizenship, ...identity.slice(6), ...school, ...adult, ...property, ...owned, ...bridge]);
    });
    (source.companies || []).forEach((company, index) => {
      const forSale = selling(company);
      push(companyTitle(company, index), [
        ["Legal name", company.legalName],
        ["Year-end", company.yearEnd],
        ["What it does", company.does],
        ["Province of incorporation", provinceName(company.provinceInc)],
        ["Where it actually operates", company.operates],
        ["Associated with another company", yesNo(company.associated)],
        ["Associated with", company.associated === "yes" ? company.associatedWith : ""],
        ["Last year revenue", company.revenue],
        ["Last year expenses", company.expenses],
        ["Last year profit before anyone is paid", company.profit],
        ["Next three years", company.forecast],
        ["Cash the business must keep", company.operatingCash],
        ["Cash and GICs beyond that", company.surplusCash],
        ["Investments", company.investments],
        ["What the company paid for those investments", company.investmentCost],
        ["Interest, dividends, and rents last year", company.passiveIncome],
        ["Gains already sold", company.gainsSold],
        ["Gains not yet sold", company.gainsUnsold],
        ["Debt", company.debt],
        ["Shareholder loans", company.shareholderLoans],
        ["Life insurance owned by the company", yesNo(company.corpIns)],
        ["The policy", company.corpIns === "yes" ? company.corpInsDetail : ""],
        ["Sale window", company.saleWindow],
        ["Who should end up with it", company.successor],
        ["Valuation range", forSale ? company.valuation : ""],
        ["A buyer would want", forSale ? company.buyerWants : ""],
        ["Willing to move passive assets out before a sale", forSale && noted(company.investments) ? company.purify : ""],
        ["Shareholder agreement", yesNo(company.sha)],
        ["Buy-sell", company.sha === "yes" ? yesNo(company.shaBuySell) : ""],
        ["Buy-sell funded", company.sha === "yes" ? yesNo(company.shaFunded) : ""],
      ]);
    });
    push("A child or partner buying or inheriting a company", [["Expectation", source.succession]]);
    push("What this plan should answer", (source.goals || []).map((goal) => [goal, "Yes"]));
    const docs = documentGroups(source);
    if (docs.length) {
      out.push({
        title: "Documents to email",
        note: "Email these to ethan@marchandwealth.ca. One email is enough.",
        docs,
        pairs: [],
      });
    }
    return out;
  }

  function workLabel(value) {
    return { working: "Working", retired: "Retired", student: "Student", home: "At home" }[value] || "";
  }

  function summaryText(source) {
    return sections(source).map((section) => {
      if (section.docs) {
        const lines = [section.note];
        section.docs.forEach((group) => {
          lines.push(group.heading);
          group.items.forEach((item) => lines.push(`- ${item}`));
        });
        return `${section.title}\n${lines.join("\n")}`;
      }
      const lines = section.pairs.map(([label, value]) => `${label}: ${String(value).trim()}`);
      return `${section.title}\n${lines.join("\n")}`;
    }).join("\n\n");
  }

  function buildPdf(JsPDF, source, logoDataUrl) {
    const doc = new JsPDF({ unit: "pt", format: "letter" });
    const W = 612;
    const H = 792;
    const M = 54;
    const CW = W - M * 2;
    const BOTTOM = H - 86;
    let y = 0;
    const client = (source.people || []).find((person) => person.role === "client") || source.people?.[0] || {};
    const name = (client.name || "").trim() || "Client";

    const font = (family, style, size, color) => {
      doc.setFont(family, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const text = (str, x, yy, opts) => doc.text(pdfSafe(str), x, yy, opts);
    const wrapLines = (str, width) => {
      const raw = doc.splitTextToSize(pdfSafe(str), width);
      const lines = Array.isArray(raw) ? raw : [String(raw)];
      return lines.length ? lines : [""];
    };

    function header() {
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", M, 36, 124, 23);
      } else {
        font("times", "bold", 16, PDF.navydeep);
        text("Advisor Strategies", M, 56);
      }
      const kicker = "ADVANCED CASE INTAKE";
      font("helvetica", "bold", 7.5, PDF.golddim);
      const kickerWidth = doc.getTextWidth(kicker) + 0.9 * (kicker.length - 1);
      doc.text(kicker, W - M - kickerWidth, 48, { charSpace: 0.9 });
      font("helvetica", "normal", 8.5, PDF.inksoft);
      text(`${name}  ·  ${formatDate(source.date)}`, W - M, 60, { align: "right" });
      doc.setDrawColor(...PDF.gold);
      doc.setLineWidth(1.2);
      doc.line(M, 72, W - M, 72);
      y = 100;
    }

    header();
    font("times", "bold", 26, PDF.navydeep);
    text("Advanced case", M, y);
    y += 22;
    font("helvetica", "normal", 10.5, PDF.inksoft);
    wrapLines(`Prepared for ${name}. Completed ${formatDate(source.date)}.`, CW).forEach((line) => {
      font("helvetica", "normal", 10.5, PDF.inksoft);
      text(line, M, y);
      y += 14;
    });
    y += 8;
    const contact = [client.email, client.mobile].filter(filled).join("  ·  ");
    if (contact) {
      font("helvetica", "normal", 9.5, PDF.inksoft);
      text(contact, M, y);
      y += 18;
    }

    function linesFor(str, width, family, style, size) {
      font(family, style, size, PDF.ink);
      const wrapped = wrapLines(String(str), width);
      const fitted = [];
      wrapped.forEach((line) => {
        if (doc.getTextWidth(line) <= width + 0.25) {
          fitted.push(line);
          return;
        }
        let buf = "";
        [...line].forEach((ch) => {
          const trial = buf + ch;
          if (!buf || doc.getTextWidth(trial) <= width) buf = trial;
          else {
            fitted.push(buf);
            buf = ch;
          }
        });
        if (buf) fitted.push(buf);
      });
      return fitted.length ? fitted : [""];
    }

    function pairBlock(label, value) {
      font("helvetica", "bold", 9, PDF.navydeep);
      const safeLabel = pdfSafe(String(label));
      const labelWidth = doc.getTextWidth(safeLabel);
      const gap = 8;
      const valueX = M + labelWidth + gap;
      const valueW = Math.max(150, CW - labelWidth - gap);
      const valueLines = linesFor(value, valueW, "helvetica", "normal", 9.5);
      const lineH = 12;
      const h = 14 + (valueLines.length - 1) * lineH + 7;
      return {
        h,
        paint() {
          const base = y + 11;
          font("helvetica", "bold", 9, PDF.navydeep);
          text(safeLabel, M, base);
          valueLines.forEach((line, index) => {
            font("helvetica", "normal", 9.5, PDF.ink);
            text(line, valueX, base + index * lineH);
          });
          y += h;
          doc.setDrawColor(...PDF.line);
          doc.setLineWidth(0.4);
          doc.line(M, y, M + CW, y);
        },
      };
    }

    function lineBlock(item) {
      font("helvetica", "normal", 9.5, PDF.ink);
      const lines = wrapLines(`- ${item}`, CW - 12);
      const h = lines.length * 13 + 1;
      return {
        h,
        paint() {
          lines.forEach((line, index) => {
            font("helvetica", "normal", 9.5, PDF.ink);
            text(line, M, y + index * 13);
          });
          y += h;
        },
      };
    }

    function emailBlock() {
      const before = "Email these to ";
      const address = "ethan@marchandwealth.ca";
      const after = ". One email is enough.";
      const mail = "mailto:ethan@marchandwealth.ca?subject=Advanced%20planning%20documents";
      return {
        h: 18,
        paint() {
          font("helvetica", "normal", 9.5, PDF.ink);
          text(before, M, y);
          const beforeW = doc.getTextWidth(pdfSafe(before));
          font("helvetica", "normal", 9.5, PDF.golddim);
          doc.textWithLink(address, M + beforeW, y, { url: mail });
          const addressW = doc.getTextWidth(address);
          doc.setDrawColor(...PDF.golddim);
          doc.setLineWidth(0.4);
          doc.line(M + beforeW, y + 1.5, M + beforeW + addressW, y + 1.5);
          font("helvetica", "normal", 9.5, PDF.ink);
          text(after, M + beforeW + addressW, y);
          y += 18;
        },
      };
    }

    function headingHeight(title) {
      font("times", "bold", 14, PDF.navydeep);
      return wrapLines(title, CW).length * 18 + 6;
    }

    function paintHeading(title) {
      font("times", "bold", 14, PDF.navydeep);
      wrapLines(title, CW).forEach((line) => {
        font("times", "bold", 14, PDF.navydeep);
        text(line, M, y);
        y += 18;
      });
      y += 6;
    }

    sections(source).forEach((section) => {
      const blocks = section.docs
        ? [emailBlock(), ...section.docs.flatMap((group) => group.items.map((item) => lineBlock(item)))]
        : section.pairs.map(([label, value]) => pairBlock(label, value));
      let index = 0;
      while (index < blocks.length) {
        const headH = headingHeight(section.title);
        const secondH = index + 1 < blocks.length ? blocks[index + 1].h : 0;
        const need = headH + blocks[index].h + secondH;
        if (y + need > BOTTOM && y > 120) {
          doc.addPage();
          header();
        }
        paintHeading(section.title);
        const reserved = secondH ? 2 : 1;
        let written = 0;
        while (index < blocks.length) {
          const fits = y + blocks[index].h <= BOTTOM;
          if (!fits && written >= reserved) break;
          blocks[index].paint();
          index += 1;
          written += 1;
          if (!fits) break;
        }
        y += 16;
      }
    });

    font("helvetica", "normal", 8, PDF.inksoft);
    const disclaimer = wrapLines("This is a planning draft. It is not tax, legal, or investment advice, and nothing is implemented from this form alone. Tell your advisor if these facts change.", CW);
    const disclaimerH = 18 + disclaimer.length * 12;
    if (y + disclaimerH > BOTTOM) {
      doc.addPage();
      header();
    } else {
      y += 18;
    }
    disclaimer.forEach((line) => {
      font("helvetica", "normal", 8, PDF.inksoft);
      text(line, M, y);
      y += 12;
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...PDF.line);
      doc.setLineWidth(0.5);
      doc.line(M, H - 40, W - M, H - 40);
      font("helvetica", "normal", 7.5, PDF.inksoft);
      text("Advisor Strategies Inc.  ·  advisorstrategies.ca  ·  Ethan Marchand", M, H - 27);
      text(`Page ${i} of ${pages}`, W - M, H - 27, { align: "right" });
    }
    return doc;
  }

  function bytesToB64url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlToBytes(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function compactState(source) {
    const payload = { date: source.date };
    if (source.viewers?.length) payload.viewers = source.viewers;
    if (filled(source.viewersOther)) payload.viewersOther = source.viewersOther.trim();
    if (filled(source.succession)) payload.succession = source.succession.trim();
    if (source.goals?.length) payload.goals = source.goals;
    const life = {};
    Object.entries(source.life || {}).forEach(([key, value]) => {
      if (filled(value)) life[key] = String(value).trim();
    });
    if (Object.keys(life).length) payload.life = life;
    const home = {};
    Object.entries(source.home || {}).forEach(([key, value]) => {
      if (filled(value)) home[key] = String(value).trim();
    });
    if (Object.keys(home).length) payload.home = home;
    if (filled(source.spousalRrsp)) payload.spousalRrsp = source.spousalRrsp.trim();
    if (filled(source.lcge)) payload.lcge = source.lcge.trim();
    payload.people = (source.people || []).map((person) => {
      const blank = blankPerson(person.role);
      const out = { role: person.role === "spouse" || person.role === "dependant" ? person.role : "client" };
      if (person.id) out.id = person.id;
      Object.keys(blank).forEach((key) => {
        if (key === "id" || key === "role") return;
        if (typeof person[key] === "string" && person[key].trim() && person[key] !== blank[key]) out[key] = person[key].trim();
      });
      return out;
    });
    if (source.companies?.length) {
      payload.companies = source.companies.map((company) => {
        const blank = blankCompany();
        const out = {};
        if (company.id) out.id = company.id;
        Object.keys(blank).forEach((key) => {
          if (key === "id") return;
          if (typeof company[key] === "string" && company[key].trim() && company[key] !== blank[key]) out[key] = company[key].trim();
        });
        return out;
      });
    }
    return payload;
  }

  async function encodeState(source) {
    const json = JSON.stringify(compactState(source));
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream === "function") {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      const packed = new Uint8Array(await new Response(stream).arrayBuffer());
      return `z${bytesToB64url(packed)}`;
    }
    return `j${bytesToB64url(bytes)}`;
  }

  async function decodeState(payload) {
    const kind = payload.slice(0, 1);
    const bytes = b64urlToBytes(payload.slice(1));
    let jsonBytes = bytes;
    if (kind === "z" && typeof DecompressionStream === "function") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      jsonBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const parsed = JSON.parse(new TextDecoder().decode(jsonBytes));
    const next = blankModel();
    next.date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : next.date;
    next.viewers = Array.isArray(parsed.viewers) ? parsed.viewers.filter((item) => typeof item === "string") : [];
    next.viewersOther = String(parsed.viewersOther || "");
    next.succession = String(parsed.succession || "");
    next.goals = Array.isArray(parsed.goals) ? parsed.goals.filter((item) => typeof item === "string") : [];
    if (parsed.life && typeof parsed.life === "object") {
      Object.keys(next.life).forEach((key) => {
        if (typeof parsed.life[key] === "string") next.life[key] = parsed.life[key];
      });
    }
    if (parsed.home && typeof parsed.home === "object") {
      Object.keys(next.home).forEach((key) => {
        if (typeof parsed.home[key] === "string") next.home[key] = parsed.home[key];
      });
    }
    if (typeof parsed.spousalRrsp === "string") next.spousalRrsp = parsed.spousalRrsp;
    if (typeof parsed.lcge === "string") next.lcge = parsed.lcge;
    if (Array.isArray(parsed.people) && parsed.people.length) {
      next.people = parsed.people.map((person) => {
        const blank = blankPerson(person.role === "spouse" || person.role === "dependant" ? person.role : "client");
        Object.keys(blank).forEach((key) => {
          if (typeof person[key] === "string") blank[key] = person[key];
        });
        if (typeof person.id === "string" && person.id) blank.id = person.id;
        if (!blank.tfsaBalance && typeof person.tfsaNotice === "string") blank.tfsaBalance = person.tfsaNotice;
        const citizen = String(blank.citizenship || "").trim();
        const citizenLower = citizen.toLowerCase();
        if (citizenLower === "canadian" || citizenLower === "canada" || citizenLower === "yes") blank.citizenship = "canadian";
        else if (citizenLower === "other" || citizenLower === "not canadian" || citizenLower === "no") blank.citizenship = "other";
        else if (citizen) {
          blank.citizenship = "other";
          if (!blank.citizenshipCountry) blank.citizenshipCountry = citizen;
        }
        if (blank.citizenship === "canadian") blank.citizenshipCountry = "";
        if (blank.role === "dependant") {
          blank.citizenship = "";
          blank.citizenshipCountry = "";
        }
        if (!blank.ownsProperty && [person.reNames, person.reValue, person.reCost, person.reNotes, person.reRent].some(noted)) {
          blank.ownsProperty = "yes";
        }
        if (blank.role === "dependant" && !blank.companyRole && (noted(person.shares) || noted(person.worksIn))) {
          blank.companyRole = "yes";
        }
        return blank;
      });
      if (!next.people.some((person) => person.role === "client")) next.people[0].role = "client";
      if (!next.home.names) {
        const donor = parsed.people.find((person) => noted(person.homeNames));
        if (donor) {
          next.home.names = String(donor.homeNames || "");
          next.home.value = String(donor.homeValue || "");
          next.home.mortgage = String(donor.homeMortgage || "");
          next.home.rate = String(donor.homeRate || "");
          next.home.renewal = String(donor.homeRenewal || "");
        }
      }
      if (!next.spousalRrsp) {
        const donor = parsed.people.find((person) => noted(person.spousalRrsp));
        if (donor) next.spousalRrsp = String(donor.spousalRrsp);
      }
    }
    if (Array.isArray(parsed.companies)) {
      next.companies = parsed.companies.map((company) => {
        const blank = blankCompany();
        Object.keys(blank).forEach((key) => {
          if (typeof company[key] === "string") blank[key] = company[key];
        });
        if (!blank.legalName && typeof company.callName === "string") blank.legalName = company.callName;
        if (typeof company.id === "string" && company.id) blank.id = company.id;
        return blank;
      });
      if (!next.lcge) {
        const mapped = parsed.companies.map((company) => {
          const text = String(company.lcge || "").trim().toLowerCase();
          if (text === "yes" || text === "used") return "Used";
          if (text === "no" || text === "not used") return "Not used";
          if (text === "not sure") return "Not sure";
          return "";
        });
        next.lcge = mapped.find((value) => value === "Used")
          || mapped.find((value) => value === "Not used")
          || mapped.find((value) => value === "Not sure")
          || "";
      }
    }
    return next;
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { buildPdf, summaryText, sections, blankModel, encodeState, decodeState };
  }
  if (typeof document === "undefined") return;

  const form = document.getElementById("ac-form");
  if (!form) return;

  const progress = document.getElementById("ac-progress");
  const stepName = document.getElementById("ac-step-name");
  const progressBar = document.getElementById("ac-progress-bar");
  const stepList = document.getElementById("ac-step-list");
  const nextLabel = document.getElementById("ac-next-label");
  const backBtn = document.getElementById("ac-back");
  const nextBtn = document.getElementById("ac-next");
  const visited = new Set();
  const peopleMount = document.getElementById("ac-people");
  const bridgeMount = document.getElementById("ac-bridge");
  const companyMount = document.getElementById("ac-companies");
  let cursor = 0;
  let showAll = false;

  const LIFE_FIELDS = [
    ["loved", "ac-life-loved"], ["need", "ac-life-need"], ["want", "ac-life-want"],
    ["stop", "ac-life-stop"], ["cash", "ac-life-cash"], ["cashName", "ac-life-cash-name"],
    ["gifts", "ac-life-gifts"], ["changes", "ac-life-changes"],
  ];

  function readLife() {
    LIFE_FIELDS.forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) model.life[key] = el.value;
    });
    model.viewers = [...form.querySelectorAll("[data-viewer]:checked")].map((el) => el.dataset.viewer);
    model.viewersOther = document.getElementById("ac-viewers-other").value;
    model.goals = [...form.querySelectorAll("[data-goal]:checked")].map((el) => el.dataset.goal);
  }

  function writeLife() {
    LIFE_FIELDS.forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.value = model.life[key] || "";
    });
    form.querySelectorAll("[data-viewer]").forEach((el) => {
      el.checked = model.viewers.includes(el.dataset.viewer);
    });
    document.getElementById("ac-viewers-other").value = model.viewersOther || "";
    form.querySelectorAll("[data-goal]").forEach((el) => {
      el.checked = model.goals.includes(el.dataset.goal);
    });
  }

  function selectOptions(options, current) {
    return options.map(([value, label]) => (
      `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(label)}</option>`
    )).join("");
  }

  function field(personOrCompany, spec, scope) {
    const value = personOrCompany[spec.key] ?? "";
    const common = `data-key="${spec.key}" data-scope="${scope}" class="${INPUT}"`;
    let control;
    if (spec.type === "area") {
      control = `<textarea ${common} rows="${spec.rows || 3}">${esc(value)}</textarea>`;
    } else if (spec.type === "province") {
      control = `<select ${common}>${selectOptions(PROVINCES, value || "AB")}</select>`;
    } else if (spec.type === "select") {
      control = `<select ${common}>${selectOptions(spec.options, value)}</select>`;
    } else if (spec.type === "check") {
      control = `<input data-key="${spec.key}" data-scope="${scope}" type="checkbox"${value ? " checked" : ""} class="mt-0.5">`;
      return `<label class="flex items-start gap-3 text-sm font-medium text-navydeep">${control}<span>${esc(spec.label)}</span></label>`;
    } else {
      const mode = spec.mode ? ` inputmode="${spec.mode}"` : "";
      const date = spec.type === "date" ? ` type="date"` : "";
      control = `<input ${common}${date}${mode} value="${esc(value)}">`;
    }
    const hint = spec.hint ? `<span class="mt-1 block text-[13px] font-normal leading-5 text-inksoft">${esc(spec.hint)}</span>` : "";
    return `<label class="block text-sm font-medium text-navydeep">${esc(spec.label)}${hint}${control}</label>`;
  }

  const YESNO = [["", "Choose one"], ["yes", "Yes"], ["no", "No"]];
  const WORK = [["working", "Working"], ["retired", "Retired"], ["student", "Student"], ["home", "At home"]];
  const ROLE = [["client", "Client"], ["spouse", "Spouse or partner"], ["dependant", "Child or other dependant"]];

  const INCOME_FIELDS = [
    { key: "salaryLast", label: "Salary last year", mode: "decimal" },
    { key: "salaryThis", label: "Salary expected this year", mode: "decimal" },
    { key: "nonEligLast", label: "Non-eligible dividends last year", mode: "decimal" },
    { key: "nonEligThis", label: "Non-eligible dividends expected this year", mode: "decimal" },
    { key: "eligLast", label: "Eligible dividends last year", hint: "Paid only after the company earns more than $500,000.", mode: "decimal" },
    { key: "eligThis", label: "Eligible dividends expected this year", mode: "decimal" },
    { key: "otherLast", label: "Other income last year", hint: "Pension, CPP, OAS, or a job somewhere else.", type: "area", rows: 2 },
    { key: "otherThis", label: "Other income expected this year", type: "area", rows: 2 },
    { key: "tfsaRoom", label: "TFSA contribution room available", mode: "decimal" },
    { key: "tfsaBalance", label: "What is your TFSA balance?", mode: "decimal" },
    { key: "tfsaContributed", label: "TFSA contributions this year", mode: "decimal" },
    { key: "tfsaWithdrawn", label: "TFSA withdrawals this year", mode: "decimal" },
    { key: "rrspRoom", label: "RRSP contribution room available", mode: "decimal" },
    { key: "rrspNoticeYear", label: "Year of the RRSP Notice of Assessment" },
    { key: "rrspContributed", label: "RRSP contributions already made this year", mode: "decimal" },
    { key: "pension", label: "An old-job pension, if any", type: "area", rows: 2 },
  ];
  const PROPERTY_FIELDS = [
    { key: "reNames", label: "Other personal real estate, whose name" },
    { key: "reCost", label: "Other real estate, what they paid", mode: "decimal" },
    { key: "reValue", label: "Other real estate, rough value", mode: "decimal" },
    { key: "reMortgage", label: "Other real estate mortgage", mode: "decimal" },
    { key: "reRate", label: "Other real estate rate" },
    { key: "reRenewal", label: "Other real estate renewal" },
    { key: "reOccupied", label: "Does anyone live in it?", type: "select", options: YESNO },
    { key: "reNotes", label: "If there is more than one property, describe the rest", type: "area", rows: 2 },
    { key: "reRent", label: "Net rent received last year", mode: "decimal" },
    { key: "reRentOn", label: "Whose return is that rent on" },
  ];
  const OWNED_FIELDS = [
    { key: "nonregValue", label: "Non-registered investments, value", mode: "decimal" },
    { key: "nonregCost", label: "Non-registered investments, what they paid", mode: "decimal" },
    { key: "personalDebt", label: "Personal debt that is not a mortgage", type: "area", rows: 2 },
    { key: "insurance", label: "Personal insurance", hint: "Company, type, owner, insured, beneficiary, coverage, premium, and renewal date.", type: "area", rows: 4 },
    { key: "will", label: "Will", type: "select", options: YESNO },
    { key: "poa", label: "Power of attorney", type: "select", options: YESNO },
    { key: "directive", label: "Personal directive", type: "select", options: YESNO },
  ];
  const HOME_FIELDS = [
    { key: "names", label: "Whose names are on title" },
    { key: "value", label: "Rough value", mode: "decimal" },
    { key: "mortgage", label: "Mortgage balance", mode: "decimal" },
    { key: "rate", label: "Mortgage rate" },
    { key: "renewal", label: "Mortgage renewal" },
  ];

  function ask(titleHtml, body = "") {
    return `<div class="space-y-4">${titleHtml}${body}</div>`;
  }

  function renderPeople() {
    const spouseExists = model.people.some((person) => person.role === "spouse");
    document.getElementById("ac-add-spouse").classList.toggle("hidden", spouseExists);
    const cards = model.people.map((person, index) => {
      const identity = `
        ${person.role === "client" ? "" : field(person, { key: "role", label: "Who is this?", type: "select", options: ROLE.filter(([value]) => value !== "client") }, "person")}
        ${field(person, { key: "name", label: "Name" }, "person")}
        ${field(person, { key: "dob", label: "Date of birth", type: "date" }, "person")}
        ${field(person, { key: "province", label: "Province of residence", type: "province" }, "person")}
        ${person.role === "dependant" ? field(person, { key: "relationship", label: "Relationship to the client" }, "person") : ""}
        ${field(person, { key: "taxResident", label: "Canadian resident for tax", type: "select", options: YESNO }, "person")}
        ${person.role === "dependant" ? "" : `
          ${field(person, { key: "citizenship", label: "Citizenship", type: "select", options: [["", "Choose one"], ["canadian", "Canadian"], ["other", "Not Canadian"]] }, "person")}
          <div data-reveal="citizenship" class="${person.citizenship === "other" ? "" : "hidden"}">
            ${field(person, { key: "citizenshipCountry", label: "Which country?" }, "person")}
          </div>
        `}
        ${field(person, { key: "workStatus", label: "Working, retired, student, or at home", type: "select", options: person.role === "dependant" ? [["", "Choose one"], ...WORK] : WORK }, "person")}
        ${person.role === "client" ? `${field(person, { key: "email", label: "Email" }, "person")}${field(person, { key: "mobile", label: "Mobile" }, "person")}` : ""}
      `;
      const roleLabel = person.role === "client" ? "Client" : person.role === "spouse" ? "Spouse or partner" : "Dependant";
      const school = person.role === "dependant" ? `
        <div data-reveal="school" class="${person.workStatus === "student" ? "" : "hidden"}">
          ${ask(
            field(person, { key: "schoolCost", label: "If this child is starting school, about how much per year?", hint: "One number.", mode: "decimal" }, "person"),
            field(person, { key: "schoolYears", label: "For how many years?", mode: "decimal" }, "person"),
          )}
        </div>
      ` : "";
      const adult = person.role === "dependant" ? "" : `
        ${ask(
          `<h3 class="font-serif text-lg text-navydeep">What ${esc(displayName(person, index))} received</h3>`,
          `<div class="grid gap-4 sm:grid-cols-2">${INCOME_FIELDS.slice(0, 6).map((spec) => field(person, spec, "person")).join("")}</div>
          ${INCOME_FIELDS.slice(6).map((spec) => field(person, spec, "person")).join("")}`,
        )}
        ${ask(
          field(person, { key: "ownsProperty", label: "Do they own a second property?", type: "select", options: YESNO }, "person"),
          `<div data-reveal="property" class="${person.ownsProperty === "yes" ? "" : "hidden"} space-y-4">${PROPERTY_FIELDS.map((spec) => field(person, spec, "person")).join("")}</div>`,
        )}
        ${ask(
          `<h3 class="font-serif text-lg text-navydeep">What they own outside any company</h3>`,
          OWNED_FIELDS.map((spec) => field(person, spec, "person")).join(""),
        )}
      `;
      return `<article class="space-y-4 rounded-sm border border-gold bg-white/80 p-4" data-person="${esc(person.id)}">
        ${person.role === "client" ? "" : `<div class="flex justify-end"><button type="button" data-remove-person="${esc(person.id)}" class="text-sm font-medium text-navydeep underline">Remove</button></div>`}
        ${ask(`<p class="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-golddim">${esc(roleLabel)}</p>`, identity)}
        ${school}
        ${adult}
      </article>`;
    }).join("");
    const household = `
      <article class="space-y-4 rounded-sm border border-line bg-white/80 p-4" data-home>
        ${ask(
          `<h3 class="font-serif text-lg text-navydeep">The home</h3>`,
          HOME_FIELDS.map((spec) => field(model.home, spec, "home")).join(""),
        )}
        ${field({ spousalRrsp: model.spousalRrsp }, { key: "spousalRrsp", label: "Spousal RRSP", hint: "Who contributes, and who owns it. Leave this blank if there is none.", type: "area", rows: 2 }, "household")}
      </article>
    `;
    peopleMount.innerHTML = cards + household;
  }

  function renderBridge() {
    const companyFields = model.companies.map((company) => `
      <div class="flex items-end gap-3" data-company="${esc(company.id)}">
        <label class="block flex-1 text-sm font-medium text-navydeep">Legal name
          <input data-key="legalName" data-scope="company" class="${INPUT}" value="${esc(company.legalName)}">
        </label>
        <button type="button" data-remove-company="${esc(company.id)}" class="mb-3 text-sm font-medium text-navydeep underline">Remove</button>
      </div>
    `).join("");
    const shareFields = (person) => `
      ${field(person, { key: "shares", label: "Shares this person owns", hint: "Which company, which class, what percent, when they got the shares, and what they paid.", type: "area", rows: 3 }, "person")}
      ${field(person, { key: "worksIn", label: "Work in a company", hint: "Which company, what they do, hours in a normal week, and since when.", type: "area", rows: 3 }, "person")}
    `;
    const peopleFields = model.people.map((person, index) => `
      <div class="space-y-4 rounded-sm border border-line bg-white/80 p-4" data-person="${esc(person.id)}">
        <p class="text-sm font-semibold text-navydeep">${esc(displayName(person, index))}</p>
        ${person.role === "dependant"
          ? ask(
            field(person, { key: "companyRole", label: "Does this child own shares or work in a company?", type: "select", options: YESNO }, "person"),
            `<div data-reveal="childRole" class="${person.companyRole === "yes" ? "" : "hidden"} space-y-4">${shareFields(person)}</div>`,
          )
          : shareFields(person)}
      </div>
    `).join("");
    bridgeMount.innerHTML = `
      <div class="space-y-3">${companyFields || `<p class="text-sm leading-6 text-inksoft">No company yet. Add each one you own, even in part.</p>`}</div>
      <button type="button" id="ac-add-company" class="px-4 py-2.5 rounded-sm border border-navydeep text-sm font-semibold text-navydeep hover:bg-navydeep hover:text-white transition">Add a company</button>
      ${peopleFields}
      <label class="block text-sm font-medium text-navydeep">Does a child or partner expect to buy or inherit a company?
        <textarea id="ac-succession" rows="3" class="${INPUT}">${esc(model.succession || "")}</textarea>
      </label>
    `;
    document.getElementById("ac-add-company").addEventListener("click", addCompany);
  }

  const COMPANY_FIELDS = [
    { key: "yearEnd", label: "Year-end", hint: "Month and day." },
    { key: "does", label: "What it does", hint: "One line." },
    { key: "provinceInc", label: "Province of incorporation", type: "province" },
    { key: "operates", label: "Where it actually operates" },
    { key: "associated", label: "Is it associated with another company you own?", type: "select", options: YESNO },
    { key: "associatedWith", label: "Which company, if it is associated", reveal: "associatedWith" },
    { key: "revenue", label: "Last year revenue", mode: "decimal" },
    { key: "expenses", label: "Last year expenses", mode: "decimal" },
    { key: "profit", label: "Last year profit before anyone is paid", mode: "decimal" },
    { key: "forecast", label: "What you expect for the next three years", hint: "Revenue, expenses, and profit for each year. Large capital spending belongs in the expenses.", type: "area", rows: 4 },
    { key: "operatingCash", label: "Cash the business must keep to operate", mode: "decimal" },
    { key: "surplusCash", label: "Cash and GICs beyond that", mode: "decimal" },
    { key: "investments", label: "Investments", hint: "What they are, and the market value.", type: "area", rows: 2 },
    { key: "investmentCost", label: "What the company paid for those investments", mode: "decimal" },
    { key: "passiveIncome", label: "Interest, dividends, and rents earned last year", type: "area", rows: 2 },
    { key: "gainsSold", label: "Gains already sold", mode: "decimal" },
    { key: "gainsUnsold", label: "Gains not yet sold", mode: "decimal" },
    { key: "debt", label: "Debt", hint: "Lender, balance, rate, payment, and what is pledged.", type: "area", rows: 3 },
    { key: "shareholderLoans", label: "Shareholder loans", hint: "Who owes whom, and how much.", type: "area", rows: 2 },
    { key: "corpIns", label: "Does the company own life insurance?", type: "select", options: YESNO },
    { key: "corpInsDetail", label: "The policy", hint: "Whose life, the amount, term or permanent, the premium, and the renewal or cash value if you know it.", type: "area", rows: 3, reveal: "corpIns" },
    { key: "saleWindow", label: "If this company might be sold", type: "select", options: [["", "Choose one"], ["Not selling", "Not selling"], ["1–3 years", "1–3 years"], ["3–7 years", "3–7 years"], ["7–15 years", "7–15 years"], ["Unknown", "Unknown"]] },
    { key: "successor", label: "Who should end up with it", type: "select", options: [["", "Choose one"], ["You", "You"], ["A child", "A child"], ["A partner", "A partner"], ["A buyer", "A buyer"], ["Unknown", "Unknown"]] },
    { key: "valuation", label: "Valuation range, if you have had one", reveal: "saleExtra" },
    { key: "buyerWants", label: "Would a buyer want the shares or the assets", type: "select", options: [["", "Choose one"], ["Shares", "Shares"], ["Assets", "Assets"], ["Not sure", "Not sure"]], reveal: "saleExtra" },
    { key: "purify", label: "Are you willing to move passive assets out before a sale?", type: "select", options: [["", "Choose one"], ["Yes", "Yes"], ["No", "No"], ["Not sure", "Not sure"]], reveal: "purify" },
    { key: "sha", label: "Shareholder agreement", type: "select", options: YESNO },
    { key: "shaBuySell", label: "Is there a buy-sell?", type: "select", options: YESNO, reveal: "shaExtra" },
    { key: "shaFunded", label: "Is the buy-sell funded?", type: "select", options: YESNO, reveal: "shaExtra" },
  ];

  const COMPANY_GROUP = {
    yearEnd: "facts", does: "facts", provinceInc: "facts", operates: "facts",
    revenue: "facts", expenses: "facts", profit: "facts", forecast: "facts",
    operatingCash: "facts", surplusCash: "facts", investments: "facts", investmentCost: "facts",
    passiveIncome: "facts", gainsSold: "facts", gainsUnsold: "facts", debt: "facts", shareholderLoans: "facts",
    associated: "associated", associatedWith: "associated",
    corpIns: "insurance", corpInsDetail: "insurance",
    saleWindow: "sale", successor: "sale", valuation: "sale", buyerWants: "sale", purify: "sale",
    sha: "sha", shaBuySell: "sha", shaFunded: "sha",
  };
  COMPANY_FIELDS.forEach((spec) => { spec.group = COMPANY_GROUP[spec.key]; });

  function companyGroup(company, group, titleKey) {
    const specs = COMPANY_FIELDS.filter((spec) => spec.group === group);
    const title = specs.find((spec) => spec.key === titleKey);
    const rest = specs.filter((spec) => spec !== title);
    const body = rest.map((spec) => {
      const html = field(company, spec, "company");
      if (!spec.reveal) return html;
      const open = companyReveal(company, spec.reveal);
      return `<div data-reveal="${spec.reveal}" class="${open ? "" : "hidden"}">${html}</div>`;
    }).join("");
    return title ? ask(field(company, title, "company"), body) : "";
  }

  function companyQuestions(company) {
    const facts = COMPANY_FIELDS.filter((spec) => spec.group === "facts").map((spec) => field(company, spec, "company")).join("");
    return `
      ${ask(`<h3 class="font-serif text-2xl text-navydeep">${esc(company.legalName.trim() || "Unnamed company")}</h3>`, facts)}
      ${companyGroup(company, "associated", "associated")}
      ${companyGroup(company, "insurance", "corpIns")}
      ${companyGroup(company, "sale", "saleWindow")}
      ${companyGroup(company, "sha", "sha")}
    `;
  }

  function companyReveal(company, key) {
    if (key === "associatedWith") return company.associated === "yes";
    if (key === "saleExtra") return selling(company);
    if (key === "purify") return selling(company) && noted(company.investments);
    if (key === "corpIns") return company.corpIns === "yes";
    if (key === "shaExtra") return company.sha === "yes";
    return true;
  }

  function personReveal(person, key) {
    if (key === "property") return person.ownsProperty === "yes";
    if (key === "school") return person.workStatus === "student";
    if (key === "childRole") return person.companyRole === "yes";
    if (key === "citizenship") return person.citizenship === "other";
    return true;
  }

  function renderCompanies() {
    const add = `<button type="button" id="ac-add-company-more" class="px-4 py-2.5 rounded-sm border border-navydeep text-sm font-semibold text-navydeep hover:bg-navydeep hover:text-white transition">${model.companies.length ? "Add another company" : "Add a company"}</button>`;
    const family = field({ lcge: model.lcge }, {
      key: "lcge",
      label: "Has anyone in the family used the lifetime capital gains exemption?",
      type: "select",
      options: [["", "Choose one"], ["Used", "Used"], ["Not used", "Not used"], ["Not sure", "Not sure"]],
    }, "household");
    const cards = model.companies.map((company, index) => `
      <article class="space-y-4 rounded-sm border border-gold bg-white/80 p-4" data-company="${esc(company.id)}">
        <p class="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-golddim">Company ${index + 1}</p>
        ${companyQuestions(company)}
      </article>
    `).join("");
    const empty = model.companies.length ? "" : `<p class="text-sm leading-6 text-inksoft">Add each company you own, even in part. The legal name carries to this page, and it is not asked again.</p>`;
    companyMount.innerHTML = `${family}${empty}${cards}${add}`;
    document.getElementById("ac-add-company-more").addEventListener("click", addCompany);
  }

  function readMounted() {
    readLife();
    const succession = document.getElementById("ac-succession");
    if (succession) model.succession = succession.value;
    form.querySelectorAll("[data-person]").forEach((card) => {
      const person = model.people.find((item) => item.id === card.dataset.person);
      if (!person) return;
      card.querySelectorAll("[data-scope='person']").forEach((el) => {
        person[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
      });
    });
    form.querySelectorAll("[data-company]").forEach((card) => {
      const company = model.companies.find((item) => item.id === card.dataset.company);
      if (!company) return;
      card.querySelectorAll("[data-scope='company']").forEach((el) => {
        company[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
      });
    });
    form.querySelectorAll("[data-scope='home']").forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(model.home, el.dataset.key)) model.home[el.dataset.key] = el.value;
    });
    form.querySelectorAll("[data-scope='household']").forEach((el) => {
      if (el.dataset.key === "spousalRrsp" || el.dataset.key === "lcge") model[el.dataset.key] = el.value;
    });
    const client = clientPerson();
    if (client && client.role !== "client") client.role = "client";
  }

  function renderStepList() {
    if (!stepList.childElementCount) {
      STEPS.forEach((id, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ac-step-pill";
        button.dataset.go = String(index);
        button.textContent = STEP_LABELS[index];
        item.append(button);
        stepList.append(item);
      });
    }
    [...stepList.querySelectorAll(".ac-step-pill")].forEach((pill, position) => {
      const active = position === cursor;
      pill.classList.toggle("is-active", active);
      pill.classList.toggle("is-done", !active && visited.has(STEPS[position]));
      if (active) pill.setAttribute("aria-current", "step");
      else pill.removeAttribute("aria-current");
    });
  }

  function showStep() {
    visited.add(STEPS[cursor]);
    form.querySelectorAll("[data-step]").forEach((step) => {
      step.classList.toggle("hidden", !showAll && step.dataset.step !== STEPS[cursor]);
    });
    progress.textContent = showAll ? "Every section" : `Part ${cursor + 1} of ${STEPS.length}`;
    stepName.textContent = STEP_LABELS[cursor];
    progressBar.style.width = `${Math.round(((cursor + 1) / STEPS.length) * 100)}%`;
    renderStepList();
    document.getElementById("ac-nav").classList.toggle("hidden", showAll);
    backBtn.classList.toggle("hidden", cursor === 0);
    nextBtn.classList.toggle("hidden", cursor === STEPS.length - 1);
    if (cursor < STEPS.length - 1) nextLabel.textContent = `Next: ${STEP_LABELS[cursor + 1]}`;
    renderDocuments();
  }

  function setShowAll(next) {
    showAll = next;
    const toggle = document.getElementById("ac-view-toggle");
    toggle.setAttribute("aria-pressed", String(showAll));
    toggle.textContent = showAll ? "One step at a time" : "Show every section";
    if (showAll) {
      readMounted();
      renderPeople();
      renderBridge();
      renderCompanies();
    }
    showStep();
    if (!showAll) document.getElementById("ac-stepper").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderDocuments() {
    const mount = document.getElementById("ac-documents");
    if (!mount) return;
    const groups = documentGroups(model);
    const mail = `<a class="font-medium text-navydeep underline" href="mailto:ethan@marchandwealth.ca?subject=Advanced%20planning%20documents">ethan@marchandwealth.ca</a>`;
    if (!groups.length) {
      mount.innerHTML = `<p>As you fill this in, the documents to email ${mail} are listed here. Do not upload them.</p>`;
      return;
    }
    const lists = groups.map((group) => `
      <div class="mt-3">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-golddim">${esc(group.heading)}</p>
        <ul class="mt-2 flex flex-col gap-2 text-navydeep">${group.items.map((item) => `<li class="flex gap-2"><span aria-hidden="true">·</span><span>${esc(item)}</span></li>`).join("")}</ul>
      </div>
    `).join("");
    mount.innerHTML = `<p>Email these to ${mail}. One email is enough.</p>${lists}`;
  }

  function refreshStep() {
    const step = STEPS[cursor];
    if (step === "people") renderPeople();
    if (step === "bridge") renderBridge();
    if (step === "companies") renderCompanies();
  }

  function go(next) {
    readMounted();
    if (!showAll && next > cursor && STEPS[cursor] === "consent" && !document.getElementById("ac-consent").checked) {
      document.getElementById("ac-consent").focus();
      return;
    }
    cursor = Math.max(0, Math.min(STEPS.length - 1, next));
    refreshStep();
    showStep();
    const target = showAll
      ? form.querySelector(`[data-step="${STEPS[cursor]}"]`)
      : document.getElementById("ac-stepper");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addCompany() {
    readMounted();
    model.companies.push(blankCompany());
    renderBridge();
    renderCompanies();
  }

  function applyReveals(card, record, openFor) {
    card.querySelectorAll("[data-reveal]").forEach((wrap) => {
      const open = openFor(wrap.dataset.reveal);
      wrap.classList.toggle("hidden", !open);
      if (!open) {
        wrap.querySelectorAll("[data-key]").forEach((input) => {
          input.value = "";
          record[input.dataset.key] = "";
        });
      }
    });
  }

  form.addEventListener("input", (event) => {
    const el = event.target;
    if (el.dataset?.scope === "person") {
      const card = el.closest("[data-person]");
      const person = model.people.find((item) => item.id === card?.dataset.person);
      if (!person) return;
      person[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
      if (card) applyReveals(card, person, (key) => personReveal(person, key));
    }
    if (el.dataset?.scope === "home" && Object.prototype.hasOwnProperty.call(model.home, el.dataset.key)) {
      model.home[el.dataset.key] = el.value;
    }
    if (el.dataset?.scope === "household" && (el.dataset.key === "spousalRrsp" || el.dataset.key === "lcge")) {
      model[el.dataset.key] = el.value;
    }
    if (el.dataset?.scope === "company") {
      const card = el.closest("[data-company]");
      const company = model.companies.find((item) => item.id === card?.dataset.company);
      if (!company) return;
      company[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
      if (card) applyReveals(card, company, (key) => companyReveal(company, key));
    }
    renderDocuments();
  });

  form.addEventListener("change", (event) => {
    const el = event.target;
    if (el.dataset?.scope === "person" && el.dataset.key === "role") {
      readMounted();
      const clients = model.people.filter((person) => person.role === "client");
      if (clients.length > 1) {
        const current = model.people.find((person) => person.id === el.closest("[data-person]")?.dataset.person);
        model.people.forEach((person) => {
          if (person !== current && person.role === "client") person.role = "spouse";
        });
      }
      if (!model.people.some((person) => person.role === "client")) model.people[0].role = "client";
      renderPeople();
      renderBridge();
      renderDocuments();
    }
  });

  form.addEventListener("click", (event) => {
    const removePerson = event.target.closest("[data-remove-person]")?.dataset.removePerson;
    const removeCompany = event.target.closest("[data-remove-company]")?.dataset.removeCompany;
    if (!removePerson && !removeCompany) return;
    readMounted();
    if (removePerson) model.people = model.people.filter((person) => person.id !== removePerson || person.role === "client");
    if (removeCompany) model.companies = model.companies.filter((company) => company.id !== removeCompany);
    renderPeople();
    renderBridge();
    renderCompanies();
    renderDocuments();
  });

  document.getElementById("ac-add-spouse").addEventListener("click", () => {
    readMounted();
    if (!model.people.some((person) => person.role === "spouse")) model.people.push(blankPerson("spouse"));
    renderPeople();
    renderBridge();
  });
  document.getElementById("ac-add-dependant").addEventListener("click", () => {
    readMounted();
    model.people.push(blankPerson("dependant"));
    renderPeople();
    renderBridge();
  });

  document.getElementById("ac-view-toggle").addEventListener("click", () => setShowAll(!showAll));
  backBtn.addEventListener("click", () => go(cursor - 1));
  nextBtn.addEventListener("click", () => go(cursor + 1));
  stepList.addEventListener("click", (event) => {
    const pill = event.target.closest("[data-go]");
    if (pill) go(Number(pill.dataset.go));
  });
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && event.target.type !== "submit") {
      event.preventDefault();
    }
  });

  function applyModel() {
    writeLife();
    renderPeople();
    renderBridge();
    renderCompanies();
    renderDocuments();
  }

  function caseHasEntries() {
    readMounted();
    const client = clientPerson();
    if (filled(client?.name) || filled(client?.email) || filled(client?.mobile)) return true;
    if (model.people.length > 1 || model.companies.length) return true;
    if (model.viewers.length || filled(model.viewersOther) || filled(model.succession) || model.goals.length) return true;
    return Object.values(model.life).some((value) => filled(value));
  }

  function samplePerson(role, values) {
    return Object.assign(blankPerson(role), values);
  }

  function sampleCompany(values) {
    return Object.assign(blankCompany(), values);
  }

  function loadSample() {
    if (caseHasEntries() && !confirm("Replace this case with the sample?")) return;
    const client = samplePerson("client", {
      name: "Alex Chen",
      dob: "1978-02-19",
      province: "AB",
      taxResident: "yes",
      citizenship: "canadian",
      workStatus: "working",
      email: "alex.chen@example.com",
      mobile: "780-555-0162",
      salaryLast: "156000",
      salaryThis: "162000",
      eligLast: "40000",
      eligThis: "48000",
      nonEligLast: "0",
      nonEligThis: "0",
      otherLast: "None.",
      otherThis: "None expected.",
      tfsaRoom: "6500",
      rrspRoom: "24600",
      rrspNoticeYear: "2025",
      rrspContributed: "9000",
      tfsaBalance: "103000",
      tfsaContributed: "6500",
      tfsaWithdrawn: "0",
      pension: "A defined-contribution pension from a job that ended in 2016. About $67,000.",
      ownsProperty: "yes",
      reNames: "Alex Chen",
      reCost: "198000",
      reValue: "345000",
      reMortgage: "96000",
      reRate: "4.79%",
      reRenewal: "August 2028",
      reOccupied: "yes",
      reNotes: "A rental condo in Edmonton. The same tenant has been there since 2022.",
      reRent: "11200",
      reRentOn: "Alex Chen",
      nonregValue: "188000",
      nonregCost: "121000",
      personalDebt: "A line of credit of $7,500 at prime. No other personal debt.",
      insurance: "Term life, Canada Life, policy 552014. Alex owns it, Alex is insured, Jordan is the beneficiary. $800,000, $82 a month, renews in 2032.",
      will: "yes",
      poa: "yes",
      directive: "yes",
      shares: "Chen Holdings Ltd., class A voting, 70%, acquired in 2016 for $100. Northline Mechanical Ltd., class A voting, 100%, acquired in 2012 for $200.",
      worksIn: "Northline Mechanical Ltd., owner and estimator, about 40 hours a week, since 2012.",
    });
    const spouse = samplePerson("spouse", {
      name: "Jordan Chen",
      dob: "1981-01-27",
      province: "AB",
      taxResident: "yes",
      citizenship: "canadian",
      workStatus: "working",
      salaryLast: "91000",
      salaryThis: "94000",
      eligLast: "15000",
      eligThis: "18000",
      nonEligLast: "0",
      nonEligThis: "0",
      otherLast: "None.",
      otherThis: "None expected.",
      tfsaRoom: "4200",
      rrspRoom: "11400",
      rrspNoticeYear: "2025",
      rrspContributed: "5000",
      tfsaBalance: "73500",
      tfsaContributed: "7000",
      tfsaWithdrawn: "1500",
      pension: "None.",
      ownsProperty: "no",
      nonregValue: "41000",
      nonregCost: "33000",
      personalDebt: "None.",
      insurance: "Term life, Canada Life, policy 552088. Jordan owns it, Jordan is insured, Alex is the beneficiary. $400,000, $41 a month, renews in 2032.",
      will: "yes",
      poa: "yes",
      directive: "no",
      shares: "Chen Holdings Ltd., class A voting, 30%, acquired in 2016 for $50.",
      worksIn: "Chen Holdings Ltd., bookkeeping, about 6 hours a week, since 2018.",
    });
    const child = samplePerson("dependant", {
      name: "Sam Chen",
      dob: "2007-03-09",
      province: "AB",
      relationship: "Child",
      taxResident: "yes",
      workStatus: "student",
      schoolCost: "24000",
      schoolYears: "5",
      companyRole: "yes",
      shares: "None.",
      worksIn: "Northline Mechanical Ltd., summer help, about 25 hours a week in July and August, since 2025.",
    });
    model = {
      date: todayIso(),
      viewers: ["Spouse", "Accountant"],
      viewersOther: "Dana Okonkwo, lawyer",
      life: {
        loved: "Three days in the shop, winters quieter, and the lake for two weeks in July.",
        need: "125000",
        want: "155000",
        stop: "Age 60, if the operating company has sold.",
        cash: "45000",
        cashName: "Joint, Alex Chen and Jordan Chen",
        gifts: "The Edmonton house to Sam, once both parents are gone.",
        changes: "Sam starts university in 2028.",
      },
      home: {
        names: "Alex Chen and Jordan Chen",
        value: "780000",
        mortgage: "265000",
        rate: "5.04%",
        renewal: "October 2028",
      },
      spousalRrsp: "Jordan contributes. Alex owns it.",
      lcge: "Not used",
      people: [client, spouse, child],
      companies: [
        sampleCompany({
          legalName: "Chen Holdings Ltd.",
          yearEnd: "December 31",
          does: "Holds the shares of the operating company and a portfolio.",
          provinceInc: "AB",
          operates: "Edmonton",
          associated: "yes",
          associatedWith: "Northline Mechanical Ltd.",
          revenue: "18000",
          expenses: "7000",
          profit: "11000",
          forecast: "2027: revenue $18,000, expenses $8,000, profit $10,000. 2028: revenue $19,000, expenses $30,000, loss $11,000. 2029: revenue $20,000, expenses $8,000, profit $12,000. A new roof on the rental, about $22,000, is in the 2028 expenses.",
          operatingCash: "12000",
          surplusCash: "125000",
          investments: "A balanced portfolio, market value $520,000.",
          investmentCost: "410000",
          passiveIncome: "Interest $3,100. Dividends $9,600.",
          gainsSold: "2500",
          gainsUnsold: "110000",
          debt: "None.",
          shareholderLoans: "The company owes Alex $25,000.",
          corpIns: "no",
          saleWindow: "7–15 years",
          successor: "A child",
          valuation: "$900,000 to $1,100,000, informal, 2025.",
          buyerWants: "Shares",
          purify: "Yes",
          sha: "yes",
          shaBuySell: "yes",
          shaFunded: "yes",
        }),
        sampleCompany({
          legalName: "Northline Mechanical Ltd.",
          yearEnd: "October 31",
          does: "Residential plumbing and heating.",
          provinceInc: "AB",
          operates: "Edmonton and St. Albert",
          associated: "yes",
          associatedWith: "Chen Holdings Ltd.",
          revenue: "1680000",
          expenses: "1390000",
          profit: "290000",
          forecast: "2027: revenue $1,740,000, expenses $1,510,000, profit $230,000. 2028: revenue $1,820,000, expenses $1,500,000, profit $320,000. 2029: revenue $1,880,000, expenses $1,540,000, profit $340,000. A service van, about $72,000, is in the 2027 expenses.",
          operatingCash: "95000",
          surplusCash: "60000",
          investments: "None.",
          investmentCost: "0",
          passiveIncome: "Interest $400.",
          gainsSold: "0",
          gainsUnsold: "0",
          debt: "Truck loan, Servus Credit Union, $51,000, 5.9%, $1,050 a month, secured by the truck.",
          shareholderLoans: "Alex owes the company $12,000.",
          corpIns: "yes",
          corpInsDetail: "Alex's life. $750,000 term, $164 a month, renews in 2033. Cash value not known.",
          saleWindow: "3–7 years",
          successor: "A buyer",
          valuation: "Not yet.",
          buyerWants: "Not sure",
          sha: "no",
        }),
      ],
      succession: "Sam has asked about the trade. Nothing is promised yet.",
      goals: [
        "How to pay yourselves",
        "How much to leave in the company",
        "Where investments and insurance should sit",
        "What a sale leaves the family",
        "What happens if you die early or live a long time",
      ],
    };
    document.getElementById("ac-consent").checked = true;
    applyModel();
    document.getElementById("ac-review-banner").classList.add("hidden");
    doneEl.classList.add("hidden");
    statusEl.textContent = "";
    submitBtn.textContent = "Submit advanced case";
    submitBtn.disabled = false;
  }

  async function caseUrl() {
    readMounted();
    const payload = await encodeState(model);
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("case", payload);
    return url.toString();
  }

  const statusEl = document.getElementById("ac-status");
  const doneEl = document.getElementById("ac-done");
  const submitBtn = document.getElementById("ac-submit");
  document.getElementById("ac-sample").addEventListener("click", loadSample);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    readMounted();
    const client = clientPerson();
    if (!document.getElementById("ac-consent").checked || !filled(client?.name) || !filled(client?.email)) {
      statusEl.textContent = "Add your consent, your name, and your email before submitting.";
      statusEl.className = "text-[13.5px] text-red-700";
      return;
    }
    submitBtn.disabled = true;
    statusEl.textContent = "Submitting…";
    statusEl.className = "text-[13.5px] text-inksoft";
    const link = await caseUrl();
    document.getElementById("ac-field-name").value = client.name.trim();
    document.getElementById("ac-field-email").value = client.email.trim();
    document.getElementById("ac-field-phone").value = client.mobile.trim();
    document.getElementById("ac-field-link").value = link;
    document.getElementById("ac-field-date").value = formatDate(model.date);
    document.getElementById("ac-field-summary").value = summaryText(model);
    try {
      const body = new URLSearchParams();
      ["form-name", "client-name", "client-email", "client-phone", "case-link", "completed-date", "case-summary", "bot-field"].forEach((name) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (field) body.append(name, field.value);
      });
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error("Submission failed");
      statusEl.textContent = "Submitted. Your answers were emailed to your advisor. Send the documents to ethan@marchandwealth.ca.";
      statusEl.className = "text-[13.5px] text-green-700";
      submitBtn.textContent = "Submit again";
    } catch {
      statusEl.textContent = "Your answers could not be sent automatically. Download the PDF and email it, with the documents, to ethan@marchandwealth.ca.";
      statusEl.className = "text-[13.5px] text-red-700";
    } finally {
      submitBtn.disabled = false;
    }
    doneEl.classList.remove("hidden");
    doneEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const copyBtn = document.getElementById("ac-copy-link");
  const copyLabel = document.getElementById("ac-copy-label");
  copyBtn.addEventListener("click", async () => {
    const link = await caseUrl();
    try {
      await navigator.clipboard.writeText(link);
      copyLabel.textContent = "Link copied";
    } catch {
      window.prompt("Copy this link:", link);
    }
    setTimeout(() => { copyLabel.textContent = "Copy link to answers"; }, 1800);
  });

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

  const downloadBtn = document.getElementById("ac-download");
  const downloadStatus = document.getElementById("ac-download-status");
  downloadBtn.addEventListener("click", async () => {
    readMounted();
    const label = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing PDF…";
    downloadStatus.textContent = "";
    try {
      const [JsPDF, logo] = await Promise.all([loadJsPdf(), loadLogo()]);
      const client = clientPerson();
      const doc = buildPdf(JsPDF, model, logo);
      const safeName = (client?.name || "Client").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "Client";
      doc.save(`${model.date}-Advanced-Case-${safeName}.pdf`);
    } catch {
      downloadStatus.textContent = "The PDF could not be created. Please try again.";
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = label;
    }
  });

  const incoming = new URLSearchParams(window.location.search).get("case");
  const boot = incoming
    ? decodeState(incoming).then((restored) => {
      model = restored;
      applyModel();
      document.getElementById("ac-consent").checked = true;
      document.getElementById("ac-review-banner").classList.remove("hidden");
      document.getElementById("ac-review-text").textContent = `Answers for ${clientPerson().name.trim() || "this case"}, completed ${formatDate(model.date)}.`;
      doneEl.classList.remove("hidden");
      document.getElementById("ac-done-text").textContent = "These answers were opened from a saved link. Download the PDF, or submit again to send an updated copy.";
      STEPS.forEach((id) => visited.add(id));
      cursor = STEPS.length - 1;
    }).catch(() => { applyModel(); })
    : Promise.resolve().then(() => { applyModel(); });

  boot.then(() => showStep());
})();
