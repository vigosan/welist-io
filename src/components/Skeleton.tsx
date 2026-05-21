import { forwardRef, type HTMLAttributes } from "react";

type Variant = "block" | "text" | "circle";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
};

const base = "animate-pulse bg-black/[0.04] dark:bg-white/[0.06]";

const variantClass: Record<Variant, string> = {
  block: "rounded-2xl",
  text: "rounded-md",
  circle: "rounded-full",
};

export const Skeleton = forwardRef<HTMLDivElement, Props>(function Skeleton(
  { className = "", variant = "block", ...rest },
  ref
) {
  const testId =
    (rest as { "data-testid"?: string })["data-testid"] ?? "skeleton";
  return (
    <div
      ref={ref}
      data-testid={testId}
      aria-hidden="true"
      className={`${base} ${variantClass[variant]} ${className}`}
      {...rest}
    />
  );
});
