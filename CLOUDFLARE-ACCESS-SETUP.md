# Secure Administration setup

- Public portal: `/index.html`
- Protected administration: `/admin.html`

Create a Cloudflare Zero Trust Access self-hosted application for the existing Pages hostname with Path `/admin.html`. Add an Allow policy containing only approved administrator email addresses. Test both allowed and denied accounts in private browser windows.

Important: in static Cloudflare mode, Content Manager changes are saved to that browser's localStorage only. They do not modify GitHub or publish to other users. Permanent shared updates require committing updated `data.js` to GitHub or adding an authenticated persistent backend.
