import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ProgressProvider } from "./progress/ProgressContext";
import "./shell.css";
import { AudioProvider } from "./audio/AudioContext";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProgressProvider>
        <AudioProvider>
          <App />
        </AudioProvider>
      </ProgressProvider>
    </BrowserRouter>
  </React.StrictMode>
);