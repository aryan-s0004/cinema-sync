import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";

const GoogleGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.7-4 2.7-6.8 0-.7-.1-1.5-.2-2.2H12z" />
    <path fill="#34A853" d="M12 22c2.4 0 4.5-.8 6-2.1l-3-2.3c-.8.6-1.9 1-3 1-2.3 0-4.2-1.5-4.9-3.6l-3.1 2.4C5.3 20.1 8.4 22 12 22z" />
    <path fill="#4A90E2" d="M7.1 15c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L4 8.8C3.4 10 3 11.4 3 13s.4 3 1 4.2L7.1 15z" />
    <path fill="#FBBC05" d="M12 7.4c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 4.7 14.4 4 12 4 8.4 4 5.3 5.9 4 8.8l3.1 2.4c.7-2.2 2.6-3.8 4.9-3.8z" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, verifyLoginOtp, resendOtp } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [otpHint, setOtpHint] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginChannel, setLoginChannel] = useState("email");
  const [otpChannel, setOtpChannel] = useState("email");
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleButtonRef = useRef(null);

  const redirectTo = location.state?.from || "/";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      if (rememberMe) {
        localStorage.setItem("rememberedLoginEmail", form.email.trim());
      } else {
        localStorage.removeItem("rememberedLoginEmail");
      }

      const loginResult = await login({ ...form, channel: loginChannel });
      if (loginResult?.otpRequired) {
        setOtpStage(true);
        setOtpChannel(loginResult.channel || loginChannel);
        setOtpExpiresAt(loginResult.expiresAt);
        setDeliveryMode(loginResult.deliveryMode || "");
        setOtpHint(loginResult.otpPreview ? `Dev OTP: ${loginResult.otpPreview}` : "");
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      await verifyLoginOtp({ email: form.email, otp, channel: otpChannel });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      const data = await resendOtp({
        email: form.email,
        purpose: otpChannel === "phone" ? "login_phone" : "login",
        channel: otpChannel,
      });
      setOtpExpiresAt(data.expiresAt);
      setDeliveryMode(data.deliveryMode || "");
      setOtpHint(data.otpPreview ? `Dev OTP: ${data.otpPreview}` : "");
      setOtp("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setError("Google did not return an ID token. Please try again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await loginWithGoogle(token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate, redirectTo]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedLoginEmail");
    if (rememberedEmail) {
      setForm((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId || otpStage) return undefined;

    const initializeGoogle = () => {
      const googleApi = window.google?.accounts?.id;
      if (!googleApi || !googleButtonRef.current) return;

      googleApi.initialize({
        client_id: googleClientId,
        callback: handleGoogleSuccess,
      });

      googleButtonRef.current.innerHTML = "";
      googleApi.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });

      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return undefined;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setError("Failed to load Google Sign-In. Please retry.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, handleGoogleSuccess, otpStage]);

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpSeconds(0);
      return undefined;
    }

    const interval = setInterval(() => {
      if (!otpExpiresAt) {
        setOtpSeconds(0);
        return;
      }
      const remaining = Math.max(
        0,
        Math.floor((new Date(otpExpiresAt).getTime() - Date.now()) / 1000)
      );
      setOtpSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  return (
    <section className="relative mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/70 shadow-2xl shadow-black/30 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="relative hidden overflow-hidden p-8 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.34),transparent_35%),radial-gradient(circle_at_82%_70%,rgba(16,185,129,0.2),transparent_32%),linear-gradient(140deg,rgba(15,23,42,0.98),rgba(30,41,59,0.86))]" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full border border-cyan-400/30 bg-cyan-500/10 blur-2xl" />
        <div className="absolute -right-8 top-10 h-40 w-40 rounded-full border border-emerald-300/30 bg-emerald-500/10 blur-2xl" />

        <div className="relative z-10 space-y-5">
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
            ShowDrop Access
          </p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
            Step into your next big-screen experience.
          </h1>
          <p className="max-w-sm text-sm leading-7 text-slate-200">
            Fast booking, intelligent recommendations, and seamless checkout from one login.
          </p>

          <div className="space-y-3 pt-3 text-sm text-slate-200">
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/40 px-3 py-2">AI picks based on your genre taste</div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/40 px-3 py-2">Smart seat suggestions for better view</div>
            <div className="rounded-xl border border-slate-600/60 bg-slate-900/40 px-3 py-2">Quick recovery if payment gets interrupted</div>
          </div>
        </div>
      </div>

      <div className="relative space-y-5 p-6 sm:p-8">
        <div className="absolute right-8 top-8 hidden rounded-full border border-slate-600 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-300 sm:block">
          Secure Login
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{otpStage ? "Verification Step" : "Welcome Back"}</p>
          <h2 className="text-3xl font-semibold text-white">{otpStage ? "Confirm OTP" : "Sign in to continue"}</h2>
        </div>

        {!otpStage ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
            <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Enter password" />
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-950/50 p-1.5 text-xs">
              <button
                type="button"
                className={`rounded-lg px-2 py-2 transition ${loginChannel === "email" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
                onClick={() => setLoginChannel("email")}
              >
                OTP via Email
              </button>
              <button
                type="button"
                className={`rounded-lg px-2 py-2 transition ${loginChannel === "phone" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
                onClick={() => setLoginChannel("phone")}
              >
                OTP via Phone
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-cyan-300 hover:text-cyan-200"
                onClick={() => setError("Password reset is coming soon. Use Google Sign-In for fastest access.")}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Continue with Email
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <p className="text-sm text-slate-300">
              Enter the OTP sent to {otpChannel === "phone" ? "your registered phone number" : form.email}
            </p>
            {deliveryMode && !["smtp", "twilio", "fast2sms"].includes(deliveryMode) ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
                {otpChannel === "phone" ? "SMS" : "Email"} delivery mode: {deliveryMode}.
              </p>
            ) : null}
            <Input
              label="6-digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
            />
            <p className="text-xs text-slate-400">
              OTP expires in: {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, "0")}
            </p>
            {otpHint ? <p className="text-xs text-cyan-300">{otpHint}</p> : null}

            <div className="flex gap-3">
              <Button type="submit" loading={loading} className="w-full">
                Verify & Login
              </Button>
              <Button type="button" variant="secondary" loading={loading} onClick={handleResendOtp}>
                Resend OTP
              </Button>
            </div>
          </form>
        )}

        {!otpStage ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              <span className="h-px flex-1 bg-slate-700" />
              <span>or continue with</span>
              <span className="h-px flex-1 bg-slate-700" />
            </div>

            {googleClientId ? (
              <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-950/70 to-slate-900/70 p-3">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <GoogleGlyph />
                    <span>Continue with Google</span>
                  </div>
                  <span className="text-[11px] text-slate-400">1-tap eligible</span>
                </div>
                <div ref={googleButtonRef} className="flex justify-center rounded-xl border border-slate-700/80 bg-white/95 py-2" />
                {!googleReady ? <p className="mt-2 text-center text-xs text-slate-500">Loading Google Sign-In...</p> : null}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">
                Add <code>VITE_GOOGLE_CLIENT_ID</code> in frontend env to enable Google Sign-In.
              </p>
            )}

            <Button type="button" variant="ghost" className="w-full border border-slate-700" onClick={() => navigate("/")}>
              Continue as Guest
            </Button>
          </div>
        ) : null}

        {error ? <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

        <p className="text-sm text-slate-400">
          New here?{" "}
          <Link to="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
            Create account
          </Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
