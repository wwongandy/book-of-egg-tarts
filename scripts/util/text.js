// Small generic string/formatting helpers shared across the build.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

module.exports = {
  escapeHtml,
  slugify,
  normalizeDate,
  formatDate,
  normalizeTags,
  stripHtml,
};
