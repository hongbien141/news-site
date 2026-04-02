"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  images: string[] | null;
  videos: VideoPayload[] | null;
  popup_link?: string | null;
  ad_title?: string | null;
  ad_desc?: string | null;
  ad_image?: string | null;
  created_at?: string;
};

type ImageItem = {
  file: File | null;
  preview: string;
  existingUrl?: string;
};

type VideoItem = {
  mode: "upload" | "embed";
  file: File | null;
  preview: string;
  existingUrl?: string;
  embedUrl: string;
  provider: "x" | "telegram";
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

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";

const textareaClass =
  "min-h-[180px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";

const cardClass = "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm";
const blockClass = "rounded-2xl border border-gray-200 bg-gray-50 p-4";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeParseImages(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  return [];
}

function safeParseVideos(value: unknown): VideoPayload[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as VideoPayload[];

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

function getEmbedPreviewUrl(provider: "x" | "telegram", url: string) {
  if (!url.trim()) return "";

  if (provider === "telegram") {
    const match = url.match(/^https?:\/\/t\.me\/([^/]+)\/(\d+)/i);
    if (!match) return "";
    return `https://t.me/${match[1]}/${match[2]}?embed=1`;
  }

  return `https://twitframe.com/show?url=${encodeURIComponent(url)}`;
}

async function uploadFile(file: File, folder: "post-images" | "post-videos" | "ads") {
  const bucket = folder === "post-videos" ? "videos" : "images";

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const safeBase = baseName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const fileName = `${Date.now()}-${safeBase || "file"}${ext ? `.${ext}` : ""}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const [images, setImages] = useState<ImageItem[]>([{ file: null, preview: "" }]);

  const [videos, setVideos] = useState<VideoItem[]>([
    {
      mode: "upload",
      file: null,
      preview: "",
      embedUrl: "",
      provider: "x",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setLoading(false);
    };

    boot();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadPosts();
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

  async function loadPosts() {
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

    const normalized = (data || []).map((item: any) => ({
      ...item,
      images: safeParseImages(item.images),
      videos: safeParseVideos(item.videos),
    })) as Post[];

    setPosts(normalized);
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
    setVideos([
      {
        mode: "upload",
        file: null,
        preview: "",
        embedUrl: "",
        provider: "x",
      },
    ]);
  }

  function addImage() {
    setImages((prev) => [...prev, { file: null, preview: "" }]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ file: null, preview: "" }];
    });
  }

  function updateImageFile(index: number, file: File | null) {
    setImages((prev) => {
      const next = [...prev];
      const old = next[index];

      if (old?.preview.startsWith("blob:")) {
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

  function addVideo() {
    setVideos((prev) => [
      ...prev,
      {
        mode: "upload",
        file: null,
        preview: "",
        embedUrl: "",
        provider: "x",
      },
    ]);
  }

  function removeVideo(index: number) {
    setVideos((prev) => {
      const target = prev[index];
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }

      const next = prev.filter((_, i) => i !== index);
      return next.length
        ? next
        : [
            {
              mode: "upload",
              file: null,
              preview: "",
              embedUrl: "",
              provider: "x",
            },
          ];
    });
  }

  function setVideoMode(index: number, mode: "upload" | "embed") {
    setVideos((prev) => {
      const next = [...prev];
      const old = next[index];

      if (old.preview.startsWith("blob:")) {
        URL.revokeObjectURL(old.preview);
      }

      next[index] = {
        ...old,
        mode,
        file: null,
        preview: "",
        existingUrl: mode === "upload" ? old.existingUrl : undefined,
        embedUrl: mode === "embed" ? old.embedUrl : "",
      };

      return next;
    });
  }

  function updateVideoFile(index: number, file: File | null) {
    setVideos((prev) => {
      const next = [...prev];
      const old = next[index];

      if (old.preview.startsWith("blob:")) {
        URL.revokeObjectURL(old.preview);
      }

      next[index] = {
        ...old,
        mode: "upload",
        file,
        preview: file ? URL.createObjectURL(file) : old.existingUrl || "",
        existingUrl: file ? undefined : old.existingUrl,
        embedUrl: "",
      };

      return next;
    });
  }

  function updateVideoProvider(index: number, provider: "x" | "telegram") {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        provider,
      };
      return next;
    });
  }

  function updateVideoEmbed(index: number, embedUrl: string) {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        mode: "embed",
        file: null,
        preview: "",
        existingUrl: undefined,
        embedUrl,
      };
      return next;
    });
  }

  async function uploadImages() {
    const result: string[] = [];

    for (const item of images) {
      if (item.file) {
        const url = await uploadFile(item.file, "post-images");
        result.push(url);
      } else if (item.existingUrl) {
        result.push(item.existingUrl);
      }
    }

    return result;
  }

  async function uploadVideos() {
    const result: VideoPayload[] = [];

    for (const item of videos) {
      if (item.mode === "upload") {
        if (item.file) {
          const url = await uploadFile(item.file, "post-videos");
          result.push({ type: "upload", url });
        } else if (item.existingUrl) {
          result.push({ type: "upload", url: item.existingUrl });
        }
      }

      if (item.mode === "embed" && item.embedUrl.trim()) {
        result.push({
          type: "embed",
          url: item.embedUrl.trim(),
          provider: item.provider,
        });
      }
    }

    return result;
  }

  async function uploadAdImageIfNeeded() {
    if (!adImageFile) return existingAdImage || null;
    return uploadFile(adImageFile, "ads");
  }

  async function handleSubmit() {
    if (!title.trim()) return alert("Bạn chưa nhập tiêu đề");
    if (!slug.trim()) return alert("Bạn chưa nhập slug");

    setSubmitting(true);

    try {
      const [uploadedImages, uploadedVideos, uploadedAdImage] = await Promise.all([
        uploadImages(),
        uploadVideos(),
        uploadAdImageIfNeeded(),
      ]);

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        status,
        images: JSON.stringify(uploadedImages),
        videos: JSON.stringify(uploadedVideos),
        popup_link: popupLink.trim() || null,
        ad_title: adTitle.trim() || null,
        ad_desc: adDesc.trim() || null,
        ad_image: uploadedAdImage || null,
      };

      if (editingId) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editingId);
        if (error) throw error;
        alert("Cập nhật bài viết thành công");
      } else {
        const { error } = await supabase.from("posts").insert([payload]);
        if (error) throw error;
        alert("Đăng bài thành công");
      }

      resetForm();
      await loadPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      alert("Lỗi: " + (error.message || "Không xác định"));
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

    setImages(
      post.images && post.images.length
        ? post.images.map((url) => ({
            file: null,
            preview: url,
            existingUrl: url,
          }))
        : [{ file: null, preview: "" }]
    );

    setVideos(
      post.videos && post.videos.length
        ? post.videos.map((item) => {
            if (item.type === "upload") {
              return {
                mode: "upload" as const,
                file: null,
                preview: item.url,
                existingUrl: item.url,
                embedUrl: "",
                provider: "x" as const,
              };
            }

            return {
              mode: "embed" as const,
              file: null,
              preview: "",
              existingUrl: undefined,
              embedUrl: item.url,
              provider: item.provider || "x",
            };
          })
        : [
            {
              mode: "upload",
              file: null,
              preview: "",
              embedUrl: "",
              provider: "x",
            },
          ]
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

    await loadPosts();
    alert("Đã xóa bài");
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        !search.trim() ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.slug.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || post.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [posts, search, statusFilter]);

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

          <div className={cardClass}>
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
          </div>
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
                CMS admin pro v1
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Đăng bài, sửa bài, quản lý nhiều ảnh, video upload hoặc embed X/Telegram và popup quảng cáo.
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
            <div className={cardClass}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    Thông tin bài viết
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Viết tiêu đề, slug, nội dung và trạng thái bài viết.
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
            </div>

            <div className={cardClass}>
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                  HÌNH ẢNH
                </p>
              </div>

              <div className="space-y-4">
                {images.map((item, index) => (
                  <div key={index} className={blockClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-red-500">HÌNH ẢNH {index + 1}</h3>

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-lg text-gray-500"
                      >
                        × Xóa
                      </button>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateImageFile(index, e.target.files?.[0] || null)}
                      className="w-full"
                    />

                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`Ảnh ${index + 1}`}
                        className="mt-4 h-56 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addImage}
                  className="w-full rounded-2xl border border-dashed border-red-300 px-4 py-4 text-lg font-semibold text-red-500"
                >
                  + Thêm hình ảnh
                </button>
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">
                  VIDEO
                </p>
              </div>

              <div className="space-y-4">
                {videos.map((item, index) => (
                  <div key={index} className={blockClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-red-500">VIDEO {index + 1}</h3>

                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="text-lg text-gray-500"
                      >
                        × Xóa
                      </button>
                    </div>

                    <div className="mb-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setVideoMode(index, "upload")}
                        className={`rounded-xl px-4 py-2 font-semibold ${
                          item.mode === "upload"
                            ? "bg-red-500 text-white"
                            : "border border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        Upload từ máy
                      </button>

                      <button
                        type="button"
                        onClick={() => setVideoMode(index, "embed")}
                        className={`rounded-xl px-4 py-2 font-semibold ${
                          item.mode === "embed"
                            ? "bg-red-500 text-white"
                            : "border border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        Embed link
                      </button>
                    </div>

                    {item.mode === "upload" ? (
                      <>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={(e) => updateVideoFile(index, e.target.files?.[0] || null)}
                          className="w-full"
                        />

                        {item.preview ? (
                          <video
                            controls
                            className="mt-4 w-full rounded-2xl bg-black"
                            src={item.preview}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <select
                          className={inputClass}
                          value={item.provider}
                          onChange={(e) => updateVideoProvider(index, e.target.value as "x" | "telegram")}
                        >
                          <option value="x">X / Twitter</option>
                          <option value="telegram">Telegram</option>
                        </select>

                        <input
                          className={inputClass}
                          value={item.embedUrl}
                          onChange={(e) => updateVideoEmbed(index, e.target.value)}
                          placeholder={
                            item.provider === "telegram"
                              ? "https://t.me/channelname/123"
                              : "https://twitter.com/username/status/123456789"
                          }
                        />

                        {item.embedUrl.trim() ? (
                          <iframe
                            src={getEmbedPreviewUrl(item.provider, item.embedUrl)}
                            className="aspect-video w-full rounded-2xl border bg-white"
                            allowFullScreen
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVideo}
                  className="w-full rounded-2xl border border-dashed border-red-300 px-4 py-4 text-lg font-semibold text-red-500"
                >
                  + Thêm video
                </button>
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold text-gray-900">Popup quảng cáo</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Dùng cho popup affiliate hoặc banner quảng cáo.
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
                    placeholder="https://shopee.vn/product/..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Tiêu đề popup
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
                    Mô tả popup
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
                    Ảnh popup
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAdImageFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />

                  {adImagePreview ? (
                    <img
                      src={adImagePreview}
                      alt="Preview popup"
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : existingAdImage ? (
                    <img
                      src={existingAdImage}
                      alt="Popup hiện tại"
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>

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
            <div className={cardClass}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    Danh sách bài viết
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Tìm kiếm, lọc, sửa và xóa bài viết.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadPosts}
                  className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Tải lại
                </button>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <input
                  className={inputClass}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tiêu đề hoặc slug"
                />

                <select
                  className={inputClass}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>

              {fetchingPosts ? (
                <p className="text-gray-500">Đang tải bài viết...</p>
              ) : filteredPosts.length === 0 ? (
                <p className="text-gray-500">Chưa có bài viết nào.</p>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const firstImage = post.images?.[0] || "";

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
                            {post.created_at ? (
                              <p className="mt-1 text-sm text-gray-500">
                                {new Date(post.created_at).toLocaleString("vi-VN")}
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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}