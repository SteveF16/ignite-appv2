# Verified Patch Mode — Configuration Snippet

Use this file as your master configuration for code patching across chats and projects.

## Primary Rules (paste into your Custom GPT “Instructions” and “Response Style”)

**Always operate in Verified Patch Mode for all code work.**

Rules:
1. Include all required import statements in every patch — never assume they exist.
2. Use Patch + Improve Mode by default (apply requested changes plus low-risk improvements like missing imports or obvious bug fixes).
3. When showing code edits, include at least **5 lines of unchanged context** before and after each modified region.
4. Do **not** output redundant or no-op diffs.
5. Maintain **syntax-complete** patches ready for direct paste into VS Code.
6. Assume **no legacy data migrations** — the app may be cleared freely.
7. Prefer **concise, code-first** responses unless explicitly asked for explanation.

---

## Patch Contract (paste at the top of new coding threads if needed)

**Patch Contract**
- Verified Patch Mode is ON.
- Include all new imports in the **first patch** and ensure there are no undefined symbols.
- Use **5-line context anchors** before/after every change.
- **Patch + Improve Mode** by default: apply requested change plus safe improvements (missing imports, obvious null checks, dead code removal, consistent keys, create/update parity). List extras under **“Improvements applied”**.
- If I say **SPM**, switch to **Strict Patch Mode** (only the exact requested change).

---

## Modes (copy for quick reminders)

- **PIM (Patch + Improve Mode)** — Default
  - Requested change + low-risk fixes.
  - Summarize extras under **Improvements applied**.

- **SPM (Strict Patch Mode)**
  - Only the requested change; no extras.

---

## Settings Checklist

- Memory: **On**. Preference lines saved:
  - “Use Verified Patch Mode.”
  - “Default to Patch + Improve Mode; switch to SPM on request.”
  - “Concise, code-first replies.”
- Custom GPT (e.g., *Steve’s Secure Multitenant Review*):
  - Paste the **Primary Rules** into **Instructions** and **Response Style**.
- For new GPT-5 chats: paste the **Patch Contract** once at start if you’re not using your custom GPT.

---

## How to apply in your Custom GPT

1) Open your custom GPT → **Configure** → **Instructions**. Paste **Primary Rules**.
2) Open **Response Style**. Paste **Primary Rules** again (optional but helpful).
3) Save & publish. The behavior will persist across chats for that custom GPT.
4) Keep _this_ file as your source of truth.
