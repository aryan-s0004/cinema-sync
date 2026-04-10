import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import FloatingInput from "../components/FloatingInput";
import CinemaBrandPanel from "../components/CinemaBrandPanel";
import useAuth from "../hooks/useAuth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, verifyAccountOtp, resendOtp } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const data = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setOtpStage(true);
      setOtpExpiresAt(data?.emailVerification?.expiresAt || null);
      setInfo("Verification code sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

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
        navigate("/", { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || "Google sign-up failed");
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (otpExpiresAt) {
        setOtpSeconds(Math.max(0, Math.floor((new Date(otpExpiresAt).getTime() - Date.now()) / 1000)));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [otpExpiresAt]);

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
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#E50914]">CinemaSync Join</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                {otpStage ? "Verify Your Email" : "Create Account"}
              </h1>
              <p className="mt-3 text-sm text-white/55">
                {otpStage
                  ? "Enter the code sent to your inbox to activate your account."
                  : "Sign up with Google or create an account with email and password."}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!otpStage ? (
                <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {googleClientId ? (
                    <div className="mb-6 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/45">Sign Up With Google</p>
                        <div className="flex justify-center">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google sign-up failed. Try email instead.")}
                            theme="filled_black"
                            shape="pill"
                            text="signup_with"
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

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <FloatingInput label="Full Name" value={form.name} onChange={handleChange("name")} required />
                    <FloatingInput label="Email Address" type="email" value={form.email} onChange={handleChange("email")} required />
                    <FloatingInput label="Password" type="password" value={form.password} onChange={handleChange("password")} required />
                    <FloatingInput
                      label="Confirm Password"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                      required
                    />

                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-relaxed text-white/55">
                      <input type="checkbox" required className="mt-0.5 accent-[#E50914]" />
                      <span>
                        I agree to the
                        <a href="#" className="mx-1 font-semibold text-[#E50914] hover:underline">
                          Terms
                        </a>
                        and
                        <a href="#" className="ml-1 font-semibold text-[#E50914] hover:underline">
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Creating..." : "Create Account"}
                    </button>
                  </form>
                </motion.div>
              ) : null}

              {otpStage ? (
                <motion.form
                  key="verify-email"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black text-white">Almost Done</h2>
                    <p className="mt-2 text-sm text-white/50">
                      We sent a 6-digit verification code to {form.email}.
                    </p>
                  </div>

                  <FloatingInput
                    label="Verification Code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs">
                    <span className="text-white/45">
                      Expires in {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => resendOtp({ email: form.email, purpose: "email_verification" })}
                      className="font-bold text-[#E50914] hover:underline"
                    >
                      Resend Code
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#E50914,#B00000)] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Activate Account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpStage(false)}
                    className="w-full text-xs font-bold uppercase tracking-[0.14em] text-white/35"
                  >
                    Back To Sign Up
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

            {!otpStage ? (
              <p className="mt-8 text-center text-sm text-white/40">
                Already have an account?
                <Link to="/login" className="ml-2 font-bold text-[#E50914] hover:underline">
                  Sign In
                </Link>
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
