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
const defaultOgImage = `${siteUrl}/og-default.png`;

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

  const [{ data: previousPost }, { data: nextPost }] = await Promise.all([
    supabase
      .from("posts")
      .select("slug,title,created_at")
      .eq("status", "published")
      .lt("created_at", post.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AdjacentPost>(),

    supabase
      .from("posts")
      .select("slug,title,created_at")
      .eq("status", "published")
      .gt("created_at", post.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<AdjacentPost>(),
  ]);

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#111]">
      {post.popup_link ? (
  <AdPopup
    postSlug={post.slug}
    adLink={post.popup_link}
    adTitle={post.ad_title}
    adDesc={post.ad_desc}
    adImage={post.ad_image}
    adLink2={post.popup_link_2}
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
            <p className="text-xl font-semibold text-gray-900">
              Group Tele:{" "}
              <a
                href="https://t.me/hongbien141"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-600"
              >
                tham gia
              </a>{" "}
              – Fanpage FB:{" "}
              <a
                href="https://www.facebook.com/hongbien141"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-600"
              >
                tham gia
              </a>
            </p>

            <p className="mx-auto mt-6 max-w-4xl text-center text-2xl font-extrabold italic leading-10 text-red-600">
              Bài viết chỉ mang tính chất giải trí, truyền tải thông tin HOẶC lên án – cảnh báo về
              những hành vi chưa chuẩn mực, không cổ súy hành động theo, cảm ơn!
            </p>
          </div>

          {previousPost || nextPost ? (
            <div className="mt-10 border-t border-gray-200 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {previousPost ? (
                  <Link
                    href={`/${previousPost.slug}`}
                    className="block rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-red-300 hover:bg-white"
                  >
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                      ← Trang trước
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-bold text-gray-900">
                      {previousPost.title}
                    </h3>
                    <p className="mt-3 text-sm text-gray-500">
                      {new Date(previousPost.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}

                {nextPost ? (
                  <Link
                    href={`/${nextPost.slug}`}
                    className="block rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left transition hover:border-red-300 hover:bg-white"
                  >
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500 md:text-right">
                      Trang sau →
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-bold text-gray-900 md:text-right">
                      {nextPost.title}
                    </h3>
                    <p className="mt-3 text-sm text-gray-500 md:text-right">
                      {new Date(nextPost.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}