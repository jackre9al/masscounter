# Mass Gainer Logger — iOS fixes

Changes
- **Date picker** no longer auto-closes when opened on iOS; it blurs only after you select a date.
- **Clear Logs** button replaces the old confirm dialog (one tap clears all logs).
- **Clear fields** beside *Grams* wipes grams + custom date/time and hides the custom panel.
- **Reduced header bounce** via `overscroll-behavior: contain` (Safari/iOS 16+).

Deploy: replace files, commit, then hard refresh on iPhone (pull to refresh or Safari reload).