"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "../../lib/supabase";
import { ROUTES } from "../../constants/routes";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(ROUTES.DASHBOARD);
      }
    });
  }, []);

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <Image
            src='/tp-logo-gold-white.png'
            alt='TruePoint TCG'
            height={40}
            width={180}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
