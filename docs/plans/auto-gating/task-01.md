goal: document human-gate criterion (3 categories) and "auto-proceder + objeción" mechanism in CLAUDE.md
files: CLAUDE.md
tests: AC-1 [manual]
done-when: grep on CLAUDE.md confirms a section naming the 3 gate categories (intención / aprobación irreversible / fallo) AND the auto-proceder + objeción pattern (resumen + continuar mismo turno + reversible vía git/re-plan) is described in prose
pattern: CLAUDE.md (existing structure — add a new ## section after the existing content, mirroring the terse caveman style already used)
