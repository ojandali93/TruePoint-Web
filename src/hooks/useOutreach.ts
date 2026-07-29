"use client";

/**
 * useOutreach — admin-only influencer outreach CRM hooks (web).
 *
 * Mirrors useRegradeTracker.ts's pattern: useState + useEffect, no
 * react-query. Uses the bare-return + derive-at-return-statement shape
 * (see useGradeLadder there for the original fix) rather than calling
 * setState synchronously inside an effect — that pattern is what triggered
 * a real build-blocking lint error earlier in this project, so it's not
 * repeated here even though some older pages in this codebase still
 * silence the same rule with an eslint-disable comment instead of avoiding
 * the underlying issue.
 */

import { useCallback, useEffect, useState } from "react";

import api from "../lib/api";

// ─── Types — mirror server/src/services/outreach.service.ts ────────────────

export const OUTREACH_STAGES = [
  "prospecting",
  "engaging",
  "messaging",
  "negotiating",
  "partnered",
  "declined",
  "cold",
] as const;
export type OutreachStage = (typeof OUTREACH_STAGES)[number];

export const OUTREACH_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "facebook",
  "twitch",
  "other",
] as const;
export type OutreachPlatform = (typeof OUTREACH_PLATFORMS)[number];

export const INTERACTION_TYPES = [
  "comment",
  "like",
  "dm",
  "reply",
  "email",
  "call",
  "meeting",
  "other",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export interface OutreachContact {
  id: string;
  name: string;
  handle: string | null;
  primary_platform: OutreachPlatform | null;
  socials: Record<string, string>;
  follower_count: number | null;
  niche: string | null;
  stage: OutreachStage;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  affiliate_id: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  interactionCount: number;
  isDueForFollowUp: boolean;
  isStale: boolean;
  affiliateSignupCount: number | null;
}

export interface OutreachInteraction {
  id: string;
  contact_id: string;
  type: InteractionType;
  notes: string | null;
  occurred_at: string;
  created_at: string;
}

export interface OutreachContactInput {
  name: string;
  handle?: string | null;
  primaryPlatform?: OutreachPlatform | null;
  socials?: Record<string, string> | null;
  followerCount?: number | null;
  niche?: string | null;
  stage?: OutreachStage;
  nextFollowUpAt?: string | null;
  notes?: string | null;
}

export interface ConvertToAffiliateInput {
  name: string;
  slug?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  collector_rate?: number | null;
  pro_rate?: number | null;
}

export interface ConvertToAffiliateResult {
  affiliateId: string;
  invite: {
    emailed: boolean;
    emailError?: string;
    claimUrl: string;
    tokenError?: string;
  };
}

// ─── List ───────────────────────────────────────────────────────────────────

export function useOutreachContacts() {
  const [data, setData] = useState<OutreachContact[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data: OutreachContact[] }>("/admin/outreach/contacts")
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useOutreachContacts] error:", err);
          setError(err.message ?? "Failed to load contacts");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  return { data, loading, error, refetch };
}

// ─── Single contact + interaction history ──────────────────────────────────

export function useOutreachContact(id: string | null) {
  const [data, setData] = useState<{
    contact: OutreachContact;
    interactions: OutreachInteraction[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  useEffect(() => {
    if (!id) return; // exposed `data` below derives to null when id is null

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{
        data: { contact: OutreachContact; interactions: OutreachInteraction[] };
      }>(`/admin/outreach/contacts/${id}`)
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useOutreachContact] error:", err);
          setError(err.message ?? "Failed to load contact");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, refetchTick]);

  return {
    data: id ? data : null,
    loading: id ? loading : false,
    error: id ? error : null,
    refetch,
  };
}

// ─── Mutations — plain async functions, same convention as regrade tracker ─

export async function createOutreachContact(
  input: OutreachContactInput,
): Promise<OutreachContact> {
  const res = await api.post<{ data: OutreachContact }>(
    "/admin/outreach/contacts",
    input,
  );
  return res.data.data;
}

export async function updateOutreachContact(
  id: string,
  patch: Partial<OutreachContactInput> & { archived?: boolean },
): Promise<void> {
  await api.patch(`/admin/outreach/contacts/${id}`, patch);
}

export async function deleteOutreachContact(id: string): Promise<void> {
  await api.delete(`/admin/outreach/contacts/${id}`);
}

export async function logOutreachInteraction(
  contactId: string,
  type: InteractionType,
  notes?: string | null,
  occurredAt?: string | null,
): Promise<OutreachInteraction> {
  const res = await api.post<{ data: OutreachInteraction }>(
    `/admin/outreach/contacts/${contactId}/interactions`,
    { type, notes, occurredAt },
  );
  return res.data.data;
}

export async function deleteOutreachInteraction(id: string): Promise<void> {
  await api.delete(`/admin/outreach/interactions/${id}`);
}

export async function convertOutreachToAffiliate(
  contactId: string,
  input: ConvertToAffiliateInput,
): Promise<ConvertToAffiliateResult> {
  const res = await api.post<{ data: ConvertToAffiliateResult }>(
    `/admin/outreach/contacts/${contactId}/convert`,
    input,
  );
  return res.data.data;
}
