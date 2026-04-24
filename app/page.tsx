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
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-[32px] bg-sky-400/30" />

          <div className="relative flex h-32 w-32 animate-bounce items-center justify-center overflow-hidden rounded-[30px] bg-gradient-to-br from-sky-400 to-sky-600 shadow-2xl shadow-sky-300/60 transition group-hover:scale-105">
            <img
              src="/telegram.svg"
              alt="Telegram"
              className="h-20 w-20 object-contain drop-shadow-md transition group-hover:scale-110"
            />
          </div>
        </div>

        <h1 className="mt-6 text-4xl font-extrabold">Hóng Biến 141</h1>

        <p className="mt-3 text-xl font-semibold text-sky-600 underline">
          Tham gia kênh Telegram
        </p>
      </a>
    </main>
  );
}