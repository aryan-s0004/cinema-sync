import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
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
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Welcome back</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
        <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Enter password" />

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="submit" loading={loading} className="w-full">
          Login
        </Button>
      </form>

      <p className="text-sm text-slate-400">
        New here? <Link to="/register" className="text-cyan-300 hover:text-cyan-200">Create account</Link>
      </p>
    </section>
  );
};

export default LoginPage;
