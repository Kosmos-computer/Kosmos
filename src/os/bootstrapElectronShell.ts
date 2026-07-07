/**
 * Bootstrap Electron shell flags before the first React paint.
 */
export function bootstrapElectronShell(): void {
  const desktop = window.arcoDesktop;
  if (!desktop?.isDesktop) return;

  const root = document.documentElement;
  root.dataset.electron = "true";
  root.dataset.platform = desktop.platform;
  root.classList.add("arco-electron");
  document.body.classList.add("arco-electron");
}
