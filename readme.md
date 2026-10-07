# Telegrinder docs website

A static site for the Markdown in [`telegrinder/dev/docs`](https://github.com/timoniq/telegrinder/tree/dev/docs).
Every Astro build and development-server startup downloads a fresh snapshot of the `dev` branch.
Markdown, images, the README example, Python requirement and Bot API version come from that same snapshot.
Downloads live in the ignored `.cache/telegrinder/` directory; a failed download stops the build rather than publishing stale content.

The look is built on the logo's pixel grid: one 20 px cell is the unit of the page, headings and labels use
the Tiny5 pixel face, and the glass renders of the logo and icons morph into their pixel grids and back.

## Run

Use Node 24 and `tar` (included on macOS/Linux and in the Docker image). Run from the repository root:

```sh
npm ci
npm run dev
npm run build
npm run check
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `https://telegrinder.rtfd.io` | Canonical URLs |
| `BASE_PATH` | `/` | Serve from a sub-path, for example `/telegrinder/` on GitHub Pages |
| `TELEGRINDER_DOCS_DIR` | `.cache/telegrinder/docs` | Explicit local-checkout override; disables downloading |

For offline work or editing the upstream docs locally:

```sh
TELEGRINDER_DOCS_DIR=/path/to/telegrinder/docs npm run dev
```

Point to the `docs` directory of a full checkout to also load the README and version metadata.
Restart the development server after changing Markdown; live reload watches the website source, not the external docs.
Downloaded images are copied into the ignored `website/public/docs-assets/` folder.

## Dependency security

The lockfile includes compatible security updates for Astro's transitive dependencies:
`devalue` 5.9.4, `http-cache-semantics` 4.3.0, `sharp` 0.35.5, `smol-toml` 1.9.0 and `source-map-js` 1.2.2.
No forced major upgrades or dependency overrides are required.

Use `npm ci` to install the patched dependency graph and `npm audit` to check both runtime and build dependencies.
After pulling security updates, rebuild and redeploy the production image using the Docker commands below;
an already-built image does not change when the lockfile changes.

## Docker

Development with live reload at <http://localhost:4321>:

```sh
docker compose up --build development
```

The repository is bind-mounted; dependencies use a separate container volume.
Docs are refreshed on server startup, not on every browser request.

Production at <http://localhost:8080>:

```sh
docker compose --profile production build --no-cache production
docker compose --profile production up -d production
```

Use `--no-cache` for production rebuilds: otherwise Docker can reuse the layer containing old upstream docs.
The final image contains only static files and a non-root nginx server, with no Node process or runtime downloads.
Missing pages return HTTP 404; only content-hashed Astro assets use immutable caching.

For a production domain or sub-path, configure the values **at build time**:

```sh
SITE_URL=https://docs.example.com BASE_PATH=/telegrinder/ \
  docker compose --profile production build --no-cache production
docker compose --profile production up -d production
```

nginx serves this build at `/telegrinder/`. TLS is handled by your reverse proxy.
Docker sub-paths support letters, digits, hyphens, underscores and slashes.
Stop the services with `docker compose --profile production down`.

## GitHub Pages

1. Push this repository and workflow to `main`.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**, not **Deploy from a branch**.
   The Astro workflow already exists; do not create a Jekyll template.
3. In **Actions**, open **Deploy documentation to GitHub Pages**, select **Run workflow**, choose `main`, and run it.
4. The workflow builds Astro and publishes only the compiled `dist/` artifact, never the repository root or `website/src/`.

Deployment runs on pushes to `main`, manually via **Actions → Run workflow**, and daily at 04:23 UTC
to pick up upstream documentation changes. Scheduled runs use the repository's default branch.
If you rename the deployment branch, update the workflow's push filter.
GitHub Pages metadata supplies `SITE_URL` and `BASE_PATH`, including project sub-paths and configured custom domains.
For a custom domain, configure **Settings → Pages → Custom domain** and its DNS records first.

### Jekyll reports "Invalid YAML front matter" in an `.astro` file

An `.astro` file contains JavaScript between `---` delimiters, not YAML front matter.
Logs mentioning `github-pages`, `jekyll`, and a source directory of `/github/workspace/.`
show that Jekyll is building the source repository instead of publishing the Astro artifact.
Switch the Pages **Source** to **GitHub Actions**, then run **Deploy documentation to GitHub Pages** as above.
Re-running the failed Jekyll job will not fix the publishing mode.

Do not rewrite the Astro front matter as YAML or add `.nojekyll` to the repository root as a workaround:
skipping Jekyll still does not compile the Astro source into a website.
Changing the publishing mode requires repository settings permissions; the workflow cannot switch it with its read-only Pages permission.

You can exercise the project-pages URL layout locally:

```sh
SITE_URL=https://OWNER.github.io BASE_PATH=/REPOSITORY/ npm run build
SITE_URL=https://OWNER.github.io BASE_PATH=/REPOSITORY/ npm run preview
```

Open `http://localhost:4321/REPOSITORY/`.

## What gets built

- `/` and `/ru/`: home with the README example running in the demo chat.
- `/tutorial/<chapter>/` and `/ru/tutorial/<chapter>/`: every file in `docs/tutorial/<lang>/`.
- `/tools/…`, `/api/`, `/changelog/…`, `/community/`: English content, available under both UIs.

Page titles, chapter counts and navigation entries are derived from the Markdown files.
Links between Markdown files (`2_rules.md`, `/docs/community_links.md`) become site routes. Links to anything
else in the repository (for example `examples/…`) point to GitHub. Documentation images are served locally.
GitHub alerts (`> [!TIP]`) are supported.

## Demo chat scenes

When a code block reaches the middle of the screen, the chat next to it plays what that code does.
Scenes live in `website/src/scenes/en.ts` and `website/src/scenes/ru.ts`, keyed by page and by the zero-based index of the
fenced block in the chapter. These hand-written UI animations are not documentation content:

```ts
"tutorial/2_rules": {
  3: [{ u: "ping" }, { b: "Pong" }, { u: "pong" }, { sys: 'Text("ping") did not match' }],
},
```

Step kinds: `u` user message, `b` bot message (`inline` buttons, `reply` quote, `html`), `sys` dispatcher note,
`kb` reply keyboard, `press`, `toast`, `edit`, `relabel`, `del`, `sticker`, `photo`, `album`.
Replies must match what the chapter's code returns. If a chapter gains or loses a code block, check the indices.

## Glass and pixels

- `website/src/render/icons.json`: 16×16 pixel icons, `#` for ink or frosted glass, `+` for accent or blue glass.
- `website/design/icons.py` and `website/design/grinder.py`: Blender (Cycles) scripts for the glass renders in `website/public/img`.

```sh
blender -b -P website/design/icons.py -- /tmp/icons            # every icon, 640×640 PNG
blender -b -P website/design/icons.py -- /tmp/icons rules      # one icon
blender -b -P website/design/grinder.py -- /tmp/mark.png --frost --size 1600
```

Convert the PNGs to 320×320 WebP into `website/public/img/icons/`. Every icon uses the same camera, so the grid
always covers the central 80 % of the frame; the morph in `website/src/scripts/glass-pixel.ts` relies on that.

## Themes

Auto, light, dark and 1-bit. 1-bit collapses every grey to black or white and shows pixels only.
The choice is stored in `localStorage` and applied before first paint.

## License
[MIT](./license)
