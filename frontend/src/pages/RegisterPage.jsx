import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../features/auth/api";
import { useAuthStore } from "../features/auth/authStore";
import { registerSchema } from "../features/auth/schemas";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  toastConflict,
  toastError,
  toastSuccess,
  toastValidation,
} from "../lib/toast";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      const data = await registerApi(values);
      setAuth(data.user, data.accessToken);
      toastSuccess("Account created!");
      navigate("/showtimes", { replace: true });
    } catch (err) {
      if (err?.status === 400 && Array.isArray(err?.details)) {
        toastValidation(err.details);
        return;
      }
      if (err?.status === 409) {
        toastConflict("An account with this email already exists", err?.requestId);
        return;
      }
      toastError(err?.message || "Registration failed", err?.requestId);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080809] px-4 py-10">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />

      {/* Film strip decorations */}
      <div className="pointer-events-none absolute left-0 top-0 hidden h-full w-8 flex-col gap-4 opacity-10 lg:flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="mx-auto h-6 w-5 rounded-sm border border-white/30 bg-white/5" />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-8 flex-col gap-4 opacity-10 lg:flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="mx-auto h-6 w-5 rounded-sm border border-white/30 bg-white/5" />
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-2xl">
            ◎
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary/80">
            Cinema Noir
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-white/40">Join the experience</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#111114] p-8 shadow-2xl">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-widest text-secondary/70">
                Name
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                variant={errors.name ? "error" : "default"}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-error">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-secondary/70">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                variant={errors.email ? "error" : "default"}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-error">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-secondary/70">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min 8 chars, uppercase + number"
                variant={errors.password ? "error" : "default"}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-error">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-widest text-secondary/70">
                Phone
              </label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Digits only"
                variant={errors.phone ? "error" : "default"}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-error">{errors.phone.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full !bg-primary hover:!bg-primary/90 !text-white !font-bold !uppercase !tracking-widest !text-sm !py-3" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-xs text-white/30">OR</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <p className="text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-secondary hover:text-secondary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
