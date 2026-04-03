"use client";

import { useState } from "react";

type SensitiveMediaProps = {
  sensitive?: boolean;
  label?: string;
  className?: string;
  children: React.ReactNode;
};

export default function SensitiveMedia({
  sensitive = false,
  label = "Nội dung nhạy cảm, cân nhắc trước khi xem.",
  className = "",
  children,
}: SensitiveMediaProps) {
  const [revealed, setRevealed] = useState(false);

  if (!sensitive || revealed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div className="pointer-events-none select-none blur-2xl opacity-40">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
        <div className="max-w-xs rounded-2xl bg-black px-5 py-4 text-center text-white shadow-xl">
          <p className="text-lg font-extrabold leading-7">{label}</p>

          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-4 rounded-xl bg-white px-4 py-2 font-bold text-black transition hover:opacity-90"
          >
            Bấm để xem
          </button>
        </div>
      </div>
    </div>
  );
}