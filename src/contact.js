(function () {
  var CONTACT_EMAIL = 'weikitw1+eggtartspage@gmail.com';

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Called by the reCAPTCHA widget (via data-callback / data-expired-callback).
  // Defined on window right away since the widget can invoke these before
  // DOMContentLoaded finishes, and reCAPTCHA itself only becomes interactive
  // well after the page has loaded anyway.
  window.onRecaptchaSuccess = function () {
    var btn = document.getElementById('contact-submit');
    if (btn) btn.disabled = false;
  };

  window.onRecaptchaExpired = function () {
    var btn = document.getElementById('contact-submit');
    if (btn) btn.disabled = true;
  };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var nameInput = document.getElementById('contact-name');
    var emailInput = document.getElementById('contact-email');
    var messageInput = document.getElementById('contact-message');
    var errorEl = document.getElementById('contact-error');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    function clearError() {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();

      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      var message = messageInput.value.trim();

      if (typeof grecaptcha !== 'undefined' && grecaptcha.getResponse().length === 0) {
        showError('Please complete the CAPTCHA verification.');
        return;
      }
      if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address so I can respond to you.');
        emailInput.focus();
        return;
      }
      if (!message) {
        showError('Please enter a message.');
        messageInput.focus();
        return;
      }

      var subject = 'Message from ' + (name || 'your blog contact form');
      var bodyLines = [];
      if (name) bodyLines.push('Name: ' + name);
      bodyLines.push('Email: ' + email);
      bodyLines.push('');
      bodyLines.push(message);

      var mailto =
        'mailto:' + encodeURIComponent(CONTACT_EMAIL) +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(bodyLines.join('\n'));

      window.location.href = mailto;
    });
  });
})();
