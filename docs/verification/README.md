# Chat verification — September 9, 2026

**Result: 33 browser checks passed, 10 data tests passed, production build passed.**

Tested the develop-branch app with isolated Chrome on macOS, synthetic expense records, and simulated mobile viewport sizes. The test profile was separate from personal browser data. Fixture spending was $420, its category budget was $400, and income was $2,000.

## Bugs found and fixed

1. Chrome exposes `userAgentData.platform` as `macOS`. The case-sensitive OS check incorrectly showed Ctrl+/ and ignored Cmd+/. Platform matching is now case-insensitive; both Mac and simulated Windows shortcuts pass.
2. At 320px, overflowing page content behind the mobile dialog widened the layout viewport and scaled the chat down. The app now contains that overflow while the mobile dialog is open and restores the page when it closes. The narrow and landscape checks pass.

## Automated browser results

- **PASS** — macOS shortcut hint recognizes userAgentData macOS
- **PASS** — Desktop dock is 380px and reserves content space
- **PASS** — Mac Cmd+/ closes and reopens dock
- **PASS** — Spending chip yields $420 and an inline chart
- **PASS** — Budget chip reports $420 of $400 and overspending
- **PASS** — Shift+Enter inserts a newline; Enter sends once
- **PASS** — Desktop pointer resize and keyboard bounds
- **PASS** — Threads and desktop preferences survive reload
- **PASS** — Category link navigates to matching filtered records
- **PASS** — Transaction reference opens transaction detail
- **PASS** — Desktop and narrow desktop have no page overflow
- **PASS** — Chat and chart render in dark theme
- **PASS** — Account B cannot see account A chat; returning restores A
- **PASS** — Corrupt saved chat recovers without a crash
- **PASS** — Upcoming bills chip returns labeled estimate and record link
- **PASS** — Last-month reference preserves its period
- **PASS** — Unsupported speech API hides microphone
- **PASS** — Windows Ctrl+/ toggles with correct hint
- **PASS** — Mobile FAB clears bottom navigation
- **PASS** — Mobile is full viewport modal with inert background
- **PASS** — Mobile quick reply renders card and chart
- **PASS** — Mobile controls have 44px touch targets
- **PASS** — Short drag keeps modal open; long drag dismisses
- **PASS** — Mobile focus cycles inside dialog
- **PASS** — Simulated keyboard viewport keeps composer visible
- **PASS** — Mobile category navigation dismisses chat
- **PASS** — Mobile layout fits narrow and landscape viewports
- **PASS** — Reduced motion disables mobile slide animation
- **PASS** — Mobile Enter inserts newline without sending
- **PASS** — Mock voice dictation populates draft and does not send
- **PASS** — Mock voice permission denial gives usable fallback
- **PASS** — Chat storage quota failure shows notice and keeps chat usable
- **PASS** — No browser runtime exceptions

The spending-chip check also observes the thinking indicator before the response appears. The browser suite reported no uncaught runtime exceptions. Financial regression tests cover periods, recurrence, transfer/income exclusions, empty data, and read-only behavior.

## Screenshots

- [Desktop, light](desktop-light.png)
- [Desktop, dark](desktop-dark.png)
- [Mobile, 390px](mobile-light.png)
- [Mobile, 320px](mobile-320.png)
- [Mobile landscape, 844 × 390](mobile-844.png)
- [Simulated keyboard viewport](mobile-keyboard-simulated.png) — the visible viewport was mocked to 410px high with a 45px offset; this is not a real keyboard capture.

## Scope and remaining device checks

This is Chrome browser verification, not certification on every operating system. Windows platform metadata and Ctrl+/ were simulated in Chrome on macOS. Mobile tests used Chrome's mobile/touch emulation, with a separate simulated VisualViewport keyboard test. Speech success and permission-denial events were mocked; unsupported-API hiding was also tested.

Still verify on real iOS Safari, Android Chrome, and Windows: software-keyboard animation, safe areas, actual microphone permissions/transcription, and OS/browser shortcut conflicts. Screen-reader announcements and actual 200% browser text zoom also need manual acceptance. Chart and card visuals were inspected in screenshots; native hover tooltip behavior was not separately certified. The existing large JavaScript bundle warning remains.

## Repeat the checks

From the repository root:

```bash
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Browser checks use Playwright 1.62.1 with installed Google Chrome. Playwright is optional and is not added to the app dependencies. To install it temporarily without changing the manifest or lockfile:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
```

In another terminal, use the URL printed by Vite (adjust the port if needed):

```bash
VERIFY_URL=http://127.0.0.1:5173 node tests/browser/chat.verify.cjs
```

For a shared Playwright runtime, set `PLAYWRIGHT_MODULE_PATH` to its package path. Results and screenshots default to `/tmp/moneyflow-verify`; override with `VERIFY_OUTPUT`. The suite creates fresh isolated contexts, seeds only those contexts, and closes them after verification.
