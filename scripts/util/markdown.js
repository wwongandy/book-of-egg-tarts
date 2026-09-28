const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { url, ASSETS_DIR } = require('./config');

// Lets markdown reference local assets by filename alone, e.g.
// ![alt](my-photo.jpg), and have it resolve to the right file under
// assets/ — regardless of how deep the current page is nested (a post
// page) or what base path GitHub Pages serves the site under. Absolute
// URLs, protocol-relative URLs, data: URIs, and paths that already start
// with "/" are left untouched.
//
// Each post/page can keep its assets in its own assets/<context>/ folder
// to stay easy to navigate (e.g. assets/2026-09-12-hello-world/foo.jpg for
// posts/2026-09-12-hello-world.md) — set via withMediaContext before
// parsing. If the file isn't found there, it falls back to assets/
// directly, so shared assets can still just live at the top level.
let currentMediaContext = null;

function withMediaContext(context, fn) {
  const previous = currentMediaContext;
  currentMediaContext = context;
  try {
    return fn();
  } finally {
    currentMediaContext = previous;
  }
}

function isExternalHref(href) {
  return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith('data:') || href.startsWith('/');
}

// Returns the published URL for a local asset reference, plus where it
// lives on disk so the build can read it (e.g. to inline an HTML embed).
function locateAsset(href) {
  if (currentMediaContext) {
    const scopedPath = path.join(ASSETS_DIR, currentMediaContext, href);
    if (fs.existsSync(scopedPath)) {
      return { filePath: scopedPath, url: url(`assets/${currentMediaContext}/${href}`) };
    }
  }
  return { filePath: path.join(ASSETS_DIR, href), url: url('assets/' + href) };
}

function resolveAssetHref(href) {
  return isExternalHref(href) ? href : locateAsset(href).url;
}

// ![alt](my-widget.html) inlines that HTML file into the page, for
// interactive content that doesn't fit markdown. Its own src/href
// attributes (scripts, stylesheets, images) are relative to the file's
// folder and resolved the same way markdown asset references are, so the
// file can pull in its assets by filename, e.g. <script src="widget.js">.
// Anything with a URL scheme or a leading "#" is left untouched.
function renderHtmlEmbed(href) {
  const { filePath } = locateAsset(href);
  if (!fs.existsSync(filePath)) {
    throw new Error(`HTML embed "${href}" not found (looked in assets/${currentMediaContext || ''}).`);
  }
  const html = fs.readFileSync(filePath, 'utf8');
  return html.replace(/\b(src|href)="([^"]*)"/g, (match, attr, value) => {
    if (!value || value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(value) || isExternalHref(value)) {
      return match;
    }
    return `${attr}="${resolveAssetHref(value)}"`;
  });
}

// Standard markdown image syntax — ![alt](src "title") — doubles as video
// embedding: if the file extension looks like a video, it renders as a
// muted, autoplaying, looping <video> instead of an <img>. Same local-file
// resolution and caption support as images, just a different tag. A .html
// extension inlines the file instead (see renderHtmlEmbed).
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
// Inlined HTML is block-level, so a paragraph holding nothing but an embed
// is unwrapped rather than left as invalid <p><div>…</div></p>.
const htmlEmbeds = new Set();
markedRenderer.image = (href, title, text) => {
  if (getExtension(href) === 'html' && !isExternalHref(href)) {
    const embedHtml = renderHtmlEmbed(href);
    htmlEmbeds.add(embedHtml);
    return embedHtml;
  }
  const resolvedHref = resolveAssetHref(href);
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
const defaultParagraphRenderer = markedRenderer.paragraph.bind(markedRenderer);
markedRenderer.paragraph = (text) => (htmlEmbeds.has(text) ? text : defaultParagraphRenderer(text));
marked.use({ renderer: markedRenderer });

// Matches a paragraph that is ENTIRELY wrapped in italics — *text*,
// _text_, or the bold+italic ***text***/___text___ — so it can be skipped
// as a home-page excerpt (asides/notes are often styled this way). Plain
// bold (**text**) is not italic, so it's left alone.
const ITALIC_ONLY_PATTERNS = [
  /^\*(?!\*)([\s\S]+)\*$/,
  /^\*{3}([\s\S]+)\*{3}$/,
  /^_(?!_)([\s\S]+)_$/,
  /^_{3}([\s\S]+)_{3}$/,
];

function isItalicOnlyParagraph(text) {
  return ITALIC_ONLY_PATTERNS.some((re) => re.test(text));
}

// Picks the first paragraph suitable for a home-page excerpt: skips
// headings and paragraphs that are entirely italicized (often asides).
function firstParagraphMarkdown(body) {
  const blocks = body
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.find((b) => !b.startsWith('#') && !isItalicOnlyParagraph(b)) || blocks[0] || '';
}

module.exports = {
  marked,
  withMediaContext,
  firstParagraphMarkdown,
};
