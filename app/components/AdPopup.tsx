"use client";

import { useEffect } from "react";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
};

const MAX_DAILY_AD_CLICKS = 5;
const STORAGE_KEY = "hb141_ad_click_limit_global";

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

export default function AdPopup({ adLink }: AdPopupProps) {
  useEffect(() => {
    if (!adLink?.trim()) return;

    const state = readAdState();

    // Đã đủ 5 lần trong ngày thì bỏ chặn hoàn toàn
    if (state.clicks >= MAX_DAILY_AD_CLICKS) return;

    let redirected = false;

    const handler = (event: MouseEvent) => {
      if (redirected) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Cho phép click bình thường trong admin/devtools editable nếu có
      const tagName = target.tagName?.toLowerCase();

      // Không chặn click chuột phải / click phụ
      if (event.button !== 0) return;

      // Không chặn nếu user đang chọn text
      const selection = window.getSelection?.()?.toString();
      if (selection && selection.trim().length > 0) return;

      // Không chặn các click vào control media có thể gây lỗi UX quá khó chịu
      if (
        tagName === "video" ||
        tagName === "audio" ||
        tagName === "source"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      redirected = true;

      const current = readAdState();
      const nextClicks = current.clicks + 1;

      writeAdState({
        date: getTodayKey(),
        clicks: nextClicks,
      });

      // Mở quảng cáo trên tab hiện tại để user có thể back lại
      window.location.href = adLink;
    };

    document.addEventListener("click", handler, true);

    return () => {
      document.removeEventListener("click", handler, true);
    };
  }, [adLink]);

  return null;
}