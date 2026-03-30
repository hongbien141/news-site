"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  images: string[] | null;
  videos: string[] | null;
};

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("published");

  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ========================
  // FETCH POSTS
  // ========================
  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    setPosts(data || []);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ========================
  // UPLOAD FILE
  // ========================
  const uploadFile = async (file: File, folder: string) => {
    const filePath = `${folder}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(filePath, file);

    if (error) {
      alert("Upload lỗi: " + error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("media")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // ========================
  // SUBMIT
  // ========================
  const handleSubmit = async () => {
    if (!title || !slug) {
      alert("Thiếu tiêu đề hoặc slug");
      return;
    }

    setSubmitting(true);

    // upload images
    const imageUrls: string[] = [];
    for (const img of images) {
      const url = await uploadFile(img, "images");
      if (url) imageUrls.push(url);
    }

    // upload videos
    const videoUrls: string[] = [];
    for (const vid of videos) {
      const url = await uploadFile(vid, "videos");
      if (url) videoUrls.push(url);
    }

    if (editingId) {
      await supabase
        .from("posts")
        .update({
          title,
          slug,
          content,
          status,
          images: imageUrls,
          videos: videoUrls,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("posts").insert([
        {
          title,
          slug,
          content,
          status,
          images: imageUrls,
          videos: videoUrls,
        },
      ]);
    }

    resetForm();
    fetchPosts();
    setSubmitting(false);
  };

  // ========================
  // RESET FORM
  // ========================
  const resetForm = () => {
    setTitle("");
    setSlug("");
    setContent("");
    setStatus("published");
    setImages([]);
    setVideos([]);
    setEditingId(null);
  };

  // ========================
  // EDIT
  // ========================
  const handleEdit = (post: Post) => {
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setStatus(post.status);
    setEditingId(post.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ========================
  // DELETE
  // ========================
  const handleDelete = async (post: Post) => {
    if (!confirm("Xóa bài này?")) return;

    await supabase.from("posts").delete().eq("id", post.id);
    fetchPosts();
  };

  // ========================
  // LOGOUT
  // ========================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  return (
    <main className="min-h-screen bg-[#f5f3ef] px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">CMS đăng bài</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border px-4 py-2"
          >
            Đăng xuất
          </button>
        </div>

        {/* FORM */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold">Thông tin bài viết</h2>

            <input
              placeholder="Tiêu đề"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border p-3 rounded-xl"
            />

            <input
              placeholder="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border p-3 rounded-xl"
            />

            <textarea
              placeholder="Nội dung"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border p-3 rounded-xl"
              rows={5}
            />

            {/* IMAGES */}
            <div>
              <h3 className="font-semibold mb-2">Hình ảnh</h3>

              {images.map((img, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{img.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setImages(images.filter((_, index) => index !== i))
                    }
                    className="text-red-500"
                  >
                    Xóa
                  </button>
                </div>
              ))}

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setImages([...images, ...(e.target.files || [])])
                }
              />
            </div>

            {/* VIDEOS */}
            <div>
              <h3 className="font-semibold mb-2">Video</h3>

              {videos.map((vid, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{vid.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setVideos(videos.filter((_, index) => index !== i))
                    }
                    className="text-red-500"
                  >
                    Xóa
                  </button>
                </div>
              ))}

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setVideos([...videos, ...(e.target.files || [])])
                }
              />
            </div>

            {/* ACTION */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-black text-white px-4 py-2 rounded-xl"
              >
                {editingId ? "Cập nhật" : "Đăng bài"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="border px-4 py-2 rounded-xl"
              >
                Tạo mới
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">
              Danh sách bài viết
            </h2>

            {posts.length === 0 && <p>Chưa có bài viết</p>}

            {posts.map((post) => (
              <div
                key={post.id}
                className="border p-3 rounded-xl mb-3"
              >
                <p className="font-semibold">{post.title}</p>
                <p className="text-sm text-gray-500">{post.slug}</p>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(post)}
                    className="text-blue-500"
                  >
                    Sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="text-red-500"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}