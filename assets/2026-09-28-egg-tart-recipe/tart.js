// Loaded by egg-tart-recipe.html: a <div class="tart-recipe"> holding an SVG
// image plus <section class="tart-popup" data-part="..."> blocks. The SVG is
// inlined so each <g class="tart-part" data-part="..."> can be hovered,
// tapped, or focused to show the matching section as a popup. Without JS
// (or if the fetch fails) the image and sections just render as a normal
// post.
(function () {
  var GAP = 16;
  var EDGE = 8;
  var narrow = window.matchMedia('(max-width: 600px)');

  function setup(root) {
    var img = root.querySelector('img[src$=".svg"]');
    if (!img) return;
    fetch(img.src)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + img.src);
        return res.text();
      })
      .then(function (text) {
        var svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
        if (svg.nodeName !== 'svg') return;
        svg.removeAttribute('width');
        svg.removeAttribute('height');

        var stage = document.createElement('div');
        stage.className = 'tart-stage';
        stage.appendChild(document.importNode(svg, true));
        var holder = img.closest('p') || img;
        holder.parentNode.replaceChild(stage, holder);

        root.querySelectorAll('.tart-popup').forEach(function (popup) {
          popup.setAttribute('role', 'tooltip');
          popup.hidden = true;
          stage.appendChild(popup);
        });
        root.classList.add('tart-ready');
        wire(stage);
      })
      .catch(function () {});
  }

  function wire(stage) {
    var pinned = null;

    function popupFor(part) {
      return stage.querySelector('.tart-popup[data-part="' + part.getAttribute('data-part') + '"]');
    }

    function hideAll(except) {
      stage.querySelectorAll('.tart-popup').forEach(function (p) {
        if (p !== except) p.hidden = true;
      });
      stage.querySelectorAll('.tart-part').forEach(function (part) {
        part.classList.toggle('is-active', !!except && popupFor(part) === except);
      });
    }

    // Places the popup beside the point (x, y) in viewport coordinates,
    // flipping to the other side if it would run off screen.
    function show(part, x, y) {
      var popup = popupFor(part);
      if (!popup) return;
      hideAll(popup);
      popup.hidden = false;
      if (narrow.matches) {
        popup.style.left = popup.style.top = '';
        return;
      }
      var rect = stage.getBoundingClientRect();
      var w = popup.offsetWidth;
      var h = popup.offsetHeight;
      var left = x + GAP + w > window.innerWidth - EDGE ? x - GAP - w : x + GAP;
      var top = y + GAP + h > window.innerHeight - EDGE ? y - GAP - h : y + GAP;
      left = Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - w));
      top = Math.max(EDGE, Math.min(top, window.innerHeight - EDGE - h));
      popup.style.left = left - rect.left + 'px';
      popup.style.top = top - rect.top + 'px';
    }

    function showAtPart(part) {
      var r = part.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      show(part, cx, cy);
    }

    function unpin() {
      pinned = null;
      hideAll(null);
    }

    stage.querySelectorAll('.tart-part').forEach(function (part) {
      ['pointerenter', 'pointermove'].forEach(function (type) {
        part.addEventListener(type, function (e) {
          if (e.pointerType === 'mouse' && !pinned) show(part, e.clientX, e.clientY);
        });
      });
      part.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse' && !pinned) hideAll(null);
      });
      part.addEventListener('click', function (e) {
        e.stopPropagation();
        if (pinned === part) return unpin();
        pinned = part;
        show(part, e.clientX, e.clientY);
      });
      part.addEventListener('focus', function () {
        if (!pinned) showAtPart(part);
      });
      part.addEventListener('blur', function () {
        if (!pinned) hideAll(null);
      });
      part.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (pinned === part) return unpin();
          pinned = part;
          showAtPart(part);
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (pinned && !e.target.closest('.tart-popup')) unpin();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') unpin();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.tart-recipe').forEach(setup);
  });
})();
