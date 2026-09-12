(function () {
  var BASE = window.SITE_BASE || '/';
  var indexPromise = null;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(BASE + 'search-index.json')
        .then(function (res) {
          return res.json();
        })
        .catch(function () {
          return [];
        });
    }
    return indexPromise;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderResults(container, matches, query) {
    if (!query) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    if (matches.length === 0) {
      container.innerHTML = '<div class="no-results">No posts match "' + escapeHtml(query) + '"</div>';
      container.hidden = false;
      return;
    }
    container.innerHTML = matches
      .slice(0, 8)
      .map(function (post) {
        var tags = (post.tags || [])
          .map(function (t) {
            return '<span class="result-tag">' + escapeHtml(t) + '</span>';
          })
          .join('');
        return (
          '<a href="' + post.url + '">' +
          '<span class="result-title">' + escapeHtml(post.title) + '</span>' +
          '<span class="result-date">' + escapeHtml(post.dateDisplay) + '</span>' +
          (tags ? '<span class="result-tags">' + tags + '</span>' : '') +
          '</a>'
        );
      })
      .join('');
    container.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var form = input ? input.closest('form') : null;
    if (!input || !results) return;

    input.addEventListener('input', function () {
      var query = input.value.trim().toLowerCase();
      if (!query) {
        renderResults(results, [], '');
        return;
      }
      loadIndex().then(function (posts) {
        var matches = posts.filter(function (post) {
          if (post.title.toLowerCase().indexOf(query) !== -1) return true;
          return (post.tags || []).some(function (tag) {
            return tag.toLowerCase().indexOf(query) !== -1;
          });
        });
        renderResults(results, matches, input.value.trim());
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = results.querySelector('a');
      if (first) window.location.href = first.getAttribute('href');
    });

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) {
        results.hidden = true;
      }
    });

    input.addEventListener('focus', function () {
      if (input.value.trim() && results.innerHTML) results.hidden = false;
    });
  });
})();
