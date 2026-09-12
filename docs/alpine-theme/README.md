# Alpine light — default appearance

The default appearance uses white surfaces, glacier-blue accents, sunrise tones, and the user-supplied mountain image. The existing purple-charcoal appearance remains available as Dark mode in Settings.

The palette is in `src/alpine-light.css`; the image is `public/images/alpine-light.png`. Dark-mode rules remain in `src/premium.css`.

Appearance migration version 3 selects light mode once for older saved records and new accounts, then preserves later light/dark/system choices. The migration does not change transaction records.

## Previews

- [Desktop light](desktop.png)
- [Mobile light](mobile.png)
- [Dark appearance](dark.png)

## Verification

The September 10 verification run passed 37 isolated Chrome browser checks and 10 data tests; the production build passed with the existing bundle-size warning. Coverage includes default-theme migration, dark mode, saved appearance choices, desktop/mobile layouts, chat interactions, and greeting changes. Mobile viewports, speech events, and Windows platform metadata are simulated; physical-device limitations remain as described in the original verification report.
