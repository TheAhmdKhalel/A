# Admin + Google Sheets setup

1. Create a Google Sheet for the project.
2. Open Extensions → Apps Script.
3. Copy `Code.gs` and `Admin.html` from this folder into the Apps Script project.
4. In `Code.gs`, set:
   - `SPREADSHEET_ID` to the Sheet ID.
   - `ADMIN_EMAILS` to the Google account(s) that should manage clients.
5. Deploy → New deployment → Web app. If this Apps Script project was deployed before, create a NEW deployment (or update the existing deployment to the newest version) after replacing both files. The `/exec` URL that still returns `Ahmad Khalel Website API is working.` is an older deployment and will not contain the Admin panel.
6. Use the deployed `/exec` URL for the forms by placing it in `js/form-config.js`:
   `window.AHMAD_FORMS_CONFIG = { endpoint: "YOUR_EXEC_URL" };`
7. Sign in to the same Google account listed in `ADMIN_EMAILS`, then open the Admin URL with `?op=admin`. Example: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?op=admin`.
8. If the URL still shows the API message, the deployment was not updated; deploy the latest code again.
9. Add a client. The panel generates Client ID, Project ID, service, token and private form URL.
10. Send the generated private URL to the client after the meeting.

Security:
- Do not put the Sheet ID, Admin credentials, or Apps Script deployment URL in public documentation beyond what the forms need.
- Keep the Admin deployment restricted to the allowed Google accounts.
- Never place `ADMIN_EMAILS` or other secrets in the GitHub-hosted JavaScript.
