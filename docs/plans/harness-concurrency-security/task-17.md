goal: remove observe command-profile Bash restrictions while retaining role-based edit denial
files: index.js, index.test.js, scripts/harness-observe.js
tests: AC-10 (unit)
done-when: node --test index.test.js green; explorer, judges, and verifier can inspect freely with edit denied, and no command-profile sandbox remains
pattern: index.js
