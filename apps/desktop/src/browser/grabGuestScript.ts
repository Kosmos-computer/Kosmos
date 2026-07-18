/**
 * Design Mode guest overlay scripts for Electron webview guests.
 * Injected via webContents.executeJavaScript from main (IPC) or the renderer.
 */

const BODY = `
  var STYLE_PROPS = [
    'display', 'position', 'width', 'height', 'margin', 'padding',
    'color', 'backgroundColor', 'border', 'borderRadius', 'fontFamily',
    'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'zIndex'
  ];
  var SAFE_ATTRS = ['id', 'class', 'name', 'type', 'role', 'href', 'src', 'alt', 'title', 'placeholder'];

  function clamp(s, max) {
    if (!s || typeof s !== 'string') return '';
    return s.length <= max ? s : s.slice(0, max) + ' (truncated)';
  }

  function sanitizeUrl(url) {
    try {
      var u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'file:') return '';
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch (e) {
      return '';
    }
  }

  function cssSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      var tag = node.tagName.toLowerCase();
      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.prototype.filter.call(parent.children, function(c) {
          return c.tagName === node.tagName;
        });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(node) + 1;
          tag += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(tag);
      if (node.id) {
        parts[0] = '#' + CSS.escape(node.id);
        break;
      }
      node = parent;
    }
    return clamp(parts.join(' > '), 700);
  }

  function reactSource(el) {
    var key = Object.keys(el).find(function(k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    if (!key) return { sourceFile: null, reactComponents: null };
    var fiber = el[key];
    var names = [];
    var source = null;
    var depth = 0;
    while (fiber && depth < 12) {
      if (fiber._debugSource && !source) {
        source = fiber._debugSource.fileName + ':' + fiber._debugSource.lineNumber;
      }
      var type = fiber.type;
      if (typeof type === 'function' || (type && typeof type === 'object')) {
        var name = type.displayName || type.name;
        if (name && names.indexOf(name) === -1) names.push(name);
      }
      fiber = fiber.return;
      depth++;
    }
    return {
      sourceFile: source ? clamp(source, 500) : null,
      reactComponents: names.length ? clamp(names.slice(0, 4).join(' > '), 500) : null
    };
  }

  function extract(el) {
    if (!el || el.nodeType !== 1) return null;
    var cs = window.getComputedStyle(el);
    var styles = {};
    for (var i = 0; i < STYLE_PROPS.length; i++) {
      styles[STYLE_PROPS[i]] = cs[STYLE_PROPS[i]] || '';
    }
    var attrs = {};
    for (var a = 0; a < SAFE_ATTRS.length; a++) {
      var name = SAFE_ATTRS[a];
      if (el.hasAttribute(name)) attrs[name] = clamp(el.getAttribute(name) || '', 200);
    }
    var rect = el.getBoundingClientRect();
    var ancestors = [];
    var p = el.parentElement;
    while (p && ancestors.length < 8) {
      ancestors.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
      p = p.parentElement;
    }
    var react = reactSource(el);
    return {
      page: {
        sanitizedUrl: sanitizeUrl(location.href),
        title: clamp(document.title || '', 200),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        capturedAt: new Date().toISOString()
      },
      target: {
        tagName: el.tagName.toLowerCase(),
        selector: cssSelector(el),
        textSnippet: clamp((el.innerText || el.textContent || '').trim(), 200),
        htmlSnippet: clamp(el.outerHTML || '', 4096),
        attributes: attrs,
        accessibility: {
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label')
        },
        rectViewport: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        computedStyles: styles,
        sourceFile: react.sourceFile,
        reactComponents: react.reactComponents
      },
      ancestorPath: ancestors,
      screenshot: null
    };
  }

  if (window.__arcoGrab && typeof window.__arcoGrab.cleanup === 'function') {
    try { window.__arcoGrab.cleanup(); } catch (e) {}
    delete window.__arcoGrab;
  }

  var host = document.createElement('div');
  host.id = '__arco-grab-host';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  var shadow = host.attachShadow({ mode: 'open' });
  var highlight = document.createElement('div');
  highlight.style.cssText =
    'position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.12);box-sizing:border-box;display:none;';
  shadow.appendChild(highlight);
  document.documentElement.appendChild(host);

  var hovered = null;
  var resolveClick = null;
  function onMove(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || host.contains(el) || el === document.documentElement || el === document.body) {
      highlight.style.display = 'none';
      hovered = null;
      return;
    }
    hovered = el;
    var r = el.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.left = r.left + 'px';
    highlight.style.top = r.top + 'px';
    highlight.style.width = r.width + 'px';
    highlight.style.height = r.height + 'px';
  }

  function cleanup() {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    if (host.parentNode) host.parentNode.removeChild(host);
    delete window.__arcoGrab;
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var el = hovered || document.elementFromPoint(e.clientX, e.clientY);
    var payload = extract(el);
    cleanup();
    if (resolveClick) resolveClick(payload);
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  window.__arcoGrab = {
    cleanup: cleanup,
    extract: extract,
    awaitClick: function() {
      return new Promise(function(resolve) { resolveClick = resolve; });
    }
  };
`;

/** Install overlay + hover tracking (does not wait for click). */
export function grabArmScript(): string {
  return `(function() { 'use strict'; ${BODY} return true; })()`;
}

/** Wait for the next Design Mode click (requires grabArmScript first). */
export function grabAwaitArmedScript(): string {
  return `(function() {
    if (!window.__arcoGrab || typeof window.__arcoGrab.awaitClick !== 'function') {
      throw new Error('Design Mode is not armed');
    }
    return window.__arcoGrab.awaitClick();
  })()`;
}

/** Arm + await in one shot (renderer fallback when IPC is unavailable). */
export function grabAwaitClickScript(): string {
  return `(function() { 'use strict'; ${BODY} return window.__arcoGrab.awaitClick(); })()`;
}

export function grabTeardownScript(): string {
  return `(function() {
    if (window.__arcoGrab && typeof window.__arcoGrab.cleanup === 'function') {
      try { window.__arcoGrab.cleanup(); } catch (e) {}
      delete window.__arcoGrab;
    }
    return true;
  })()`;
}
