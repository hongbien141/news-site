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

type GateState = {
  unlockedUntil: number;
};

function getGateKey(postSlug: string) {
  return `hb141_adgate_24h_${postSlug}`;
}

function readGateState(postSlug: string): GateState {
  if (typeof window === "undefined") {
    return { unlockedUntil: 0 };
  }

  try {
    const raw = localStorage.getItem(getGateKey(postSlug));
    if (!raw) return { unlockedUntil: 0 };

    const parsed = JSON.parse(raw) as Partial<GateState>;

    return {
      unlockedUntil: Number(parsed.unlockedUntil || 0),
    };
  } catch {
    return { unlockedUntil: 0 };
  }
}

function writeGateState(postSlug: string, state: GateState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getGateKey(postSlug), JSON.stringify(state));
}

function isUnlocked(state: GateState) {
  return state.unlockedUntil > Date.now();
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
    unlockedUntil: 0,
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentState = readGateState(postSlug);
    setGateState(currentState);
    setReady(true);
  }, [postSlug]);

  const unlocked = isUnlocked(gateState);

  const handleClickStep1 = () => {
    const nextState = {
  unlockedUntil: getEndOfTodayTimestamp(),
};

    writeGateState(postSlug, nextState);
    setGateState(nextState);
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
              "Click vào liên kết quảng cáo màu xanh bên dưới 👇 để mở khoá nội dung."}
          </p>

          <a
            href={adLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClickStep1}
            className="mx-auto mt-5 inline-flex max-w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-base font-extrabold leading-6 text-white shadow-md transition hover:bg-red-600 sm:mt-7 sm:text-2xl"
          >
            👉Mở quảng cáo Shopee
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
            Sau khi mở quảng cáo, quay lại trang này để tiếp tục xem.
          </p>
        </div>
      </div>
    </div>
  );
}