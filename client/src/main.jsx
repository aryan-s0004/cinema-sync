import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </BrowserRouter>
);
