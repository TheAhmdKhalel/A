document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('website-form');
  if (!form || !window.AHMAD_FORM_GUARD) return;

  const guard = window.AHMAD_FORM_GUARD;
  const verifyBox = document.getElementById('form-verification');
  const fields = document.getElementById('website-fields');
  const verifyBtn = document.getElementById('verify-whatsapp');
  const verifyMsg = document.getElementById('verify-message');
  const formMsg = document.getElementById('form-message');
  const tokenField = document.getElementById('form-token');
  const clientIdField = document.getElementById('verified-client-id');
  const projectIdField = document.getElementById('verified-project-id');
  const phoneInput = document.getElementById('verify-whatsapp-number');
  const websitePhone = document.getElementById('website-whatsapp');
  const token = guard.getToken();

  tokenField.value = token;

  const setMessage = (element, text, success = false) => {
    element.hidden = !text;
    element.textContent = text;
    element.classList.toggle('is-success', success);
  };

  if (!token || !guard.config.endpoint) {
    setMessage(verifyMsg, !token
      ? 'هذا النموذج يحتاج إلى رابط خاص أُرسل لك بعد الاجتماع.'
      : 'هذا النموذج غير مهيأ للاتصال حاليًا.');
    verifyBtn.disabled = true;
    return;
  }

  verifyBtn.addEventListener('click', async () => {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'جارٍ التحقق…';
    setMessage(verifyMsg, '');

    try {
      const result = await guard.verify({ token, whatsapp: phoneInput.value });
      websitePhone.value = result.whatsapp;
      phoneInput.setAttribute('readonly', 'readonly');
      clientIdField.value = result.clientId || '';
      projectIdField.value = result.projectId || '';
      verifyBox.hidden = true;
      fields.hidden = false;
    } catch (error) {
      const messages = {
        FORM_PHONE_MISSING: 'أدخل رقم WhatsApp للمتابعة.',
        FORM_VERIFY_REQUEST_FAILED: 'تعذر الاتصال بخدمة التحقق. حاول مرة أخرى.',
        FORM_ENDPOINT_MISSING: 'هذا النموذج غير مهيأ للاتصال حاليًا.'
      };
      setMessage(verifyMsg, messages[error.message] || 'رقم WhatsApp لا يطابق بيانات هذا الرابط.');
      phoneInput.focus();
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'التحقق والمتابعة ↗';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(formMsg, '');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const answers = {};
    for (let i = 1; i <= 16; i += 1) {
      answers[`q${i}`] = form.querySelector(`[name="q${i}"]`)?.value || '';
    }
    answers.clientName = form.querySelector('[name="client-name"]')?.value || '';

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'جارٍ الإرسال…';

    try {
      const result = await guard.submit({
        formType: 'website',
        token,
        whatsapp: websitePhone.value,
        answers
      });

      if (!result.ok) throw new Error(result.duplicate ? 'DUPLICATE' : 'SUBMIT_FAILED');

      form.reset();
      fields.hidden = true;
      setMessage(formMsg, 'تم إرسال معلومات الموقع بنجاح.', true);
    } catch (error) {
      setMessage(formMsg, error.message === 'DUPLICATE'
        ? 'تم إرسال هذا النموذج مسبقًا.'
        : 'تعذر حفظ النموذج حاليًا. حاول مرة أخرى.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'إرسال النموذج ↗';
    }
  });
});
