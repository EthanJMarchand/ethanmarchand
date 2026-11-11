# Ethan Marchand

Planning tools for Ethan Marchand, Managing Advisor, Client Services at [Advisor Strategies](https://advisorstrategies.ca/).

The homepage asks one question. Clients continue to the firm. Everyone else opens one tool. The tools are the ones from Marchand Wealth, plus an advanced case intake: quote, TFSA calculator, financial plan, client intake, investor questionnaire, and advanced case. Query strings, Netlify fields, and PDFs still work. The investor questionnaire is ten questions and six profiles.

This repository does not modify [marchandwealth](https://github.com/ethanjmarchand/marchandwealth).

**Future public address:** [ethanmarchand.ca](https://ethanmarchand.ca). When `marchandwealth.ca` is pointed here, forward the host and keep the path and query string. A plan link only works if `?client-name=...` arrives intact.

## What a visitor can do

| Page | What it is |
|---|---|
| [`index.html`](index.html) | One choice: client, or a tool |
| [`life-insurance-quote.html`](life-insurance-quote.html) | Compulife quote, same embed |
| [`tfsa-calculator.html`](tfsa-calculator.html) | TFSA room, catch-up, and retirement income |
| [`needs-analysis.html`](needs-analysis.html) | Financial plan, one step at a time |
| [`client-intake.html`](client-intake.html) | Intake. Submit builds a plan link |
| [`investor-questionnaire.html`](investor-questionnaire.html) | 10 questions, one of six profiles, reopen link, PDF |
| [`advanced-case.html`](advanced-case.html) | Corporate intake. Reopen link and PDF. Documents are emailed, not uploaded |

`contact.html`, `schedule.html`, `insights.html`, and old article addresses send people to advisorstrategies.ca. On Netlify that is a 301 in [`netlify.toml`](netlify.toml). Locally those files redirect in the browser.

## Stack

Plain HTML, vanilla JavaScript, and Tailwind CSS compiled to [`assets/css/site.css`](assets/css/site.css). No framework. jsPDF is vendored and loaded only when someone downloads a questionnaire or advanced case PDF.

Colours and type match Advisor Strategies: deep `#0d232a`, sage `#618986`, cream `#e8e4df`, Poppins. The class names in the tools (`bg-gold`, `text-navydeep`, `font-serif`) still work. Their values are redefined in [`tailwind.config.js`](tailwind.config.js).

```bash
npm install
npm run build:css      # required after a new utility class
npm run watch:css      # rebuild while editing
npm run test:needs-analysis
python3 -m http.server
```

Open `http://localhost:8000/`. Root-absolute paths and the plan's JavaScript modules do not load from a `file://` address.

A new Tailwind class does nothing until the CSS is rebuilt. Netlify runs `npm run build` on deploy, so the rebuild is only required for local preview.

## How saved work comes back

There is no database and nothing is written to the browser for a plan.

- **Financial plan.** Entries live in the open tab. The intake stores them as one compressed `?plan=` value, the same packing as an advanced case, and puts that link in the Netlify field `plan-link`. An older link that still lists each field, such as `?client-name=...&client-age=...`, also refills the plan. Anyone with the link can open the entries. The page says so.
- **Investor questionnaire.** Every answer is compressed into `?iq=` on `iq-link`. Opening it restores the answers, shows the result, and allows the PDF without submitting again. An older link that lists each answer still opens. The handoff to the intake is compressed into `?in=`, and the profile's return rates come from [`investor-profiles.js`](investor-profiles.js).
- **Advanced case.** Text answers are compressed into `?case=`. Opening that link refills the intake and allows the PDF. Documents are not collected on the form. The last step asks the client to email them.
- **PDF and print.** The questionnaire and advanced case PDFs are drawn with jsPDF from `/assets/logo.png` (the dark wordmark, so it prints on white). The plan prints to `YYYY-MM-DD-Financial-Plan-<names>`. Footers read Advisor Strategies.
- **Forms.** `client-intake`, `investor-questionnaire`, `tfsa-consultation`, and `advanced-case` post `application/x-www-form-urlencoded` to the current page, the way Netlify Forms expects. Each has `data-netlify="true"` and a honeypot. Fields built in JavaScript are also listed on a hidden form, or Netlify drops them.
Submissions do nothing useful until the site is on Netlify, with form notifications turned on for `advanced-case`. If a submit fails before that, the page keeps the reopen link and points at `ethan@marchandwealth.ca`. Change `CONTACT_EMAIL` in [`assets/js/shared.js`](assets/js/shared.js) when the Advisor Strategies mailbox should receive it instead. The `<noscript>` notes in `advanced-case.html` and `investor-questionnaire.html` name it too, since they show without JavaScript.

The old Marchand Wealth analytics tag is not on these pages. If a new tag is added, strip the query string from the page address before it is sent. That string is the client's plan.

`window.MarchandInvestorProfiles` is the name the three tools already share. Leave the global name alone.

## Figures to update once a year

**TFSA calculator:** it reads the same table as the financial plan, `needs-analysis/data/tfsa-contribution-limit.js` (below). One new line there updates both. Years you have not added yet are projected from the recent average increase, rounded to $500.

**Financial plan:** add a year by copying the newest block. Do not change older years.

| File | What to add |
|---|---|
| `needs-analysis/data/inflation-canada.js` | The new annual CPI percent |
| `needs-analysis/data/tfsa-contribution-limit.js` | The new TFSA dollar limit, and `taxYear`. The TFSA calculator uses this table too |
| `needs-analysis/data/rrsp-limits.js` | The new RRSP dollar limit |
| `needs-analysis/data/cpp-amounts.js` | Maximum monthly CPP at 65, YMPE, and YAMPE |
| `needs-analysis/data/oas-amounts.js` | OAS maximums and the recovery-tax threshold |
| `needs-analysis/data/tax-brackets.js` | Combined federal and provincial brackets |
| `needs-analysis/data/tax-credits.js` | Basic personal, age, and pension amounts |
| `needs-analysis/data/life-expectancy.js` | A new Statistics Canada life expectancy, when one replaces the year on file |
| `needs-analysis/data/probate-fees.js` | A province's schedule when the fee changes |
| `needs-analysis/data/planning-assumptions.js` | Only when a default planning choice should change |

Profile return rates live only in `investor-profiles.js`. Change them there and the questionnaire, intake, and plan follow.

## Header

The header and footer are copied on each tool page. There is no shared template. Change the markup in every page when the navigation changes: `index.html` and the tool pages.
