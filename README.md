# Mass Gainer Logger — Actions + Edit/Delete

What’s new
- **Delete**: 
  - Desktop → hover a row to reveal a trash icon.
  - Mobile → tap a row to open an action sheet with Delete.
- **Edit**:
  - Desktop hover menu also includes Edit.
  - Mobile action sheet has Edit.
  - Editing pre-fills grams and opens Custom time; Save updates the entry.
- **'Auto time'**:
  - The toggle now reads **Custom time** ↔ **Auto time**.
  - Auto time hides the custom panel and clears date/time fields.

Existing features
- Minimalist design.
- Last 7 days (detailed), Last Week (total with range), Grand Total.
- Scroll unlocks once entries reach `MAX_ENTRIES`.

Deploy
- Drag all files into a GitHub repo and enable GitHub Pages (Settings → Pages → Branch: `main`, folder: `/ (root)`).

Tweak
```js
const MAX_ENTRIES = 10; // in script.js
```
