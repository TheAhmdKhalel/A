# Forms + Google Sheets setup

## 1. Google Sheet
Create one Google Sheet and copy its spreadsheet ID into `backend/Code.gs` as `SPREADSHEET_ID`.
The script creates these tabs automatically:
- Clients
- Meeting Forms
- Identity Forms
- Website Forms
- Identity + Website Forms

## 2. Public Forms Web App
Deploy the Apps Script as a Web App that can be accessed by anyone who has the private token link. Use this deployment URL in `js/form-config.js` as `endpoint`.

## 3. Admin Web App
Create a **separate deployment** of the same Apps Script for Admin. Configure access so the signed-in Google account is required, then add your Google account email to `CONFIG.ADMIN_EMAILS`.
Open the Admin deployment at:
`YOUR_ADMIN_WEB_APP_URL?op=admin`

The Admin page creates:
- Client ID
- Project ID
- Service
- WhatsApp
- Email
- Unique Token

It returns a private website URL such as:
`https://ahmadkhalel.com/form-identity/?token=...`

## 4. Important security rule
Do not publish the Admin page as a normal GitHub Pages page. Keep it inside the restricted Admin Web App deployment.

The public forms deployment must **not** be used for admin creation.

## Email notifications

Email notifications are sent by Web3Forms from the website after a successful Google Sheets save. The Web3Forms access key is stored in `js/form-config.js` and is intentionally a public form access key, not a Google credential. The same flow is used for Meeting, Identity, Website, Identity + Website, and the public Contact form.
