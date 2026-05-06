"use client";
import { useEffect } from "react";
import { createClient } from "../lib/supabase";
import { useAuthStore } from "../stores/auth.store";
import api from "../lib/api";
import { Profile } from "../types/user.types";

export const useAuth = () => {
  const { profile, isLoading, setProfile, setLoading, clear } = useAuthStore();
  const supabase = createClient();

  const fetchProfile = async () => {
    try {
      const res = await api.get<{ data: Profile }>("/users/me");
      setProfile(res.data.data);
    } catch {
      // Profile doesn't exist yet — user needs onboarding
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile();
      } else {
        clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
  };

  return { profile, isLoading, signOut, supabase };
};
