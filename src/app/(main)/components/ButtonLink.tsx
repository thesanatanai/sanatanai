import Icon from "./Lordicon";

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  /** Opens in a new tab and appends the screen-reader hint. */
  external?: boolean;
  externalLabel?: string;
  variant?: "primary" | "ghost";
  icon?: string;
  className?: string;
}

/** Pill button with a slowly turning ring in the mandala's colours and a Lordicon arrow that leans forward on hover. */
export default function ButtonLink({
  href,
  children,
  external = false,
  externalLabel = "",
  variant = "primary",
  icon = "arrow",
  className = "",
}: Readonly<ButtonLinkProps>) {
  const primary = variant === "primary";
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`btn group relative inline-flex ${className}`}
    >
      <span className="btn-ring" aria-hidden="true" />
      <span
        className={`btn-face relative z-10 inline-flex items-center gap-3 rounded-full py-3.5 pl-7 pr-6 text-base font-medium md:text-lg ${
          primary ? "bg-ember text-night" : "bg-dusk text-ivory"
        }`}
      >
        <span>{children}</span>
        <span className="btn-arrow inline-flex">
          <Icon
            src={icon}
            size={26}
            target="parent*4"
            colors={primary ? "primary:#0d0b1e,secondary:#0d0b1e" : undefined}
          />
        </span>
      </span>
      {external && externalLabel ? <span className="sr-only">{externalLabel}</span> : null}
    </a>
  );
}
