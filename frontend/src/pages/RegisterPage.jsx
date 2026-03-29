import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
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
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      await verifyAccountOtp({ email: form.email, otp });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      const data = await resendOtp({ email: form.email, purpose: "email_verification" });
      setOtpExpiresAt(data.expiresAt);
      setDeliveryMode(data.deliveryMode || "");
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

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
        text: "signup_with",
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
      const remaining = Math.max(0, Math.floor((new Date(otpExpiresAt).getTime() - Date.now()) / 1000));
      setOtpSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  return (
    <section className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold text-white">Create account</h1>
        <p className="text-sm text-slate-400">Join CinemaSync and book your next show faster.</p>
      </div>

      {!otpStage ? (
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="Full Name" value={form.name} onChange={handleChange("name")} placeholder="Your name" />
            <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
            <Input label="Phone (optional)" value={form.phone} onChange={handleChange("phone")} placeholder="+919876543210" />
            <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Minimum 6 characters" />

            <Button type="submit" loading={loading} className="w-full">
              Create Account
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="h-px flex-1 bg-slate-700" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-700" />
          </div>

          {googleClientId ? (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-200">
                <GoogleGlyph />
                <span>Sign up with Google</span>
              </div>
              <div ref={googleButtonRef} className="flex justify-center rounded-lg border border-slate-700/80 bg-white/95 py-2" />
              {!googleReady ? <p className="mt-2 text-center text-xs text-slate-500">Loading Google Sign-In...</p> : null}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-400">
              Add <code>VITE_GOOGLE_CLIENT_ID</code> in frontend env to enable Google Sign-In.
            </p>
          )}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <p className="text-sm text-slate-300">Enter OTP sent to {form.email}</p>
          {deliveryMode && deliveryMode !== "smtp" ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
              Delivery mode: {deliveryMode}
            </p>
          ) : null}
          <Input
            label="6-digit OTP"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            maxLength={6}
          />
          <p className="text-xs text-slate-400">OTP expires in: {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, "0")}</p>

          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="w-full">
              Verify Email
            </Button>
            <Button type="button" variant="secondary" loading={loading} onClick={handleResendOtp}>
              Resend
            </Button>
          </div>
        </form>
      )}

      {error ? <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

      <p className="mt-4 text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-cyan-300 hover:text-cyan-200">Sign in</Link>
      </p>
    </section>
  );
};

export default RegisterPage;
