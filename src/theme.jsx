export const T = {
  bg: "#F5F3FB", card: "#FFFFFF", sunken: "#EDEAF7", line: "#E8E4F3",
  text: "#17142A", mute: "#605C7A", faint: "#9793B0",
  rose: "#E01B7A", blue: "#0A84D6", gold: "#B07800", violet: "#7332E0", grey: "#7B7799",
  roseBg: "#FEE8F3", blueBg: "#E2F1FD", goldBg: "#FCF1D8", violetBg: "#EFE6FE", greyBg: "#EDEAF7",
};

export const DISPLAY = "'Chakra Petch', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const EASE = "cubic-bezier(.2,.8,.2,1)";

export const halo = c =>
  `0 0 0 1px ${c}55, 0 0 16px -2px ${c}88, 0 0 34px -8px ${c}66, 0 10px 26px -14px ${c}`;

export const Logo = ({ size = 42 }) => (
  <svg width={size} height={size * 0.72} viewBox="0 0 64 46" aria-label="To-cloud">
    <defs>
      <linearGradient id="thcl" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#0A84D6" />
        <stop offset="34%" stopColor="#7332E0" />
        <stop offset="68%" stopColor="#E01B7A" />
        <stop offset="100%" stopColor="#F2B705" />
      </linearGradient>
      <linearGradient id="thcl2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path fill="url(#thcl)" d="M50.5 44H16C7.7 44 1 37.3 1 29S7.7 14 16 14c1.2 0 2.4.1 3.5.4C22.6 6.6 30.2 1.5 38.6 2.1c9.6.6 17.4 8.2 18.3 17.8C61.4 21.6 64 25.6 64 30.2 64 37.8 58 44 50.5 44z" />
    <path fill="url(#thcl2)" opacity="0.5" d="M50.5 44H16C7.7 44 1 37.3 1 29c0-4.9 2.3-9.2 5.9-11.9C5.3 24.9 10.8 32 18.6 32h32.9c4 0 7.5-2.2 9.4-5.4C63.4 34.3 57.8 44 50.5 44z" />
  </svg>
);

/* light travelling around a border */
export const GlowFrame = ({ c, children, className = "", radius = 24, pad = 2, speed = 5, style }) => (
  <div className={`relative ${className}`}
       style={{ borderRadius: radius, boxShadow: halo(c), ...style }}>
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius }} aria-hidden="true">
      <div className="tc-anim absolute"
           style={{ inset: "-75%",
                    background: `conic-gradient(from 0deg, ${c}00 0deg, ${c}00 200deg, ${c} 268deg, #FFFFFF 300deg, ${c} 332deg, ${c}00 360deg)`,
                    animation: `tcspin ${speed}s linear infinite` }} />
    </div>
    <div className="absolute" style={{ inset: pad, borderRadius: radius - pad, background: T.card }} />
    <div className="relative">{children}</div>
  </div>
);
