interface IubLogoProps {
  className?: string;
}

export default function IubLogo({ className = "h-8 w-auto" }: IubLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/iub-logo.svg"
      alt="Independent University Bangladesh"
      className={className}
      loading="lazy"
    />
  );
}
