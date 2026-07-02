"use client";

/**
 * Haptic feedback policy:
 * - nudge: destructive action confirmed / submit confirmed (still in user gesture)
 * - success: after API OK in try (best-effort post-await on mobile)
 * - error: only in catch
 * - light: cancel / dismiss without success
 */
import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useWebHaptics } from "web-haptics/react";
import type { HapticPattern, HapticPreset } from "web-haptics";

type HapticInput = number | string | HapticPattern | HapticPreset;
type TriggerOptions = { intensity?: number };

interface HapticsContextType {
  trigger: (input?: HapticInput, options?: TriggerOptions) => Promise<void> | undefined;
  cancel: () => void | undefined;
  isSupported: boolean;
  triggerSuccess: () => Promise<void> | undefined;
  triggerError: () => Promise<void> | undefined;
  triggerNudge: () => Promise<void> | undefined;
  triggerSelection: () => Promise<void> | undefined;
  triggerLight: () => Promise<void> | undefined;
}

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export function HapticsProvider({ children }: { children: ReactNode }) {
  const { trigger, cancel, isSupported } = useWebHaptics();

  const value = useMemo<HapticsContextType>(
    () => ({
      trigger,
      cancel,
      isSupported,
      triggerSuccess: () => trigger("success"),
      triggerError: () => trigger("error"),
      triggerNudge: () => trigger("nudge"),
      triggerSelection: () => trigger("selection"),
      triggerLight: () => trigger("light"),
    }),
    [trigger, cancel, isSupported]
  );

  return (
    <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>
  );
}

export function useHaptics(): HapticsContextType {
  const context = useContext(HapticsContext);
  if (context === undefined) {
    throw new Error("useHaptics must be used within a HapticsProvider");
  }
  return context;
}
