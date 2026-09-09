# AI integration plan

**Status: proposed design, not implemented.** No AI SDK, AI endpoint, or server is present in the reviewed project. This plan is provider-neutral; select a provider and model during implementation using its current documentation and costs.

## First feature: turn a sentence into an expense draft

Let the user type: “Spent $18.50 on lunch today.” The app proposes an expense amount, date, and an existing category. Show an editable preview, then save only when the user confirms.

This is a bounded first feature: it connects to the existing add-entry workflow and produces a result the user can inspect.

Acceptance criteria:

- An unambiguous expense produces a valid editable draft.
- Dates use an explicit reference date and timezone supplied by the app.
- Missing currency, amount, or category can trigger a clarification instead of a guess.
- The suggested category must exist in the user's allowed category list.
- Nothing is saved until the user selects the existing save action.
- Failed, unavailable, or disabled AI leaves manual entry usable.

## Proposed architecture

```text
React entry form
  -> POST /api/ai/parse-expense
  -> Backend validates input and builds the model request
  -> AI provider returns structured draft
  -> Backend validates the draft
  -> React displays editable preview
  -> User confirms through existing application action
```

Add a small backend or serverless API. The backend owns the provider secret; the frontend calls your endpoint. Do not put a private AI key in a `VITE_` variable: those values are exposed in browser code. [Vite documentation](https://vite.dev/guide/env-and-mode).

Suggested additions, all new work:

```text
server/
  .env.example                 Placeholder server configuration
  routes/ai.js                 AI request handlers
  services/aiProvider.js        Provider adapter
  validation/expenseDraft.js    Request and response validation
src/
  components/AiExpenseInput.jsx
  utils/aiClient.js
```

Connect `AiExpenseInput.jsx` to `src/pages/AddEntry.jsx`. Reuse the existing application save behavior rather than letting model output dispatch arbitrary reducer actions. Validate allowed amounts, dates, categories, and supported entry types before saving.

## Proposed API contract

`POST /api/ai/parse-expense` — this endpoint does not yet exist.

Example request with synthetic data:

```json
{
  "text": "Spent $18.50 on lunch today",
  "referenceDate": "2026-09-09",
  "timezone": "America/Chicago",
  "baseCurrency": "USD",
  "allowedCategories": [
    { "id": "example-food-id", "name": "Food" }
  ]
}
```

Use real category IDs from application state instead of the illustrative ID above.

Example validated response:

```json
{
  "status": "draft",
  "draft": {
    "type": "expense",
    "amount": 18.5,
    "currency": "USD",
    "date": "2026-09-09",
    "categoryId": "example-food-id",
    "title": "Lunch"
  },
  "clarification": null
}
```

For ambiguous input return `status: "needs_clarification"`, `draft: null`, and a short clarification question. Reject unsupported currencies or require an explicit conversion workflow; do not save a foreign amount as if it were USD. Convert the positive draft amount to the existing app's transaction representation through its normal entry flow.

Use a strict structured-output schema where the selected provider supports it, plus independent server validation. Treat user text as data rather than instructions that can change the endpoint's rules. The model must not receive credentials or account-password records.

## Next feature: explain a monthly report

Add a “Summarize this month” action to Reports. Compute totals, category changes, and budget usage with application code, then ask AI to explain those supplied facts. Include the selected period and currency in the response UI.

Send only the summary needed for the explanation, with user opt-in. Avoid sending names, emails, password records, and full transaction notes. If the previous period has no records, describe the comparison as unavailable. Check that generated numeric claims match the supplied facts before displaying them, or render numbers directly from the computed data.

## Later possibilities

| Feature | Additional work |
| --- | --- |
| Category suggestions | Merchant hints and allowed-category matching |
| Receipt extraction | Image upload, size limits, extraction validation, deletion policy |
| Spending questions | Restricted read-only queries over the user's records |
| Budget suggestions | Reliable history, explicit assumptions, editable proposals |

## Privacy, reliability, and public access

Keep AI optional and explain which data is sent before the first request. Do not log raw financial text by default. Set input limits, timeouts, request quotas, and a server-side spending ceiling. Display a clear retry state without duplicating transactions.

The current localStorage session cannot authenticate a public backend: a user can alter its user ID. Before exposing a paid AI endpoint publicly, implement trusted server-side authentication and authorization, or keep the prototype restricted to local development. A backend with a private provider key still needs access controls to prevent others from consuming that key's quota.

## Implementation milestones

1. Establish manual-entry and persistence checks using sample records.
2. Add a backend with server-only configuration and request validation.
3. Implement expense parsing with structured responses and invalid-output handling.
4. Add preview, clarification, cancel, and explicit save behavior.
5. Verify parsing against a small fixed set of synthetic examples.
6. Add report explanations using computed summaries.
7. Add trusted authentication and quotas before a public AI deployment.

Test missing amounts, ambiguous dates, unsupported currency, unknown categories, malicious instructions embedded in descriptions, invalid model JSON, timeouts, and repeated clicks. Ensure cancel never saves and confirmation saves only once. Keep the core tracker usable when every AI request fails.
