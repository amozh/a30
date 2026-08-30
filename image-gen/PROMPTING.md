# What works for the A20 animal portraits

> **This file is the lessons ledger.** Whenever a run teaches something new about
> getting a better result from the model — or a new way it refuses to listen — it is
> written here at once, with the take numbers, so the next session does not pay to
> relearn it. The owner's process rules live in the project's
> `context/generation-rules.md`; the tooling is `scripts/panel_run.sh`,
> `scripts/colour_drift.py`, `scripts/colour_match.py`.

Findings from a 19-image experiment run on 2026-08-29 (~€2.60), comparing prompt
complexity, models, reference-image conditioning, background control and targeted
editing against the existing rabbit and horse paintings.

## The workflow, in short

1. Fill `{{ANIMAL}}`, `{{COSTUME}}` and `{{GAZE}}` in
   `prompts/a20_portrait_template.txt`.
2. Generate a **batch** with `-m pro -s 2K` and **all three anchors**
   (`-r refs/rabbit_center.jpeg -r refs/wolfhound_green.jpeg -r refs/horse.jpeg`).
3. Score them with `scripts/background_darkness.py` and shortlist anything under ~12.
4. **Look at the shortlist yourself** — the score is blind to structural errors.
5. Fix any single defect by feeding that image back as the reference (see below)
   rather than rerolling.
6. Only once the composition is settled, re-run at `-s 4K` or upscale.

## The four things that actually matter

**1. Pass the existing painting as a reference. This is the biggest lever by far.**

Nothing else came close. Text alone — even a long, carefully art-directed prompt —
produces a _good Baroque animal portrait_, but not one that hangs beside the rabbit.
With `-r refs/rabbit_center.jpeg` the model matched the near-black background, the
crop, the cup's scale and placement, the brass-buttoned tunic and the blue cuff,
and the result reads as a companion piece rather than a cousin. For a triptych this
is the difference between "matching set" and "three separate paintings".

**2. Never say the word "gallery", and explicitly forbid frames.**

The single worst failure came from a phrase I thought was helpful: _"a painting
photographed in a gallery"_. Both models rendered a literal gilt picture frame,
a gallery wall, and hanging hardware **inside** the image — the painting became a
photograph _of_ a painting. `pro` did this most obediently, because it follows
instructions more literally. The minimal prompts baked in frames too, unprompted.

The fix is to say what the image _is_, not how it would be seen:

> The painted scene fills the entire image edge to edge — this is the bare canvas
> surface itself, with no picture frame, no border, no wall behind it.

plus an `AVOID` list naming frames, gilt moulding, gallery walls, hanging wire,
mat board, borders and letterbox bars. This also cured a separate bug where `pro`
letterboxed a 9:16 canvas into a 4:5 block with brown bars — that was the prompt's
fault, not the aspect ratio's.

**3. Prompt length pays, but only when it is art direction rather than description.**

| Tier                                  | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| One line ("a cat in Baroque uniform") | Busy, cluttered, baked-in frame, generic. Unusable.                      |
| One paragraph                         | Right subject, wrong mood — bookshelves, globes, curtains, tricorn hats. |
| Structured sections                   | Clean, dark, on-brand.                                                   |

What earns its place is the structure: `SUBJECT / COSTUME / PROPS / LIGHT / PALETTE /
RENDERING / FRAMING / AVOID`. The `AVOID` block does real work — background clutter
only disappeared once bookshelves, windows, curtains and hats were named explicitly.

**4. Gaze direction is controllable, which the triptych needs.**

Stating the hanging position works reliably:

> The animal is turned three-quarters toward the RIGHT edge of the canvas and gazes
> to the right, because this panel hangs to the LEFT of a companion painting and
> must look inward toward it.

Explaining _why_ ("because this panel hangs to the left") landed more consistently
than the bare instruction. Flip RIGHT/LEFT for the other side.

## Model choice

`pro` (`gemini-3-pro-image`) for anything going on the wall. With a reference image
it matched the anchor painting's palette and lighting noticeably more closely than
`flash`, and its brushwork and craquelure read as paint rather than as a smooth
digital render. It is also the more literal instruction-follower — an asset once
the prompt is clean, a liability while the prompt still contains a phrase like
"photographed in a gallery".

`flash` is close behind and fine for exploring compositions cheaply. `flash-lite`
was not competitive for this style.

## Print resolution

`--size 4K` at `9:16` returns **3072 × 5504 px** (~19 MB PNG). On a 1 m-high canvas
that is ~140 DPI. Fine for a wall piece at normal viewing distance, especially on
textured canvas, but it is not 300 DPI — if the printer asks for more, upscale
before printing rather than expecting it from the model.

## Matching the near-black background

The anchor rabbit's background is almost pure black. Early takes drifted warm and
grey-brown, which instantly breaks the set. Two changes closed the gap:

- **Drop the "soft warm glow behind the head".** That clause was the main cause of
  the lift. Replaced with an explicit refusal: _"no glow, no halo, no rim light, no
  visible light source and no gradient anywhere in the background — uniformly black
  right up to all four edges."_
- **Pass both anchors** (`-r refs/rabbit_center.jpeg -r refs/horse.jpeg`). This was
  expected to _lighten_ results, since the horse's background is a warm grey-brown.
  It darkened them instead — more anchors appear to tighten the overall style lock
  rather than average the backgrounds.

### Variance dominates, so select rather than tune

Measured mean corner luminance (0 = black), anchor rabbit = **9.2**:

| Take                         | Score   |
| ---------------------------- | ------- |
| Old template, 4K             | 22.2    |
| Baseline template            | 19.1    |
| \+ style-anchor block        | 17.0    |
| \+ both references           | 14.7    |
| \+ flat-black wording, run 1 | 16.1    |
| \+ flat-black wording, run 2 | **9.1** |

The last two rows are the **same prompt run twice**. A 7-point spread between
identical runs is larger than the gap between most prompt variants — so the
single-sample ranking above is partly noise, and the earlier conclusion that each
edit produced a stepwise improvement does not hold up. There is no seed parameter.

The practical consequence: treat the prompt as getting you into the right
neighbourhood, then generate several and select on measurement.

```bash
bun run generate -f /tmp/filled.txt -m pro -a 9:16 -s 2K \
  -r refs/rabbit_center.jpeg -r refs/wolfhound_green.jpeg -r refs/horse.jpeg \
  -n 4 --label left-panel
uv run --with pillow python scripts/background_darkness.py refs/rabbit_center.jpeg output/*left-panel*
```

Anything scoring under ~12 will hang beside the rabbit; above ~15 has a visible
glow. This beats eyeballing thumbnails, where a warm background looks fine alone
and only fails once it is on the wall next to the anchor.

### What the score does not catch

The metric measures four corner patches of background tone. That is all it
measures. The strongest wolfhound take scored 9.1 — effectively a perfect match —
while containing an obvious duplicated chair back that a person spotted
immediately. Structural errors, anatomy, costume coherence and expression are
entirely invisible to it.

Use the score to **rank and shortlist**, never to approve. Every candidate still
needs a human look, and the things worth looking at hardest are furniture joinery,
paw and limb count, and anywhere two objects overlap.

## Recipe

Fill the `{{ANIMAL}}`, `{{COSTUME}}` and `{{GAZE}}` placeholders in
`prompts/a20_portrait_template.txt`, then generate a batch and select on the
measurement rather than taking the first result:

```bash
bun run generate -f /tmp/filled.txt -m pro -a 9:16 -s 2K \
  -r refs/rabbit_center.jpeg -r refs/wolfhound_green.jpeg -r refs/horse.jpeg \
  -n 4 --label left-panel
uv run --with pillow python scripts/background_darkness.py refs/rabbit_center.jpeg output/*left-panel*
```

Work at 2K while choosing the composition — it is a third of the cost and the
content is what is being judged. Re-run the winner at 4K, or upscale, only once
the subject and costume are settled.

## Fixing a defect without losing the composition

Generated paintings carry structural errors that survive a good background score —
the first strong wolfhound take had **two chair backs**, a tall padded upright
standing where the armrest should be, so the sitter read as wedged between two
chairs. Furniture joinery is where this style breaks most often; faces and costume
hold up far better.

Rerolling is the wrong instinct: variance means you are likely to lose the
composition you liked and land a different flaw. Instead, feed the flawed painting
back in as the reference and ask for a targeted repair.

### Diagnose from the whole image, never from a crop

The first repair attempt **removed the wrong chair and made the painting worse**,
and the way it went wrong is the most useful lesson here.

The scene contained two chairs: a correctly scaled giltwood chair on the left that
the dog actually sits in, and a second, much larger chair back with a carved crest
rail intruding on the right. Having decided the problem was on the left, the left
side was cropped and examined in isolation — where a perfectly normal chair (back
panel plus armrest) was misread as "two backs". The genuine duplicate was on the
right, in the half never looked at. The repair then deleted the real chair and left
an armrest floating attached to nothing.

Two rules follow:

- **Look at the entire image at a decent size before diagnosing.** Cropping to the
  region you already suspect guarantees you will find something there.
- **When elements are duplicated, work out which one is _correct_ first.** The
  duplicate is often the one that looks impressive — here the larger, more ornate
  chair with the carved crest was the intruder.

The editing capability itself was never the problem. It did exactly what it was
told, both times. The failure was diagnosis.

### The prompt shape that works

Kept in `prompts/targeted_fix_example.txt`:

1. **State that exactly one correction is wanted**, and nothing else.
2. **Name the element that is correct and must survive**, not just the one that is
   wrong. With duplicated objects this disambiguation is what makes the difference —
   "the chair on the LEFT is correct and must be kept exactly as it is; the chair on
   the RIGHT does not belong".
3. **Describe the defect in physical terms** — scale, position, viewing angle, and
   why it reads as wrong.
4. **Say what should be there instead**, in the scene's own vocabulary — here, "the
   same flat, unlit, near-absolute black background used elsewhere".
5. **List what must be preserved, explicitly and by name** — head, pose, costume
   details, props, the surviving furniture, brushwork — and forbid re-composing or
   re-cropping.

Generate the repair as a small batch (`-n 2`) too; the same variance applies.

Note this is still a full regeneration, not a masked inpaint, so the result is not
pixel-identical. Whether quality degrades over repeated edit rounds is untested;
prefer one edit over a chain of them.

The template's `AVOID` block now names duplicated chairs directly, which should
reduce how often this needs fixing at all.

## The anchors in `refs/`

Order matters — earlier images carry more weight — so lead with the two that represent
the target, and keep the horse last.

| Anchor | Background score | What it contributes |
| ------ | ---------------- | ------------------- |
| `rabbit_center.jpeg` | 9.2 | The original. Crop, cup scale and placement, red tunic, blue cuff. |
| `wolfhound_green.jpeg` | 10.0 | **Added 2026-08-29.** Best output of the calibration runs — a training image, not a triptych panel. Contributes a properly black background, coherent chair joinery after repair, and proof that a forest-green tunic with gold frogging renders well. |
| `horse.jpeg` | — | Warm grey-brown background, reclining pose. Kept because dropping it was never tested and adding it *darkened* results rather than lightening them. |

`wolfhound_green.jpeg` is the 4K PNG from
`output/2026-08-29T20-28-55-fix2-right-chair-…-2.png`, downsampled to 2048 px and saved
as JPEG so it is cheap to send on every call. The full-resolution original stays in
`output/`.

Note what it is and is not. It came out of the runs that calibrated this tooling, so it
is a **style anchor only** — not a panel, not a candidate, and not a decision about which
animal goes where. Do not treat its wolfhound, its costume or its props as settled
content for the triptych; that lives in the project's `context/art-direction.md`.

## Scene panels (learned 2026-08-29, left panel v2)

- **A reference with the wrong anatomy overrides the prompt.** The owner's sketch had
  human hands; passed as a composition reference it produced human hands in 2 of 3
  takes despite an explicit paws-only instruction and an AVOID entry. Feed back a
  *generated* take as the composition reference instead, never the sketch.
- **Natural (uncropped) ears** only landed once described positively as "hanging,
  folding down along the cheeks like a hound's" *and* "cropped ears, pointed erect
  ears" went into AVOID. The bare word "uncropped" was ignored 4 of 4 times.
- **Parallel `pro` runs return 429 RESOURCE_EXHAUSTED.** Three concurrent 4-reference
  requests lost half their images. Run `pro` batches sequentially.
- **A previous take as the first reference locks its defects in.** Human hands in take
  №07 survived three paragraphs of paw instructions in 3 of 5 repaints; the two that
  got paws right had abandoned the composition entirely. **Fix anatomy with an image,
  not with words:** passing an earlier take of the same dog whose paws were correct as
  a second reference ("copy the paws of IMAGE 2") gave true paws in 3 of 4 — while the
  first reference kept the composition.
- **Reference position is weight.** The owner's sketch (human hands) passed *second*
  pulled hands into 2 of 3 takes; the same sketch passed *third*, after the approved
  take and with an explicit "gesture only" scope, pulled none in 2 of 2 while its
  gesture landed. Put the take you want preserved first, the thing you want borrowed
  later, and say exactly what to borrow.
- **Chains of edits degrade.** Each "take the last output, change one thing" pass
  drifts colour, background and finish a little; after three or four passes the
  picture is visibly warmer, redder and browner than the approved one, even though
  no single step asked for that (№24 → 28 → 29 → 30). Always edit from the
  **approved anchor** (or the take closest to it) and state every change against
  it, rather than from the most recent output. Say explicitly that colour balance,
  temperature and background must be reproduced exactly.
- **Anthropomorphic drift.** With a "customer" brief the model makes a human body
  with an animal head. If the owner wants an animal that happens to wear a robe,
  say so in those words — cat-sized, cat-proportioned, sitting as a cat sits — and
  put the owner's sketch first among the references.
- **The model cannot de-AI itself.** A long, specific "make it look real, not
  generated" instruction (uneven focus, restrained colour, material texture, no
  sheen) produced a *glossier* take, not a more natural one. The generated look —
  saturation, plastic highlights, uniform crispness — comes off in post-processing
  (desaturate ~20%, soften contrast, lift blacks, tame highlights, fine grain), which
  is free and deterministic. Same for colour drift between takes: histogram-match to
  the approved take instead of regenerating.
- **The owner's taste, not mine, decides what "painterly" means.** The matte,
  restrained fresh-generation takes below read to me as "real oil painting"; to the
  owner they read as *cartoonish*, and the crisp, saturated c04/c08 line was "the right
  cat". Show early, ask before committing a batch to a look. The technical findings
  below still hold — they just serve a different target than I assumed.
- **Fresh generation beats editing for a new scene.** Nineteen cat takes on 2026-08-30:
  every edit chained from the first approved take kept its plastic AI sheen and locked
  every object in place (a cup could not be moved in four attempts, a sandwich could not
  be changed in three). Generating *fresh* — owner's sketch first, the approved sibling
  panel second for darkness and finish, the logo third, **no earlier take of the same
  scene at any position** — produced matte, restrained, genuinely painterly pictures at
  once. Any earlier take of the same scene in the references, even fourth, snaps the
  composition back to it. Roll the same fresh prompt twice; the variance is worth it.
- **Place objects relative to other objects, never in abstract depth.** "At the far end
  of the table / in the background / on a sideboard" failed every time — the cup landed
  front-and-centre, and "sideboard + wall lamp" produced a framed painting on a gallery
  wall. "Directly behind the sandwich half on the wrapper, its lower part hidden by it"
  worked first time, as an edit to a take that had no cup.
- **"Melted / oozing / dripping cheese" renders as glossy yellow plastic.** Say "a thin
  layer of cheese, melted and SET flat, matte, a narrow pale line" and put dripping,
  oozing and shiny cheese in AVOID.
- **Logo text drifts under variance** — "A20" became "A2O" with an underline, and a
  fallen bag came out mirrored. Forbid the letter O, underlines, mirroring and a bag on
  its side; check text at full size before approving. Never write "IMAGE 2" next to the
  description of printed text — it leaked onto the bag as a label.
- **A reference-locked object cannot be moved by text.** "Move the cup behind the
  wrapper" from the take that already had the cup on the wrapper: 0 of 2, both times
  the cup stayed put and the colours drifted. Adding the object into empty space from
  the take *before* it existed, with an exact placement, is the way to relocate it.
  And **no other reference may contain the object**: a second reference passed "only
  for the bag's lighting" still carried its cup, and the cup landed exactly where that
  reference had it. Every reference sets the position of everything visible in it.
- A facade scene does not break the series look — oil, craquelure and palette held in
  all three takes. The background-darkness score is meaningless for scenes.

## Still open

- The background work was done at 2K. Whether 4K behaves the same is untested — the
  one 4K sample scored 22.2, but that used the old template, so it is not evidence
  against 4K itself.
- The right-hand panel (gaze turned LEFT) has not been generated; only the left-panel
  direction was verified.
- Whether the third anchor actually tightens consistency is now testable but untested —
  `refs/wolfhound_green.jpeg` was added after the run that produced it, so no batch has
  yet been generated with all three.

## Макет у Pillow як референс — спосіб рухати й масштабувати об'єкти (2026-08-30, c14–c16)

Текст не зменшує і не переміщує об'єкт, навіть коли жоден референс його не містить: стакан
кота ставав на те саме місце тим самим розміром і в c14, і в c15 — позиція стала пріором
моделі для композиції. Що спрацювало (c16): зібрати **макет руками в Pillow** — вирізати
об'єкт, зменшити/посунути/притемнити, залатати діру фоном — і дати моделі макет єдиним
референсом із задачею «clean repaint: прибери шви, збережи розмір і позицію точно».
Геометрія тримається, шви зачищає добре. Але білий об'єкт модель знову висвітлює —
тінь добивати маскою постобробки (c17), як і раніше. Постобробний пайплайн тепер
скрипт: `scripts/postprocess.py IN OUT`.
