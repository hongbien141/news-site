"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

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

type Post = {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  images: ImagePayload[] | null;
  videos: VideoPayload[] | null;
  popup_link?: string | null;
  ad_title?: string | null;
  ad_desc?: string | null;
  ad_image?: string | null;
  popup_link_2?: string | null;
  ad_title_2?: string | null;
  ad_desc_2?: string | null;
  ad_image_2?: string | null;
  created_at?: string;
};

type ImageItem = {
  file: File | null;
  preview: string;
  existingUrl?: string;
  sensitive: boolean;
};

type VideoItem = {
  mode: "upload" | "embed";
  file: File | null;
  preview: string;
  existingUrl?: string;
  embedUrl: string;
  provider: "x" | "telegram";
  sensitive: boolean;
};

const POSTS_PER_PAGE = 7;

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

async function uploadVideoViaApi(file: File) {
  const MAX_SIZE = 200 * 1024 * 1024;

  if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
    throw new Error("Chỉ hỗ trợ mp4, webm, ogg");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("Video vượt quá 200MB");
  }

  const presignRes = await fetch("/api/r2-presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const presignText = await presignRes.text();

  let presignData: { uploadUrl?: string; publicUrl?: string; error?: string } = {};

  try {
    presignData = JSON.parse(presignText);
  } catch {
    throw new Error(presignText || "Không tạo được URL upload");
  }

  if (!presignRes.ok) {
    throw new Error(presignData.error || "Không tạo được URL upload");
  }

  if (!presignData.uploadUrl || !presignData.publicUrl) {
    throw new Error("Thiếu uploadUrl hoặc publicUrl");
  }

  try {
    const uploadRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      const uploadText = await uploadRes.text();
      throw new Error(uploadText || `Upload trực tiếp lên R2 thất bại (${uploadRes.status})`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Upload lên R2 lỗi: ${error.message}`);
    }
    throw new Error("Upload lên R2 bị chặn hoặc thất bại");
  }

  return presignData.publicUrl;
}

function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "green" | "yellow" | "red" | "blue" | "purple";
}) {
  const toneMap = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
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
  const [currentPage, setCurrentPage] = useState(1);

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
  const [popupLink2, setPopupLink2] = useState("");
  const [adTitle2, setAdTitle2] = useState("");
  const [adDesc2, setAdDesc2] = useState("");
  const [adImageFile2, setAdImageFile2] = useState<File | null>(null);
  const [adImagePreview2, setAdImagePreview2] = useState("");
  const [existingAdImage2, setExistingAdImage2] = useState("");

  const [images, setImages] = useState<ImageItem[]>([
    { file: null, preview: "", sensitive: false },
  ]);

  const [videos, setVideos] = useState<VideoItem[]>([
    {
      mode: "upload",
      file: null,
      preview: "",
      embedUrl: "",
      provider: "x",
      sensitive: false,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setLoading(false);
    };

    void boot();
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

  useEffect(() => {
    if (!adImageFile2) {
      setAdImagePreview2("");
      return;
    }

    const objectUrl = URL.createObjectURL(adImageFile2);
    setAdImagePreview2(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [adImageFile2]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, posts.length]);

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

    const normalized = (data || []).map(
      (
        item: Omit<Post, "images" | "videos"> & {
          images: unknown;
          videos: unknown;
        }
      ) => ({
        ...item,
        images: safeParseImages(item.images),
        videos: safeParseVideos(item.videos),
      })
    ) as Post[];

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
    setPopupLink2("");
    setAdTitle2("");
    setAdDesc2("");
    setAdImageFile2(null);
    setAdImagePreview2("");
    setExistingAdImage2("");
    setImages([{ file: null, preview: "", sensitive: false }]);
    setVideos([
      {
        mode: "upload",
        file: null,
        preview: "",
        embedUrl: "",
        provider: "x",
        sensitive: false,
      },
    ]);
  }

  function addImage() {
    setImages((prev) => [...prev, { file: null, preview: "", sensitive: false }]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ file: null, preview: "", sensitive: false }];
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
        ...old,
        file,
        preview: file ? URL.createObjectURL(file) : old?.existingUrl || "",
        existingUrl: file ? undefined : old?.existingUrl,
      };

      return next;
    });
  }

  function updateImageSensitive(index: number, sensitive: boolean) {
    setImages((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sensitive,
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
        sensitive: false,
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
              sensitive: false,
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

  function updateVideoSensitive(index: number, sensitive: boolean) {
    setVideos((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sensitive,
      };
      return next;
    });
  }

  async function uploadImages() {
    const result: ImagePayload[] = [];

    for (const item of images) {
      if (item.file) {
        const url = await uploadFile(item.file, "post-images");
        result.push({
          url,
          sensitive: item.sensitive,
        });
      } else if (item.existingUrl) {
        result.push({
          url: item.existingUrl,
          sensitive: item.sensitive,
        });
      }
    }

    return result;
  }

  async function uploadVideos() {
    const result: VideoPayload[] = [];

    for (const item of videos) {
      if (item.mode === "upload") {
        if (item.file) {
          const url = await uploadVideoViaApi(item.file);
          result.push({
            type: "upload",
            url,
            sensitive: item.sensitive,
          });
        } else if (item.existingUrl) {
          result.push({
            type: "upload",
            url: item.existingUrl,
            sensitive: item.sensitive,
          });
        }
      }

      if (item.mode === "embed" && item.embedUrl.trim()) {
        result.push({
          type: "embed",
          url: item.embedUrl.trim(),
          provider: item.provider,
          sensitive: item.sensitive,
        });
      }
    }

    return result;
  }

  async function uploadAdImageIfNeeded() {
    if (!adImageFile) return existingAdImage || null;
    return uploadFile(adImageFile, "ads");
  }

  async function uploadAdImage2IfNeeded() {
    if (!adImageFile2) return existingAdImage2 || null;
    return uploadFile(adImageFile2, "ads");
  }

  async function handleSubmit() {
    if (!title.trim()) return alert("Bạn chưa nhập tiêu đề");
    if (!slug.trim()) return alert("Bạn chưa nhập slug");

    setSubmitting(true);

    try {
            const [uploadedImages, uploadedVideos, uploadedAdImage, uploadedAdImage2] =
        await Promise.all([
          uploadImages(),
          uploadVideos(),
          uploadAdImageIfNeeded(),
          uploadAdImage2IfNeeded(),
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
        popup_link_2: popupLink2.trim() || null,
        ad_title_2: adTitle2.trim() || null,
        ad_desc_2: adDesc2.trim() || null,
        ad_image_2: uploadedAdImage2 || null,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không xác định";
      alert("Lỗi: " + message);
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
    setPopupLink2(post.popup_link_2 || "");
    setAdTitle2(post.ad_title_2 || "");
    setAdDesc2(post.ad_desc_2 || "");
    setExistingAdImage2(post.ad_image_2 || "");
    setAdImageFile2(null);
    setAdImagePreview2("");

    setImages(
      post.images && post.images.length
        ? post.images.map((item) => ({
            file: null,
            preview: item.url,
            existingUrl: item.url,
            sensitive: !!item.sensitive,
          }))
        : [{ file: null, preview: "", sensitive: false }]
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
                sensitive: !!item.sensitive,
              };
            }

            return {
              mode: "embed" as const,
              file: null,
              preview: "",
              existingUrl: undefined,
              embedUrl: item.url,
              provider: item.provider || "x",
              sensitive: !!item.sensitive,
            };
          })
        : [
            {
              mode: "upload",
              file: null,
              preview: "",
              embedUrl: "",
              provider: "x",
              sensitive: false,
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

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const pageStart = (currentPage - 1) * POSTS_PER_PAGE;
  const pageEnd = currentPage * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(pageStart, pageEnd);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
                CMS admin pro v3
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Quản trị bài viết gọn hơn, rõ hơn, có thumbnail, badge trạng thái, phân trang và điều hướng nhanh ra frontend.
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

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Thông tin bài viết</h2>
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
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Tiêu đề</label>
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
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Slug</label>
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
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Nội dung</label>
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
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">HÌNH ẢNH</p>
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

                    <label className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={item.sensitive}
                        onChange={(e) => updateImageSensitive(index, e.target.checked)}
                      />
                      Đánh dấu nội dung nhạy cảm
                    </label>

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
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">VIDEO</p>
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
                        Link ngoài
                      </button>
                    </div>

                    <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={item.sensitive}
                        onChange={(e) => updateVideoSensitive(index, e.target.checked)}
                      />
                      Đánh dấu nội dung nhạy cảm
                    </label>

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
                          onChange={(e) =>
                            updateVideoProvider(index, e.target.value as "x" | "telegram")
                          }
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
                              : "https://x.com/username/status/123456789"
                          }
                        />

                        {item.embedUrl.trim() ? (
                          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                            <p className="font-medium text-gray-800">
                              Đã lưu link {item.provider === "telegram" ? "Telegram" : "X / Twitter"}:
                            </p>
                            <p className="mt-2 break-all">{item.embedUrl}</p>
                          </div>
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
                <h2 className="text-2xl font-extrabold text-gray-900">Quảng cáo bước 1</h2>
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

<div className={cardClass}>
  <div className="mb-5">
    <h2 className="text-2xl font-extrabold text-gray-900">Quảng cáo bước 2</h2>
    <p className="mt-1 text-sm text-gray-500">
      Sau khi người xem quay lại từ quảng cáo bước 1, chạm vào màn hình sẽ mở quảng cáo bước 2.
    </p>
  </div>

  <div className="space-y-4">
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        Link quảng cáo bước 2
      </label>
      <input
        className={inputClass}
        value={popupLink2}
        onChange={(e) => setPopupLink2(e.target.value)}
        placeholder="https://www.tiktok.com/view/product/..."
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        Tiêu đề quảng cáo bước 2
      </label>
      <input
        className={inputClass}
        value={adTitle2}
        onChange={(e) => setAdTitle2(e.target.value)}
        placeholder="Nhập tiêu đề quảng cáo bước 2"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        Mô tả quảng cáo bước 2
      </label>
      <textarea
        className="min-h-[110px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white"
        value={adDesc2}
        onChange={(e) => setAdDesc2(e.target.value)}
        placeholder="Nhập mô tả quảng cáo bước 2"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        Ảnh quảng cáo bước 2
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setAdImageFile2(e.target.files?.[0] || null)}
        className="w-full"
      />

      {adImagePreview2 ? (
        <img
          src={adImagePreview2}
          alt="Preview quảng cáo bước 2"
          className="mt-4 h-56 w-full rounded-2xl object-cover"
        />
      ) : existingAdImage2 ? (
        <img
          src={existingAdImage2}
          alt="Quảng cáo bước 2 hiện tại"
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
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Danh sách bài viết</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Thumbnail nhỏ, badge rõ ràng, quản lý nhanh hơn.
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

              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
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

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    statusFilter === "all"
                      ? "bg-black text-white"
                      : "border border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  Tất cả
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("published")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    statusFilter === "published"
                      ? "bg-green-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  Published
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("draft")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    statusFilter === "draft"
                      ? "bg-yellow-500 text-white"
                      : "border border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  Draft
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <span>
                  Tổng: <strong>{filteredPosts.length}</strong> bài
                </span>
                <span>
                  Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
                </span>
              </div>

              {fetchingPosts ? (
                <p className="text-gray-500">Đang tải bài viết...</p>
              ) : filteredPosts.length === 0 ? (
                <p className="text-gray-500">Chưa có bài viết nào.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedPosts.map((post) => {
                      const firstImage = post.images?.[0]?.url || "";
                      const hasImages = !!post.images?.length;
                      const hasVideos = !!post.videos?.length;
                      const hasPopup = !!post.popup_link;
                      const hasSensitive =
                        !!post.images?.some((item) => item.sensitive) ||
                        !!post.videos?.some((item) => item.sensitive);

                      return (
                        <div
                          key={post.id}
                          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex gap-4">
                            <div className="shrink-0">
                              {firstImage ? (
                                <img
                                  src={firstImage}
                                  alt={post.title}
                                  className="h-24 w-24 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                                  No img
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                  <h3 className="line-clamp-2 text-lg font-extrabold leading-6 text-gray-900">
                                    {post.title}
                                  </h3>

                                  <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                                    /{post.slug}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge tone={post.status === "published" ? "green" : "yellow"}>
                                      {post.status}
                                    </Badge>

                                    {hasImages ? <Badge tone="blue">Ảnh</Badge> : null}
                                    {hasVideos ? <Badge tone="purple">Video</Badge> : null}
                                    {hasPopup ? <Badge tone="red">Popup</Badge> : null}
                                    {hasSensitive ? <Badge tone="red">Nhạy cảm</Badge> : null}
                                  </div>

                                  {post.content ? (
                                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">
                                      {post.content}
                                    </p>
                                  ) : null}

                                  {post.created_at ? (
                                    <p className="mt-3 text-xs font-medium text-gray-500">
                                      {new Date(post.created_at).toLocaleString("vi-VN")}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                                  <Link
                                    href={`/${post.slug}`}
                                    target="_blank"
                                    className="rounded-2xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700"
                                  >
                                    Xem bài
                                  </Link>

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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredPosts.length > POSTS_PER_PAGE ? (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ← Trước
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            currentPage === page
                              ? "bg-black text-white"
                              : "border border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sau →
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}