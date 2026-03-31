import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../components/ui/Button";
import FloatingInput from "../components/FloatingInput";
import CinemaBrandPanel from "../components/CinemaBrandPanel";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    loginWithGoogle,
    forgotPassword,
    verifyForgotPasswordOTP,
    resetPassword,
  } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  
  // Forgot Password Steps: 1=email, 2=otp, 3=newPassword
  const [forgotStep, setForgotStep] = useState(0); 
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetExpiresAt, setResetExpiresAt] = useState(null);
  const [resetSeconds, setResetSeconds] = useState(0);

  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectTo = location.state?.from || "/";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    try {
      setLoading(true);
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Flow
  const handleInitiateForgot = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await forgotPassword({ email: form.email });
      setResetExpiresAt(data.expiresAt);
      setForgotStep(2);
      setInfo("Reset code sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await verifyForgotPasswordOTP({ email: form.email, otp });
      setResetToken(data.resetToken);
      setForgotStep(3);
      setInfo("Code verified. Enter your new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await resetPassword({ resetToken, newPassword });
      setForgotStep(0);
      setInfo("Password updated. Please sign in.");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const token = credentialResponse?.credential;
    try {
      setLoading(true);
      await loginWithGoogle(token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate, redirectTo]);

  useEffect(() => {
    if (!googleClientId || forgotStep !== 0) return;
    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSuccess,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320,
      });
      setGoogleReady(true);
    };
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  }, [googleClientId, handleGoogleSuccess, forgotStep]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (resetExpiresAt) {
        setResetSeconds(Math.max(0, Math.floor((new Date(resetExpiresAt).getTime() - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [resetExpiresAt]);

  return (
    <div className="min-h-screen flex bg-[#1A1A2E]">
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] relative overflow-hidden border-r border-white/5">
        <CinemaBrandPanel />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-white/50 text-sm">Sign in to continue your CinemaSync journey</p>
          </div>

          <AnimatePresence mode="wait">
            {forgotStep === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {googleClientId ? (
                  <div className="space-y-4 mb-6">
                    <div ref={googleButtonRef} className="w-full flex justify-center" />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/30 text-xs font-bold uppercase tracking-wider">OR</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <FloatingInput label="Email Address" type="email" value={form.email} onChange={handleChange("email")} required />
                  <FloatingInput label="Password" type="password" value={form.password} onChange={handleChange("password")} required />
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="accent-[#E50914]" />
                      <span className="text-white/40 text-xs">Stay signed in</span>
                    </div>
                    <button type="button" onClick={() => setForgotStep(1)} className="text-[#E50914] text-xs font-bold hover:underline">Forgot password?</button>
                  </div>

                  <button type="submit" disabled={loading} className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000] hover:from-[#FF1522] hover:to-[#E50914] transition-all shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? "Processing..." : "Sign In"}
                  </button>
                </form>
              </motion.div>
            )}

            {forgotStep > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                 {forgotStep === 1 && (
                   <form onSubmit={handleInitiateForgot} className="space-y-6">
                     <h3 className="text-xl font-bold text-white">Recover Password</h3>
                     <p className="text-white/50 text-sm">Enter the email associated with your account.</p>
                     <FloatingInput label="Email Address" type="email" value={form.email} onChange={handleChange("email")} required />
                     <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000]">Get Reset Code</button>
                     <button type="button" onClick={() => setForgotStep(0)} className="w-full text-white/30 text-xs font-bold">Cancel</button>
                   </form>
                 )}
                 {forgotStep === 2 && (
                   <form onSubmit={handleVerifyResetOtp} className="space-y-6">
                     <h3 className="text-xl font-bold text-white">Verify Reset Code</h3>
                     <p className="text-white/50 text-sm">Enter the 6-digit code sent to your email.</p>
                     <FloatingInput label="Security Code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
                     <div className="text-xs text-white/40">Expires in: {Math.floor(resetSeconds / 60)}:{String(resetSeconds % 60).padStart(2, "0")}</div>
                     <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000]">Verify Code</button>
                   </form>
                 )}
                 {forgotStep === 3 && (
                   <form onSubmit={handleFinalReset} className="space-y-6">
                     <h3 className="text-xl font-bold text-white">Set New Password</h3>
                     <p className="text-white/50 text-sm">Choose a strong password for your account.</p>
                     <FloatingInput label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                     <FloatingInput label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                     <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000]">Update Password</button>
                   </form>
                 )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex gap-2 animate-shake">⚠ {error}</div>}
          {info && <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex gap-2">✓ {info}</div>}

          {forgotStep === 0 && (
            <p className="mt-8 text-center text-sm text-white/40">
              New to CinemaSync? <Link to="/register" className="text-[#E50914] font-bold hover:underline ml-1">Create Account</Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
