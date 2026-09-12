---
title: Markdown Feature Showcase
date: 2026-08-01
tags: [running, engineering]
---

This file is a reference, not a live post — it lives at the project root, not in `posts/`, so the build script never picks it up and it never appears on the site. Copy any of the patterns below into a real post in `posts/` whenever you need them.

Below is everything this markdown-powered setup can render — headings, lists, code, tables, and more.

## Labels (tags)

Add a `tags` list to a post's frontmatter, like this file does at the top:

```yaml
tags: [running, engineering]
```

Tags show up as small pills under the title, both on the home page and on the post itself, and they're searchable — typing "running" or "engineering" into the search bar in the nav will find this post. A post with no `tags` field just shows no pills; a good default for posts that don't fit a specific label is a single catch-all tag like `tags: [other]`.

## Text formatting

You can write **bold text**, *italic text*, ***bold italic***, and ~~strikethrough~~. Inline `code` works too, and so do [links](https://www.markdownguide.org/).

## Headings

Headings from `##` down to `######` are all supported.

### A smaller heading

#### An even smaller one

##### Getting quite small

###### The smallest heading

## Lists

Unordered lists:

- First item
- Second item
  - A nested item
  - Another nested item
- Third item

Ordered lists:

1. Preheat the oven
2. Mix the ingredients
3. Bake for 25 minutes
   1. Check at the 20 minute mark
   2. Rotate the pan if needed

Task lists:

- [x] Write the build script
- [x] Add light/dark mode
- [ ] Convince everyone I know to subscribe

## Blockquotes

> Simplicity is the ultimate sophistication.
>
> — often attributed to Leonardo da Vinci

## Code blocks

Inline code like `const x = 1` is one thing, but fenced code blocks get syntax highlighting hints too:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('world'));
```

```python
def greet(name):
    return f"Hello, {name}!"

print(greet("world"))
```

## Tables

| Feature       | Supported |
|---------------|-----------|
| Headings      | Yes       |
| Lists         | Yes       |
| Tables        | Yes       |
| Code blocks   | Yes       |
| Images        | Yes       |

## Images

A regular URL works exactly as you'd expect:

![A scenic placeholder](https://picsum.photos/600/300)

Local images work too. Drop a file into the `images/` folder at the project root, then reference it by filename alone — no need to think about base paths or how deeply nested the current page is:

![A local sample image](sample.svg)

That second image is `images/sample.svg` in this repo, referenced in this post as just `![A local sample image](sample.svg)`.

All images are automatically capped at 300px tall and centered on the page, so a photo never overwhelms a post regardless of its original size.

### Captions

Add a caption by adding a quoted title after the URL — the fourth part of standard markdown image syntax:

```markdown
![Alt text](sample.svg "This text becomes the caption")
```

![A local sample image](sample.svg "A caption rendered underneath the image")

The alt text (`Alt text` / `A local sample image`) is still there for accessibility and screen readers — it's just not shown visually. The quoted title is what appears as the caption underneath the image. Leave the title off and no caption is shown.

## Videos

The exact same image syntax embeds a video instead, if the file extension is a video type (`.mp4`, `.webm`, `.ogv`, `.mov`). No audio support is needed here, so every video renders muted, autoplaying, and looping, with playback controls in case a reader wants to pause it:

```markdown
![A short clip](my-clip.mp4)
```

![A sample clip](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4 "A public-domain sample clip, autoplaying and looping")

Local video files work the same way images do — drop one in `images/` and reference it by filename alone. Captions work identically too (the quoted title above became the caption under this clip). Stick to `.mp4` or `.webm` for the widest browser support; `.mov` files often don't play in Chrome or Firefox.

## Horizontal rule

Three hyphens on their own line draw a divider:

---

## Wrapping up

That covers pretty much everything you'd ever need for a simple blog post: text styling, headings, lists, quotes, code, tables, and images. Anything written in the `posts/` folder using these features will render exactly like this.
