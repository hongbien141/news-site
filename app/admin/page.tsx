"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  popup_link: string | null;
  ad_title: string | null;
  ad_desc: string | null;
  ad_image: string | null;
  images: string[] | null;
  videos: string[] | null;
  created_at?: string;
};

type MediaItem = {
  file: File | null;
  preview: string;
  existingUrl?: string;
};

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function safeParseArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  return [];
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

async function uploadFile(file: File, folder: "post-images" | "post-videos" | "ads") {
  const bucket = folder === "post-videos" ? "videos" : "images";

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const sanitizedBaseName = baseName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeName = `${Date.now()}-${sanitizedBaseName || "file"}${extension ? `.${extension}` : ""}`;
  const filePath = `${folder}/${safeName}`;

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

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("published");

  const [popupLink, setPopupLink] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [adDesc, setAdDesc] = useState("");

  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState("");
  const [existingAdImage, setExistingAdImage] = useState("");

  const [images, setImages] = useState<MediaItem[]>([{ file: null, preview: "" }]);
  const [videos, setVideos] = useState<MediaItem[]>([{ file: null, preview: "" }]);

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
    if (!adImageFile) {
      setAdImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(adImageFile);
    setAdImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [adImageFile]);

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

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setContent("");
    setStatus("published");
    setPopupLink("");
    setAdTitle("");
    setAdDesc("");

    setAdImageFile(null);
    setAdImagePreview("");
    setExistingAdImage("");

    setImages([{ file: null, preview: "" }]);
    setVideos([{ file: null, preview: "" }]);
  }

  function updateImageFile(index: number, file: File | null) {
    setImages((prev) => {
      const next = [...prev];
      const old = next[index];

      if (old?.preview && old.preview.startsWith("blob:")) {
        URL.revokeObjectURL(old.preview);
      }

      next[index] = {
        file,
        preview: file ? URL.createObjectURL(file) : old?.existingUrl || "",
        existingUrl: file ? undefined : old?.existingUrl,
      };

      return next;
    });
  }

  function updateVideoFile(index: number, file: File | null) {
    setVideos((prev) => {
      const next = [...prev];
      const old = next[index];

      if (old?.preview && old.preview.startsWith("blob:")) {
        URL.revokeObjectURL(old.preview);
      }

      next[index] = {
        file,
        preview: file ? URL.createObjectURL(file) : old?.existingUrl || "",
        existingUrl: file ? undefined : old?.existingUrl,
      };

      return next;
    });
  }

  function addImageItem() {
    setImages((prev) => [...prev, { file: null, preview: "" }]);
  }

  function addVideoItem() {
    setVideos((prev) => [...prev, { file: null, preview: "" }]);
  }

  function removeImageItem(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target?.preview && target.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }

      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ file: null, preview: "" }];
    });
  }

  function removeVideoItem(index: number) {
    setVideos((prev) => {
      const target = prev[index];
      if (target?.preview && target.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }

      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ file: null, preview: "" }];
    });
  }

  async function uploadMediaItems(
    items: MediaItem[],
    folder: "post-images" | "post-videos"
  ) {
    const results: string[] = [];

    for (const item of items) {
      if (item.file) {
        const url = await uploadFile(item.file, folder);
        results.push(url);
      } else if (item.existingUrl) {
        results.push(item.existingUrl);
      }
    }

    return results;
  }

  async function uploadAdImageIfNeeded() {
    if (!adImageFile) return existingAdImage || null;
    return uploadFile(adImageFile, "ads");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert("Bạn chưa nhập tiêu đề");
      return;
    }

    if (!slug.trim()) {
      alert("Bạn chưa nhập slug");
      return;
    }

    setSubmitting(true);

    try {
      const [uploadedImages, uploadedVideos, uploadedAdImage] = await Promise.all([
        uploadMediaItems(images, "post-images"),
        uploadMediaItems(videos, "post-videos"),
        uploadAdImageIfNeeded(),
      ]);

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        status,
        popup_link: popupLink.trim() || null,
        ad_title: adTitle.trim() || null,
        ad_desc: adDesc.trim() || null,
        ad_image: uploadedAdImage,
        images: uploadedImages,
        videos: uploadedVideos,
      };

      if (editingId) {
        const { error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        alert("Cập nhật bài viết thành công");
      } else {
        const { error } = await supabase.from("posts").insert([payload]);

        if (error) throw error;
        alert("Đăng bài thành công");
      }

      resetForm();
      await fetchPosts();
    } catch (error: any) {
      alert(error.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(post: Post) {
    setEditingId(post.id);
    setTitle(post.title || "");
    setSlug(post.slug || "");
    setContent(post.content || "");
    setStatus(post.status || "published");
    setPopupLink(post.popup_link || "");
    setAdTitle(post.ad_title || "");
    setAdDesc(post.ad_desc || "");
    setExistingAdImage(post.ad_image || "");
    setAdImageFile(null);
    setAdImagePreview("");

    const parsedImages = safeParseArray(post.images);
    const parsedVideos = safeParseArray(post.videos);

    setImages(
      parsedImages.length
        ? parsedImages.map((url) => ({
            file: null,
            preview: url,
            existingUrl: url,
          }))
        : [{ file: null, preview: "" }]
    );

    setVideos(
      parsedVideos.length
        ? parsedVideos.map((url) => ({
            file: null,
            preview: url,
            existingUrl: url,
          }))
        : [{ file: null, preview: "" }]
    );

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

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";
  const textareaClass =
    "min-h-[200px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";
  const blockClass = "rounded-2xl border border-gray-200 bg-gray-50 p-4";

  if (loading) {
    return <main className="p-10">Đang tải...</main>;
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
              Admin
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900">
              Đăng nhập CMS
            </h1>
          </div>

          <Card>
            <div className="space-y-4">
              <input
                placeholder="Email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Mật khẩu"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={handleLogin}
                className="w-full rounded-2xl bg-black py-3 font-semibold text-white"
              >
                Đăng nhập
              </button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
                ADMIN
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
                CMS đăng bài
                <p className="text-red-500 font-bold">ADMIN VERSION FIX 1</p>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Tạo bài viết, thêm nhiều hình ảnh, nhiều video và popup quảng cáo theo giao diện đơn giản.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    Thông tin bài viết
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Nhập tiêu đề, slug, nội dung và trạng thái bài viết.
                  </p>
                </div>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Tạo bài mới
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Tiêu đề
                  </label>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => {
                      if (!slug.trim() && title.trim()) {
                        setSlug(slugify(title));
                      }
                    }}
                    placeholder="Nhập tiêu đề bài"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Slug
                    </label>
                    <input
                      className={inputClass}
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      placeholder="vi-du-bai-viet"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Trạng thái
                    </label>
                    <select
                      className={inputClass}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Nội dung
                  </label>
                  <textarea
                    className={textareaClass}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập nội dung bài viết"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                  HÌNH ẢNH
                </p>
              </div>

              <div className="space-y-4">
                {images.map((item, index) => (
                  <div key={index} className={blockClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-red-500">
                        HÌNH ẢNH {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeImageItem(index)}
                        className="text-lg text-gray-500"
                      >
                        × Xóa
                      </button>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        updateImageFile(index, file);
                      }}
                      className="w-full"
                    />

                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`Hình ảnh ${index + 1}`}
                        className="mt-4 h-56 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addImageItem}
                  className="w-full rounded-2xl border border-dashed border-red-300 px-4 py-4 text-lg font-semibold text-red-500"
                >
                  + Thêm hình ảnh
                </button>
              </div>
            </Card>

            <Card>
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                  VIDEO
                </p>
              </div>

              <div className="space-y-4">
                {videos.map((item, index) => (
                  <div key={index} className={blockClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-red-500">
                        VIDEO {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeVideoItem(index)}
                        className="text-lg text-gray-500"
                      >
                        × Xóa
                      </button>
                    </div>

                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        updateVideoFile(index, file);
                      }}
                      className="w-full"
                    />

                    {item.preview ? (
                      <video
                        controls
                        className="mt-4 w-full rounded-2xl bg-black"
                        src={item.preview}
                      />
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVideoItem}
                  className="w-full rounded-2xl border border-dashed border-red-300 px-4 py-4 text-lg font-semibold text-red-500"
                >
                  + Thêm video
                </button>
              </div>
            </Card>

            <Card>
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Popup quảng cáo
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Thiết lập link, tiêu đề, mô tả và ảnh popup quảng cáo.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Link popup quảng cáo
                  </label>
                  <input
                    className={inputClass}
                    value={popupLink}
                    onChange={(e) => setPopupLink(e.target.value)}
                    placeholder="https://s.shopee.vn/..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Tiêu đề popup quảng cáo
                  </label>
                  <input
                    className={inputClass}
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Nhập tiêu đề popup"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Mô tả popup quảng cáo
                  </label>
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white"
                    value={adDesc}
                    onChange={(e) => setAdDesc(e.target.value)}
                    placeholder="Nhập mô tả popup"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Ảnh popup quảng cáo
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
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : existingAdImage ? (
                    <img
                      src={existingAdImage}
                      alt="Ảnh quảng cáo hiện tại"
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </Card>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl bg-black px-5 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Đang xử lý..." : editingId ? "Lưu cập nhật" : "Đăng bài"}
            </button>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    Danh sách bài viết
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Bấm sửa để đổ dữ liệu về form, bấm xóa để gỡ bài khỏi website.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchPosts}
                  className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
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
                  {posts.map((post) => {
                    const postImages = safeParseArray(post.images);
                    const firstImage = postImages[0] || "";

                    return (
                      <div key={post.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-gray-900">
                              {post.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">/{post.slug}</p>
                            <p className="mt-2 text-sm text-gray-500">
                              Trạng thái: {post.status}
                            </p>
                            {post.ad_title ? (
                              <p className="mt-1 text-sm text-gray-500">
                                Popup: {post.ad_title}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(post)}
                              className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(post)}
                              className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={post.title}
                            className="mt-4 h-44 w-full rounded-2xl object-cover"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}