---

# Typepilot: Google Docs automation and in-page fallback (branch: automation/puppeteer-typing)

This branch adds a Puppeteer-based automation script that reliably simulates human typing in Google Docs by sending real keyboard events, plus an in-page fallback utility for regular contentEditable / textarea / input text editors.

These changes are available on the branch: `automation/puppeteer-typing`

Files added on this branch:

- `scripts/puppeteer-type.ts` — Puppeteer script that opens Chrome, navigates to a DOC_URL, focuses the editor, and types using `page.keyboard.type` (real keyboard events). Falls back to DOM insertion for non-Docs pages.
- `src/utils/typing-fallback.ts` — In-page utilities: `insertTextAtCursor(text)` and `humanType(text, delay)` for use inside your web app on ordinary editable elements.
- `docs/PUPPETEER-TYPING.md` — Usage and troubleshooting instructions.
- `package.json` (branch-local change) — added devDependencies `puppeteer`, `ts-node` and the npm script `type:docs` to run the automation script.

## Why this is needed

Google Docs and similar rich editors often ignore synthetic DOM KeyboardEvent/InputEvent objects created by in-page scripts (those events have `isTrusted === false`). Google Docs uses a complex editor model that requires real, trusted keyboard events to update its document model properly. Dispatching fake events or mutating DOM nodes directly usually leaves Docs out-of-sync.

The reliable approach is to use browser automation (Puppeteer/Playwright) which sends input via the browser's input layer and is treated as trusted by the editor. For non-Docs editors (plain contentEditable or inputs), the in-page fallback will insert text at the selection/caret.

---

## How to run the Puppeteer automation locally

1. Install dependencies:

```bash
npm install
# or if you prefer only dev deps:
npm install --save-dev puppeteer ts-node
```

2. Prepare a Chrome profile (recommended):

- Option A (recommended): reuse an existing Chrome profile so you are already signed into Google.
  - Linux example: `~/.config/google-chrome`
  - macOS example: `~/Library/Application Support/Google/Chrome`
  - Set the environment variable `USER_DATA_DIR` to point to the profile folder (not a subfolder named `Default` unless that's the one you want).

- Option B: Allow Puppeteer to create a temporary profile. You will need to sign in the first time the browser opens.

3. Run the script (example):

```bash
DOC_URL="https://docs.google.com/document/your-doc-id-here" \
TEXT="Hello from Typepilot!" \
USER_DATA_DIR="/path/to/your/chrome/profile" \
npm run type:docs
```

Environment variables supported:

- `DOC_URL` (required): Google Docs URL or any page with an editable area.
- `TEXT` (optional): text to type; defaults to a sample message.
- `USER_DATA_DIR` (optional but recommended): path to an existing Chrome profile so you’re already signed-in to Google.
- `TYPING_DELAY` (optional): ms delay per character (default 60). Example: `TYPING_DELAY=40`.
- `PUPPETEER_EXECUTABLE_PATH` (optional): if Puppeteer cannot find Chrome/Chromium on your system, set this to the browser binary path.

Notes:

- The script opens a visible browser window (headful). Google Docs typically requires an interactive session.
- The script sends real keyboard events via `page.keyboard.type`, which Google Docs accepts as user input.
- For non-Docs pages, the script will try `page.keyboard.type` and, if that fails, call an in-page fallback that inserts text via selection/Range or textarea value updates.

---

## Using the in-page fallback inside Typepilot (for normal editors)

Import the utility and call `humanType` while the target editor is focused.

Example:

```ts
import { humanType } from './src/utils/typing-fallback';

// ensure a textarea or contentEditable element is focused, then:
await humanType('Hello from Typepilot!', 60);
```

API:

- `insertTextAtCursor(text: string): boolean` — attempts to insert `text` at the current caret/selection. Returns true on success.
- `humanType(text: string, delay = 60): Promise<void>` — types `text` char-by-char with `delay` ms between characters using `insertTextAtCursor`.

This fallback works for normal textareas, text inputs, and contentEditable elements, but it will not reliably update Google Docs' internal model.

---

## Troubleshooting

- If the browser opens but nothing types:
  - Ensure the document page is fully loaded and focused. The script clicks the center of the page; if your doc UI is different you can adjust coordinates or call `page.click(selector)` in the script.
  - If using `USER_DATA_DIR`, make sure Chrome isn't already running with the same profile (Chrome prevents multiple instances using the same profile in many cases).
  - If Puppeteer fails to launch, set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary or install a matching Chromium.

- If you want headless CI runs: Google Docs requires interactive sign-in in most cases, so headless won't work for Docs.

---

## Next steps / optional changes

- I can open a pull request from `automation/puppeteer-typing` → `main` including these changes and usage instructions (I can do that for you).
- If you prefer Playwright, I can convert the script.
- If you want a compiled JS version (no ts-node), I can add a build step and a plain JS script instead.

---

Please check the `automation/puppeteer-typing` branch and let me know if you want the PR opened or any edits to the README content.
