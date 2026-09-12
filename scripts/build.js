const fs = require('fs');
const { PER_PAGE, BASE, DIST_DIR, url } = require('./util/config');
const { loadPosts } = require('./util/posts');
const {
  renderListPage,
  renderPostPage,
  renderAboutPage,
  renderContactPage,
} = require('./util/templates');
const { rimraf, writeFile, copyStaticAssets, copyImages } = require('./util/output');

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
