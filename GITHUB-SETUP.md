# Work on MONEYFLOW

Repository: [Sushan2004/MONEYFLOW-expense-tracker-](https://github.com/Sushan2004/MONEYFLOW-expense-tracker-)

This repository preserves the Git history from the original local expense tracker. The original README is retained in `README.original.md`. AI features are planned in `AI-INTEGRATION.md`.

## Set up on another computer

Install Node.js with npm and Git, then run:

```bash
git clone https://github.com/Sushan2004/MONEYFLOW-expense-tracker-.git
cd MONEYFLOW-expense-tracker-
npm ci
npm run dev -- --open
```

## Save future changes

Review your changes, then commit the intended files and push:

```bash
git status
git diff
git add README.md
git commit -m "Update project documentation"
git push origin main
```

Replace `README.md` with the files you changed. Keep credentials, personal exports, `node_modules/`, and `dist/` out of commits. Custom API environment files are excluded in `.gitignore`; private AI credentials must also remain on the server.

## Verify changes

```bash
npm run build
npm run preview
```

Check the affected user flows with sample data. No test or lint scripts are currently defined. Publishing source to GitHub does not deploy a live application; hosting and a future AI backend are separate setup tasks.
