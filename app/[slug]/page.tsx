import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdPopup from "../components/AdPopup";

type PageProps = {
  params: { slug: string }; // ❌ bỏ Promise
};

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = params; // ❌ bỏ await

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    notFound();
  }

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
          {post.video_url ? (
            <div className="mb-6">
              {post.video_url.includes("youtube.com") ||
              post.video_url.includes("youtu.be") ? (
                <iframe
                  src={convertYoutubeUrl(post.video_url)}
                  className="aspect-video w-full rounded-xl"
                  allowFullScreen
                />
              ) : (
                <video controls className="w-full rounded-xl bg-black">
  <source src={post.video_url} type="video/mp4" />
  Trình duyệt của bạn không hỗ trợ video này.
</video>
              )}
            </div>
          ) : null}

          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="mb-6 w-full rounded-xl object-cover"
            />
          ) : null}

          <div className="space-y-5 whitespace-pre-line text-lg leading-8 text-gray-800">
            {post.content}
          </div>
        </div>
      </div>
    </main>
  );
}

function convertYoutubeUrl(url: string) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/
  );

  if (!match) return url;

  return `https://www.youtube.com/embed/${match[1]}`;
}