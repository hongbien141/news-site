import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  cover_image: string | null;
  video_url: string | null;
  popup_link: string | null;
  status: string;
  created_at: string;
};

export default async function HomePage() {
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#111]">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-red-500">
          Tin tức mới
        </p>

        <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
          Hồng Biển 141
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Danh sách bài viết mới nhất
        </p>

        <div className="mt-10 grid gap-6">
          {posts && posts.length > 0 ? (
            posts.map((post: Post) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                  <div className="overflow-hidden rounded-xl bg-gray-100">
                    {post.cover_image ? (
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center text-gray-400">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold leading-tight">
                      {post.title}
                    </h2>

                    <p className="mt-3 line-clamp-3 text-gray-600">
                      {post.content}
                    </p>

                    <p className="mt-4 text-sm text-gray-400">
                      {new Date(post.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-8 text-gray-500 shadow-sm">
              Chưa có bài viết nào.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}