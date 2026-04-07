import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../features/auth/api";
import { useAuthStore } from "../features/auth/authStore";
import { loginSchema } from "../features/auth/schemas";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  toastAuth,
  toastError,
  toastSuccess,
  toastValidation,
} from "../lib/toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      const data = await login(values);
      setAuth(data.user, data.accessToken);
      toastSuccess("Welcome back!");
      navigate("/showtimes", { replace: true });
    } catch (err) {
      if (err?.status === 401) {
        toastAuth("Invalid email or password");
        return;
      }

      if (err?.status === 400 && Array.isArray(err?.details)) {
        toastValidation(err.details);
        return;
      }

      toastError(err?.message || "Login failed", err?.requestId);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-100 px-4 py-10">
      <Card variant="elevated" size="lg" className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
            Cinema Booking
          </p>
          <CardTitle className="text-2xl text-primary">Welcome Back</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-base-content/80"
              >
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

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-base-content/80"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                variant={errors.password ? "error" : "default"}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-error">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-base-content/70">
            New here?{" "}
            <Link
              to="/register"
              className="font-semibold text-secondary hover:text-secondary/80"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
