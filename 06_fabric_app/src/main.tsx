import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import App from "./App.tsx";
import { ErrorFallback } from "./ErrorFallback";
import { AuthProvider } from "./hooks/use-auth";
import { bootstrapAuth } from "./services/rayfin-auth.service";
import { AuthGate } from "./components/auth-gate.component";

import "./global.css";

async function start() {
  const root = createRoot(document.getElementById("root")!);
  if (import.meta.env.VITE_DEMO === "1") {
    // aperçu local hors de Fabric, avec des données de démonstration
    const { installDemo } = await import("./demo/demo-data");
    installDemo();
    root.render(<App />);
    return;
  }
  const rayfinAuthService = bootstrapAuth();
  root.render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider rayfinAuthService={rayfinAuthService}>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>,
  );
}

start();
