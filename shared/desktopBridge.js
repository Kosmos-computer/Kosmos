/** IPC contract between the Electron main process and the Arco shell renderer. */
export const DESKTOP_IPC = {
    openAppWindow: "arco:open-app-window",
    closeAppWindow: "arco:close-app-window",
    focusAppWindow: "arco:focus-app-window",
    closeAllAppWindows: "arco:close-all-app-windows",
    appWindowClosed: "arco:app-window-closed",
    setTitleBarTheme: "arco:set-title-bar-theme",
};
