#!/usr/bin/env ts-node
/**
 * Puppeteer typing helper for Google Docs and fallback typing for normal contentEditable inputs.
 *
 * Usage:
 *  DOC_URL="https://docs.google.com/document/..." \
 *  TEXT="Hello from Typepilot" \
 *  USER_DATA_DIR="/home/you/.config/google-chrome" \
 *  npx ts-node scripts/puppeteer-type.ts
 *
 * Notes:
 * - Provide USER_DATA_DIR to reuse an existing Chrome profile (recommended).
 * - If USER_DATA_DIR is not provided, the script will create a temporary profile but you'll need to sign in.
 */

import puppeteer from 'puppeteer';

const DOC_URL = process.env.DOC_URL || process.argv[2];
const TEXT = process.env.TEXT || process.argv[3] || "Hello, this is an automated typing test from Typepilot.";
const USER_DATA_DIR = process.env.USER_DATA_DIR; // optional
const TYPING_DELAY = Number(process.env.TYPING_DELAY || 60); // ms per character

if (!DOC_URL) {
  console.error('Missing DOC_URL. Set environment variable DOC_URL or pass the URL as first argument.');
  process.exit(1);
}

async function tryFocusEditor(page: puppeteer.Page) {
  // Several strategies to focus Google Docs editor or a generic contentEditable.
  try {
    await page.evaluate(() => {
      const contentEditable = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (contentEditable) {
        contentEditable.focus();
        return true;
      }
      // Some editors place editable areas in iframes. Try to click the center of the page as a generic fallback.
      return false;
    });
  } catch (err) {
    // ignore
  }

  // If google docs, try clicking a known area
  const url = await page.url();
  if (url.includes('docs.google.com')) {
    // click near the middle of the viewport which usually focuses the doc body
    await page.mouse.click(400, 300).catch(() => {});
  } else {
    await page.mouse.click(200, 100).catch(() => {});
  }

  await page.waitForTimeout(200);
}

async function fallbackInsertText(page: puppeteer.Page, text: string) {
  // Fallback for regular contentEditable or textarea elements using page.evaluate.
  await page.evaluate((inputText: string) => {
    function insertTextAtSelection(text: string) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        // try to find a focused textarea or input
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text'))) {
          const el = active as HTMLInputElement | HTMLTextAreaElement;
          const start = (el as HTMLTextAreaElement).selectionStart ?? (el as HTMLInputElement).selectionStart ?? 0;
          const end = (el as HTMLTextAreaElement).selectionEnd ?? (el as HTMLInputElement).selectionEnd ?? 0;
          const val = el.value;
          el.value = val.slice(0, start) + text + val.slice(end);
          const pos = start + text.length;
          (el as HTMLTextAreaElement).selectionStart = pos;
          (el as HTMLTextAreaElement).selectionEnd = pos;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }

      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      // move selection after inserted text
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      const el = textNode.parentElement;
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    insertTextAtSelection(inputText);
  }, text);
}

async function run() {
  const launchArgs: string[] = ['--no-sandbox', '--disable-setuid-sandbox'];
  if (USER_DATA_DIR) {
    launchArgs.push(`--user-data-dir=${USER_DATA_DIR}`);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: launchArgs,
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();
    await page.goto(DOC_URL, { waitUntil: 'networkidle2' });

    // Wait for the document to load visually. Adjust if needed for large docs or slow networks.
    await page.waitForTimeout(4000);

    await tryFocusEditor(page);

    // If it's Google Docs, use keyboard typing which sends real input events.
    if ((await page.url()).includes('docs.google.com')) {
      await page.keyboard.type(TEXT, { delay: TYPING_DELAY });
    } else {
      // For normal contentEditable fields or inputs, try keyboard.type first, then fallback to direct DOM insertion
      try {
        await page.keyboard.type(TEXT, { delay: TYPING_DELAY });
      } catch (err) {
        console.warn('keyboard.type failed, falling back to DOM insertion:', err);
        await fallbackInsertText(page, TEXT);
      }
    }

    console.log('Typing complete.');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('Error in puppeteer-type script:', err);
  } finally {
    await browser.close();
  }
}

run();
