import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../components/ui/Button";
import FloatingInput from "../components/FloatingInput";
import CinemaBrandPanel from "../components/CinemaBrandPanel";
import useAuth from "../hooks/useAuth";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.7-4 2.7-6.8 0-.7-.1-1.5-.2-2.2H12z" />
    <path fill="#34A853" d="M12 22c2.4 0 4.5-.8 6-2.1l-3-2.3c-.8.6-1.9 1-3 1-2.3 0-4.2-1.5-4.9-3.6l-3.1 2.4C5.3 20.1 8.4 22 12 22z" />
    <path fill="#4A90E2" d="M7.1 15c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L4 8.8C3.4 10 3 11.4 3 13s.4 3 1 4.2L7.1 15z" />
    <path fill="#FBBC05" d="M12 7.4c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 4.7 14.4 4 12 4 8.4 4 5.3 5.9 4 8.8l3.1 2.4c.7-2.2 2.6-3.8 4.9-3.8z" />
  </svg>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, verifyAccountOtp, resendOtp } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required");
      return;
    }

    try {
      setLoading(true);
      const data = await register(form);
      setOtpStage(true);
      setOtpExpiresAt(data?.emailVerification?.expiresAt || null);
      setDeliveryMode(data?.emailVerification?.deliveryMode || "");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      await verifyAccountOtp({ email: form.email, otp });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const token = credentialResponse?.credential;
    try {
      setLoading(true);
      await loginWithGoogle(token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (!googleClientId || otpStage) return;
    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSuccess,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline", size: "large", text: "signup_with", shape: "pill", width: 320,
      });
      setGoogleReady(true);
    };
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  }, [googleClientId, handleGoogleSuccess, otpStage]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (otpExpiresAt) {
        setOtpSeconds(Math.max(0, Math.floor((new Date(otpExpiresAt).getTime() - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [otpExpiresAt]);

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
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-white/50 text-sm">Join the CinemaSync community today</p>
          </div>

          <AnimatePresence mode="wait">
            {!otpStage ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {googleClientId && (
                  <div className="space-y-4 mb-6">
                    <div ref={googleButtonRef} className="w-full flex justify-center" />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-white/30 text-xs font-bold uppercase tracking-wider">OR</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FloatingInput label="Full Name" value={form.name} onChange={handleChange("name")} />
                  <FloatingInput label="Email Address" type="email" value={form.email} onChange={handleChange("email")} />
                  <FloatingInput label="Phone (Optional)" value={form.phone} onChange={handleChange("phone")} />
                  <FloatingInput label="Password" type="password" value={form.password} onChange={handleChange("password")} />
                  
                  <label className="flex items-start gap-2 mt-6 text-xs text-white/50 leading-tight">
                    <input type="checkbox" required className="mt-0.5 accent-[#E50914]" />
                    <span>I agree to the <a href="#" className="text-[#E50914] hover:underline">Terms of Service</a> and <a href="#" className="text-[#E50914] hover:underline">Privacy Policy</a>.</span>
                  </label>

                  <button type="submit" disabled={loading} className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000] hover:from-[#FF1522] hover:to-[#E50914] transition-all shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? "Creating..." : "Create Account"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleVerifyOtp} className="space-y-6">
                <h3 className="text-xl font-bold text-white">Verify Your Email</h3>
                <p className="text-white/50 text-sm">We've sent a 6-digit code to <b>{form.email}</b>. Please enter it below to activate your account.</p>
                <FloatingInput label="Verification Code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <div className="flex justify-between items-center text-xs">
                   <span className="text-white/40">Expires in: {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, "0")}</span>
                   <button type="button" onClick={() => resendOtp({email: form.email, purpose: "email_verification"})} className="text-[#E50914] font-bold">Resend Code</button>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#E50914] to-[#B00000] hover:scale-[1.02] transition-all">Activate Account</button>
                <button type="button" onClick={() => setOtpStage(false)} className="w-full text-white/30 text-xs font-bold hover:text-white transition-colors">Back to Registration</button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex gap-2">⚠ {error}</div>}

          {!otpStage && (
            <p className="mt-8 text-center text-sm text-white/40">
              Already have an account? <Link to="/login" className="text-[#E50914] font-bold hover:underline ml-1">Sign In</Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
