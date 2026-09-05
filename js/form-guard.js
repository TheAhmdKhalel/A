/**
 * Shared client/project form verification.
 * The token identifies the project-specific invitation; WhatsApp is the second factor.
 */
window.AHMAD_FORM_GUARD = (() => {
  const cfg = window.AHMAD_FORMS_CONFIG || { endpoint: '' };

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

    const response = await fetch(`${cfg.endpoint}?op=verify&token=${encodeURIComponent(token)}&whatsapp=${encodeURIComponent(phone)}`);
    if (!response.ok) throw new Error('FORM_VERIFY_REQUEST_FAILED');

    const data = await response.json();
    if (!data.verified) throw new Error('FORM_VERIFY_FAILED');

    return { ...data, whatsapp: phone };
  };

  const submit = async ({ formType, token, whatsapp, answers }) => {
    if (!cfg.endpoint) throw new Error('FORM_ENDPOINT_MISSING');
    const response = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ formType, token, whatsapp: normalizePhone(whatsapp), answers })
    });
    if (!response.ok) throw new Error('FORM_SUBMIT_REQUEST_FAILED');
    return response.json();
  };

  return { config: cfg, getToken, normalizePhone, verify, submit };
})();
