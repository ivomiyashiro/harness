goal: auto-resolve tags + exemplars in spec skill without asking user; keep final spec-approval gate explicit
files: skills/spec/SKILL.md
tests: AC-4 [manual]
done-when: inspection of skills/spec/SKILL.md confirms (a) tag criteria section instructs applying tags via baked-in criteria and dispatching explorer for exemplars WITHOUT a user confirmation step, (b) the final spec-approval gate is still present and labeled explicitly as a human gate
pattern: skills/spec/SKILL.md (same frontmatter + Format/Tag criteria/Pattern exemplars/Exit structure; edit in-place)
