"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The /grading/submissions route is deprecated. The submissions UI now
// lives inside the /grading page as a tab. Redirect users who land here
// (bookmarks, old links, etc.) to the new location.

export default function GradingSubmissionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/grading");
  }, [router]);
  return null;
}
