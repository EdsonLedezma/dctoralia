"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { z } from "zod";
const schema = z.object({
  unreadOnly: z.boolean(),
  showDetails: z.boolean(),
  pageSize: z.union([z.literal(8), z.literal(15), z.literal(25)]),
});
const defaults = { unreadOnly: false, showDetails: true, pageSize: 8 } as const;
const serializedDefaults = JSON.stringify(defaults);
export function useInboxPreferences() {
  const { data } = useSession();
  const key = "dopilot-inbox-preferences:" + (data?.user.id ?? "anonymous");
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener("dopilot-inbox-preferences", notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener("dopilot-inbox-preferences", notify);
    };
  }, []);
  const snapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key) ?? serializedDefaults;
    } catch {
      return serializedDefaults;
    }
  }, [key]);
  const raw = useSyncExternalStore(
    subscribe,
    snapshot,
    () => serializedDefaults,
  );
  let preferences: z.infer<typeof schema> = defaults;
  try {
    const parsed = schema.safeParse(JSON.parse(raw) as unknown);
    if (parsed.success) preferences = parsed.data;
  } catch {
    /* Invalid device preferences fall back safely. */
  }
  const save = (patch: Partial<z.infer<typeof schema>>) => {
    window.localStorage.setItem(
      key,
      JSON.stringify(schema.parse({ ...preferences, ...patch })),
    );
    window.dispatchEvent(new Event("dopilot-inbox-preferences"));
  };
  return { preferences, save };
}
