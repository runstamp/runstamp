# Runstamp quality policy

Source: the accountmade project burned ~64+ sessions learning how to make generated
deliverables genuinely send-grade. Its distilled playbook lives in
`~/.claude/projects/-Users-jake-plain-plainworks-accountmade/memory/` (~180 files).
These directives port that methodology to runstamp.com's existing harness
(`ga/evals/vqh/`, `ga/ratchets.json`, `pnpm eval:icp`, `test-suite/engine-validation/`).
Catalog execution and evidence requirements are enforced by the factory manifests, GA scripts,
and ratchets in the repository.

## The five laws (from accountmade, non-negotiable)

1. **The builder never grades its own work.** 64/64 in-session "done" claims failed a
   fresh cold audit. Verdicts come from a blind auditor: a fresh agent given ONLY
   rendered pages + the rubric, told nothing about what changed, defaulting to FAIL,
   calibrated every run against a known-pass and known-fail anchor (if it misgrades
   either, fix the auditor and discard the verdict).
2. **Green gates pass garbage.** Deterministic checks (no overflow, contrast, valid XML)
   are diagnostics, never proof of quality. The bar is "would a client actually send
   this?" — judged on the rendered page, every time.
3. **Overfit law.** A fix authored against one fixture becomes a template of that
   fixture. Every engine change must be validated across ≥2 unrelated-domain fixtures
   before it counts. Never move the bar to fit the output.
4. **Findings graduate into gates.** Every defect class a judge or audit finds becomes a
   deterministic check that runs on every render, plus a `ga/ratchets.json` metric.
   That's the ratchet: quality can only go up.
5. **When scores plateau across method changes, the bottleneck is the constant.** For
   accountmade the constant was timid visual language (small text, hairlines, flat
   white, one shy accent). The fix was bold composition + the brand's real design
   language + drawn (never fabricated) artifacts — not another architecture.

---

## D1 — Ratchet the ICP floor (the core loop; repeat until every required mean ≥ 3.6)

> **Release rule updated 2026-08-14:** GA requires exactly three complete
> 120-document runs, each corpus mean and each three-run format aggregate at or
> above 3.6, plus one release-owner verification of the hash-bound 12-module HTML
> bundle. The score is a regression/triage signal; the owner review is the
> release-blocking visual veto. The former 4.5/cold-audit rule is historical.

> Historical context only: the superseded 20-document evidence reported a 3.65/5
> mean. It remains available in Git history but is not current GA evidence;
> only a complete contract-v4 120-document result is eligible.
> Take the 3 worst-scoring deliverables (currently: Annual operating plan 1.93, Annual
> marketing budget 2.33, Weekly sales pipeline 2.60). For each: render it, look at every
> page, and name the ROOT CAUSE class (not cosmetic symptoms) — e.g. degenerate table,
> title-echo, orphan figure, void band, timid hierarchy. Fix each cause IN THE ENGINE
> (packages/*), never in the fixture. Per the overfit law, verify each fix improves or
> holds ≥2 other fixtures in different domains before keeping it. Execute all code and
> content work via `codex exec`; you orchestrate, review, and judge. Re-run
> `pnpm eval:icp` and report the score delta per deliverable. Then graduate every fixed
> defect class into (a) a deterministic check in the render/validation path and (b) a
> `ga/ratchets.json` metric. Do not declare improvement from your own eyes — the
> re-scored judge number is the only claim you may make.

## D2 — Release-owner bulk verification (one approval over the frozen GA bundle)

> Freeze the complete 120-document artifact set, then run
> `pnpm review:ga:generate -- --artifact-set <artifact-set.json>`. Open
> `ga/human-review/index.html`; review all 12 module pages, all 79 executed,
> hash-bound ICP workflow cards, and every rendered page in the four 30-document engine
> galleries. Default verdict is HOLD. Any release-blocking defect requires a new
> artifact set and review bundle. Only the release owner may check the final
> attestation and export `human-verification.json`; place it at
> `ga/human-verification.json` and run `pnpm review:ga:verify`. Automated scores,
> green tests, and another agent cannot substitute for this approval.

## D3 — Calibrate the judge against Jake's eye (run every ~2 weeks)

> Select 10 rendered deliverables spanning the score range, present them to me blind
> (no scores shown) for a would-send / wouldn't-send rating. Compare my ratings to the
> VQH judge scores in `ga/evals/vqh/scores/`. If the judge is systematically harsher or
> softer than me by >0.5, fix the JUDGE (anchors/rubric in `ga/evals/vqh/calibration.json`)
> — never tune the engine to please a miscalibrated judge; that is the reward-hack trap
> accountmade proved (its panel was 1.2 pts harsher than Jake and rejected 6/10 decks
> he'd ship).

## D4 — Strip-the-color pass on showcases (demos are the storefront)

> For each marketing showcase (`app/app/(marketing)/*-showcase/`) and playground default
> output: render it, then apply the strip-the-color test — mentally remove palette and
> imagery; if what remains is text-in-boxes (title + N identical bordered panels,
> label-over-paragraph in a hairline box, a 4-row table floating in a half-empty panel),
> it is unshippable regardless of green gates. Replace each failing showcase with ONE
> realistic client deliverable per vertical — real-shaped content, one coherent brand,
> drawn artifacts (charts/tables only where genuinely comparable data exists, never
> fabricated numbers). NEVER show the same content recolored across themes as "proof of
> range" — a client has exactly one brand; recolored duplicates are a defect-detection
> artifact, not a demo. Respect memory rules: sharp corners, card gutters.

## D5 — Chaos fuzz for reliability (the 99.9% half)

> Build/extend a fuzz runner over the visual corpus: recombine REAL fixture content
> (test-suite/engine-validation/fixtures/) across shape extremes — item counts 1→50,
> overlong strings, unicode, empty sections, hostile brand palettes (neon,
> low-contrast, serif) — render everything, and run the deterministic gauntlet:
> overflow/truncation, WCAG AA contrast measured on output, orphan figures (number ≠
> caption), title echo, degenerate artifacts (<2 rows/items), void bands. Include
> negative controls: a deliberately-broken fixture MUST fail each gate, else the gate
> is dead. Every new defect class found → engine fix (validated cross-domain) + gate +
> ratchet metric. Report the honest defect-free rate, not "tests pass."

## D6 — Staleness diagnosis (run only if D1 plateaus for 3+ rounds)

> Scores are plateauing across engine changes, which per accountmade means the
> bottleneck is the constant: the visual language itself. Audit the rendered corpus for
> the stale-template fingerprint — smallish text, thin hairlines, flat white, one timid
> accent, abstract shapes, zero real artifacts. Propose and prototype (hand-composed,
> n=3 visually-opposite brands/verticals — never abstract an engine from n=1) a bolder
> language: oversized type as a graphic element, full-bleed color fields, real scale
> contrast, intentional density, drawn artifacts as protagonists. Only after the recipe
> passes a blind audit on all 3 hand-built proofs may it be generalized into the engine.

## Cadence

- Each working session = ONE D1 ratchet round, ending with re-scored numbers.
- After the frozen release candidate changes → regenerate and repeat D2; the old approval becomes stale.
- D3 every ~2 weeks; D4 whenever showcases change; D5 weekly in background; D6 only on plateau.
- Ship claim requires: three complete 120-document runs at the 3.6 floor, all hard gates green,
  and one current release-owner approval of the complete review bundle.
