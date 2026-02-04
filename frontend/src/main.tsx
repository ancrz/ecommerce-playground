import React from "react";
import ReactDOM from "react-dom/client";
// Importa el componente principal desde el archivo .tsx
import App from "./App.tsx";
import "./index.css";
import { initLogger } from "./logger";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/react-query";
import { FeedbackProvider } from "./components/ui/FeedbackModal";

import { WebSocketProvider } from "./context/WebSocketContext"; // NEW

// Inicializar observabilidad remota
initLogger();

// Agregamos '!' para asegurar no nulo en TS
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </FeedbackProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
