# Admin 5.4 — setup

## 1. Google Apps Script

Copy `backend/Code.gs` and `backend/Admin.html` into the same Apps Script project used by the forms.

Make sure `CONFIG.SPREADSHEET_ID` and `CONFIG.SITE_BASE_URL` are correct.

## 2. Set the Admin password

In the Apps Script editor, select the function **`setAdminPassword`** and run it once.

A dialog will ask for your password. The password is stored only as a SHA-256 hash in Script Properties; it is not written into `Code.gs` or GitHub.

Use a strong unique password.

## 3. Deploy

Deploy the Apps Script as a Web App and use the deployed `/exec` URL.

The Admin page is:

`YOUR_EXEC_URL?op=admin`

The Admin panel now uses password authentication and provides:
- Add Client
- Automatic Client ID
- Automatic Project ID
- Automatic secure Token
- Automatic private form URL
- Copy / Share / Open
- Active Clients
- Inactive Clients
- Active / Inactive filter
- Activate / Deactivate

## 4. Client creation

When adding a client, enter only:
- Client Number
- WhatsApp / Phone
- Email
- Service

The system automatically generates the internal IDs and token and puts the new client in **Active Clients**.

## 5. Important

The public GitHub Pages site does not contain the Admin password or Google Sheet credentials.

The existing private forms continue to use token + WhatsApp verification.
