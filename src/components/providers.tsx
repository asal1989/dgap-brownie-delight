"use client";

import { createContext, useContext, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import type { PublicConfig } from "@/lib/config";

const ConfigContext = createContext<PublicConfig>({
  brandName: "DGAP Brownie Delight",
  whatsappDigits: "",
  deliveryFee: 0,
  freeDeliveryThreshold: 0,
  minimumOrder: 0,
});

export function useSiteConfig(): PublicConfig {
  return useContext(ConfigContext);
}

export function Providers({ config, children }: { config: PublicConfig; children: ReactNode }) {
  return (
    <ConfigContext.Provider value={config}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ConfigContext.Provider>
  );
}
