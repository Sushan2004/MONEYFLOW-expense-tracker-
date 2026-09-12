# Moneyflow welcome page

Updated September 12, 2026. The public `/` page introduces Moneyflow before sign-in. Signed-in users can preview it at `/#preview`; visiting `/` without a hash still opens their dashboard.

## Design

The supplied Rocket Money and Robinhood screenshots inspired the large split hero, product preview, spacious feature sections, and animated closing banner. The page uses Moneyflow branding, its Alpine light and purple-charcoal dark themes, and the existing user-supplied mountain image.

- Sticky navigation and working login/signup links.
- Interactive Spending, Budget, and Goals sample views inside a CSS phone frame.
- Animated chart entrance, floating cards, and scroll reveals.
- Six feature cards describing existing app capabilities.
- Mountain illustration and three-step introduction.
- Expandable FAQs covering mobile use, local storage, the rules-based assistant, and manual entry.
- Closing call to action with animated vertical streaks and a pause/resume control.
- Reduced-motion support, keyboard focus styles, a skip link, and responsive layouts.

The preview uses labeled illustrative data, not the user's records. No user counts, testimonials, press endorsements, bank integrations, or app-store availability are claimed. Account behavior and financial data storage are unchanged.

## Source

- `src/pages/Landing.jsx`: page content, preview selection, motion state, and IntersectionObserver cleanup.
- `src/pages/Landing.css`: isolated `mf-` styles, responsive layouts, animations, and reduced-motion handling.
- `src/hooks/useGreeting.js`: existing anonymous, time-based greeting reused by the preview.

No dependencies, server APIs, or external AI services were added.

## Verification

- `npm run build`: passed; existing large-bundle warning remains.
- `npm test`: all 10 data tests passed.
- `tests/browser/landing.verify.cjs`: 9 verification groups passed, including preview controls, account links, FAQs, motion controls, both theme palettes, and overflow checks at 320, 390, 768, 1024, and 1440px.
- `tests/browser/chat.verify.cjs`: all 37 existing checks passed. Its landing selectors now point to the new phone preview.
- Light desktop, mobile, and dark screenshots reviewed. Browser testing uses headless Chrome with viewport emulation, not physical iOS/Android devices.

Run with a local Vite server and Playwright available:

```bash
VERIFY_URL=http://localhost:5190 node tests/browser/landing.verify.cjs
```

Set `PLAYWRIGHT_MODULE_PATH` to the installed Playwright directory if it is not available as a local dependency. Set `VERIFY_OUTPUT` to customize screenshot output. The test launches installed Google Chrome and uses isolated browser data.

## Previews

[Light desktop](desktop.png) · [Mobile](mobile.png) · [Dark desktop](dark.png) · [Browser results](results.json)
