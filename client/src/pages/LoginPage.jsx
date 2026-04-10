import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import FloatingInput from "../components/FloatingInput";
import CinemaBrandPanel from "../components/CinemaBrandPanel";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, forgotPassword, verifyForgotPasswordOTP, resetPassword } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
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

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectTo = location.state?.from || "/";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const clearMessages = () => {
    setError("");
    setInfo("");
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();
    clearMessages();

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

  const handleInitiateForgot = async (event) => {
    event.preventDefault();
    clearMessages();

    try {
      setLoading(true);
      const data = await forgotPassword({ email: form.email });
      setResetExpiresAt(data?.expiresAt || null);
      setForgotStep(2);
      setInfo("Reset code sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (event) => {
    event.preventDefault();
    clearMessages();

    try {
      setLoading(true);
      const data = await verifyForgotPasswordOTP({ email: form.email, otp });
      setResetToken(data.resetToken);
      setForgotStep(3);
      setInfo("Code verified. Set your new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalReset = async (event) => {
    event.preventDefault();
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ resetToken, newPassword });
      setForgotStep(0);
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setInfo("Password updated. Please sign in.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      const token = credentialResponse?.credential;
      if (!token) {
        setError("Google authentication did not return a valid token");
        return;
      }

      try {
        setLoading(true);
        await loginWithGoogle(token);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, redirectTo]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (resetExpiresAt) {
        setResetSeconds(Math.max(0, Math.floor((new Date(resetExpiresAt).getTime() - Date.now()) / 1000)));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [resetExpiresAt]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.2),transparent_28%),linear-gradient(180deg,#09090d_0%,#11131b_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.02fr_0.98fr]">
        <div className="hidden lg:block border-r border-white/8">
          <CinemaBrandPanel />
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(25,27,38,0.96),rgba(13,14,20,0.96))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-10"
          >
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#E50914]">CinemaSync Access</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                {forgotStep === 0 ? "Sign In" : "Recover Your Account"}
              </h1>
              <p className="mt-3 text-sm text-white/55">
                {forgotStep === 0
                  ? "Use Google or your email and password to continue."
                  : "Reset your password in a simple three-step flow."}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {forgotStep === 0 ? (
                <motion.div key="signin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {googleClientId ? (
                    <div className="mb-6 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/45">Continue With Google</p>
                        <div className="flex justify-center">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google sign-in failed. Try email instead.")}
                            theme="filled_black"
                            shape="pill"
                            text="continue_with"
                            size="large"
                            width="340"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">or</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                    </div>
                  ) : null}

                  <form onSubmit={handlePasswordSignIn} className="space-y-5">
                    <FloatingInput
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={handleChange("email")}
                      required
                    />
                    <FloatingInput
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={handleChange("password")}
                      required
                    />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/35">Email/password sign-in only</span>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          clearMessages();
                        }}
                        className="font-bold text-[#E50914] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Signing In..." : "Sign In"}
                    </button>
                  </form>
                </motion.div>
              ) : null}

              {forgotStep === 1 ? (
                <motion.form
                  key="forgot-email"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleInitiateForgot}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-white">Step 1: Request Code</h2>
                    <p className="mt-2 text-sm text-white/50">Enter your account email to receive a reset code.</p>
                  </div>
                  <FloatingInput label="Email Address" type="email" value={form.email} onChange={handleChange("email")} required />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {loading ? "Sending..." : "Send Reset Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(0);
                      clearMessages();
                    }}
                    className="w-full text-xs font-bold uppercase tracking-[0.14em] text-white/35"
                  >
                    Back To Sign In
                  </button>
                </motion.form>
              ) : null}

              {forgotStep === 2 ? (
                <motion.form
                  key="forgot-otp"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleVerifyResetOtp}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-white">Step 2: Verify Code</h2>
                    <p className="mt-2 text-sm text-white/50">Enter the 6-digit code sent to {form.email}.</p>
                  </div>
                  <FloatingInput
                    label="Reset Code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
                    Expires in {Math.floor(resetSeconds / 60)}:{String(resetSeconds % 60).padStart(2, "0")}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                </motion.form>
              ) : null}

              {forgotStep === 3 ? (
                <motion.form
                  key="forgot-reset"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleFinalReset}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-white">Step 3: New Password</h2>
                    <p className="mt-2 text-sm text-white/50">Choose a strong password and confirm it below.</p>
                  </div>
                  <FloatingInput
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                  <FloatingInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </motion.form>
              ) : null}
            </AnimatePresence>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}

            {forgotStep === 0 ? (
              <p className="mt-8 text-center text-sm text-white/40">
                New to CinemaSync?
                <Link to="/register" className="ml-2 font-bold text-[#E50914] hover:underline">
                  Create Account
                </Link>
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
