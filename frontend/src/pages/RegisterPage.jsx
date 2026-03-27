import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, verifyAccountOtp, resendOtp } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [otpHint, setOtpHint] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
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
      setOtpHint(data?.emailVerification?.otpPreview ? `Dev OTP: ${data.emailVerification.otpPreview}` : "");
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
      setOtpHint(data.otpPreview ? `Dev OTP: ${data.otpPreview}` : "");
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
      const remaining = Math.max(0, Math.floor((new Date(otpExpiresAt).getTime() - Date.now()) / 1000));
      setOtpSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  return (
    <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Create your CinemaSync account</h1>

      {!otpStage ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Name" value={form.name} onChange={handleChange("name")} placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Minimum 6 characters" />

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <Button type="submit" loading={loading} className="w-full">
            Register
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleVerifyOtp}>
          <p className="text-sm text-slate-300">Enter OTP sent to {form.email}</p>
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
              Verify Email
            </Button>
            <Button type="button" variant="secondary" loading={loading} onClick={handleResendOtp}>
              Resend OTP
            </Button>
          </div>
        </form>
      )}

      <p className="text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-cyan-300 hover:text-cyan-200">Login</Link>
      </p>
    </section>
  );
};

export default RegisterPage;
