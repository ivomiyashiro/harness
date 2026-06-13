---
name: visual-mock
description: "Visual phase — isolated mock iteration in the target stack with a hard approval gate. Trigger: harness full pipeline reaches a feature with UI."
---

Orchestrator-side. Runs after plan approval, BEFORE implement, for features with UI.

## Stack detection

Flutter project (`pubspec.yaml`) → Flutter mock widget. Web project → static HTML. Tell the `visual` agent which.

## First visual feature in a project

No design-tokens file referenced in `docs/conventions.md`? Instruct the visual agent to create it FIRST (colors, typography, spacing), then add its path to `docs/conventions.md`. Every later mock uses only tokens — that's what keeps iterations cheap and screens consistent.

## The loop (isolation is the point)

1. Dispatch `visual` with: the spec's UI-relevant AC numbers, the tokens file path, target stack, `docs/mocks/` destination.
2. Relay between user and agent: the agent reports the mock PATH + how to view it; the user looks (browser / emulator) and answers in TEXT; you pass the text back. Mock code and screenshots never enter this thread.
3. Repeat until the user says approved.

## Hard gate

No implement phase starts while the mock is unapproved. On approval:

1. Commit the mock under `docs/mocks/`.
2. Re-dispatch `planner` with the approved mock path so the UI task files' `pattern:`/`files:` reference it — Flutter: the mock widget file IS the implementation base (logic/data get wired in, widget is not a throwaway); web: the markup is the structural reference.
3. Write `phase: implement` to the state file.
