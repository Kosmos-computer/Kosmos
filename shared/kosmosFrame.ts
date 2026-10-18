/**
 * Identity of the still-frame Kosmos window.
 *
 * The page lives in kosmos-engine (`apps/kosmos-frame`). This shell only
 * names the dock entry and proxies `screenshot` to a loopback `kosmos serve`.
 * The id is stable so the window key (`web:kosmos-engine`) survives restarts.
 */
export const KOSMOS_FRAME_APP_ID = "kosmos-engine";
export const KOSMOS_FRAME_NAME = "Kosmos";
export const KOSMOS_ENGINE_PROXY_PATH = "/api/kosmos";
/**
 * Same-origin page. The browser loads it from whatever host serves the
 * desktop, and the page opens `/api/kosmos` on that host. A loopback URL
 * would point at the viewer's own machine.
 */
export const KOSMOS_FRAME_PAGE_URL = "/kosmos-frame/index.html";
