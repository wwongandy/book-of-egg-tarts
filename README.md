# Book of Egg Tarts

This is my own personal blog that you can fork and modify to make your own
blog.

Posts are markdown files, compiled into static HTML by a small Node build
script, and deployed to GitHub Pages via GitHub
Actions. No database, no backend, no client-side markdown rendering.

## Writing a post

Add a markdown file to `posts/`, named however you like (a date prefix like
`2026-09-12-my-post.md` keeps them sorted in the folder, but sorting on the
site itself is driven by the `date` in the frontmatter, not the filename).

```markdown
---
title: My Post Title
date: 2026-09-12
---

First paragraph — this is what shows on the home page as the preview.

Rest of the post goes here, using normal markdown.
```

Optional frontmatter fields:

- `slug` — overrides the URL slug (defaults to the filename, minus a leading
  `YYYY-MM-DD-` date prefix if present).
- `tags` — a list of labels, e.g. `tags: [running, engineering]`. They show
  as small pills on the post and are searchable from the nav search bar —
  typing a tag name finds every post with that tag. A good default for
  posts that don't fit a specific label is `tags: [other]`.

See `example.md` at the project root for a full reference of every markdown
feature this blog supports (headings, lists, tables, code blocks, images,
and more). It intentionally lives outside `posts/`, so the build never
picks it up and it never appears on the live site.

## Adding images to a post

Drop image files into the `images/` folder at the project root, then
reference them in a post by filename alone:

```markdown
![Alt text](my-photo.jpg)
```

The build script rewrites that to the correct URL under the site's base
path, no matter how deep the post page is nested or whether the site is
served from a subpath (as GitHub project pages are). Full URLs
(`https://...`) and data URIs are left untouched, so external images still
work exactly as written.

Every image is automatically capped at 300px tall and centered, regardless
of its original size. Add a caption by adding a quoted title after the
path — this is standard markdown image syntax:

```markdown
![Alt text](my-photo.jpg "This text becomes the caption")
```

The alt text stays for accessibility; the quoted title is what renders as
a caption underneath the image. Leave the title off for no caption.

### Videos

The same syntax embeds a video if the extension is a video type (`.mp4`,
`.webm`, `.ogv`, `.mov`):

```markdown
![Alt text](my-clip.mp4)
```

It renders as a muted, autoplaying, looping `<video>` with controls — no
audio support is needed for this, so it's always muted. Local files, path
resolution, and captions all work exactly like they do for images. Prefer
`.mp4` or `.webm`; `.mov` often won't play in Chrome or Firefox.

Push to `main` and GitHub Actions rebuilds and redeploys the site
automatically.

## Editing the About page

Edit `content/about.md`. It's rendered the same way as a post page.

## Light/dark mode

The reader-mode toggle (bottom-right button) defaults to dark between 9pm
and 6am in the visitor's own local time, and light the rest of the day —
this is a plain clock check on their device, not a location lookup, done
once when the page loads (a tab left open across the boundary won't flip
on its own until it's reloaded). Once someone clicks the toggle, their
explicit choice is remembered (`localStorage`) and overrides the clock for
that browser from then on. Change the window by editing
`NIGHT_START_HOUR` / `NIGHT_END_HOUR` at the top of `src/theme.js`.

## Local development

```bash
npm install
npm run build     # writes the static site to dist/
npm run dev        # build + serve dist/ locally
```

## How the contact form works

This is a fully static site, so it can't send email on your behalf. The
contact form instead validates that the visitor entered their email and a
message, then opens the visitor's own email client with a pre-filled
`mailto:` link addressed to you, so you can reply directly to them.

Before that, the visitor must complete a Google reCAPTCHA v2 checkbox — the
"Compose Email" button stays disabled until it's checked.

### Setting up your own reCAPTCHA key

By default the site ships with Google's public **test key**, which always
renders and always passes (it doesn't actually block anything) — this
lets the whole site build and work locally without any setup. Before you
rely on it for real:

1. Go to [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin),
   register a new site, choose **reCAPTCHA v2 "I'm not a robot" Checkbox**,
   and add your GitHub Pages domain (e.g. `<username>.github.io`).
2. Copy the **Site Key** it gives you (not the Secret Key — this project
   has no backend, so the secret key is never used).
3. In your GitHub repo, go to **Settings → Secrets and variables → Actions**
   and add a new repository secret named `RECAPTCHA_SITE_KEY` with that
   value. The deploy workflow already passes it through automatically.
4. For local builds, export it before running `npm run build`:
   ```bash
   export RECAPTCHA_SITE_KEY=your-site-key-here
   npm run build
   ```

Note that reCAPTCHA site keys are meant to be public — they appear in the
page source of every site that uses one — so there's no need to keep this
value secret; using a GitHub secret here is just a convenient way to keep
your specific key out of the repo's source files, not a security measure.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo settings, go to **Pages** and set the source to **GitHub
   Actions**.
3. Push to `main` — the included workflow (`.github/workflows/deploy.yml`)
   builds the site and publishes it.

The workflow automatically figures out the correct base path: `/` for a
`<username>.github.io` repo, or `/<repo-name>/` for a normal project repo.
