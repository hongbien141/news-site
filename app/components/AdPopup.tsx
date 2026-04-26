"use client";

import { useEffect, useState } from "react";

const DEFAULT_AD_IMAGE = "/shopee-default.png";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
};

type PopupState = {
  hiddenUntil: number;
};

function isFacebookMobileApp() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const isFacebook = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  return isFacebook && isMobile;
}

function getEndOfTodayTimestamp() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  ).getTime();
}

function getPopupKey(postSlug: string) {
  return `hb141_adpopup_until_end_day_${postSlug}`;
}

function readPopupState(postSlug: string): PopupState {
  if (typeof window === "undefined") {
    return { hiddenUntil: 0 };
  }

  try {
    const raw = localStorage.getItem(getPopupKey(postSlug));
    if (!raw) return { hiddenUntil: 0 };

    const parsed = JSON.parse(raw) as Partial<PopupState>;

    return {
      hiddenUntil: Number(parsed.hiddenUntil || 0),
    };
  } catch {
    return { hiddenUntil: 0 };
  }
}

function writePopupState(postSlug: string, state: PopupState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getPopupKey(postSlug), JSON.stringify(state));
}

function isHiddenToday(state: PopupState) {
  return state.hiddenUntil > Date.now();
}

export default function AdPopup({
  postSlug,
  adLink,
  adTitle,
  adDesc,
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isFbApp, setIsFbApp] = useState(false);

  useEffect(() => {
    setHydrated(true);

    const fbMobile = isFacebookMobileApp();
    setIsFbApp(fbMobile);

    if (!fbMobile) {
      setIsOpen(false);
      return;
    }

    if (!adLink?.trim()) {
      setIsOpen(false);
      return;
    }

    const popupState = readPopupState(postSlug);

    if (isHiddenToday(popupState)) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [postSlug, adLink]);

  const hideUntilEndOfDay = () => {
    writePopupState(postSlug, {
      hiddenUntil: getEndOfTodayTimestamp(),
    });
  };

  const closePopup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    hideUntilEndOfDay();
    setIsOpen(false);
  };

  const openAd = () => {
    if (!adLink?.trim()) return;

    hideUntilEndOfDay();
    setIsOpen(false);

    window.location.href = adLink;
  };

  if (!hydrated || !isFbApp || !isOpen || !adLink?.trim()) {
  return null;
}

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4"
      onClick={openAd}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          openAd();
        }
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-black/80 text-4xl font-light leading-none text-white shadow-lg"
        aria-label="Đóng quảng cáo"
      >
        ×
      </button>

      <div className="max-h-[82vh] max-w-[92vw] overflow-hidden rounded-md">
       <img
  src={DEFAULT_AD_IMAGE}
  alt={adTitle?.trim() || adDesc?.trim() || "Quảng cáo"}
  className="max-h-[82vh] max-w-[92vw] object-contain"
/>
      </div>
    </div>
  );
}