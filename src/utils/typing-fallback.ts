// src/utils/typing-fallback.ts
// In-page fallback typing utilities for standard contentEditable and input/textarea elements.

export function insertTextAtCursor(text: string): boolean {
  // 1) If a textarea or text input is focused, set its value
  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && (active as HTMLInputElement).type === 'text')) {
      const el = active as HTMLInputElement | HTMLTextAreaElement;
      const start = (el as any).selectionStart ?? 0;
      const end = (el as any).selectionEnd ?? start;
      const val = el.value;
      el.value = val.slice(0, start) + text + val.slice(end);
      const pos = start + text.length;
      try {
        (el as any).selectionStart = pos;
        (el as any).selectionEnd = pos;
      } catch {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }

  // 2) If there is a Selection / Range (contentEditable)
  const sel = window.getSelection?.();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    // Move caret after inserted node
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    const parent = textNode.parentElement;
    if (parent) parent.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // 3) Try execCommand('insertText') as last resort (may be deprecated but still useful)
  try {
    const ok = document.execCommand('insertText', false, text);
    if (ok) return true;
  } catch {}

  return false;
}

export async function humanType(text: string, delay = 60): Promise<void> {
  for (const ch of Array.from(text)) {
    const ok = insertTextAtCursor(ch);
    if (!ok) {
      // nothing we can do in-page — give up early
      break;
    }
    await new Promise((res) => setTimeout(res, delay));
  }
}
