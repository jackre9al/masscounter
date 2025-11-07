# Milk / Mass Gainer Logger

Single-file web app split into three files for GitHub Pages.

## Files
- `index.html` – markup
- `style.css` – styles
- `script.js` – logic (localStorage, CSV export, scroll lock rule)

## Scroll rule
Scroll is **locked only while the list is not full**. Full is defined by `MAX_ENTRIES` in `script.js`:

```js
const MAX_ENTRIES = 10;
```

If you want a different label for the last column, change `HOW_MUCH_LABEL` in `script.js`:

```js
const HOW_MUCH_LABEL = 'Cumulative (g)';
```

## Deploy to GitHub Pages (Mac drag & drop)
1. Create a new GitHub repository (public or private).
2. Drag-drop these three files into the repo root on github.com.
3. Commit.
4. Go to **Settings → Pages**. Under **Build and deployment**, select **Branch: main** and **/ (root)**, then **Save**.
5. Your site will appear at `https://<username>.github.io/<repo>/` after a short delay.

## How to use
- Type grams, press **Enter** or click **Add**.
- The table shows local device date/time, dose number, grams, and cumulative grams.
- **Export CSV** saves `milk-logger.csv` locally.
- **Clear** wipes all entries on this device only.

Created: 2025-11-07
