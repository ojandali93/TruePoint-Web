import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, style, ...props }, ref) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
          borderRadius: 6,
          padding: "10px 14px",
          fontSize: 14,
          color: "var(--text-primary)",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.2s ease",
          width: "100%",
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? "var(--red)" : "var(--gold-dim)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? "var(--red)" : "var(--border)";
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: "var(--red)" }}>{error}</span>}
      {hint && !error && (
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{hint}</span>
      )}
    </div>
  ),
);

Input.displayName = "Input";

