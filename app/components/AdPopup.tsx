"use client";

import { useEffect, useState } from "react";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
};

const MAX_DAILY_AD_VIEWS = 5;
const DAILY_STORAGE_KEY = "hb141_ad_daily_limit";

type DailyAdState = {
  date: string;
  views: number;
};

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readDailyState(): DailyAdState {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), views: 0 };
  }

  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    const today = getTodayKey();

    if (!raw) {
      return { date: today, views: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<DailyAdState>;

    if (parsed.date !== today) {
      return { date: today, views: 0 };
    }

    return {
      date: today,
      views: Number(parsed.views || 0),
    };
  } catch {
    return { date: getTodayKey(), views: 0 };
  }
}

function writeDailyState(state: DailyAdState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
}

function getUnlockedPostKey(postSlug: string) {
  return `hb141_ad_unlocked_${postSlug}`;
}

function isPostUnlocked(postSlug: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(getUnlockedPostKey(postSlug)) === "1";
}

function unlockPost(postSlug: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getUnlockedPostKey(postSlug), "1");
}

export default function AdPopup({
  postSlug,
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

    // Nếu bài này đã được mở khóa trong phiên hiện tại
    // (ví dụ user đã bấm quảng cáo rồi back lại)
    // thì không hiện popup nữa
    if (isPostUnlocked(postSlug)) {
      setIsOpen(false);
      return;
    }

    const dailyState = readDailyState();

    // Nếu đã quá 5 lượt hiện quảng cáo trong ngày thì bỏ popup
    if (dailyState.views >= MAX_DAILY_AD_VIEWS) {
      setIsOpen(false);
      return;
    }

    // Tăng số lượt bị popup trong ngày ngay khi vào bài
    writeDailyState({
      date: getTodayKey(),
      views: dailyState.views + 1,
    });

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [adLink, postSlug]);

  const handleOpenAd = () => {
    // Đánh dấu bài này đã được mở khóa trong session
    // để khi user back lại thì xem bài luôn
    unlockPost(postSlug);

    setIsOpen(false);

    // Mở quảng cáo trên tab hiện tại
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