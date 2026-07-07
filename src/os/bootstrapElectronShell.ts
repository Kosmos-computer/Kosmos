/**
 * Bootstrap Electron shell flags before the first React paint so title-bar CSS
 * variables and layout offsets apply immediately (no flash / zero-height bar).
 */
export function bootstrapElectronShell(): void {
  const desktop = window.arcoDesktop;
  if (!desktop?.isDesktop) return;

  const root = document.documentElement;
  root.dataset.electron = "true";
  root.dataset.platform = desktop.platform;
  root.classList.add("arco-electron");
  root.style.setProperty("--arco-electron-titlebar-height", "34px");
  document.body.classList.add("arco-electron");
}
