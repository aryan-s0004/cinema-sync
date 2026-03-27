import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyLoginOtp, resendOtp } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [otpHint, setOtpHint] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const loginResult = await login(form);
      if (loginResult?.otpRequired) {
        setOtpStage(true);
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
      await verifyLoginOtp({ email: form.email, otp });
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
      const data = await resendOtp({ email: form.email, purpose: "login" });
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
    <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Welcome back</h1>

      {!otpStage ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Enter password" />

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <Button type="submit" loading={loading} className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <p className="text-sm text-slate-300">Enter the OTP sent to {form.email}</p>
          {deliveryMode && deliveryMode !== "smtp" ? (
            <p className="text-xs text-amber-300">Email delivery mode: {deliveryMode}. Configure SMTP for real inbox delivery.</p>
          ) : null}
          <Input
            label="6-digit OTP"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            maxLength={6}
          />
          <p className="text-xs text-slate-400">OTP expires in: {Math.floor(otpSeconds / 60)}:{String(otpSeconds % 60).padStart(2, "0")}</p>
          {otpHint ? <p className="text-xs text-cyan-300">{otpHint}</p> : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

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

      <p className="text-sm text-slate-400">
        New here? <Link to="/register" className="text-cyan-300 hover:text-cyan-200">Create account</Link>
      </p>
    </section>
  );
};

export default LoginPage;
