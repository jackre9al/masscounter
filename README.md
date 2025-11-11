# Mass Gainer Logger — CSV Import + Profiles

**New**
- **Import CSV** (Actions → Import CSV). It **merges** into the current profile and **de‑duplicates**:
  - Primary key = **ID** if present.
  - Otherwise by **(ISO Timestamp, Grams)** signature.
- Accepts headers: `ID, ISO Timestamp, Local Timestamp, Grams` and optional `Profile`.
- Keeps your **Last 7 days / Last Week / Grand Total** UI exactly like manual entries.

**Profiles & PIN**
- You can switch profiles via the **Profile** pill (email as profile name).
- Optional **4‑digit PIN** per profile (client‑side SHA‑256; no server).

**Sync across devices?**
- This is a 100% static site (GitHub Pages). There’s no safe way to auto‑sync without a server.
- Practical options **today**:
  1) **Manual**: Export on device A → AirDrop / Files → Import on device B.
  2) **Private server (future)**: We can add a tiny Supabase/Firebase backend with email login to sync. Say the word and I’ll ship that version.

Deploy by dropping the folder into your Pages repo and hard refresh on all devices.
