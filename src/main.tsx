import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SkybreakProtocol from "./SkybreakProtocol";
import "./styles.css";

const isGerman = window.location.pathname.replace(/\/+$/, "").endsWith("/de");
const baseUrl = import.meta.env.BASE_URL;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SkybreakProtocol
      language={isGerman ? "de" : "en"}
      languageHref={isGerman ? baseUrl : `${baseUrl}de/`}
      iconSrc={`${baseUrl}icon-512.png`}
    />
  </StrictMode>,
);
