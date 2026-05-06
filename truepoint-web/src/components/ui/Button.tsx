import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--gold)",
    color: "#0D0E11",
    border: "none",
    fontWeight: 500,
  },
  secondary: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "none",
  },
  danger: {
    background: "transparent",
    color: "var(--red)",
    border: "1px solid var(--red)",
  },
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 12, padding: "6px 14px", borderRadius: 5 },
  md: { fontSize: 13, padding: "10px 20px", borderRadius: 6 },
  lg: { fontSize: 15, padding: "14px 32px", borderRadius: 6 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      children,
      style,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.2s ease, opacity 0.2s ease",
        fontFamily: "inherit",
        width: fullWidth ? "100%" : undefined,
        letterSpacing: "0.02em",
        ...styles[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </button>
  ),
);

Button.displayName = "Button";

