"use client";

import { useEffect, useState } from "react";

type AdGateProps = {
  postSlug: string;
  adLink?: string | null;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
  children: React.ReactNode;
};

function getUnlockKey(postSlug: string) {
  return `hb141_content_unlocked_${postSlug}`;
}

export default function AdGate({
  postSlug,
  adLink,
  adTitle,
  adDesc,
  adImage,
  children,
}: AdGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem(getUnlockKey(postSlug)) === "1";
    setUnlocked(isUnlocked);
    setReady(true);
  }, [postSlug]);

  const openAd = () => {
    if (!adLink) return;

    sessionStorage.setItem(getUnlockKey(postSlug), "1");
    setUnlocked(true);

    window.location.href = adLink;
  };

  if (!ready) return null;

  if (!adLink || unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-10 blur-[1px]">
        {children}
      </div>

      <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/95 px-4 py-8">
        <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-4xl font-extrabold text-red-600">
            {adTitle?.trim() || "NỘI DUNG ĐÃ BỊ ẨN"}
          </h2>

          <p className="mt-6 text-lg font-semibold leading-8 text-gray-900">
            {adDesc?.trim() ||
              "Bạn cần click vào liên kết quảng cáo màu xanh bên dưới👇 để xem nội dung bài viết này."}
          </p>

          <button
            type="button"
            onClick={openAd}
            className="mt-7 text-2xl font-extrabold text-sky-700 hover:text-red-600"
          >
            Click Để Xem 👉 MỞ ỨNG DỤNG SHOPEE
          </button>

          {adImage ? (
            <button
              type="button"
              onClick={openAd}
              className="mt-7 block w-full overflow-hidden rounded-xl"
            >
              <img
                src={adImage}
                alt={adTitle?.trim() || "Quảng cáo"}
                className="w-full object-cover"
              />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}