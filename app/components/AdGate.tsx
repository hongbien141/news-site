"use client";

import { useEffect, useRef, useState } from "react";

type AdGateProps = {
  postSlug: string;
  adLink?: string | null;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
  children: React.ReactNode;
};

const TELEGRAM_URL = "https://t.me/hongbien141";

type GateState = {
  step1Done: boolean;
  step2Done: boolean;
};

function getGateKey(postSlug: string) {
  return `hb141_adgate_${postSlug}`;
}

function readGateState(postSlug: string): GateState {
  if (typeof window === "undefined") {
    return { step1Done: false, step2Done: false };
  }

  try {
    const raw = sessionStorage.getItem(getGateKey(postSlug));
    if (!raw) return { step1Done: false, step2Done: false };

    const parsed = JSON.parse(raw) as Partial<GateState>;

    return {
      step1Done: !!parsed.step1Done,
      step2Done: !!parsed.step2Done,
    };
  } catch {
    return { step1Done: false, step2Done: false };
  }
}

function writeGateState(postSlug: string, state: GateState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getGateKey(postSlug), JSON.stringify(state));
}

export default function AdGate({
  postSlug,
  adLink,
  adTitle,
  adDesc,
  adImage,
  children,
}: AdGateProps) {
  const [gateState, setGateState] = useState<GateState>({
    step1Done: false,
    step2Done: false,
  });
  const [ready, setReady] = useState(false);
  const telegramBoundRef = useRef(false);

  useEffect(() => {
    const currentState = readGateState(postSlug);
    setGateState(currentState);
    setReady(true);
  }, [postSlug]);

  useEffect(() => {
    if (!ready) return;

    // Chỉ bật click màn hình mở Telegram SAU KHI đã click link quảng cáo bước 1
    if (!gateState.step1Done || gateState.step2Done) return;

    if (telegramBoundRef.current) return;
    telegramBoundRef.current = true;

    const handleOpenTelegram = (event: MouseEvent) => {
      const latestState = readGateState(postSlug);

      if (!latestState.step1Done || latestState.step2Done) return;

      event.preventDefault();
      event.stopPropagation();

      const nextState = {
        step1Done: true,
        step2Done: true,
      };

      writeGateState(postSlug, nextState);
      setGateState(nextState);

      window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
    };

    document.addEventListener("click", handleOpenTelegram, true);

    return () => {
      document.removeEventListener("click", handleOpenTelegram, true);
      telegramBoundRef.current = false;
    };
  }, [ready, gateState.step1Done, gateState.step2Done, postSlug]);

  const handleClickStep1 = () => {
    const nextState = {
      step1Done: true,
      step2Done: false,
    };

    writeGateState(postSlug, nextState);
    setGateState(nextState);
  };

  if (!ready) return null;

  if (!adLink || gateState.step1Done) {
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
            {adTitle?.trim() || "VIDEO Ở BÊN DƯỚI QUẢNG CÁO"}
          </h2>

          <p className="mt-6 text-lg font-semibold leading-8 text-gray-900">
            {adDesc?.trim() ||
              "CLICK VÀO LINK QUẢNG CÁO MÀU XANH BÊN DƯỚI👇 SAU ĐÓ F5 TRANG ĐỂ TIẾP TỤC XEM."}
          </p>

          <a
            href={adLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClickStep1}
            className="mt-7 inline-block text-2xl font-extrabold text-sky-700 hover:text-red-600"
          >
            Link Quảng Cáo Giấy Ăn Topgia 👉 CLICK MỞ ỨNG DỤNG SHOPEE
          </a>

          {adImage ? (
            <div className="mt-7 overflow-hidden rounded-xl">
              <img
                src={adImage}
                alt={adTitle?.trim() || "Quảng cáo"}
                className="w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}