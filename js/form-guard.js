/**
 * Shared client/project form verification + Google Sheets submission
 * + Web3Forms notification.
 */
window.AHMAD_FORM_GUARD = (() => {
  const cfg = window.AHMAD_FORMS_CONFIG || { endpoint: '', web3AccessKey: '' };

  const normalizePhone = (value) => String(value || '')
    .trim()
    .replace(/[\s().-]/g, '')
    .replace(/^00/, '+');

  const getToken = () => new URLSearchParams(window.location.search).get('token') || '';

  const verify = async ({ token, whatsapp }) => {
    if (!cfg.endpoint) throw new Error('FORM_ENDPOINT_MISSING');
    if (!token) throw new Error('FORM_TOKEN_MISSING');

    const phone = normalizePhone(whatsapp);
    if (!phone) throw new Error('FORM_PHONE_MISSING');

    const response = await fetch(
      `${cfg.endpoint}?op=verify&token=${encodeURIComponent(token)}&whatsapp=${encodeURIComponent(phone)}`
    );
    if (!response.ok) throw new Error('FORM_VERIFY_REQUEST_FAILED');

    const data = await response.json();
    if (!data.verified) throw new Error('FORM_VERIFY_FAILED');

    return { ...data, whatsapp: phone };
  };

  const submit = async ({ formType, token, whatsapp, answers }) => {
    if (!cfg.endpoint) throw new Error('FORM_ENDPOINT_MISSING');

    const response = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        formType,
        token,
        whatsapp: normalizePhone(whatsapp),
        answers
      })
    });

    const raw = await response.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (_) {}

    if (!response.ok) throw new Error('FORM_SUBMIT_REQUEST_FAILED');
    return data;
  };

  const notify = async ({ formType, token, whatsapp, clientId, projectId, service, email, answers }) => {
    if (!cfg.web3AccessKey) throw new Error('WEB3_ACCESS_KEY_MISSING');

    const formNames = {
      meeting: 'Meeting Form',
      identity: 'Visual Identity Form',
      website: 'Website Form',
      'identity-website': 'Identity + Website Form'
    };

    const subject = `نموذج جديد — ${formNames[formType] || formType} — ${clientId || projectId || 'Ahmad Khalel'}`;

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: cfg.web3AccessKey,
        subject,
        from_name: 'Ahmad Khalel Forms',
        name: clientId || projectId || 'Client',
        email: email || '',
        replyto: email || '',
        message: [
          'تم استلام نموذج جديد من موقع Ahmad Khalel.',
          '',
          `Client ID: ${clientId || ''}`,
          `Project ID: ${projectId || ''}`,
          `Service: ${service || ''}`,
          `WhatsApp: ${whatsapp || ''}`,
          `Form: ${formNames[formType] || formType}`,
          '',
          'Answers:',
          JSON.stringify(answers || {}, null, 2)
        ].join('\n')
      })
    });

    const raw = await response.text();
    let result = {};
    try { result = JSON.parse(raw); } catch (_) {}

    if (!response.ok || result.success !== true) {
      throw new Error(result.message || 'WEB3_EMAIL_FAILED');
    }

    return result;
  };

  return { config: cfg, getToken, normalizePhone, verify, submit, notify };
})();
