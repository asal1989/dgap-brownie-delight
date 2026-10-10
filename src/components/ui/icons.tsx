import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M16.8 7.2h.01" />
  </svg>
);

export const FacebookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 21v-8h3l.5-3.5H14V7.4c0-1 .4-1.7 1.8-1.7H17.6V2.6C17.3 2.5 16.3 2.4 15.2 2.4 12.8 2.4 10.5 3.9 10.5 6.8V9.5H7.5V13h3v8z" />
  </svg>
);

export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19z" />
    <path d="M9 9.2c.2 2.2 2.6 4.6 4.8 4.8.7 0 1.4-.6 1.4-1.2l-1.6-.9-.8.6c-.9-.4-1.7-1.2-2.1-2.1l.6-.8-.9-1.6c-.6 0-1.4.7-1.4 1.2z" />
  </svg>
);
