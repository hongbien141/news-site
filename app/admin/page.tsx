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
  gallery_images: string | null;
  gallery_videos: string | null;
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

function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryVideoFiles, setGalleryVideoFiles] = useState<File[]>([]);

  const [existingCoverImage, setExistingCoverImage] = useState("");
  const [existingVideoUrl, setExistingVideoUrl] = useState("");
  const [existingAdImage, setExistingAdImage] = useState("");
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [existingGalleryVideos, setExistingGalleryVideos] = useState<string[]>([]);

  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [adImagePreview, setAdImagePreview] = useState("");
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  const [galleryVideoPreviews, setGalleryVideoPreviews] = useState<string[]>([]);

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

  useEffect(() => {
    if (galleryImageFiles.length === 0) {
      setGalleryImagePreviews([]);
      return;
    }

    const urls = galleryImageFiles.map((file) => URL.createObjectURL(file));
    setGalleryImagePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryImageFiles]);

  useEffect(() => {
    if (galleryVideoFiles.length === 0) {
      setGalleryVideoPreviews([]);
      return;
    }

    const urls = galleryVideoFiles.map((file) => URL.createObjectURL(file));
    setGalleryVideoPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryVideoFiles]);

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

    setGalleryImageFiles([]);
    setGalleryVideoFiles([]);

    setExistingCoverImage("");
    setExistingVideoUrl("");
    setExistingAdImage("");
    setExistingGalleryImages([]);
    setExistingGalleryVideos([]);

    setImagePreview("");
    setVideoPreview("");
    setAdImagePreview("");
    setGalleryImagePreviews([]);
    setGalleryVideoPreviews([]);
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

  async function uploadMultipleFiles(
    bucket: "images" | "videos",
    files: File[],
    folder = "posts"
  ) {
    if (files.length === 0) return [];

    const results: string[] = [];

    for (const file of files) {
      const url = await uploadFile(bucket, file, folder);
      results.push(url);
    }

    return results;
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
      const [
        coverImageUrl,
        videoUrl,
        adImageUrl,
        uploadedGalleryImages,
        uploadedGalleryVideos,
      ] = await Promise.all([
        uploadImageIfNeeded(),
        uploadVideoIfNeeded(),
        uploadAdImageIfNeeded(),
        uploadMultipleFiles("images", galleryImageFiles, "gallery-images"),
        uploadMultipleFiles("videos", galleryVideoFiles, "gallery-videos"),
      ]);

      const finalGalleryImages =
        uploadedGalleryImages.length > 0
          ? uploadedGalleryImages
          : existingGalleryImages;

      const finalGalleryVideos =
        uploadedGalleryVideos.length > 0
          ? uploadedGalleryVideos
          : existingGalleryVideos;

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
        gallery_images: JSON.stringify(finalGalleryImages),
        gallery_videos: JSON.stringify(finalGalleryVideos),
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
    setExistingGalleryImages(safeParseArray(post.gallery_images));
    setExistingGalleryVideos(safeParseArray(post.gallery_videos));

    setImageFile(null);
    setVideoFile(null);
    setAdImageFile(null);
    setGalleryImageFiles([]);
    setGalleryVideoFiles([]);

    setImagePreview("");
    setVideoPreview("");
    setAdImagePreview("");
    setGalleryImagePreviews([]);
    setGalleryVideoPreviews([]);

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

  function SectionTitle({
    title,
    desc,
  }: {
    title: string;
    desc?: string;
  }) {
    return (
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
        {desc ? <p className="mt-1 text-sm text-gray-500">{desc}</p> : null}
      </div>
    );
  }

  function Card({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <section
        className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        {children}
      </section>
    );
  }

  function Field({
    label,
    required,
    hint,
    children,
  }: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
          {hint ? <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span> : null}
        </label>
        {children}
      </div>
    );
  }

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";
  const textareaClass =
    "min-h-[140px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-red-300 focus:bg-white";
  const fileBoxClass =
    "rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4";

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
            <p className="mt-2 text-sm text-gray-500">
              Quản lý bài viết, ảnh, video và popup quảng cáo.
            </p>
          </div>

          <Card>
            <div className="space-y-4">
              <Field label="Email" required>
                <input
                  className={inputClass}
                  placeholder="Nhập email admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Mật khẩu" required>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <button
                onClick={handleLogin}
                className="w-full rounded-2xl bg-black px-5 py-3 font-semibold text-white transition hover:opacity-90"
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
                Công cụ quản trị
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
                Tạo bài viết nhanh ⚡
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Điền thông tin bài viết, thêm ảnh, thêm video, cấu hình popup quảng cáo
                rồi đăng ngay trên website.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle
                  title={isEditing ? "Chỉnh sửa bài viết" : "Thông tin bài viết"}
                  desc="Nhập tiêu đề, slug, nội dung và trạng thái bài viết."
                />
                {isEditing ? (
                  <button
                    onClick={resetForm}
                    className="h-fit rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                  >
                    Tạo bài mới
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4">
                <Field label="Tiêu đề bài viết" required>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    onBlur={() => {
                      if (!form.slug.trim() && form.title.trim()) {
                        updateForm("slug", slugify(form.title));
                      }
                    }}
                    placeholder="VD: Người hùng giữa đời thường"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Slug"
                    required
                    hint="không dấu, dùng cho link bài viết"
                  >
                    <input
                      className={inputClass}
                      value={form.slug}
                      onChange={(e) => updateForm("slug", slugify(e.target.value))}
                      placeholder="nguoi-hung-giua-doi-thuong"
                    />
                  </Field>

                  <Field label="Trạng thái" required>
                    <select
                      className={inputClass}
                      value={form.status}
                      onChange={(e) => updateForm("status", e.target.value)}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </select>
                  </Field>
                </div>

                <Field label="Nội dung bài viết" required hint="nội dung sẽ hiển thị trước ảnh và video">
                  <textarea
                    className={`${textareaClass} min-h-[240px]`}
                    value={form.content}
                    onChange={(e) => updateForm("content", e.target.value)}
                    placeholder="Nhập nội dung bài viết..."
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionTitle
                title="Hình ảnh bài viết"
                desc="Ảnh cover dùng cho trang chủ, ảnh nội dung dùng trong bài."
              />

              <div className="space-y-6">
                <Field label="Ảnh cover từ máy tính">
                  <div className={fileBoxClass}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setImageFile(file);
                      }}
                      className="w-full"
                    />
                  </div>

                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview ảnh cover"
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : existingCoverImage ? (
                    <img
                      src={existingCoverImage}
                      alt="Ảnh cover hiện tại"
                      className="mt-4 h-56 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                </Field>

                <Field label="Ảnh nội dung" hint="có thể chọn nhiều ảnh cùng lúc">
                  <div className={fileBoxClass}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setGalleryImageFiles(files);
                      }}
                      className="w-full"
                    />
                  </div>

                  {galleryImagePreviews.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {galleryImagePreviews.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Preview ảnh nội dung ${index + 1}`}
                          className="h-40 w-full rounded-2xl object-cover"
                        />
                      ))}
                    </div>
                  ) : existingGalleryImages.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {existingGalleryImages.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Ảnh nội dung ${index + 1}`}
                          className="h-40 w-full rounded-2xl object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </Field>
              </div>
            </Card>

            <Card>
              <SectionTitle
                title="Video bài viết"
                desc="Video chính hiển thị trước, các video nội dung hiển thị phía dưới."
              />

              <div className="space-y-6">
                <Field label="Video chính">
                  <div className={fileBoxClass}>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setVideoFile(file);
                      }}
                      className="w-full"
                    />
                  </div>

                  {videoPreview ? (
                    <video
                      controls
                      className="mt-4 w-full rounded-2xl bg-black"
                      src={videoPreview}
                    />
                  ) : existingVideoUrl ? (
                    <video
                      controls
                      className="mt-4 w-full rounded-2xl bg-black"
                      src={existingVideoUrl}
                    />
                  ) : null}
                </Field>

                <Field label="Video nội dung" hint="có thể chọn nhiều video cùng lúc">
                  <div className={fileBoxClass}>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setGalleryVideoFiles(files);
                      }}
                      className="w-full"
                    />
                  </div>

                  {galleryVideoPreviews.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {galleryVideoPreviews.map((src, index) => (
                        <video
                          key={index}
                          controls
                          className="w-full rounded-2xl bg-black"
                          src={src}
                        />
                      ))}
                    </div>
                  ) : existingGalleryVideos.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {existingGalleryVideos.map((src, index) => (
                        <video
                          key={index}
                          controls
                          className="w-full rounded-2xl bg-black"
                          src={src}
                        />
                      ))}
                    </div>
                  ) : null}
                </Field>
              </div>
            </Card>

            <Card>
              <SectionTitle
                title="Popup quảng cáo"
                desc="Thiết lập link, tiêu đề, mô tả và ảnh popup quảng cáo."
              />

              <div className="space-y-4">
                <Field label="Link popup quảng cáo">
                  <input
                    className={inputClass}
                    value={form.popupLink}
                    onChange={(e) => updateForm("popupLink", e.target.value)}
                    placeholder="https://s.shopee.vn/..."
                  />
                </Field>

                <Field label="Tiêu đề popup quảng cáo">
                  <input
                    className={inputClass}
                    value={form.adTitle}
                    onChange={(e) => updateForm("adTitle", e.target.value)}
                    placeholder="VD: Kem đánh răng trắng răng"
                  />
                </Field>

                <Field label="Mô tả popup quảng cáo">
                  <textarea
                    className={`${textareaClass} min-h-[110px]`}
                    value={form.adDesc}
                    onChange={(e) => updateForm("adDesc", e.target.value)}
                    placeholder="VD: Giảm 50% hôm nay"
                  />
                </Field>

                <Field label="Ảnh popup quảng cáo từ máy tính">
                  <div className={fileBoxClass}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setAdImageFile(file);
                      }}
                      className="w-full"
                    />
                  </div>

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
                </Field>
              </div>
            </Card>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl bg-black px-5 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting
                ? "Đang xử lý..."
                : isEditing
                ? "Lưu cập nhật bài viết"
                : "Đăng bài viết"}
            </button>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <SectionTitle
                  title="Danh sách bài viết"
                  desc="Bấm sửa để đổ dữ liệu về form, bấm xóa để gỡ bài khỏi website."
                />
                <button
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
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
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
                            onClick={() => handleEdit(post)}
                            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(post)}
                            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {post.cover_image ? (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="mt-4 h-44 w-full rounded-2xl object-cover"
                        />
                      ) : null}

                      {post.ad_image ? (
                        <img
                          src={post.ad_image}
                          alt={post.ad_title || "Ảnh quảng cáo"}
                          className="mt-4 h-32 w-full rounded-2xl object-cover"
                        />
                      ) : null}

                      {post.video_url ? (
                        <video
                          controls
                          className="mt-4 w-full rounded-2xl bg-black"
                          src={post.video_url}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle
                title="Hướng dẫn sử dụng"
                desc="Quy trình đăng bài nhanh theo đúng hệ thống hiện tại."
              />
              <ol className="space-y-3 text-sm leading-6 text-gray-600">
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    1
                  </span>
                  <span>Nhập tiêu đề, slug, nội dung và trạng thái bài viết.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    2
                  </span>
                  <span>Thêm ảnh cover, nhiều ảnh nội dung, video chính và nhiều video nội dung.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    3
                  </span>
                  <span>Nhập link popup quảng cáo, tiêu đề, mô tả và ảnh quảng cáo nếu cần.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    4
                  </span>
                  <span>Bấm đăng bài để lưu lên website. Nếu đang sửa, bấm lưu cập nhật.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    5
                  </span>
                  <span>Danh sách bài viết bên phải dùng để sửa nhanh hoặc xóa bài khỏi website.</span>
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}