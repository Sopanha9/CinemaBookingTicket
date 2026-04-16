import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../features/auth/api";
import { useAuthStore } from "../features/auth/authStore";
import { registerSchema } from "../features/auth/schemas";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
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
        toastConflict(
          "An account with this email already exists",
          err?.requestId,
        );
        return;
      }

      toastError(err?.message || "Registration failed", err?.requestId);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-100 px-4 py-10">
      <Card variant="elevated" size="lg" className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
            Cinema Booking
          </p>
          <CardTitle className="text-2xl text-primary">
            Create Account
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="text-sm font-medium text-base-content/80"
              >
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
                autoComplete="new-password"
                placeholder="At least 8 chars, uppercase + number"
                variant={errors.password ? "error" : "default"}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-error">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-base-content/80"
              >
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-base-content/70">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-secondary hover:text-secondary/80"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
