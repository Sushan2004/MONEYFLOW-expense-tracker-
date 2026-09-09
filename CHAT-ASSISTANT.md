# Moneyflow assistant

A responsive web chat interface for mobile browsers and desktop browsers on macOS and Windows. This change does not package native iOS, Android, Windows, or macOS applications.

## Use it

Sign in to a demo account and select the floating chat button. Ask about this month's spending, last month's spending, a category, income, weekly/monthly/yearly budgets, upcoming bills, or savings goals. Unsupported questions receive guidance about supported queries. The assistant uses local query matching and calculations, not an external language model. It never edits financial records.

On screens below 1024px, chat fills the visible viewport. Pull the top handle down more than 90px to dismiss, tap the handle, or use Close. The mobile input supports newlines; use Send to submit. Background controls are inert while the dialog is open, and keyboard focus stays in the dialog.

On desktop, the collapsible right dock starts at 380px and can resize from 360px to 480px. Drag its left edge, or focus the separator and use Left/Right arrows, Home, and End. The dashboard reserves space for the dock. Use Cmd+/ on Mac or Ctrl+/ on Windows to toggle, Enter to send, Shift+Enter for a newline, and Escape to close.

Use the history selector to revisit a conversation and + to start another. Click category and transaction references to open their records. Category references preserve the answer's month filter, including last month; use the date filter to change that period.

## Data and persistence

`src/utils/chatAnswers.js` derives answers from current React application state, reusing the budget selectors. Spending excludes income and savings transfers. Mini spending cards reuse `SpendingDoughnutChart` and expose exact amounts in visible category links as well as chart tooltips.

Each answer is a dated snapshot. Existing answers do not silently recalculate after transactions are edited; send the question again for a fresh result. Currency formatting uses the app's current display-currency settings.

History, selected thread, desktop open state, and width use `et:chat:<userId>` in localStorage, separate from the financial-state key. Storage is bounded to the latest 20 threads and 100 messages per thread. New threads replace the oldest when the limit is reached. If storage is corrupt, chat starts fresh; if writing fails, an on-screen notice explains that history is only in memory. Signing out unmounts chat and aborts voice input and pending generation. Browser storage is device/origin-specific and can be cleared or edited by the user.

Upcoming bills are estimates from the most recent recurring expense for each merchant/category/account/frequency combination. Entries without a recognized frequency are excluded. Estimates show the next occurrence within 30 days, with month-end clamping and leap-year handling. There is no bill-status ledger, and separate subscriptions sharing that combination cannot be distinguished. A recorded entry today advances to the next cycle.

## Mobile viewport and speech

The overlay listens to `visualViewport.resize` and `visualViewport.scroll`, using viewport height and offsetTop to keep the composer inside the keyboard-visible area. It falls back to innerHeight, with dynamic viewport CSS as the initial value. Safe-area padding and reduced-motion preferences are respected.

Voice dictation is available only when `SpeechRecognition` or `webkitSpeechRecognition` exists. Results populate the draft; they do not auto-send. Permission failures leave typing available. Although answer generation requires no backend, a browser's speech implementation may send audio to a remote transcription service and may need internet access. The UI discloses this near the microphone control.

References: [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Verification

```bash
npm test
npm run build
```

Automated coverage includes month/year boundaries, category links, income and transfer exclusions, monthly/weekly/yearly budgets, empty records, month-end and leap-year recurrence, recurring-history deduplication, goals, and unsupported queries that do not mutate state.

Physical-device acceptance checks still needed:

- iOS Safari and Android Chrome: portrait/landscape, keyboard show/hide, scroll, safe areas, close and short/long drag gestures.
- macOS and Windows: OS-specific shortcut, Enter/Shift+Enter, mouse and keyboard resizing, dashboard reflow, tooltips, and category/transaction navigation.
- Refresh/reopen history, switch demo accounts, deny microphone permission, and test a browser without SpeechRecognition.
- Light/dark themes, 200% text zoom, reduced motion, and screen-reader announcements/focus order.

A successful build and data tests do not certify behavior on physical devices. No native-device or browser interaction test was run for this change.
