import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SpecPage from "./SpecPage";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpecPage />
  </StrictMode>,
);
