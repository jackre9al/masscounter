# Mass Gainer Logger — Custom Date/Time

Minimalist UI with optional custom date & time:

- Leave blank → uses device time automatically (default)
- Click **Custom time** → reveals date + time fields
- **Now** resets custom fields back to blank
- Last 7 days (detailed), Last Week total with range, Grand Total
- Scroll unlocks once entries reach `MAX_ENTRIES`

## Files
- `index.html`
- `style.css`
- `script.js`

## Deploy
Drag all files into a GitHub repo and enable GitHub Pages (Settings → Pages → Branch: `main`, folder: `/ (root)`).

## Tweaks
Open `script.js`:
```js
const MAX_ENTRIES = 10; // scroll lock threshold
``` 
