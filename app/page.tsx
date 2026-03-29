export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  cover_image: string | null;
  status: string | null;
  created_at: string;
};

export default async function HomePage() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] p-10 text-red-600">
        Lỗi tải bài viết: {error.message}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#111]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
          Tin tức mới
        </p>

        <h1 className="mt-4 text-5xl font-extrabold tracking-tight md:text-7xl">
          Hóng Biến 141
        </h1>

        <p className="mt-4 text-2xl text-gray-600">Danh sách bài viết mới nhất</p>

        <div className="mt-10 space-y-7">
          {posts && posts.length > 0 ? (
            posts.map((post: Post) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="block rounded-[28px] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-5 md:flex-row">
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="h-56 w-full rounded-2xl object-cover md:w-[260px]"
                    />
                  ) : (
                    <div className="h-56 w-full rounded-2xl bg-gray-200 md:w-[260px]" />
                  )}

                  <div className="flex flex-1 flex-col justify-center">
                    <h2 className="text-3xl font-extrabold">{post.title}</h2>

                    <p className="mt-4 line-clamp-2 text-2xl text-gray-600">
                      {post.content || ""}
                    </p>

                    <p className="mt-6 text-xl text-gray-400">
                      {new Date(post.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm text-gray-500">
              Chưa có bài viết nào.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}