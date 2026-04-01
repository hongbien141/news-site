"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type AdPopupProps = {
  postSlug: string;
  adLink: string;
  adTitle?: string | null;
  adDesc?: string | null;
  adImage?: string | null;
};

export default function AdPopup({
  postSlug,
  adLink,
  adTitle,
  adDesc,
  adImage,
}: AdPopupProps) {
  const [open, setOpen] = useState(false);
  const [clicked, setClicked] = useState(false);
  const touchHandledRef = useRef(false);

  useEffect(() => {
    const key = `ad_seen_${postSlug}`;
    const seen = sessionStorage.getItem(key);

    if (!seen) {
      setOpen(true);
    }
  }, [postSlug]);

  const openAd = () => {
    if (clicked) return;

    setClicked(true);

    const key = `ad_seen_${postSlug}`;
    sessionStorage.setItem(key, "1");

    // Mở tab mới NGAY trong thao tác click/touch của user
    const popup = window.open(adLink, "_blank", "noopener,noreferrer");

    setOpen(false);

    // Ghi tracking sau, không chặn popup
    void supabase.from("ad_clicks").insert([
      {
        post_slug: postSlug,
        ad_link: adLink,
      },
    ]).then(({ error }) => {
      if (error) {
        console.error("Lỗi ghi tracking click:", error);
      }
    });

    // Nếu browser chặn popup thì chỉ đóng popup thôi, không cho tab cũ nhảy theo
    if (!popup) {
      console.warn("Popup bị chặn bởi trình duyệt.");
    }
  };

  useEffect(() => {
    if (!open || clicked) return;

    const handleTouchEnd = () => {
      touchHandledRef.current = true;
      openAd();

      window.setTimeout(() => {
        touchHandledRef.current = false;
      }, 500);
    };

    const handleClick = () => {
      if (touchHandledRef.current) return;
      openAd();
    };

    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("click", handleClick);
    };
  }, [open, clicked, adLink, postSlug]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-red-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white">
          Thông báo quảng cáo
        </div>

        {adImage ? (
          <img
            src={adImage}
            alt={adTitle || "Quảng cáo"}
            className="h-56 w-full object-cover"
          />
        ) : null}

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold">
            {adTitle || "Nhấn bất kỳ để tiếp tục"}
          </h2>

          <p className="mt-3 text-gray-600">
            {adDesc ||
              "Quảng cáo sẽ được mở ở tab mới. Bạn có thể quay lại để đọc tiếp bài viết."}
          </p>

          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-black px-5 py-3 font-semibold text-white"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}