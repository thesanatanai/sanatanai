"use client";
export default function FooterClient({ rights }: Readonly<{ rights: string }>) {
  return (
    <p className="mx-auto mt-10 max-w-6xl text-sm text-ivory/55">
      {rights.replace("{year}", String(new Date().getFullYear()))}
    </p>
  );
}
