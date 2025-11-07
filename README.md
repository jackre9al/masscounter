# Mass Gainer Logger (Minimalist)

- Minimal, Google/Apple-like UI
- Add grams, see **Last 7 days** with per-day detail and totals
- **Last Week** shows one combined total with date range (previous calendar week)
- **Grand Total** shows all-time total
- Scroll unlocks once entries reach `MAX_ENTRIES`

## Files
- `index.html`
- `style.css`
- `script.js`

## Deploy
Drag all files into a GitHub repo and enable GitHub Pages (Settings → Pages → Branch: `main`, folder: `/ (root)`).

## Tweaks
Open `script.js` and adjust:
```js
const MAX_ENTRIES = 10; // scroll lock threshold
```
