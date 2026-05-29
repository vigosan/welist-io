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
        className="w-6 h-6 rounded-full shrink-0"
      />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
      <span className="text-[8px] text-gray-500 font-medium">
        {initials(name)}
      </span>
    </div>
  );
}
