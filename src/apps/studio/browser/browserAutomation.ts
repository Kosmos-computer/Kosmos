/**
 * Studio Browser automation — executes click/fill/snapshot against the
 * active Design Mode webview (or last-registered guest).
 */
import type { BrowserCommand, BrowserResult } from "@shared/types";

type WebviewLike = {
  executeJavaScript: <T>(code: string, userGesture?: boolean) => Promise<T>;
};

let activeWebview: WebviewLike | null = null;

export function registerStudioBrowserWebview(webview: WebviewLike | null): void {
  activeWebview = webview;
}

export async function executeBrowserCommand(command: BrowserCommand): Promise<BrowserResult> {
  if (!activeWebview) {
    return {
      ok: false,
      error: "No Studio Browser webview is open. Open Techno Studio → Browser and load a page first.",
    };
  }

  try {
    if (command.kind === "snapshot") {
      const snapshot = await activeWebview.executeJavaScript<string>(
        `(function(){
          var texts = [];
          document.querySelectorAll('a,button,input,textarea,select,[role=button]').forEach(function(el,i){
            var label = (el.getAttribute('aria-label') || el.innerText || el.value || el.tagName || '').trim().slice(0,80);
            var sel = el.id ? ('#'+el.id) : el.tagName.toLowerCase();
            texts.push((i+1)+'. '+sel+' — '+label);
          });
          return 'URL: '+location.href+'\\nTitle: '+document.title+'\\n'+texts.slice(0,80).join('\\n');
        })()`,
        true,
      );
      return { ok: true, outcome: "Captured browser snapshot", snapshot };
    }

    if (command.kind === "click") {
      const sel = JSON.stringify(command.selector);
      const ok = await activeWebview.executeJavaScript<boolean>(
        `(function(){ var el = document.querySelector(${sel}); if(!el) return false; el.click(); return true; })()`,
        true,
      );
      return ok
        ? { ok: true, outcome: `Clicked ${command.selector}` }
        : { ok: false, error: `No element matching ${command.selector}` };
    }

    if (command.kind === "fill") {
      const sel = JSON.stringify(command.selector);
      const val = JSON.stringify(command.value);
      const ok = await activeWebview.executeJavaScript<boolean>(
        `(function(){
          var el = document.querySelector(${sel});
          if(!el) return false;
          el.focus();
          if ('value' in el) {
            var proto = Object.getOwnPropertyDescriptor(el.__proto__, 'value') || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (proto && proto.set) proto.set.call(el, ${val});
            else el.value = ${val};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.textContent = ${val};
          }
          return true;
        })()`,
        true,
      );
      return ok
        ? { ok: true, outcome: `Filled ${command.selector}` }
        : { ok: false, error: `No element matching ${command.selector}` };
    }

    return { ok: false, error: "Unknown browser command" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
