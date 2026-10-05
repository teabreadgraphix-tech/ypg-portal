import Image from "next/image";

export function Avatar({ name, photoUrl, size = 64 }: { name: string; photoUrl: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-forest-800 font-medium text-paper"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials || "?"}
    </div>
  );
}
