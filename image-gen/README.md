# image-gen

CLI for generating images with Google's Gemini image models ("Nano Banana"), used
for A20 marketing and menu imagery.

## Which balance you are spending

The account holds two separate, non-interchangeable balances. This is the whole
reason the tool has a `--backend` switch:

| Backend            | Balance                  | Auth        | Expires   |
| ------------------ | ------------------------ | ----------- | --------- |
| `vertex` (default) | GCP Free Credit (~€263)  | ADC, no key | ~Nov 2026 |
| `api`              | Gemini API prepay (~€99) | API key     | ~Aug 2027 |

Google Cloud Welcome/free-trial credits **cannot** pay for the Gemini Developer
API — that is [documented policy](https://ai.google.dev/gemini-api/docs/billing)
for accounts opened after 2026-03-02, and the AI Studio billing page keeps its own
separate balance to match. So the larger, sooner-expiring pool is only reachable
through Vertex, which is why `vertex` is the default: it spends the money that
expires first.

At roughly €0.06 per 1K image on the default model, the GCP credit is worth on the
order of 4,000 images before it lapses.

Every run prints which balance it is charging before it starts.

## Setup

The `vertex` backend needs the Google Cloud SDK and Application Default Credentials:

```bash
brew install --cask google-cloud-sdk
gcloud auth login
gcloud auth application-default login   # separate from the above; libraries read a different file
gcloud services enable aiplatform.googleapis.com --project=gen-lang-client-0880150256
```

Then install dependencies:

```bash
bun install
```

The `api` backend instead needs a key from [AI Studio](https://aistudio.google.com/apikey):

```bash
bun run auth          # stores it in the macOS Keychain
bun run auth status   # show masked key
bun run auth clear    # remove it
```

The key resolves as: `GEMINI_API_KEY` env var first (override), then Keychain
(service `a30-gemini-api-key`).

## Usage

```bash
bun run generate "a flat white on a marble counter, morning light"

# pick a model, shape and resolution
bun run generate "storefront at golden hour" --model pro --aspect-ratio 16:9 --size 2K

# several variations in one go
bun run generate "latte art, top down" --count 4

# spend the prepay balance instead of the GCP credit
bun run generate "menu board mockup" --backend api

# match the style of existing paintings (repeatable), with a long prompt from a file
bun run generate -f prompts/a20_portrait_template.txt \
  -r refs/rabbit_center.jpeg -r refs/horse.jpeg --label left-panel
```

Images land in `output/` (gitignored) and their paths are printed to stdout, so
they pipe cleanly: `bun run generate "…" | xargs open`. Progress and the billing
line go to stderr.

### Models

| Alias          | Model ID                      | Notes                         |
| -------------- | ----------------------------- | ----------------------------- |
| `flash-lite`   | `gemini-3.1-flash-lite-image` | fastest and cheapest, 1K only |
| `flash`        | `gemini-3.1-flash-image`      | default workhorse, 0.5K–4K    |
| `pro`          | `gemini-3-pro-image`          | best text rendering, priciest |
| `flash-legacy` | `gemini-2.5-flash-image`      | original Nano Banana          |

Use `pro` for anything containing words (menu boards, signage) — text rendering is
what it is meaningfully better at, at roughly twice the cost.

Options: `--aspect-ratio` accepts 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9;
`--size` accepts 1K, 2K, 4K (defaults to 1K server-side). `--reference` is
repeatable and conditions the output on existing images — the single most effective
way to match an established style, and also how targeted edits are made.
`--prompt-file` keeps long art direction out of the shell, and `--label` tags output
filenames for A/B runs.

## Prompting

**[PROMPTING.md](PROMPTING.md) is the important document here** — what actually
produces professional results for the A20 animal portraits, learned by experiment
rather than assumed. It covers reference conditioning, the prompt structure that
works, background matching, run-to-run variance, and how to repair a defect without
losing a composition.

`prompts/a20_portrait_template.txt` is the working template;
`prompts/targeted_fix_example.txt` shows the repair prompt shape;
`refs/` holds the existing paintings used as style anchors;
`scripts/background_darkness.py` scores how well a take matches the anchors' near-black
background.

## Notes

- The Imagen family (`imagen-4.0-*`) and its `generateImages()` API shut down on
  2026-08-17. These models replace it and use `generateContent()`, returning image
  bytes as inline data parts. Any tutorial calling `generateImages()` is stale.
- All output carries an invisible SynthID watermark; this cannot be disabled.
- Vertex location defaults to `global`, the only endpoint serving the full model
  line-up (`gemini-3-pro-image` was not on EU regions as of mid-2026). Override
  with `GOOGLE_CLOUD_LOCATION` if data residency requires it.
- Safety filters return a well-formed response with no image parts; the CLI
  reports the `finishReason` rather than failing silently.
- Verified working against Vertex on 2026-08-29: `gemini-3.1-flash-image` at
  1024×1024, plain ADC, `global` endpoint, no `-preview` suffix on the model ID.
