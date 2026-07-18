/**
 * Studio project preview proxy — like Search browse, but allows loopback /
 * private hosts so cloud & browser Studio can embed the user's project
 * same-origin (Design Mode can inject a picker). Not for the open web
 * crawl surface; requires auth.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Design Mode bridge — parent posts arm/teardown; guest posts grab payloads. */
const DESIGN_MODE_BRIDGE = `<script>(function(){
  if (window.__arcoDesignBridge) return;
  window.__arcoDesignBridge = true;
  var STYLE_PROPS=['display','position','width','height','margin','padding','color','backgroundColor','border','borderRadius','fontFamily','fontSize','fontWeight','lineHeight','textAlign','zIndex'];
  var SAFE_ATTRS=['id','class','name','type','role','href','src','alt','title','placeholder'];
  function clamp(s,max){if(!s||typeof s!=='string')return'';return s.length<=max?s:s.slice(0,max)+' (truncated)';}
  function sanitizeUrl(url){try{var u=new URL(url);if(u.protocol!=='http:'&&u.protocol!=='https:'&&u.protocol!=='file:')return'';u.search='';u.hash='';return u.toString();}catch(e){return'';}}
  function cssSelector(el){if(el.id)return'#'+CSS.escape(el.id);var parts=[],node=el;while(node&&node.nodeType===1&&parts.length<5){var tag=node.tagName.toLowerCase();var parent=node.parentElement;if(parent){var siblings=Array.prototype.filter.call(parent.children,function(c){return c.tagName===node.tagName;});if(siblings.length>1)tag+=':nth-of-type('+(siblings.indexOf(node)+1)+')';}parts.unshift(tag);if(node.id){parts[0]='#'+CSS.escape(node.id);break;}node=parent;}return clamp(parts.join(' > '),700);}
  function extract(el){if(!el||el.nodeType!==1)return null;var cs=window.getComputedStyle(el);var styles={};for(var i=0;i<STYLE_PROPS.length;i++)styles[STYLE_PROPS[i]]=cs[STYLE_PROPS[i]]||'';var attrs={};for(var a=0;a<SAFE_ATTRS.length;a++){var n=SAFE_ATTRS[a];if(el.hasAttribute(n))attrs[n]=clamp(el.getAttribute(n)||'',200);}var rect=el.getBoundingClientRect();var ancestors=[];var p=el.parentElement;while(p&&ancestors.length<8){ancestors.push(p.tagName.toLowerCase()+(p.id?'#'+p.id:''));p=p.parentElement;}return{page:{sanitizedUrl:sanitizeUrl(location.href),title:clamp(document.title||'',200),viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,devicePixelRatio:window.devicePixelRatio||1,capturedAt:new Date().toISOString()},target:{tagName:el.tagName.toLowerCase(),selector:cssSelector(el),textSnippet:clamp((el.innerText||el.textContent||'').trim(),200),htmlSnippet:clamp(el.outerHTML||'',4096),attributes:attrs,accessibility:{role:el.getAttribute('role'),ariaLabel:el.getAttribute('aria-label')},rectViewport:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},computedStyles:styles,sourceFile:null,reactComponents:null},ancestorPath:ancestors,screenshot:null};}
  function captureShot(el){try{var r=el.getBoundingClientRect();var w=Math.max(1,Math.ceil(r.width));var h=Math.max(1,Math.ceil(r.height));var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');if(!ctx)return null;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#111';ctx.font='12px sans-serif';ctx.fillText('<'+el.tagName.toLowerCase()+'>',8,20);ctx.fillText((el.innerText||'').trim().slice(0,80),8,40);return{mimeType:'image/png',dataUrl:c.toDataURL('image/png'),width:w,height:h};}catch(e){return null;}}
  var host=null,hovered=null,armed=false;
  function cleanup(){if(!host)return;document.removeEventListener('mousemove',onMove,true);document.removeEventListener('click',onClick,true);if(host.parentNode)host.parentNode.removeChild(host);host=null;hovered=null;armed=false;}
  function onMove(e){var el=document.elementFromPoint(e.clientX,e.clientY);if(!el||!host||host.contains(el)||el===document.documentElement||el===document.body){if(host&&host._hl)host._hl.style.display='none';hovered=null;return;}hovered=el;var r=el.getBoundingClientRect();var hl=host._hl;hl.style.display='block';hl.style.left=r.left+'px';hl.style.top=r.top+'px';hl.style.width=r.width+'px';hl.style.height=r.height+'px';}
  function onClick(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();var el=hovered||document.elementFromPoint(e.clientX,e.clientY);var payload=extract(el);if(payload)payload.screenshot=captureShot(el);cleanup();try{parent.postMessage({source:'arco-design-mode',action:'grab',payload:payload},'*');}catch(err){}}
  function arm(){if(armed)return;cleanup();host=document.createElement('div');host.id='__arco-grab-host';host.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;';var shadow=host.attachShadow({mode:'open'});var hl=document.createElement('div');hl.style.cssText='position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.12);box-sizing:border-box;display:none;';shadow.appendChild(hl);host._hl=hl;document.documentElement.appendChild(host);document.addEventListener('mousemove',onMove,true);document.addEventListener('click',onClick,true);armed=true;}
  window.addEventListener('message',function(ev){var d=ev.data;if(!d||d.source!=='arco-design-mode')return;if(d.action==='arm')arm();if(d.action==='teardown')cleanup();});
  try{parent.postMessage({source:'arco-design-mode',action:'ready'},'*');}catch(e){}
})();</script>`;

const PROXY_NAV_SCRIPT = `<script>(function(){var P="/api/studio/preview?url=";function px(h){try{var u=new URL(h,document.baseURI);if(u.protocol!=="http:"&&u.protocol!=="https:")return h;return P+encodeURIComponent(u.href);}catch(e){return h;}}document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var href=a.getAttribute("href");if(!href||href.charAt(0)==="#"||href.indexOf("javascript:")===0)return;e.preventDefault();window.location.href=px(a.href);},true);}())</script>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isMetadataHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "metadata.google.internal" || host === "169.254.169.254";
}

export function parseStudioPreviewTarget(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Missing url");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  if (isMetadataHost(parsed.hostname)) {
    throw new Error("This URL cannot be previewed");
  }
  return parsed;
}

function stripFrameBlockingMeta(html: string): string {
  return html
    .replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
}

function injectPreviewHelpers(html: string, pageUrl: string): string {
  const cleaned = stripFrameBlockingMeta(html);
  const baseTag = `<base href="${escapeHtml(pageUrl)}">`;
  const injection = `${baseTag}${PROXY_NAV_SCRIPT}${DESIGN_MODE_BRIDGE}`;

  if (/<head\b[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<head\b[^>]*>/i, (head) => `${head}${injection}`);
  }
  if (/<html\b[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<html\b[^>]*>/i, (el) => `${el}<head>${injection}</head>`);
  }
  return `<!DOCTYPE html><html><head>${injection}</head><body>${cleaned}</body></html>`;
}

export function studioPreviewErrorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview error</title></head><body style="font:14px/1.5 system-ui,sans-serif;padding:24px;color:#444"><h1 style="font-size:16px;margin:0 0 8px">Could not load project preview</h1><p style="margin:0">${escapeHtml(message)}</p><p style="margin:12px 0 0;color:#777">Design Mode in the browser needs a project URL the Kosmos server can fetch (local workspace port, tunnel, or cloud preview).</p></body></html>`;
}

export async function fetchStudioPreviewPage(
  rawUrl: string,
): Promise<{ html: string; contentType: string }> {
  const target = parseStudioPreviewTarget(rawUrl);
  const res = await fetch(target.href, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`Preview request failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "text/html";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Only HTML pages can be previewed for Design Mode");
  }

  const html = injectPreviewHelpers(await res.text(), res.url || target.href);
  return { html, contentType: "text/html; charset=utf-8" };
}

/** Studio Browser iframe src — always same-origin via the preview proxy. */
export function studioPreviewFrameSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    parseStudioPreviewTarget(trimmed);
  } catch {
    return trimmed;
  }
  return `/api/studio/preview?url=${encodeURIComponent(trimmed)}`;
}
