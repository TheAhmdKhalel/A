/**
 * Entry guard for private client forms.
 * GitHub Pages cannot enforce server-side authorization on a static route,
 * so pages without a token are immediately redirected away before the form
 * can be used. Token + WhatsApp verification remains enforced by Apps Script.
 */
(() => {
  const params = new URLSearchParams(window.location.search);
  const token = (params.get('token') || '').trim();

  if (!token) {
    window.location.replace('/');
    return;
  }
})();
