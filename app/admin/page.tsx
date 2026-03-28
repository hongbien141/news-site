export const dynamic = "force-dynamic";
"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "../../lib/supabase-browser";

const supabase = createBrowserSupabase();

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  video_url: string | null;
  popup_link: string | null;
  cover_image: string | null;
  status: string | null;
  ad_title: string | null;
  ad_desc: string | null;
  ad_image: string | null;
  created_at: string;
};

const initialForm = {
  title: "",
  slug: "",
  content: "",
  popupLink: "",
  status: "published",
  adTitle: "",
  adDesc: "",
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [adImageFile, setAdImageFile] = useState<File | null>(null);

  const [existingCoverImage, setExistingCoverImage] = useState("");
  const [existingVideoUrl, setExistingVideoUrl] = useState("");
  const [existingAdImage, setExistingAdImage] = useState("");

  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [adImagePreview, setAdImagePreview] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchPosts();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(videoFile);
    setVideoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  useEffect(() => {
    if (!adImageFile) {
      setAdImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(adImageFile);
    setAdImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [adImageFile]);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function fetchPosts() {
    setFetchingPosts(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    setFetchingPosts(false);

    if (error) {
      alert("Lỗi tải bài viết: " + error.message);
      return;
    }

    setPosts((data ?? []) as Post[]);
  }

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Đăng nhập lỗi: " + error.message);
      return;
    }

    setIsLoggedIn(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setPosts([]);
  }

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);

    setImageFile(null);
    setVideoFile(null);
    setAdImageFile(null);

    setExistingCoverImage("");
    setExistingVideoUrl("");
    setExistingAdImage("");

    setImagePreview("");
    setVideoPreview("");
    setAdImagePreview("");
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function uploadFile(
    bucket: "images" | "videos",
    file: File,
    folder = "posts"
  ) {
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${folder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Upload ${bucket === "videos" ? "video" : "ảnh"} lỗi: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function uploadImageIfNeeded() {
    if (!imageFile) return existingCoverImage || null;
    return uploadFile("images", imageFile, "posts");
  }

  async function uploadVideoIfNeeded() {
    if (!videoFile) return existingVideoUrl || null;
    return uploadFile("videos", videoFile, "posts");
  }

  async function uploadAdImageIfNeeded() {
    if (!adImageFile) return existingAdImage || null;
    return uploadFile("images", adImageFile, "ads");
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      alert("Bạn chưa nhập tiêu đề");
      return;
    }

    if (!form.slug.trim()) {
      alert("Bạn chưa nhập slug");
      return;
    }

    setSubmitting(true);

    try {
      const [coverImageUrl, videoUrl, adImageUrl] = await Promise.all([
        uploadImageIfNeeded(),
        uploadVideoIfNeeded(),
        uploadAdImageIfNeeded(),
      ]);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        content: form.content.trim(),
        popup_link: form.popupLink.trim() || null,
        cover_image: coverImageUrl,
        video_url: videoUrl,
        status: form.status,
        ad_title: form.adTitle.trim() || null,
        ad_desc: form.adDesc.trim() || null,
        ad_image: adImageUrl,
      };

      if (isEditing && editingId !== null) {
        const { error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingId);

        if (error) throw new Error(error.message);

        alert("Cập nhật bài viết thành công");
      } else {
        const { error } = await supabase.from("posts").insert([payload]);

        if (error) throw new Error(error.message);

        alert("Đăng bài thành công");
      }

      resetForm();
      await fetchPosts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Có lỗi xảy ra";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(post: Post) {
    setEditingId(post.id);
    setForm({
      title: post.title ?? "",
      slug: post.slug ?? "",
      content: post.content ?? "",
      popupLink: post.popup_link ?? "",
      status: post.status ?? "published",
      adTitle: post.ad_title ?? "",
      adDesc: post.ad_desc ?? "",
    });

    setExistingCoverImage(post.cover_image ?? "");
    setExistingVideoUrl(post.video_url ?? "");
    setExistingAdImage(post.ad_image ?? "");

    setImageFile(null);
    setVideoFile(null);
    setAdImageFile(null);

    setImagePreview("");
    setVideoPreview("");
    setAdImagePreview("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(post: Post) {
    const ok = window.confirm(`Xóa bài "${post.title}"?`);
    if (!ok) return;

    const { error } = await supabase.from("posts").delete().eq("id", post.id);

    if (error) {
      alert("Xóa lỗi: " + error.message);
      return;
    }

    if (editingId === post.id) {
      resetForm();
    }

    await fetchPosts();
    alert("Đã xóa bài");
  }

  if (loading) {
    return <main className="p-10">Đang tải...</main>;
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] p-10">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="mb-6 text-2xl font-bold">Đăng nhập admin</h1>

          <input
            placeholder="Email"
            className="mb-3 w-full rounded border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="mb-3 w-full rounded border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-black py-3 font-semibold text-white"
          >
            Đăng nhập
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
              Admin
            </p>
            <h1 className="text-3xl font-extrabold md:text-4xl">
              CMS mini đăng bài
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2"
          >
            Đăng xuất
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {isEditing ? "Sửa bài viết" : "Tạo bài mới"}
              </h2>

              {isEditing ? (
                <button
                  onClick={resetForm}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Tạo bài mới
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Tiêu đề</label>
                <input
                  className="w-full rounded border p-3"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  onBlur={() => {
                    if (!form.slug.trim() && form.title.trim()) {
                      updateForm("slug", slugify(form.title));
                    }
                  }}
                  placeholder="Nhập tiêu đề bài"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Slug</label>
                <input
                  className="w-full rounded border p-3"
                  value={form.slug}
                  onChange={(e) => updateForm("slug", slugify(e.target.value))}
                  placeholder="vi-du-bai-viet"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Nội dung</label>
                <textarea
                  className="min-h-[180px] w-full rounded border p-3"
                  value={form.content}
                  onChange={(e) => updateForm("content", e.target.value)}
                  placeholder="Nhập nội dung bài viết"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Link popup quảng cáo
                </label>
                <input
                  className="w-full rounded border p-3"
                  value={form.popupLink}
                  onChange={(e) => updateForm("popupLink", e.target.value)}
                  placeholder="https://s.shopee.vn/..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tiêu đề popup quảng cáo
                </label>
                <input
                  className="w-full rounded border p-3"
                  value={form.adTitle}
                  onChange={(e) => updateForm("adTitle", e.target.value)}
                  placeholder="Kem đánh răng trắng răng"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Mô tả popup quảng cáo
                </label>
                <textarea
                  className="min-h-[100px] w-full rounded border p-3"
                  value={form.adDesc}
                  onChange={(e) => updateForm("adDesc", e.target.value)}
                  placeholder="Giảm 50% hôm nay"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Trạng thái
                </label>
                <select
                  className="w-full rounded border p-3"
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ảnh cover từ máy tính
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                  className="w-full"
                />

                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview ảnh cover"
                    className="mt-3 h-48 w-full rounded-xl object-cover"
                  />
                ) : existingCoverImage ? (
                  <img
                    src={existingCoverImage}
                    alt="Ảnh cover hiện tại"
                    className="mt-3 h-48 w-full rounded-xl object-cover"
                  />
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ảnh popup quảng cáo từ máy tính
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAdImageFile(file);
                  }}
                  className="w-full"
                />

                {adImagePreview ? (
                  <img
                    src={adImagePreview}
                    alt="Preview ảnh quảng cáo"
                    className="mt-3 h-48 w-full rounded-xl object-cover"
                  />
                ) : existingAdImage ? (
                  <img
                    src={existingAdImage}
                    alt="Ảnh quảng cáo hiện tại"
                    className="mt-3 h-48 w-full rounded-xl object-cover"
                  />
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Video từ máy tính
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setVideoFile(file);
                  }}
                  className="w-full"
                />

                {videoPreview ? (
                  <video
                    controls
                    className="mt-3 w-full rounded-xl bg-black"
                    src={videoPreview}
                  />
                ) : existingVideoUrl ? (
                  <video
                    controls
                    className="mt-3 w-full rounded-xl bg-black"
                    src={existingVideoUrl}
                  />
                ) : null}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Đang xử lý..."
                  : isEditing
                  ? "Lưu cập nhật"
                  : "Đăng bài"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Danh sách bài viết</h2>
              <button
                onClick={fetchPosts}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Tải lại
              </button>
            </div>

            {fetchingPosts ? (
              <p className="text-gray-500">Đang tải bài viết...</p>
            ) : posts.length === 0 ? (
              <p className="text-gray-500">Chưa có bài viết nào.</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold">
                          {post.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          /{post.slug}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          Trạng thái: {post.status}
                        </p>
                        {post.ad_title ? (
                          <p className="mt-2 text-sm text-gray-500">
                            Popup: {post.ad_title}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleEdit(post)}
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {post.cover_image ? (
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="mt-4 h-40 w-full rounded-xl object-cover"
                      />
                    ) : null}

                    {post.ad_image ? (
                      <img
                        src={post.ad_image}
                        alt={post.ad_title || "Ảnh quảng cáo"}
                        className="mt-4 h-32 w-full rounded-xl object-cover"
                      />
                    ) : null}

                    {post.video_url ? (
                      <video
                        controls
                        className="mt-4 w-full rounded-xl bg-black"
                        src={post.video_url}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}