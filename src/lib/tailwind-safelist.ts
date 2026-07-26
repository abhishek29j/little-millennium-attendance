// This file exists so Tailwind's content scanner picks up dynamically
// composed class names used across the app (e.g. `bg-${tone}/30`).
// Do not import at runtime.
export const SAFELIST = `
bg-sky bg-sky/15 bg-sky/20 bg-sky/25 bg-sky/30 bg-sky/40 bg-sky/60 text-sky-foreground ring-sky
bg-sun bg-sun/15 bg-sun/20 bg-sun/25 bg-sun/30 bg-sun/40 bg-sun/60 text-sun-foreground ring-sun
bg-leaf bg-leaf/15 bg-leaf/20 bg-leaf/25 bg-leaf/30 bg-leaf/40 bg-leaf/60 text-leaf-foreground ring-leaf
bg-tangerine bg-tangerine/15 bg-tangerine/20 bg-tangerine/25 bg-tangerine/30 bg-tangerine/40 bg-tangerine/60 text-tangerine-foreground ring-tangerine
bg-berry bg-berry/15 bg-berry/20 bg-berry/25 bg-berry/30 bg-berry/40 bg-berry/60 text-berry-foreground ring-berry
`;
