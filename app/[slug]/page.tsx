export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdPopup from "../components/AdPopup";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) {
    notFound();
  }

  const images = parseJsonArray(post.images);
  const videos = parseJsonArray(post.videos);

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
          {new Date(post.created_at).toLocaleDateString("vi-VN")} · hongbien141.io.vn
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
            <div className="mt-8 space-y-4">
              {videos.map((video, index) => (
                <video
                  key={index}
                  controls
                  className="w-full rounded-xl bg-black"
                  src={video}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}