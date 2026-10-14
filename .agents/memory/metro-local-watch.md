---
name: Metro and Replit internal files
description: Metro can crash while crawling short-lived directories under Replit's .local workspace state.
---

Exclude `.local` from Metro's file map when configuring the Expo watcher.

**Why:** Replit creates and removes temporary skill and workflow-log directories under `.local`; Metro's fallback watcher can hit ENOENT while crawling them and terminate the frontend workflow.

**How to apply:** Keep Metro's resolver block list excluding `.local` paths. Revisit only if project source is intentionally moved under `.local`.
