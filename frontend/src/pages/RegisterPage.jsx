import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Create your CinemaSync account</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Name" value={form.name} onChange={handleChange("name")} placeholder="Your name" />
        <Input label="Email" type="email" value={form.email} onChange={handleChange("email")} placeholder="you@example.com" />
        <Input label="Password" type="password" value={form.password} onChange={handleChange("password")} placeholder="Minimum 6 characters" />

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="submit" loading={loading} className="w-full">
          Register
        </Button>
      </form>

      <p className="text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-cyan-300 hover:text-cyan-200">Login</Link>
      </p>
    </section>
  );
};

export default RegisterPage;
