epic: harness-hardening
phase: active
subspecs:
harness-state-machine | depends-on none | status active | pr none
harness-concurrency-security | depends-on harness-state-machine | status pending | pr none
harness-testing-packaging | depends-on harness-concurrency-security | status pending | pr none
harness-context-efficiency | depends-on harness-testing-packaging | status pending | pr none
next: specify harness-state-machine with backward-compatible state parsing
