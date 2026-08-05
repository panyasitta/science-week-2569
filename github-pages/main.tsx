import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/noto-sans-thai";
import "@fontsource/pridi/500.css";
import "@fontsource/pridi/600.css";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ไม่พบตำแหน่งสำหรับแสดงเว็บไซต์");
}

createRoot(root).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
);
