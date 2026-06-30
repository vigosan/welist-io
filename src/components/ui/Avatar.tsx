import { initials } from "@/lib/private-name";

export function Avatar({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        className="w-6 h-6 rounded-full shrink-0 outline outline-1 -outline-offset-1 outline-black/[0.06] dark:outline-white/[0.06]"
      />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-black/[0.06] dark:bg-white/[0.06] shrink-0 flex items-center justify-center">
      <span className="text-[8px] text-muted font-medium">
        {initials(name)}
      </span>
    </div>
  );
}
