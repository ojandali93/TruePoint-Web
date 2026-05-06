export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--charcoal)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#0D0E11",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "DM Mono, monospace",
              }}
            >
              TP
            </span>
          </div>
          <span
            className='font-display'
            style={{ fontSize: 22, letterSpacing: "0.08em" }}
          >
            TRUEPOINT
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.12em",
              fontFamily: "DM Mono, monospace",
            }}
          >
            TCG
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
