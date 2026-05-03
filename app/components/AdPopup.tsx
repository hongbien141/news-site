"use client";

import { useCallback, useEffect, useState } from "react";

const AD_IMAGE_STEP_1 = "/shopee-default.png";
const AD_IMAGE_STEP_2 = "/tiktok-default.png";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adLink2?: string | null;
  adTitle?: string | null;
  adDesc?: string | null;
};

type PopupState = {
  hiddenUntil: number;
};

type PopupStep = 1 | 2;

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

function getPopupKey(postSlug: string, step: PopupStep) {
  return `hb141_adpopup_until_end_day_${postSlug}_${step}`;
}

function readPopupState(postSlug: string, step: PopupStep): PopupState {
  if (typeof window === "undefined") return { hiddenUntil: 0 };

  try {
    const raw = localStorage.getItem(getPopupKey(postSlug, step));
    if (!raw) return { hiddenUntil: 0 };

    const parsed = JSON.parse(raw) as Partial<PopupState>;

    return {
      hiddenUntil: Number(parsed.hiddenUntil || 0),
    };
  } catch {
    return { hiddenUntil: 0 };
  }
}

function writePopupState(postSlug: string, step: PopupStep, state: PopupState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getPopupKey(postSlug, step), JSON.stringify(state));
}

function isHiddenToday(state: PopupState) {
  return state.hiddenUntil > Date.now();
}

export default function AdPopup({
  postSlug,
  adLink,
  adLink2,
  adTitle,
  adDesc,
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isFbApp, setIsFbApp] = useState(false);
  const [step, setStep] = useState<PopupStep | null>(null);

  const getNextPopupStep = useCallback((): PopupStep | null => {
    const link1 = adLink?.trim();
    const link2 = adLink2?.trim();

    if (link1 && !isHiddenToday(readPopupState(postSlug, 1))) {
      return 1;
    }

    if (link2 && !isHiddenToday(readPopupState(postSlug, 2))) {
      return 2;
    }

    return null;
  }, [postSlug, adLink, adLink2]);

  const checkAndOpenPopup = useCallback(() => {
    if (!isFacebookMobileApp()) {
      setIsOpen(false);
      return;
    }

    const nextStep = getNextPopupStep();

    if (!nextStep) {
      setIsOpen(false);
      setStep(null);
      return;
    }

    window.setTimeout(() => {
      setStep(nextStep);
      setIsOpen(true);
    }, 500);
  }, [getNextPopupStep]);

  useEffect(() => {
  setHydrated(true);

  const fbMobile = isFacebookMobileApp();
  setIsFbApp(fbMobile);

  if (!fbMobile) return;

  checkAndOpenPopup();

  const handlePageShow = () => {
    const nextStep = getNextPopupStep();

    if (!nextStep) {
      setIsOpen(false);
      setStep(null);
      return;
    }

    checkAndOpenPopup();
  };

  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("focus", handlePageShow);

  return () => {
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("focus", handlePageShow);
  };
}, [checkAndOpenPopup, getNextPopupStep]);

  const hideUntilEndOfDay = (popupStep: PopupStep) => {
    writePopupState(postSlug, popupStep, {
      hiddenUntil: getEndOfTodayTimestamp(),
    });
  };

  const closePopup = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (step) {
      hideUntilEndOfDay(step);
    }

    setIsOpen(false);
  };

  const openAd = () => {
    if (!step) return;

    const currentAdLink = step === 1 ? adLink?.trim() : adLink2?.trim();
    if (!currentAdLink) return;

    hideUntilEndOfDay(step);
    setIsOpen(false);

   window.open(currentAdLink, "_blank", "noopener,noreferrer");

  if (!hydrated || !isFbApp || !isOpen || !step) {
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
          src={step === 1 ? AD_IMAGE_STEP_1 : AD_IMAGE_STEP_2}
          alt={adTitle?.trim() || adDesc?.trim() || "Quảng cáo"}
          className="max-h-[82vh] max-w-[92vw] object-contain"
        />
      </div>
    </div>
  );
}
