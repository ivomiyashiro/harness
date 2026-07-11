goal: deny edit and indirect mutation Bash access for explorer, judges, and verifier while retaining inspection/runtime commands
files: index.js, index.test.js, agents/explorer.md, agents/judge-a.md, agents/judge-b.md, agents/verifier.md
tests: AC-10 (unit)
done-when: node --test index.test.js green; protected agents cannot mutate through edit or Bash allowlists
pattern: index.js
