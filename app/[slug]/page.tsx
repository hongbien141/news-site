export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase";
import AdPopup from "../components/AdPopup";
import SensitiveMedia from "../components/SensitiveMedia";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ImagePayload = {
  url: string;
  sensitive?: boolean;
};

type VideoPayload =
  | {
      type: "upload";
      url: string;
      sensitive?: boolean;
    }
  | {
      type: "embed";
      url: string;
      provider: "x" | "telegram";
      sensitive?: boolean;
    };

type AdjacentPost = {
  slug: string;
  title: string;
  created_at: string;
};

const siteName = "Hóng Biến 141";
const siteUrl = "https://hongbien141.io.vn";
const defaultOgImage = `${siteUrl}/og-default-v2.png`;

function safeParseImages(value: unknown): ImagePayload[] {
  if (!value) return [];

  const normalize = (item: unknown): ImagePayload | null => {
    if (typeof item === "string") {
      return { url: item, sensitive: false };
    }

    if (
      item &&
      typeof item === "object" &&
      "url" in item &&
      typeof (item as { url?: unknown }).url === "string"
    ) {
      const typed = item as { url: string; sensitive?: boolean };
      return {
        url: typed.url,
        sensitive: !!typed.sensitive,
      };
    }

    return null;
  };

  if (Array.isArray(value)) {
    return value.map(normalize).filter((item): item is ImagePayload => !!item);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(normalize).filter((item): item is ImagePayload => !!item)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function safeParseVideos(value: unknown): VideoPayload[] {
  if (!value) return [];

  const normalize = (item: unknown): VideoPayload | null => {
    if (!item || typeof item !== "object") return null;

    const typed = item as {
      type?: unknown;
      url?: unknown;
      provider?: unknown;
      sensitive?: unknown;
    };

    if (typed.type === "upload" && typeof typed.url === "string") {
      return {
        type: "upload",
        url: typed.url,
        sensitive: !!typed.sensitive,
      };
    }

    if (
      typed.type === "embed" &&
      typeof typed.url === "string" &&
      (typed.provider === "x" || typed.provider === "telegram")
    ) {
      return {
        type: "embed",
        url: typed.url,
        provider: typed.provider,
        sensitive: !!typed.sensitive,
      };
    }

    return null;
  };

  if (Array.isArray(value)) {
    return value.map(normalize).filter((item): item is VideoPayload => !!item);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(normalize).filter((item): item is VideoPayload => !!item)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getVideoLabel(video: Extract<VideoPayload, { type: "embed" }>) {
  return video.provider === "telegram" ? "Telegram" : "X / Twitter";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServer();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    return {
      title: siteName,
      description: "Trang tin tức tổng hợp Hóng Biến 141",
    };
  }

  const images = safeParseImages(post.images);
  const firstImage = defaultOgImage;
  const title = post.title || siteName;
  const description =
    (post.content || "").replace(/\s+/g, " ").trim().slice(0, 180) ||
    "Trang tin tức tổng hợp Hóng Biến 141";
  const url = `${siteUrl}/${post.slug}`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      locale: "vi_VN",
      url,
      siteName,
      title,
      description,
      images: [
        {
          url: firstImage,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [firstImage],
    },
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createSupabaseServer();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) {
    notFound();
  }

  const images = safeParseImages(post.images);
  const videos = safeParseVideos(post.videos);


  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#111]">
{post.popup_link && post.ad_image ? (
  <AdPopup
    postSlug={post.slug}
    adLink={post.popup_link}
    adImage={post.ad_image}
  />
) : null}
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-red-500">
          Tin tức
        </p>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          {post.title}
        </h1>

        <p className="mt-6 text-lg text-gray-500">
          {new Date(post.created_at).toLocaleDateString("vi-VN")} · Hóng Biến 141
        </p>

        <div className="mt-6 border-t border-gray-300" />

  postSlug={post.slug}
  adLink={post.popup_link}
  adTitle={post.ad_title}
  adDesc={post.ad_desc}
  adImage={post.ad_image}

  <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">

          <div className="space-y-5 whitespace-pre-line text-lg leading-8 text-gray-800">
            {post.content}
          </div>

          {images.length > 0 ? (
            <div className="mt-8 space-y-4">
              {images.map((image, index) => (
                <SensitiveMedia
                  key={index}
                  sensitive={!!image.sensitive}
                  label="Hình ảnh nhạy cảm, cân nhắc trước khi xem."
                  className="rounded-xl"
                >
                  <img
                    src={image.url}
                    alt={`${post.title} ${index + 1}`}
                    className="w-full rounded-xl object-cover"
                  />
                </SensitiveMedia>
              ))}
            </div>
          ) : null}

          {videos.length > 0 ? (
            <div className="mt-8 space-y-6">
              {videos.map((video, index) => (
                <div key={index}>
                  {video.type === "upload" ? (
                    <SensitiveMedia
                      sensitive={!!video.sensitive}
                      label="Video nhạy cảm, cân nhắc trước khi xem."
                      className="rounded-xl"
                    >
                      <video
                        controls
                        className="w-full rounded-xl bg-black"
                        src={video.url}
                      />
                    </SensitiveMedia>
                  ) : (
                    <SensitiveMedia
                      sensitive={!!video.sensitive}
                      label="Liên kết video có nội dung nhạy cảm, cân nhắc trước khi xem."
                      className="rounded-2xl"
                    >
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-red-300 hover:bg-white"
                      >
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                          Video ngoài
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-gray-900">
                          Mở video trên {getVideoLabel(video)}
                        </h3>
                        <p className="mt-3 break-all text-sm text-gray-600">{video.url}</p>
                      </a>
                    </SensitiveMedia>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-10 border-t border-gray-300 pt-8 text-center">
  <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-500">
    Theo dõi cộng đồng
  </p>

  <h2 className="mt-3 text-2xl font-extrabold text-gray-900 md:text-3xl">
    Tham gia kênh để hóng biến nhanh nhất
  </h2>

  <div className="mt-7 grid gap-4 md:grid-cols-2">
    <a
      href="https://t.me/hongbien141"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 animate-pulse rounded-full bg-sky-300/30" />

      <div className="relative flex flex-col items-center">
        <div className="flex h-20 w-20 animate-bounce items-center justify-center rounded-[24px] bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-300/50">
          <img
            src="/Telegram_logo.svg"
            alt="Telegram"
            className="h-12 w-12 object-contain drop-shadow-md transition group-hover:scale-110"
          />
        </div>

        <h3 className="mt-4 text-xl font-extrabold text-gray-900">
          Kênh Telegram
        </h3>

        <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
          Nhận tin mới nhanh hơn, xem không quảng cáo.
        </p>

        <span className="mt-4 inline-flex rounded-full bg-sky-600 px-5 py-2 text-sm font-bold text-white transition group-hover:bg-red-600">
          Tham gia ngay
        </span>
      </div>
    </a>

    <a
      href="https://www.facebook.com/hongbien141"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 animate-pulse rounded-full bg-blue-300/30" />

      <div className="relative flex flex-col items-center">
        <div className="flex h-20 w-20 animate-bounce items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-300/50">
          <img
            src="/facebook_logo.svg"
            alt="Facebook"
            className="h-12 w-12 object-contain drop-shadow-md transition group-hover:scale-110"
          />
        </div>

        <h3 className="mt-4 text-xl font-extrabold text-gray-900">
          Fanpage Facebook
        </h3>

        <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
          Theo dõi fanpage để cập nhật bài viết mới.
        </p>

        <span className="mt-4 inline-flex rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition group-hover:bg-red-600">
          Theo dõi ngay
        </span>
      </div>
    </a>
  </div>

  <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-100 bg-red-50/60 px-4 py-4 text-center">
  <p className="text-sm font-semibold italic leading-6 text-red-600 sm:text-base sm:leading-7">
    Bài viết chỉ mang tính chất giải trí, truyền tải thông tin hoặc lên án – cảnh báo về
    những hành vi chưa chuẩn mực, không cổ súy hành động theo. Cảm ơn!
  </p>
</div>
</div>

        </div>
      </div>
    </main>
  );
}