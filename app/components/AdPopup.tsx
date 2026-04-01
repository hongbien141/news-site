"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const key = `ad_seen_${postSlug}`;
    const seen = sessionStorage.getItem(key);

    if (!seen) {
      setOpen(true);
    }
  }, [postSlug]);

  useEffect(() => {
    if (!open || clicked) return;

    const handleGlobalClick = async () => {
      setClicked(true);

      const key = `ad_seen_${postSlug}`;
      sessionStorage.setItem(key, "1");

      try {
        await supabase.from("ad_clicks").insert([
          {
            post_slug: postSlug,
            ad_link: adLink,
          },
        ]);
      } catch (error) {
        console.error("Lỗi ghi tracking click:", error);
      }

      window.open(adLink, "_blank", "noopener,noreferrer");
      setOpen(false);
    };

    window.addEventListener("click", handleGlobalClick);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [open, clicked, postSlug, adLink]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
              "Bạn sẽ được chuyển đến trang quảng cáo, sau đó quay lại để xem tiếp nội dung."}
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