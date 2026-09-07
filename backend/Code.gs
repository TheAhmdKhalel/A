const CONFIG = {
  // ==============================
  // ضع بياناتك هنا فقط
  // ==============================

  SPREADSHEET_ID: '1Be2g2VCNt5v3zX6OxbWL0DrRySSbpCDige16us7T5Rk',

  SITE_BASE_URL: 'https://ahmadkhalel.com',

  // بريدك الذي يستقبل إشعارات الطلبات
  NOTIFICATION_EMAIL: 'work.khalel@gmail.com',

  // Admin authentication is password-based.
  // Set ADMIN_PASSWORD_HASH once in Script Properties using setAdminPassword().
  ADMIN_SESSION_SECONDS: 21600,

  // ==============================
  // أسماء أوراق Google Sheets
  // ==============================

  SHEETS: {
    CONTACT: 'Contact',
    CLIENTS: 'Clients',
    MEETING: 'Meeting Forms',
    IDENTITY: 'Identity Forms',
    WEBSITE: 'Website Forms',
    BOTH: 'Identity + Website Forms'
  }
};


// ============================================
// GET
// ============================================

function doGet(e) {

  const p = (e && e.parameter) || {};

  // Admin — always require an allowed Google account before serving the panel.
  if (p.op === 'admin') {
    return HtmlService
      .createHtmlOutputFromFile('Admin')
      .setTitle('Ahmad Khalel — Admin');
  }

  // Verification for private forms
  if (p.op !== 'verify') {
    return json_({
      ok: true,
      service: 'Ahmad Khalel Forms'
    });
  }

  try {

    const token = clean_(p.token);
    const whatsapp = normalizePhone_(p.whatsapp);

    if (!token || !whatsapp) {
      return json_({
        ok: false,
        verified: false
      });
    }

    const client = findClientByToken_(token);

    const verified =
      !!client &&
      normalizePhone_(client.whatsapp) === whatsapp &&
      String(client.status || '').toLowerCase() !== 'revoked';

    return json_({
      ok: true,
      verified: verified,
      clientId: verified ? client.clientId : '',
      projectId: verified ? client.projectId : '',
      service: verified ? client.service : '',
      email: verified ? client.email : '',
      formType: verified ? ({
        'Meeting': 'meeting',
        'Identity': 'identity',
        'Website': 'website',
        'Identity + Website': 'identity-website'
      }[client.service] || '') : ''
    });

  } catch (err) {

    return json_({
      ok: false,
      verified: false,
      error: String(err.message || err)
    });
  }
}


// ============================================
// ADMIN — AUTHENTICATION + CLIENTS
// ============================================

function loginAdmin(password) {
  const configured = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH');
  if (!configured) {
    throw new Error('ADMIN_PASSWORD_NOT_CONFIGURED');
  }

  const supplied = sha256_(clean_(password));
  if (supplied !== configured) {
    throw new Error('INVALID_ADMIN_PASSWORD');
  }

  const sessionToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put(
    'admin_session_' + sessionToken,
    '1',
    CONFIG.ADMIN_SESSION_SECONDS
  );

  return { ok: true, sessionToken };
}

function logoutAdmin(sessionToken) {
  if (sessionToken) {
    CacheService.getScriptCache().remove('admin_session_' + clean_(sessionToken));
  }
  return { ok: true };
}

function requireAdminSession_(sessionToken) {
  const token = clean_(sessionToken);
  if (!token || CacheService.getScriptCache().get('admin_session_' + token) !== '1') {
    throw new Error('ADMIN_SESSION_EXPIRED');
  }
}

function createClientFromAdmin(payload) {
  const p = payload || {};
  requireAdminSession_(p.sessionToken);
  return createClient_(p.client);
}

function ensureClientsSheet_() {
  const sheet = getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);
  const headers = ['Client Number','Client ID','Project ID','Service','WhatsApp','Email','Token','Status','Last Submitted At'];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    return sheet;
  }

  const current = sheet.getRange(1,1,Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  if (current[0] === 'Client ID' && current.length < 9) {
    // v5.3 compatibility: keep the old Client ID as both the legacy client number and generated ID.
    sheet.insertColumnBefore(1);
    sheet.getRange(1,1,1,9).setValues([headers]);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const oldIds = sheet.getRange(2,2,lastRow-1,1).getValues();
      sheet.getRange(2,1,lastRow-1,1).setValues(oldIds);
      sheet.getRange(2,2,lastRow-1,1).setValues(oldIds);
    }
    return sheet;
  }

  if (current.join('|') !== headers.join('|')) {
    ensureHeaders_(sheet, headers);
  }
  return sheet;
}

function listClientsFromAdmin(sessionToken) {
  requireAdminSession_(sessionToken);

  const sheet = ensureClientsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1).map((row, i) => ({
    row: i + 2,
    clientNumber: clean_(row[0]),
    clientId: clean_(row[1]),
    projectId: clean_(row[2]),
    service: clean_(row[3]),
    whatsapp: clean_(row[4]),
    email: clean_(row[5]),
    token: clean_(row[6]),
    status: clean_(row[7]) || 'Active',
    lastSubmittedAt: row[8] ? new Date(row[8]).toISOString() : '',
    formUrl: buildFormUrl_(clean_(row[3]), clean_(row[6]))
  }));
}

function setClientStatusFromAdmin(payload) {
  const p = payload || {};
  requireAdminSession_(p.sessionToken);

  const row = Number(p.row);
  const status = clean_(p.status);

  if (!row || (status !== 'Active' && status !== 'Inactive')) {
    throw new Error('INVALID_CLIENT_STATUS');
  }

  const sheet = getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);
  sheet.getRange(row, 8).setValue(status);
  return { ok: true, row, status };
}

function createClient_(client) {
  const c = client || {};

  // Admin only needs: client number, WhatsApp/phone, email and service.
  // Client ID + Project ID + Token are generated automatically.
  const clientNumber = clean_(c.clientNumber);
  const service = clean_(c.service);
  const whatsapp = normalizePhone_(c.whatsapp);
  const email = clean_(c.email);
  const status = 'Active';

  if (!clientNumber || !service || !whatsapp || !email) {
    throw new Error('Client number, phone, service, and email are required.');
  }

  if (
    service !== 'Meeting' &&
    service !== 'Identity' &&
    service !== 'Website' &&
    service !== 'Identity + Website'
  ) {
    throw new Error('Invalid service.');
  }

  const sheet = ensureClientsSheet_();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (clean_(rows[i][0]) === clientNumber) {
      throw new Error('Client number already exists.');
    }
    if (normalizePhone_(rows[i][4]) === whatsapp && clean_(rows[i][5]).toLowerCase() === email.toLowerCase()) {
      throw new Error('A client with this phone and email already exists.');
    }
  }

  const clientId = generateClientId_();
  const projectId = generateProjectId_();
  const token = generateToken_();

  sheet.appendRow([
    clientNumber,
    clientId,
    projectId,
    service,
    whatsapp,
    email,
    token,
    status,
    ''
  ]);

  return {
    clientNumber,
    clientId,
    projectId,
    service,
    whatsapp,
    email,
    status,
    token,
    formUrl: buildFormUrl_(service, token)
  };
}

function generateClientId_() {
  return 'AK-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
}

function generateProjectId_() {
  return 'P-' + new Date().getFullYear() + '-' + Utilities.getUuid().replace(/-/g, '').substring(0, 6).toUpperCase();
}

function buildFormUrl_(service, token) {
  const base = String(CONFIG.SITE_BASE_URL || '').replace(/\/$/, '');
  const formPath =
    service === 'Meeting' ? 'meeting' :
    service === 'Identity' ? 'form-identity' :
    service === 'Website' ? 'form-website' :
    'form-identity-website';

  return base + '/' + formPath + '/?token=' + encodeURIComponent(token);
}

function sha256_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return digest.map(b => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

// Run once manually from Apps Script editor, enter your chosen password.
// The password itself is never stored in Code.gs.
function setAdminPassword() {
  const password = Browser.inputBox('Admin password', 'Enter a strong password:', Browser.Buttons.OK_CANCEL);
  if (!password || password === 'cancel') throw new Error('Password setup cancelled.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD_HASH', sha256_(password));
  return 'Admin password configured successfully.';
}

// ============================================
// POST
// ============================================

function doPost(e) {

  try {

    // Accept both JSON POST bodies and application/x-www-form-urlencoded
    // requests (used by sendBeacon from the public contact form).
    let body = {};
    const rawBody = String(
      (e && e.postData && e.postData.contents) || ''
    ).trim();

    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (_) {
        body = (e && e.parameter) || {};
      }
    } else {
      body = (e && e.parameter) || {};
    }


    // ========================================
    // CONTACT FORM
    // ========================================

    if (body.action === 'contact') {

      return handleContact_(body);
    }


    // ========================================
    // ADMIN CREATE CLIENT
    // ========================================

    if (body.action === 'createClient') {

      return json_({
        ok: true,
        client: createClientFromAdmin(body)
      });
    }


    // ========================================
    // PRIVATE FORMS
    // ========================================

    const token = clean_(body.token);
    const whatsapp = normalizePhone_(body.whatsapp);
    const formType = clean_(body.formType);
    const answers = body.answers || {};

    if (!token || !whatsapp || !formType) {

      throw new Error(
        'Missing required form metadata.'
      );
    }

    const client = findClientByToken_(token);

    if (
      !client ||
      normalizePhone_(client.whatsapp) !== whatsapp ||
      String(client.status || '').toLowerCase() === 'revoked'
    ) {

      return json_({
        ok: false,
        verified: false,
        error: 'Verification failed.'
      });
    }


    const serviceToFormType = {
      'Meeting': 'meeting',
      'Identity': 'identity',
      'Website': 'website',
      'Identity + Website': 'identity-website'
    };

    const expectedFormType = serviceToFormType[client.service];

    if (!expectedFormType || expectedFormType !== formType) {
      return json_({
        ok: false,
        verified: false,
        error: 'FORM_TYPE_NOT_ALLOWED'
      });
    }

    let sheetName = '';

    if (formType === 'meeting') {
      sheetName = CONFIG.SHEETS.MEETING;
    } else if (formType === 'identity') {
      sheetName = CONFIG.SHEETS.IDENTITY;
    } else if (formType === 'website') {
      sheetName = CONFIG.SHEETS.WEBSITE;
    } else if (formType === 'identity-website') {
      sheetName = CONFIG.SHEETS.BOTH;
    } else {
      throw new Error('Unknown form type.');
    }


    // منع الإرسال المكرر
    if (isTokenSubmitted_(token, sheetName)) {

      return json_({
        ok: false,
        duplicate: true,
        error: 'This form has already been submitted.'
      });
    }


    const sheet = getOrCreateSheet_(sheetName);

    ensureHeaders_(sheet, [
      'Timestamp',
      'Client ID',
      'Project ID',
      'Service',
      'WhatsApp',
      'Email',
      'Token',
      'Answers JSON'
    ]);


    sheet.appendRow([
      new Date(),
      client.clientId,
      client.projectId,
      client.service,
      whatsapp,
      client.email,
      token,
      JSON.stringify(answers)
    ]);


    markClientSubmission_(client.row);


    // Email notifications are handled by Web3Forms on the client.
    // Google Apps Script is responsible here for verification + Sheets only.

    return json_({
      ok: true,
      submitted: true,
      clientId: client.clientId,
      projectId: client.projectId,
      service: client.service,
      email: client.email
    });


  } catch (err) {

    return json_({
      ok: false,
      error: String(err.message || err)
    });
  }
}


// ============================================
// CONTACT FORM HANDLER
// ============================================

function handleContact_(body) {

  const name = clean_(body.name);
  const email = clean_(body.email);
  const phone = normalizePhone_(body.phone);
  const service = clean_(body.service);
  const message = clean_(body.message);


  // Honeypot
  if (clean_(body.botcheck)) {

    return json_({
      ok: false,
      error: 'Invalid submission.'
    });
  }


  if (!name || !email || !phone || !service || !message) {

    return json_({
      ok: false,
      error: 'All required fields must be completed.'
    });
  }


  const sheet = getOrCreateSheet_(
    CONFIG.SHEETS.CONTACT
  );


  ensureHeaders_(sheet, [
    'timestamp',
    'name',
    'email',
    'phone',
    'service',
    'message'
  ]);


  sheet.appendRow([
    new Date(),
    name,
    email,
    phone,
    service,
    message
  ]);


  // Email notifications are handled by Web3Forms on the public site.

  return json_({
    ok: true,
    success: true,
    submitted: true,
    emailProvider: 'web3forms'
  });
}


// ============================================
// FIND CLIENT BY TOKEN
// ============================================

function findClientByToken_(token) {

  const sheet = ensureClientsSheet_();


  const values =
    sheet.getDataRange().getValues();


  if (!values.length) {
    return null;
  }


  const headers =
    values.shift().map(String);


  const idx =
    Object.fromEntries(
      headers.map((h, i) => [
        h.trim(),
        i
      ])
    );


  for (
    let r = 0;
    r < values.length;
    r++
  ) {

    const row = values[r];


    if (
      clean_(row[idx['Token']]) === token
    ) {

      return {
        row: r + 2,
        clientId: row[idx['Client ID']],
        clientNumber: row[idx['Client Number']],
        projectId: row[idx['Project ID']],
        service: row[idx['Service']],
        whatsapp: row[idx['WhatsApp']],
        email: row[idx['Email']],
        status: row[idx['Status']]
      };
    }
  }


  return null;
}


// ============================================
// DUPLICATE SUBMISSION CHECK
// ============================================

function isTokenSubmitted_(
  token,
  sheetName
) {

  const sheet =
    getOrCreateSheet_(sheetName);


  const values =
    sheet.getDataRange().getValues();


  if (!values.length) {
    return false;
  }


  const tokenIndex =
    values[0]
      .map(String)
      .indexOf('Token');


  if (tokenIndex < 0) {
    return false;
  }


  return values
    .slice(1)
    .some(row =>
      clean_(row[tokenIndex]) === token
    );
}


// ============================================
// MARK CLIENT AS SUBMITTED
// ============================================

function markClientSubmission_(row) {

  const sheet =
    getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0]
      .map(String);


  const submittedIndex =
    headers.indexOf('Last Submitted At');


  if (submittedIndex >= 0) {

    sheet
      .getRange(
        row,
        submittedIndex + 1
      )
      .setValue(new Date());
  }
}


// ============================================
// GENERATE TOKEN
// ============================================

function generateToken_() {

  return Utilities
    .getUuid()
    .replace(/-/g, '');
}


// ============================================
// GET / CREATE SHEET
// ============================================

function getOrCreateSheet_(name) {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );


  return (
    ss.getSheetByName(name) ||
    ss.insertSheet(name)
  );
}


// ============================================
// ENSURE HEADERS
// ============================================

function ensureHeaders_(sheet, headers) {

  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([headers]);
  }
}


// ============================================
// NORMALIZE PHONE
// ============================================

function normalizePhone_(value) {

  return clean_(value)
    .replace(/[^\d+]/g, '')
    .replace(/^00/, '+');
}


// ============================================
// CLEAN
// ============================================

function clean_(value) {

  return String(
    value == null ? '' : value
  ).trim();
}


// ============================================
// JSON RESPONSE
// ============================================

function json_(object) {

  return ContentService
    .createTextOutput(
      JSON.stringify(object)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


