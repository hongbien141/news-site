"use client";

import { useEffect, useRef, useState } from "react";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;

  adLink2?: string | null;
};

const MAX_DAILY_AD_VIEWS = 5;
const DAILY_STORAGE_KEY = "hb141_ad_daily_limit_v2";

type DailyAdState = {
  date: string;
  views: number;
};

type PostAdStageState = {
  stage1Done: boolean;
  stage2Done: boolean;
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

function getStageKey(postSlug: string) {
  return `hb141_ad_stage_${postSlug}`;
}

function readStageState(postSlug: string): PostAdStageState {
  if (typeof window === "undefined") {
    return { stage1Done: false, stage2Done: false };
  }

  try {
    const raw = sessionStorage.getItem(getStageKey(postSlug));
    if (!raw) {
      return { stage1Done: false, stage2Done: false };
    }

    const parsed = JSON.parse(raw) as Partial<PostAdStageState>;
    return {
      stage1Done: !!parsed.stage1Done,
      stage2Done: !!parsed.stage2Done,
    };
  } catch {
    return { stage1Done: false, stage2Done: false };
  }
}

function writeStageState(postSlug: string, state: PostAdStageState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getStageKey(postSlug), JSON.stringify(state));
}

export default function AdPopup({
  postSlug,
  adLink,
  adTitle,
  adDesc,
  adImage,
  adLink2,
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const stage2BoundRef = useRef(false);

  useEffect(() => {
    setHydrated(true);

    if (!adLink?.trim()) {
      setIsOpen(false);
      return;
    }

    const dailyState = readDailyState();

    if (dailyState.views >= MAX_DAILY_AD_VIEWS) {
      setIsOpen(false);
      return;
    }

    const stageState = readStageState(postSlug);

    // Nếu chưa mở quảng cáo 1 thì hiện popup 1
    if (!stageState.stage1Done) {
      writeDailyState({
        date: getTodayKey(),
        views: dailyState.views + 1,
      });

      const timer = window.setTimeout(() => {
        setIsOpen(true);
      }, 700);

      return () => window.clearTimeout(timer);
    }

    // Nếu đã mở quảng cáo 1 nhưng chưa mở quảng cáo 2
    // thì khi user back lại, chỉ cần chạm 1 lần sẽ mở quảng cáo 2
    if (stageState.stage1Done && !stageState.stage2Done && adLink2?.trim()) {
      if (stage2BoundRef.current) return;
      stage2BoundRef.current = true;

      const handleStage2Click = (event: MouseEvent) => {
        const latestStage = readStageState(postSlug);
        if (latestStage.stage2Done) return;

        event.preventDefault();
        event.stopPropagation();

        writeStageState(postSlug, {
          stage1Done: true,
          stage2Done: true,
        });

        window.location.href = adLink2;
      };

      document.addEventListener("click", handleStage2Click, true);

      return () => {
        document.removeEventListener("click", handleStage2Click, true);
        stage2BoundRef.current = false;
      };
    }
  }, [postSlug, adLink, adLink2]);

  const handleOpenAd1 = () => {
    writeStageState(postSlug, {
      stage1Done: true,
      stage2Done: false,
    });

    setIsOpen(false);
    window.location.href = adLink;
  };

  if (!hydrated || !isOpen || !adLink?.trim()) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={handleOpenAd1}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleOpenAd1();
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
            Sau khi quay lại, chạm màn hình một lần nữa để tiếp tục.
          </p>
        </div>
      </div>
    </div>
  );
}