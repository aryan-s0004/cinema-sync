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
  const {
    login,
    loginWithGoogle,
    requestLoginOtp,
    verifyLoginOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
  } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [signInMode, setSignInMode] = useState("password");
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState("");
  const [forgotStage, setForgotStage] = useState("none");
  const [resetForm, setResetForm] = useState({ email: "", otp: "", newPassword: "" });
  const [resetExpiresAt, setResetExpiresAt] = useState(null);
  const [resetSeconds, setResetSeconds] = useState(0);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("email");
  const [otpChannel, setOtpChannel] = useState("email");
  const [googleReady, setGoogleReady] = useState(false);

  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectTo = location.state?.from || "/";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleResetChange = (field) => (event) => {
    const value = field === "otp"
      ? event.target.value.replace(/\D/g, "").slice(0, 6)
      : event.target.value;
    setResetForm((prev) => ({ ...prev, [field]: value }));
  };

  const activateSignInMode = (mode) => {
    setSignInMode(mode);
    setOtpStage(false);
    setOtp("");
    setOtpExpiresAt(null);
    setForgotStage("none");
    setInfo("");
    setError("");
  };

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const loginResult = await login({ ...form, channel });

      if (loginResult?.otpRequired) {
        setOtpStage(true);
        setOtpChannel(loginResult.channel || channel);
        setOtpExpiresAt(loginResult.expiresAt);
        setDeliveryMode(loginResult.deliveryMode || "");
        setInfo(`Verification code sent via ${loginResult.channel === "phone" ? "phone OTP" : "email OTP"}.`);
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSignInRequest = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!form.email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      const data = await requestLoginOtp({ email: form.email, channel });
      setOtpStage(true);
      setOtpChannel(data.channel || channel);
      setOtpExpiresAt(data.expiresAt);
      setDeliveryMode(data.deliveryMode || "");
      setInfo(`OTP sent via ${data.channel === "phone" ? "phone" : "email"}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

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
      setError("");
      setInfo("");
      const data = await resendOtp({
        email: form.email,
        purpose: otpChannel === "phone" ? "login_phone" : "login",
        channel: otpChannel,
      });
      setOtpExpiresAt(data.expiresAt);
      setDeliveryMode(data.deliveryMode || "");
      setOtp("");
      setInfo("OTP resent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotStage("request");
    setOtpStage(false);
    setOtp("");
    setOtpExpiresAt(null);
    setResetForm((prev) => ({ ...prev, email: form.email || prev.email }));
    setError("");
    setInfo("");
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!resetForm.email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword({ email: resetForm.email });
      setResetExpiresAt(data?.expiresAt || null);
      setForgotStage("verify");
      setInfo("If your account exists, a reset code is sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await resendOtp({
        email: resetForm.email,
        purpose: "password_reset",
        channel: "email",
      });
      setResetExpiresAt(data.expiresAt);
      setResetForm((prev) => ({ ...prev, otp: "" }));
      setInfo("Reset code resent successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!resetForm.email || !/^\d{6}$/.test(resetForm.otp) || !resetForm.newPassword) {
      setError("Email, valid 6-digit code and new password are required");
      return;
    }
    if (resetForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email: resetForm.email,
        otp: resetForm.otp,
        newPassword: resetForm.newPassword,
      });
      setForgotStage("none");
      setSignInMode("password");
      setForm((prev) => ({ ...prev, email: resetForm.email, password: "" }));
      setResetForm({ email: resetForm.email, otp: "", newPassword: "" });
      setResetExpiresAt(null);
      setInfo("Password reset successful. Please sign in.");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
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
      setInfo("");
      await loginWithGoogle(token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate, redirectTo]);

  useEffect(() => {
    if (!googleClientId || otpStage || forgotStage !== "none") return undefined;

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
  }, [googleClientId, handleGoogleSuccess, otpStage, forgotStage]);

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

  useEffect(() => {
    if (!resetExpiresAt) {
      setResetSeconds(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(resetExpiresAt).getTime() - Date.now()) / 1000));
      setResetSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [resetExpiresAt]);

  return (
    <section className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">Sign in to continue your CinemaSync booking flow</p>
      </div>

      {forgotStage === "none" && !otpStage ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-1 text-xs">
            <button
              type="button"
              className={`rounded-md px-2 py-2 transition ${signInMode === "password" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
              onClick={() => activateSignInMode("password")}
            >
              Password
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-2 transition ${signInMode === "otp" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
              onClick={() => activateSignInMode("otp")}
            >
              Sign in via OTP
            </button>
          </div>

          <form className="space-y-4" onSubmit={signInMode === "password" ? handlePasswordSignIn : handleOtpSignInRequest}>
            <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
            {signInMode === "password" ? (
              <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Enter password" />
            ) : null}

            <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Receive OTP via</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  className={`rounded-md px-2 py-2 transition ${channel === "email" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
                  onClick={() => setChannel("email")}
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2 py-2 transition ${channel === "phone" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:bg-slate-800"}`}
                  onClick={() => setChannel("phone")}
                >
                  Phone OTP
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              {signInMode === "password" ? "Sign In" : "Send OTP"}
            </Button>
          </form>

          <button
            type="button"
            className="text-sm text-cyan-300 hover:text-cyan-200"
            onClick={openForgotPassword}
          >
            Forgot password?
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="h-px flex-1 bg-slate-700" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-700" />
          </div>

          {googleClientId ? (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-200">
                <GoogleGlyph />
                <span>Continue with Google</span>
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
      ) : null}

      {otpStage ? (
        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <p className="text-sm text-slate-300">
            Enter OTP sent to {otpChannel === "phone" ? "your registered phone number" : form.email}
          </p>
          {deliveryMode && !["smtp", "twilio", "fast2sms"].includes(deliveryMode) ? (
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
              Verify OTP
            </Button>
            <Button type="button" variant="secondary" loading={loading} onClick={handleResendOtp}>
              Resend
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOtpStage(false);
              setOtp("");
              setOtpExpiresAt(null);
              setInfo("");
              setError("");
            }}
          >
            Back to sign in
          </Button>
        </form>
      ) : null}

      {forgotStage === "request" ? (
        <form className="space-y-4" onSubmit={handleForgotPassword}>
          <p className="text-sm text-slate-300">Enter your email to receive a password reset code</p>
          <Input
            label="Email"
            type="email"
            value={resetForm.email}
            onChange={handleResetChange("email")}
            placeholder="you@example.com"
          />
          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="w-full">
              Send reset code
            </Button>
            <Button type="button" variant="secondary" onClick={() => setForgotStage("none")} className="w-full">
              Back
            </Button>
          </div>
        </form>
      ) : null}

      {forgotStage === "verify" ? (
        <form className="space-y-4" onSubmit={handleResetPassword}>
          <p className="text-sm text-slate-300">Enter the code sent to {resetForm.email}</p>
          <Input
            label="Reset code"
            value={resetForm.otp}
            onChange={handleResetChange("otp")}
            placeholder="123456"
            maxLength={6}
          />
          <Input
            label="New password"
            type="password"
            value={resetForm.newPassword}
            onChange={handleResetChange("newPassword")}
            placeholder="Minimum 6 characters"
          />
          <p className="text-xs text-slate-400">
            Code expires in: {Math.floor(resetSeconds / 60)}:{String(resetSeconds % 60).padStart(2, "0")}
          </p>
          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="w-full">
              Reset password
            </Button>
            <Button type="button" variant="secondary" loading={loading} onClick={handleResendResetOtp}>
              Resend
            </Button>
          </div>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotStage("none")}>
            Back to sign in
          </Button>
        </form>
      ) : null}

      {error ? <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}
      {info ? <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{info}</p> : null}

      <p className="mt-4 text-sm text-slate-400">
        New here? <Link to="/register" className="text-cyan-300 hover:text-cyan-200">Create account</Link>
      </p>
    </section>
  );
};

export default LoginPage;
