import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@arco/styles/tokens.css";
import "@arco/styles/base.css";
import "@arco/styles/ui.css";
import "@arco/styles/settings.css";
import "@arco/styles/apps.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
