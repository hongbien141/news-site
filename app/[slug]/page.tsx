export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase";
import AdPopup from "../components/AdPopup";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type VideoPayload =
  | {
      type: "upload";
      url: string;
    }
  | {
      type: "embed";
      url: string;
      provider: "x" | "telegram";
    };

function safeParseImages(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function safeParseVideos(value: unknown): VideoPayload[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value as VideoPayload[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getEmbedUrl(video: VideoPayload) {
  if (video.type !== "embed") return "";

  if (video.provider === "telegram") {
    const match = video.url.match(/^https?:\/\/t\.me\/([^/]+)\/(\d+)/i);
    if (!match) return "";
    const channel = match[1];
    const postId = match[2];
    return `https://t.me/${channel}/${postId}?embed=1`;
  }

  return `https://twitframe.com/show?url=${encodeURIComponent(video.url)}`;
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
      {post.popup_link ? (
        <AdPopup
          postSlug={post.slug}
          adLink={post.popup_link}
          adTitle={post.ad_title}
          adDesc={post.ad_desc}
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

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <div className="space-y-5 whitespace-pre-line text-lg leading-8 text-gray-800">
            {post.content}
          </div>

          {images.length > 0 ? (
            <div className="mt-8 space-y-4">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${post.title} ${index + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}

          {videos.length > 0 ? (
            <div className="mt-8 space-y-6">
              {videos.map((video, index) => (
                <div key={index}>
                  {video.type === "upload" ? (
                    <video
                      controls
                      className="w-full rounded-xl bg-black"
                      src={video.url}
                    />
                  ) : (
                    <iframe
                      src={getEmbedUrl(video)}
                      className="aspect-video w-full rounded-xl border"
                      allowFullScreen
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}