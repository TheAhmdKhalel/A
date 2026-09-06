document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('brand-form');
  if (!form || !window.AHMAD_FORM_GUARD) return;

  const guard = window.AHMAD_FORM_GUARD;
  const verifyBox = document.getElementById('form-verification');
  const fields = document.getElementById('identity-fields');
  const verifyBtn = document.getElementById('verify-whatsapp');
  const verifyMsg = document.getElementById('verify-message');
  const formMsg = document.getElementById('form-message');
  const tokenField = document.getElementById('form-token');
  const clientIdField = document.getElementById('verified-client-id');
  const projectIdField = document.getElementById('verified-project-id');
  const phoneInput = document.getElementById('verify-whatsapp-number');
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
      document.getElementById('brand-whatsapp').value = result.whatsapp;
      clientIdField.value = result.clientId || '';
      projectIdField.value = result.projectId || '';
      verifyBox.hidden = true;
      fields.hidden = false;
      setMessage(verifyMsg, 'تم التحقق من رقم WhatsApp بنجاح.', true);
      phoneInput.setAttribute('readonly', 'readonly');
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

    const styles = [...form.querySelectorAll('input[name="logo-style[]"]:checked')];
    if (styles.length > 2) {
      setMessage(formMsg, 'يمكن اختيار نمط واحد أو نمطين فقط.');
      return;
    }

    const answers = {};
    for (let i = 1; i <= 14; i += 1) {
      answers[`q${i}`] = form.querySelector(`[name="q${i}"]`)?.value || '';
    }
    answers.elements = [...form.querySelectorAll('input[name="elements[]"]:checked')].map((input) => input.value);
    answers.logoStyle = styles.map((input) => input.value);
    answers.brandName = form.querySelector('[name="brand-name"]')?.value || '';

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'جارٍ الإرسال…';

    try {
      const result = await guard.submit({
        formType: 'identity',
        token,
        whatsapp: form.querySelector('[name="whatsapp"]').value,
        answers
      });

      if (!result.ok) {
        throw new Error(result.duplicate ? 'DUPLICATE' : 'SUBMIT_FAILED');
      }

      try {
        await guard.notify({
          formType: 'identity',
          token,
          whatsapp: form.querySelector('[name="whatsapp"]').value,
          clientId: result.clientId || clientIdField.value,
          projectId: result.projectId || projectIdField.value,
          service: result.service || 'Identity',
          email: result.email || '',
          answers
        });
      } catch (emailError) {
        console.error('Web3Forms notification failed after Sheets save:', emailError);
        form.reset();
        fields.hidden = true;
        verifyBox.hidden = true;
        setMessage(formMsg, 'تم حفظ معلومات الهوية بنجاح، لكن تعذر إرسال إشعار البريد الآن.', true);
        return;
      }

      form.reset();
      fields.hidden = true;
      verifyBox.hidden = true;
      setMessage(formMsg, 'تم إرسال معلومات الهوية بنجاح.', true);
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
