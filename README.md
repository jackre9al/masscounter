# Mass Gainer Logger — Actions (Fixed)

Fix for the action sheet showing on page load:
- CSS now forces `[hidden]{display:none !important}` so the sheet stays hidden across browsers.
- JS closes the sheet on render and on page load, and only opens it if a row was tapped.
- Guarded `openSheet()` so it never opens without a valid target id.

Everything else remains:
- Minimalist UI, edit/delete, 'Custom time' ↔ 'Auto time'
- Last 7 days (detailed), Last Week total (with range), Grand Total
- Scroll lock threshold via `MAX_ENTRIES`

Deploy: replace your repo files with these and refresh.
