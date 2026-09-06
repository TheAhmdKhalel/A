const CONFIG = {
  // ==============================
  // ضع بياناتك هنا فقط
  // ==============================

  SPREADSHEET_ID: '1Be2g2VCNt5v3zX6OxbWL0DrRySSbpCDige16us7T5Rk',

  SITE_BASE_URL: 'https://ahmadkhalel.com',

  // بريدك الذي يستقبل إشعارات الطلبات
  NOTIFICATION_EMAIL: 'work.khalel@gmail.com',

  // البريد المسموح له بالدخول إلى لوحة Admin
  ADMIN_EMAILS: [
    'work.khalel@gmail.com'
  ],

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

  // Admin
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
      email: verified ? client.email : ''
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
// ADMIN — CREATE CLIENT
// ============================================

function createClientFromAdmin(client) {

  requireAdmin_();

  return createClient_(client);
}


function createClient_(client) {

  const c = client || {};

  const clientId = clean_(c.clientId);
  const projectId = clean_(c.projectId);
  const service = clean_(c.service);

  const whatsapp = normalizePhone_(c.whatsapp);
  const email = clean_(c.email);

  const status = clean_(c.status) || 'Active';

  if (
    !clientId ||
    !projectId ||
    !service ||
    !whatsapp ||
    !email
  ) {
    throw new Error(
      'Client ID, Project ID, Service, WhatsApp, and Email are required.'
    );
  }

  if (
    service !== 'Meeting' &&
    service !== 'Identity' &&
    service !== 'Website' &&
    service !== 'Identity + Website'
  ) {
    throw new Error('Invalid service.');
  }

  const sheet = getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);

  ensureHeaders_(sheet, [
    'Client ID',
    'Project ID',
    'Service',
    'WhatsApp',
    'Email',
    'Token',
    'Status',
    'Last Submitted At'
  ]);

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {

    if (clean_(rows[i][0]) === clientId) {
      throw new Error('Client ID already exists.');
    }

    if (clean_(rows[i][1]) === projectId) {
      throw new Error('Project ID already exists.');
    }
  }

  const token = generateToken_();

  sheet.appendRow([
    clientId,
    projectId,
    service,
    whatsapp,
    email,
    token,
    status,
    ''
  ]);

  const base = String(CONFIG.SITE_BASE_URL || '')
    .replace(/\/$/, '');

  const formPath =
    service === 'Meeting'
      ? 'meeting'
      : service === 'Identity'
        ? 'form-identity'
        : service === 'Website'
          ? 'form-website'
          : 'form-identity-website';

  return {
    clientId,
    projectId,
    service,
    whatsapp,
    email,
    status,
    token,
    formUrl:
      base +
      '/' +
      formPath +
      '/?token=' +
      encodeURIComponent(token)
  };
}


// ============================================
// POST
// ============================================

function doPost(e) {

  try {

    const body = JSON.parse(
      (e &&
        e.postData &&
        e.postData.contents) || '{}'
    );


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

      requireAdmin_();

      return json_({
        ok: true,
        client: createClient_(body.client)
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

  const sheet =
    getOrCreateSheet_(CONFIG.SHEETS.CLIENTS);


  ensureHeaders_(sheet, [
    'Client ID',
    'Project ID',
    'Service',
    'WhatsApp',
    'Email',
    'Token',
    'Status',
    'Last Submitted At'
  ]);


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


  const statusIndex =
    headers.indexOf('Status');


  if (statusIndex >= 0) {

    sheet
      .getRange(
        row,
        statusIndex + 1
      )
      .setValue('Submitted');
  }


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


// ============================================
// ADMIN ACCESS
// ============================================

function requireAdmin_() {

  const email =
    String(
      Session
        .getActiveUser()
        .getEmail() || ''
    )
    .trim()
    .toLowerCase();


  const allowed =
    (CONFIG.ADMIN_EMAILS || [])
      .map(x =>
        String(x || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);


  if (
    !email ||
    allowed.indexOf(email) < 0 ||
    allowed.indexOf(
      'replace_with_your_google_email'
    ) >= 0
  ) {

    throw new Error(
      'Admin access denied.'
    );
  }
}