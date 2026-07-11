epic: harness-hardening
phase: active
subspecs:
harness-state-machine | depends-on none | status done | pr feat/harness-state-machine
harness-concurrency-security | depends-on harness-state-machine | status active | pr none
harness-testing-packaging | depends-on harness-concurrency-security | status pending | pr none
harness-context-efficiency | depends-on harness-testing-packaging | status pending | pr none
next: specify harness-concurrency-security on top of harness-state-machine
