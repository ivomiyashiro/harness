goal: instruct iterate to amend spec IN-PLACE on docs/specs/<feature>.md, leaving a single source of truth
files: skills/iterate/SKILL.md
tests: AC-8 [manual]
done-when: inspection of skills/iterate/SKILL.md confirms that the spec-routing row instructs editing docs/specs/<feature>.md in-place (replacing/updating the affected ACs), with an explicit prohibition on creating a parallel spec file or leaving obsolete contradictory ACs
pattern: skills/iterate/SKILL.md (same frontmatter + Routing table/Finish structure; edit in-place)
