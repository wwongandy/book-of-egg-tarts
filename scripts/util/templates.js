const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { url, BASE, CONTENT_DIR, RECAPTCHA_SITE_KEY } = require('./config');
const { marked, withMediaContext } = require('./markdown');
const { escapeHtml } = require('./text');

function layout({ title, activeNav, bodyHtml, description }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
<link rel="stylesheet" href="${url('styles.css')}">
</head>
<body>
<script>window.SITE_BASE = ${JSON.stringify(BASE)};</script>
<header class="site-header">
  <nav class="nav">
    <a class="nav-brand" href="${url('')}">The Book of Egg Tarts</a>
    <div class="nav-links">
      <a href="${url('')}" ${activeNav === 'home' ? 'aria-current="page"' : ''}>Home</a>
      <a href="${url('about/')}" ${activeNav === 'about' ? 'aria-current="page"' : ''}>About</a>
      <a href="${url('contact/')}" ${activeNav === 'contact' ? 'aria-current="page"' : ''}>Contact</a>
    </div>
    <form class="search-form" role="search" autocomplete="off">
      <input type="search" id="search-input" placeholder="Search title or label…" aria-label="Search posts by title or label">
      <div id="search-results" class="search-results" hidden></div>
    </form>
  </nav>
</header>
<main class="container">
${bodyHtml}
</main>
<footer class="site-footer">
  <p>Note that egg tarts are not the same as pastel de natas or custard tarts.</p>
</footer>
<button id="theme-toggle" aria-label="Toggle light and dark mode" title="Toggle light/dark mode">
  <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
  <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
</button>
<script src="${url('theme.js')}"></script>
<script src="${url('search.js')}"></script>
</body>
</html>
`;
}

function tagList(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="tag-list">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`;
}

function postCard(post) {
  return `<article class="post-card">
  <h2><a href="${url('posts/' + post.slug + '/')}">${escapeHtml(post.title)}</a></h2>
  <time datetime="${post.date}">${post.dateDisplay}</time>
  ${tagList(post.tags)}
  <div class="excerpt">${post.excerptHtml}</div>
  <a class="read-more" href="${url('posts/' + post.slug + '/')}">Read more &rarr;</a>
</article>`;
}

function pagination(page, totalPages) {
  if (totalPages <= 1) return '';
  const prevHref = page === 1 ? null : page === 2 ? url('') : url(`page/${page - 1}/`);
  const nextHref = page === totalPages ? null : url(`page/${page + 1}/`);
  return `<nav class="pagination" aria-label="Pagination">
  ${prevHref ? `<a href="${prevHref}">&larr; Newer posts</a>` : '<span></span>'}
  <span class="page-indicator">Page ${page} of ${totalPages}</span>
  ${nextHref ? `<a href="${nextHref}">Older posts &rarr;</a>` : '<span></span>'}
</nav>`;
}

function renderListPage(posts, page, totalPages) {
  const cards = posts.length ? posts.map(postCard).join('\n') : '<p>No posts yet.</p>';
  const body = `<section class="post-list">
${cards}
</section>
${pagination(page, totalPages)}`;
  return layout({
    title: page === 1 ? 'My Blog' : `My Blog — Page ${page}`,
    activeNav: 'home',
    bodyHtml: body,
    description: 'A minimalistic personal blog.',
  });
}

function renderPostPage(post) {
  const body = `<article class="post">
  <h1>${escapeHtml(post.title)}</h1>
  <time datetime="${post.date}">${post.dateDisplay}</time>
  ${tagList(post.tags)}
  <div class="post-content">${post.contentHtml}</div>
  <p><a href="${url('')}">&larr; Back to all posts</a></p>
</article>`;
  return layout({
    title: post.title,
    activeNav: 'post',
    bodyHtml: body,
    description: post.excerptText.slice(0, 160),
  });
}

function renderAboutPage() {
  const aboutPath = path.join(CONTENT_DIR, 'about.md');
  const raw = fs.readFileSync(aboutPath, 'utf8');
  const { data, content } = matter(raw);
  const html = withMediaContext('about', () => marked.parse(content));
  const body = `<article class="post">
  <h1>${escapeHtml(data.title || 'About')}</h1>
  <div class="post-content">${html}</div>
</article>`;
  return layout({ title: 'About', activeNav: 'about', bodyHtml: body });
}

function renderContactPage() {
  const body = `<article class="post">
  <h1>Contact</h1>
  <div class="post-content">
    <div class="contact-links">
      <a class="button-link" href="https://www.linkedin.com/in/wei-wong-454995170/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a class="button-link button-link-secondary" href="https://drive.google.com/file/d/1OmyWCsTszZx9D1Cb7-f0Vc5MCNmqaBsA/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume</a>
    </div>
    <p>You can also contact me using the form below, though I presume you already know me personally if you are reading this blog.</p>
  </div>
  <form id="contact-form" class="contact-form" novalidate>
    <label for="contact-name">Name</label>
    <input type="text" id="contact-name" name="name" autocomplete="name">

    <label for="contact-email">Your email <span class="required">(required)</span></label>
    <input type="email" id="contact-email" name="email" autocomplete="email" required>

    <label for="contact-message">Message <span class="required">(required)</span></label>
    <textarea id="contact-message" name="message" rows="6" required></textarea>

    <div class="recaptcha-wrapper">
      <div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}" data-callback="onRecaptchaSuccess" data-expired-callback="onRecaptchaExpired"></div>
    </div>

    <p id="contact-error" class="form-error" role="alert" hidden></p>

    <button type="submit" id="contact-submit" disabled>Compose Email</button>
  </form>
</article>
<script src="https://www.google.com/recaptcha/api.js" async defer></script>
<script src="${url('contact.js')}"></script>`;
  return layout({ title: 'Contact', activeNav: 'contact', bodyHtml: body });
}

module.exports = {
  renderListPage,
  renderPostPage,
  renderAboutPage,
  renderContactPage,
};
