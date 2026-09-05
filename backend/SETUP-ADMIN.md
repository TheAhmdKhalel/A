# Admin + Google Sheets setup

1. Create a Google Sheet for the project.
2. Open Extensions → Apps Script.
3. Copy `Code.gs` and `Admin.html` from this folder into the Apps Script project.
4. In `Code.gs`, set:
   - `SPREADSHEET_ID` to the Sheet ID.
   - `ADMIN_EMAILS` to the Google account(s) that should manage clients.
5. Deploy → New deployment → Web app.
6. Use the deployed `/exec` URL for the forms by placing it in `js/form-config.js`:
   `window.AHMAD_FORMS_CONFIG = { endpoint: "YOUR_EXEC_URL" };`
7. Open the Admin URL with `?op=admin`.
8. Add a client. The panel generates Client ID, Project ID, service, token and private form URL.
9. Send the generated private URL to the client after the meeting.

Security:
- Do not put the Sheet ID, Admin credentials, or Apps Script deployment URL in public documentation beyond what the forms need.
- Keep the Admin deployment restricted to the allowed Google accounts.
- Never place `ADMIN_EMAILS` or other secrets in the GitHub-hosted JavaScript.
