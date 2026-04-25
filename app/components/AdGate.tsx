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

      <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/95 px-3 py-5 sm:px-4 sm:py-8">
        <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
            Nội Dung Đã Bị Khoá
          </p>

          <h2 className="mt-3 text-2xl font-extrabold leading-tight text-red-600 sm:text-4xl">
            {adTitle?.trim() || "VIDEO Ở BÊN DƯỚI QUẢNG CÁO"}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-gray-800 sm:mt-6 sm:text-lg sm:leading-8">
            {adDesc?.trim() ||
              "Click liên kết quảng cáo màu xanh bên dưới 👇 để mở khoá nội dung."}
          </p>

          <a
            href={adLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClickStep1}
            className="mx-auto mt-5 inline-flex max-w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-base font-extrabold leading-6 text-white shadow-md transition hover:bg-red-600 sm:mt-7 sm:text-2xl"
          >
          👉MỞ ỨNG DỤNG SHOPEE
          </a>

          {adImage ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 sm:mt-7">
              <img
                src={adImage}
                alt={adTitle?.trim() || "Quảng cáo"}
                className="max-h-[520px] w-full object-contain sm:max-h-[720px]"
              />
            </div>
          ) : null}

          <p className="mt-4 text-xs font-medium leading-5 text-gray-500 sm:text-sm">
            Sau khi mở quảng cáo, quay lại trang để tiếp tục xem.
          </p>
        </div>
      </div>
    </div>
  );
}