# SysAdminIQ v3.2.1 — Fixed Full Knowledge Base Edition

## Important fix
This build embeds the complete knowledge base directly into `data.js` as an offline fallback. It now works when `index.html` is opened directly in a browser, without requiring `server.py`.

It contains the full v3.2.1 data set:
- 37 troubleshooting articles
- 16 automation scripts
- 14 commands
- VMware, Windows, Linux, AWS and Azure categories

## Run locally
Option 1: Double-click `index.html`.

Option 2 (recommended for Content Manager persistence across users/devices):
```bash
python server.py
```
Then open the local address shown in the terminal.

## Browser cache
This build uses a new browser storage key (`sysAdminIQKB_v321`) and will not reuse the earlier v3.0/v3.2 cache as the primary source. If you have custom edits in an older version, export a KB backup there and import it through Content Manager after opening this build.


## v3.2.2 fix
This build explicitly exposes the embedded knowledge base to the browser and uses a new storage key so old cached data cannot replace the bundled 37-article knowledge base. It works when index.html is opened directly.
