goal: remove blocking plan-approval gate from write-plan; add auto-proceed summary + non-blocking glob-overlap signal
files: skills/write-plan/SKILL.md
tests: AC-2 [manual], AC-3 [manual]
done-when: inspection of skills/write-plan/SKILL.md confirms (a) no instruction to present plan for user approval / wait for a go-ahead, (b) instructs: summarize tasks+globs, declare "procedo salvo que me detengas", load implement skill in the same turn, (c) glob overlap is flagged prominently inside the auto-proceed summary and does NOT stop the flow
pattern: skills/write-plan/SKILL.md (same frontmatter + Steps/Rules structure; edit in-place)
