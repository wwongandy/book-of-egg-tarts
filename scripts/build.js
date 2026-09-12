const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const CONTENT_DIR = path.join(ROOT, 'content');
const SRC_DIR = path.join(ROOT, 'src');
const IMAGES_DIR = path.join(ROOT, 'images');
const DIST_DIR = path.join(ROOT, 'dist');
const PER_PAGE = 10;

// Minimal .env.local loader for local dev, so contributors don't need to
// export vars by hand. Only fills in vars not already set in the real
// environment (CI sets RECAPTCHA_SITE_KEY etc. via real env vars, which
// take precedence). No dependency on the "dotenv" package for this.
function loadDotEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnvLocal();

// BASE is the site's root path, e.g. "/" for a user/org page or a custom
// domain, or "/repo-name/" for a GitHub project page. Set via env var in CI.
let BASE = process.env.SITE_BASE || '/';
if (!BASE.startsWith('/')) BASE = '/' + BASE;
if (!BASE.endsWith('/')) BASE = BASE + '/';

// Google's published test key for reCAPTCHA v2 — always renders and always
// passes, so local builds work out of the box. Replace with your own site
// key (from google.com/recaptcha/admin) via the RECAPTCHA_SITE_KEY env var
// before deploying for real; the test key does not block anything.
const RECAPTCHA_SITE_KEY =
  process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function url(relPath) {
  return BASE + relPath.replace(/^\/+/, '');
}

// Lets markdown reference local images by filename alone, e.g.
// ![alt](my-photo.jpg), and have it resolve to images/my-photo.jpg under
// the site's base path — regardless of how deep the current page is
// nested (a post page) or what base path GitHub Pages serves the site
// under. Absolute URLs, protocol-relative URLs, data: URIs, and paths
// that already start with "/" are left untouched.
function resolveImageHref(href) {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith('data:') || href.startsWith('/')) {
    return href;
  }
  return url('images/' + href);
}

// Standard markdown image syntax — ![alt](src "title") — doubles as video
// embedding: if the file extension looks like a video, it renders as a
// muted, autoplaying, looping <video> instead of an <img>. Same local-file
// resolution and caption support as images, just a different tag.
const VIDEO_MIME_TYPES = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
};

function getExtension(href) {
  const withoutQuery = href.split(/[?#]/)[0];
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function isVideoHref(href) {
  return getExtension(href) in VIDEO_MIME_TYPES;
}

// Minimal guard since video hrefs bypass marked's own link-cleaning
// (which the default image renderer normally applies) — this is a
// single-author blog, but there's no reason not to reject javascript: URLs.
function isSafeUrl(href) {
  return !/^\s*javascript:/i.test(href);
}

// A markdown image's "title" (![alt](src "title")) becomes a caption
// rendered underneath it, inside a <figure>. Title text arriving here is
// already HTML-escaped by marked's lexer, so it's safe to drop straight
// into the caption markup.
const markedRenderer = new marked.Renderer();
const defaultImageRenderer = markedRenderer.image.bind(markedRenderer);
markedRenderer.image = (href, title, text) => {
  const resolvedHref = resolveImageHref(href);
  let mediaHtml;
  if (isVideoHref(href) && isSafeUrl(resolvedHref)) {
    const mime = VIDEO_MIME_TYPES[getExtension(href)];
    mediaHtml = `<video autoplay loop muted playsinline controls><source src="${resolvedHref}" type="${mime}">${text}</video>`;
  } else {
    mediaHtml = defaultImageRenderer(resolvedHref, title, text);
  }
  if (!title) return mediaHtml;
  return `<figure class="post-image">${mediaHtml}<figcaption>${title}</figcaption></figure>`;
};
marked.use({ renderer: markedRenderer });

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(relPath, contents) {
  const fullPath = path.join(DIST_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents);
}

// gray-matter (via js-yaml) parses an unquoted "date: 2026-09-01" as a JS
// Date object rather than a string, so frontmatter dates need normalizing
// to a plain "YYYY-MM-DD" string regardless of which form they arrive in.
function normalizeDate(rawDate) {
  if (rawDate instanceof Date) {
    return rawDate.toISOString().slice(0, 10);
  }
  return String(rawDate).slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstParagraphMarkdown(body) {
  const blocks = body
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const paragraph = blocks.find((b) => !b.startsWith('#')) || blocks[0] || '';
  return paragraph;
}

function normalizeTags(rawTags) {
  if (!rawTags) return [];
  const list = Array.isArray(rawTags) ? rawTags : String(rawTags).split(',');
  return list.map((t) => String(t).trim()).filter(Boolean);
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Load posts ----------

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  const posts = files.map((filename) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { data, content } = matter(raw);

    if (!data.title) {
      throw new Error(`Post "${filename}" is missing a "title" in its frontmatter.`);
    }
    if (!data.date) {
      throw new Error(`Post "${filename}" is missing a "date" in its frontmatter.`);
    }

    const defaultSlug = filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const slug = data.slug ? slugify(data.slug) : slugify(defaultSlug);

    const excerptMarkdown = firstParagraphMarkdown(content);
    const excerptHtml = marked.parse(excerptMarkdown);
    const contentHtml = marked.parse(content);

    const date = normalizeDate(data.date);
    const tags = normalizeTags(data.tags);

    return {
      title: data.title,
      date,
      dateDisplay: formatDate(date),
      slug,
      tags,
      excerptHtml,
      excerptText: stripHtml(excerptHtml),
      contentHtml,
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

// ---------- Templates ----------

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const cards = posts.length
    ? posts.map(postCard).join('\n')
    : '<p>No posts yet.</p>';
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
  const html = marked.parse(content);
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

// ---------- Build ----------

function copyStaticAssets() {
  const files = ['styles.css', 'theme.js', 'search.js', 'contact.js'];
  for (const f of files) {
    fs.copyFileSync(path.join(SRC_DIR, f), path.join(DIST_DIR, f));
  }
}

function copyImages() {
  if (!fs.existsSync(IMAGES_DIR)) return;
  fs.cpSync(IMAGES_DIR, path.join(DIST_DIR, 'images'), { recursive: true });
}

function build() {
  rimraf(DIST_DIR);
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const posts = loadPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * PER_PAGE;
    const pagePosts = posts.slice(start, start + PER_PAGE);
    const html = renderListPage(pagePosts, page, totalPages);
    if (page === 1) {
      writeFile('index.html', html);
    } else {
      writeFile(`page/${page}/index.html`, html);
    }
  }

  for (const post of posts) {
    writeFile(`posts/${post.slug}/index.html`, renderPostPage(post));
  }

  writeFile('about/index.html', renderAboutPage());
  writeFile('contact/index.html', renderContactPage());

  const searchIndex = posts.map((p) => ({
    title: p.title,
    date: p.date,
    dateDisplay: p.dateDisplay,
    url: url(`posts/${p.slug}/`),
    excerpt: p.excerptText.slice(0, 160),
    tags: p.tags,
  }));
  writeFile('search-index.json', JSON.stringify(searchIndex));

  // .nojekyll prevents GitHub Pages from ignoring files/folders starting with underscore etc.
  writeFile('.nojekyll', '');

  copyStaticAssets();
  copyImages();

  console.log(`Built ${posts.length} post(s) across ${totalPages} page(s). BASE=${BASE}`);
}

build();
