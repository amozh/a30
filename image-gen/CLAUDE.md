@README.md

## Before generating anything for the A20 wall

**Read these four, in this order, before writing a single prompt.** Each answers a
different question, and skipping any one of them produces work that has to be redone.

| # | Read | Answers |
| - | ---- | ------- |
| 1 | `.aikit/projects/*_a20-wall-triptych-and-audience/STATE.md` | Which panel is being made, what is already decided, what is still open. Start here — it points at the current milestone. |
| 2 | `…/context/art-direction.md` (same project) | **What goes in the picture and why.** Series grammar, costume-per-panel, colour, gaze, food, text. This is the expensive-to-rediscover file. |
| 3 | [PROMPTING.md](PROMPTING.md) | **How to get it out of the model.** Prompt structure, reference conditioning, background matching, variance, defect repair. |
| 4 | `prompts/a20_portrait_template.txt` | The actual template to fill: `{{ANIMAL}}`, `{{COSTUME}}`, `{{GAZE}}`. |

Load the project with `/project` rather than reading its files ad hoc — it also carries
the audience findings that explain *why* the wall is being made at all.

**Style and composition come from the reference images, not from prose.** Always pass
the anchors in `refs/`; that lever outweighs every wording choice. Never invent a new
composition for this series — the grammar in `art-direction.md` is fixed.

**The hard content rule:** every panel portrays **a customer, never staff**. A courier
character was explicitly rejected. Panels differ by costume — travelling coat / uniform
/ house robe — not by occupation.

`PROMPTING.md` records findings that are counter-intuitive enough that you will get them
wrong by reasoning from first principles:

- Reference images (`-r refs/...`) matter far more than prompt wording.
- Saying "photographed in a gallery" makes the model paint a literal picture frame
  into the image.
- Run-to-run variance exceeds the difference between prompt variants, so generate a
  batch and select — do not tune the prompt against a single sample and conclude
  the edit helped.
- `scripts/background_darkness.py` ranks candidates but approves nothing; it is
  blind to structural errors. A take scoring a perfect 9.1 still had a duplicated
  chair back.
- Repair a defect by feeding the image back as a reference, not by rerolling — but
  diagnose from the **whole image at full size**, never from a crop of the region
  you already suspect. The first repair attempt deleted the wrong chair and made the
  painting worse, because only the half assumed to be faulty was examined.
- **Verify a point edit on a full-resolution crop of that region, never on a
  thumbnail or a side-by-side strip.** A 512 px comparison strip showed a cup
  "moved behind the wrapper"; the full-size crop showed it had not moved at all.
  Thumbnails show what you expect to see.

## The iteration rules (owner, 2026-08-30) — always in force

Full text: project `context/generation-rules.md`. In short:

1. **Loop:** detailed prompt + ordered references → **one** image → verify on a
   **full-resolution crop** of the changed region → fix → up to **3 iterations**.
   After 3 failures, stop and tell the owner what did not work and why.
2. **One live prompt per panel**, `milestones/NN-slug/PROMPT.txt`. Edit it; never
   write a fresh prompt per run. `scripts/panel_run.sh` snapshots it into the run
   folder, generates, numbers the output, and prints colour drift.
3. **Watch degradation.** Every run measures drift against the first reference
   (`scripts/colour_drift.py`). Fix drift with `scripts/colour_match.py`, not by
   regenerating. Edit from the approved anchor, not the latest output.
4. **Learn.** `PROMPTING.md` is the lessons ledger — append every new finding with
   take numbers, the moment it is learned.

```bash
cd image-gen
scripts/panel_run.sh <PROMPT.txt> <run-dir> <NN-name> <ref-to-keep> [more refs]
```

## Working notes

**Every run spends real money.** Generation is not a free operation to reach for
while exploring — a `pro` 4K image is ~€0.24. Generate when the user asks for
images, not to check whether something works. One image is enough to verify a code
change; use `--model flash-lite` for that.

**Do not change the default backend.** `vertex` is default because it spends the
GCP Free Credit, which expires ~Nov 2026, while the `api` prepay balance is good
until ~Aug 2027. The two balances are not interchangeable in either direction. If
a Vertex call fails, diagnose it — do not quietly fall back to `--backend api`,
which silently charges the wrong wallet.

**The model IDs are verified, not guessed.** `gemini-3.1-flash-image` was confirmed
working against the Vertex `global` endpoint on 2026-08-29 with no `-preview`
suffix. Published sources disagree on this; the code is right and the sources are
stale. Do not "correct" `src/constants.ts` from documentation alone.

**Imagen is gone.** `generateImages()` and every `imagen-4.0-*` ID shut down
2026-08-17. Image generation goes through `models.generateContent()` with
`responseModalities: ['IMAGE']`, and bytes come back as `inlineData` parts. Much of
the material online still shows the old API.

**Never read or print the API key.** It lives in the Keychain (service
`a30-gemini-api-key`). `src/utils/keychain.ts` is the only thing that touches it,
and it stays masked in output.

## Layout

| Path                      | Role                                            |
| ------------------------- | ----------------------------------------------- |
| `src/constants.ts`        | model aliases → IDs, project/location defaults  |
| `src/client.ts`           | backend switch: `vertex` (ADC) vs `api` (key)   |
| `src/image_generation.ts` | `generateContent` call + inline-part extraction |
| `src/utils/keychain.ts`   | API key storage, mirrors `vendus/`              |
| `scripts/generate.ts`     | the CLI                                         |
| `scripts/auth.ts`         | key management for the `api` backend            |

Prompting assets, all covered by `PROMPTING.md`:

| Path                                | Role                                        |
| ----------------------------------- | ------------------------------------------- |
| `prompts/a20_portrait_template.txt` | working template, `{{PLACEHOLDER}}` slots   |
| `prompts/targeted_fix_example.txt`  | prompt shape for repairing one defect       |
| `refs/`                             | existing paintings used as style anchors    |
| `scripts/background_darkness.py`    | scores background match against the anchors |

**Every generation command starts with an explicit `cd` into `image-gen/`.** The
session's working directory drifts (a `cd` into a milestone folder to rename images,
say), and `bun run generate` from anywhere else fails instantly with
`Script not found "generate"` — a background retry loop then spins uselessly. Three
runs were lost to this in one session.

`output/` is gitignored — generated images stay local unless the user asks
otherwise. **For A20 wall-panel work, do not use `output/` at all:** the owner wants
every prompt and every generated image inside the project, under
`milestones/NN-slug/runs/<date>_<run-name>/{prompts,images}/`, so pass `-o` on every
run and keep the filled prompt file next to the images.

## Conventions

Mirrors `vendus/`: bun, strict TypeScript, commander for CLIs, snake_case module
filenames, 4-space prettier with single quotes, named exports grouped at the bottom
of the file. Scripts print data to stdout and progress to stderr so output pipes.

Before calling work done:

```bash
bun run typecheck && bun run lint && bun run format
```
