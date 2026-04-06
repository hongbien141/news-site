"use client";

import { useEffect, useState } from "react";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
};

const MAX_DAILY_AD_CLICKS = 5;
const STORAGE_KEY = "hb141_ad_popup_global_daily_limit";

type AdState = {
  date: string;
  clicks: number;
};

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readAdState(): AdState {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), clicks: 0 };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayKey();

    if (!raw) {
      return { date: today, clicks: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<AdState>;

    if (parsed.date !== today) {
      return { date: today, clicks: 0 };
    }

    return {
      date: today,
      clicks: Number(parsed.clicks || 0),
    };
  } catch {
    return { date: getTodayKey(), clicks: 0 };
  }
}

function writeAdState(state: AdState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function AdPopup({
  adLink,
  adTitle,
  adDesc,
  adImage,
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    if (!adLink?.trim()) {
      setIsOpen(false);
      return;
    }

    const state = readAdState();

    // Nếu trong ngày đã click quảng cáo đủ 5 lần thì không hiện popup nữa
    if (state.clicks >= MAX_DAILY_AD_CLICKS) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [adLink]);

  const handleOpenAd = () => {
    const current = readAdState();
    const nextClicks = current.clicks + 1;

    writeAdState({
      date: getTodayKey(),
      clicks: nextClicks,
    });

    setIsOpen(false);

    // Mở trên tab hiện tại để người xem có thể back lại bài viết
    window.location.href = adLink;
  };

  if (!hydrated || !isOpen || !adLink?.trim()) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={handleOpenAd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleOpenAd();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-6 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            Quảng cáo
          </p>

          <h3 className="mt-3 text-3xl font-extrabold leading-tight text-red-600">
            {adTitle?.trim() || "NỘI DUNG ĐÃ BỊ ẨN"}
          </h3>

          <p className="mt-6 text-lg font-semibold leading-8 text-gray-800">
            {adDesc?.trim() ||
              "Bạn cần click vào nội dung quảng cáo bên dưới để tiếp tục xem bài viết này."}
          </p>

          <p className="mt-6 text-3xl font-extrabold text-sky-700">
            Click để xem 👉 MỞ QUẢNG CÁO
          </p>

          {adImage ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
              <img
                src={adImage}
                alt={adTitle?.trim() || "Quảng cáo"}
                className="w-full object-cover"
              />
            </div>
          ) : null}

          <p className="mt-5 text-sm font-medium text-gray-500">
            Chạm vào popup để mở quảng cáo và tiếp tục.
          </p>
        </div>
      </div>
    </div>
  );
}