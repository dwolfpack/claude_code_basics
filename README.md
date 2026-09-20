# Claude Code Basics

A small static site and a handful of browser games, built with Claude Code and
deployed to GitHub Pages straight from `main`. No build step, no dependencies —
every page is plain HTML, CSS and vanilla JavaScript, so anything here can be
opened straight from the filesystem or served with any static file server.

```sh
npx http-server -p 8146 .      # then open http://localhost:8146/
```

## The site

| Page | What it is |
| --- | --- |
| [`index.html`](index.html) | Landing page — the learning path from first setup to agentic workflows |
| [`setup-guide.html`](setup-guide.html) | Installing and configuring Claude Code |
| [`projects-list.html`](projects-list.html) | First projects, with the demos in [`projects/`](projects) |
| [`sessions-list.html`](sessions-list.html) | Advanced sessions — skills, subagents, flows, in [`sessions/`](sessions) |
| [`social-list.html`](social-list.html) | Sharing what you built, in [`social/`](social) |

## Games

| Game | Directory | What it is |
| --- | --- | --- |
| **Golden Trail** | [`golden-trail/`](golden-trail) | A Golden-Axe-style beat-'em-up: four knights, a six-stage trail, rideable drakes and two great wyrms. Installable, plays offline. |
| **Shadow Step** | [`ninja-runner/`](ninja-runner) | An endless three-lane ninja runner with swipe controls. Installable, plays offline. |
| **Hebrew Quest** | [`hebrew-quest/`](hebrew-quest) | מסע בעברית — a Hebrew-learning game for children. |
| **Jungle Runner** | [`jungle-runner/`](jungle-runner) | A small side-scrolling runner. |

Each game directory has its own README with controls and notes.

## Deployment

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) uploads the whole
repository to GitHub Pages on every push to `main`, so a merged change is live
without any further steps.
