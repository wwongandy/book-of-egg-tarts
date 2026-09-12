const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { url, IMAGES_DIR } = require('./config');

// Lets markdown reference local images by filename alone, e.g.
// ![alt](my-photo.jpg), and have it resolve to the right file under
// images/ — regardless of how deep the current page is nested (a post
// page) or what base path GitHub Pages serves the site under. Absolute
// URLs, protocol-relative URLs, data: URIs, and paths that already start
// with "/" are left untouched.
//
// Each post/page can keep its media in its own images/<context>/ folder
// to stay easy to navigate (e.g. images/2026-09-12-hello-world/foo.jpg for
// posts/2026-09-12-hello-world.md) — set via withMediaContext before
// parsing. If the file isn't found there, it falls back to images/
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

function resolveImageHref(href) {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith('data:') || href.startsWith('/')) {
    return href;
  }
  if (currentMediaContext) {
    const scopedPath = path.join(IMAGES_DIR, currentMediaContext, href);
    if (fs.existsSync(scopedPath)) {
      return url(`images/${currentMediaContext}/${href}`);
    }
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
