export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ef] px-4 text-[#111]">
      <a
        href="https://t.me/hongbien141"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center text-center"
      >
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-sky-500 text-6xl font-extrabold text-white shadow-xl transition group-hover:scale-105">
          ✈
        </div>

        <h1 className="mt-6 text-4xl font-extrabold">
          Hóng Biến 141
        </h1>

        <p className="mt-3 text-xl font-semibold text-sky-600 underline">
          Tham gia kênh Telegram
        </p>
      </a>
    </main>
  );
}