# Premium theme

The interface now uses charcoal (#101115), periwinkle (#96B2FF), restrained magenta (#E167DF), and Commissioner typography, based on the supplied visual references. Semantic tokens in `src/premium.css` cover both charcoal and light appearances.

The dashboard and landing preview show only **Good morning** before noon and **Good afternoon** from noon onward, using device-local time. The shared greeting hook updates every 30 seconds and when the browser regains focus. Account data and original project credits remain intact.

The redesign initializes accounts to dark mode once (`themeVersion: 2`), then preserves subsequent light/dark/system choices. Browser verification confirms that the migration preserves transaction records. Built-in categories use the updated chart palette; custom category records are preserved.

## Previews

- [Desktop](premium-desktop.png)
- [Mobile](premium-mobile.png)
- [Landing preview](premium-landing-preview.png)

## Verification

37 isolated Chrome browser checks passed, including all chat regression checks, theme migration, mobile rendering, saved light preference, anonymous greetings, and the live noon transition. All 10 data tests passed, and the production build passed with the existing bundle-size warning. Browser tests use simulated mobile layouts and mocked speech/Windows metadata as described in the original verification report; this does not certify physical device behavior.
