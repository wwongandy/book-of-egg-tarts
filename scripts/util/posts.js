const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { POSTS_DIR } = require('./config');
const { marked, withMediaContext, firstParagraphMarkdown } = require('./markdown');
const { slugify, normalizeDate, formatDate, normalizeTags, stripHtml } = require('./text');

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

    const filenameBase = filename.replace(/\.md$/, '');
    const defaultSlug = filenameBase.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const slug = data.slug ? slugify(data.slug) : slugify(defaultSlug);

    const excerptMarkdown = firstParagraphMarkdown(content);
    const excerptHtml = withMediaContext(filenameBase, () => marked.parse(excerptMarkdown));
    const contentHtml = withMediaContext(filenameBase, () => marked.parse(content));

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

module.exports = { loadPosts };
