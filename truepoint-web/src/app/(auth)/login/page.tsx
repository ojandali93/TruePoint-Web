"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "../../../lib/supabase";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ROUTES } from "../../../constants/routes";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setServerError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : error.message,
        );
        return;
      }

      router.push(ROUTES.DASHBOARD);
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail || getValues("email");
    if (!email) {
      setServerError("Enter your email address first.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSent(true);
  };

  return (
    <div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "32px",
        }}
      >
        {!showForgot ? (
          <>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 6,
                letterSpacing: "0.02em",
              }}
            >
              Welcome back
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 28,
              }}
            >
              Sign in to your TruePoint account.
            </p>

            {serverError && (
              <div
                style={{
                  background: "rgba(201,76,76,0.1)",
                  border: "1px solid rgba(201,76,76,0.3)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--red)",
                  marginBottom: 20,
                }}
              >
                {serverError}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <Input
                label='Email address'
                type='email'
                placeholder='you@example.com'
                error={errors.email?.message}
                autoComplete='email'
                {...register("email")}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Input
                  label='Password'
                  type='password'
                  placeholder='Your password'
                  error={errors.password?.message}
                  autoComplete='current-password'
                  {...register("password")}
                />
                <button
                  type='button'
                  onClick={() => setShowForgot(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    fontSize: 11,
                    cursor: "pointer",
                    textAlign: "right",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type='submit'
                variant='primary'
                size='lg'
                loading={isSubmitting}
                fullWidth
                style={{ marginTop: 4 }}
              >
                Sign in
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* Forgot password view */}
            <button
              onClick={() => {
                setShowForgot(false);
                setForgotSent(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                marginBottom: 20,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Back to sign in
            </button>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Reset password
            </h1>

            {forgotSent ? (
              <div
                style={{
                  background: "rgba(61,170,110,0.1)",
                  border: "1px solid rgba(61,170,110,0.3)",
                  borderRadius: 8,
                  padding: "16px",
                  marginTop: 20,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--green)",
                    lineHeight: 1.6,
                  }}
                >
                  Check your email — we sent a password reset link to{" "}
                  <strong>{forgotEmail}</strong>.
                </p>
              </div>
            ) : (
              <>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    marginBottom: 24,
                    lineHeight: 1.6,
                  }}
                >
                  Enter your email and we'll send you a reset link.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <Input
                    label='Email address'
                    type='email'
                    placeholder='you@example.com'
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <Button
                    type='button'
                    onClick={handleForgotPassword}
                    variant='primary'
                    size='lg'
                    fullWidth
                  >
                    Send reset link
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Switch to register */}
      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        Don't have an account?{" "}
        <Link
          href={ROUTES.REGISTER}
          style={{
            color: "var(--gold)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Get started free
        </Link>
      </p>
    </div>
  );
}
