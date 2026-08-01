import Image from "next/image";
import Link from "next/link";

const STORYBOARD_FRAMES = [
  {
    slug: "360-spin-showcase",
    number: "01",
    name: "Listing Spin",
    spec: "1:1 · 5 sec",
    use: "Shop listing",
    position: "54% 52%",
  },
  {
    slug: "blind-box-unboxing",
    number: "02",
    name: "Blind-box Reveal",
    spec: "9:16 · 5 sec",
    use: "Drop day",
    position: "59% 43%",
  },
  {
    slug: "paparazzi-flash",
    number: "03",
    name: "Social Flash",
    spec: "9:16 · 5 sec",
    use: "Reels & shorts",
    position: "66% 51%",
  },
] as const;

const LAB_ASSET = "/brand/pikbo-lab-cat-moth.webp";

export function HomeCinemaHero() {
  return (
    <section
      id="home-create"
      data-home-hero="editorial-launch-studio"
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#F7F3EA] text-[#111111]"
      aria-labelledby="home-hero-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.045)_1px,transparent_1px)] [background-size:32px_32px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-14 lg:px-10 lg:py-20 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-14">
          <div className="max-w-[620px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#F7F3EA] sm:text-[10px]">
                One photo · three fixed videos
              </span>
              <span className="rounded-full border border-[#111111]/16 bg-white/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#111111]/48 sm:text-[10px]">
                Public format preview · no upload
              </span>
            </div>

            <h1
              id="home-hero-title"
              className="mt-5 max-w-[610px] font-display text-[clamp(3rem,6vw,6.25rem)] font-black leading-[0.89] tracking-[-0.067em] sm:mt-7"
            >
              Turn one toy photo into a{" "}
              <span className="block text-[#E94B35]">collector-ready launch.</span>
            </h1>

            <p className="mt-5 max-w-[540px] text-sm font-semibold leading-6 text-[#111111]/60 sm:mt-7 sm:text-lg sm:leading-8">
              Pikbo creates a Listing Spin, Blind-box Reveal, and Social Flash
              for designer toys—without prompts, model hunting, or timeline
              editing.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link
                href="/create?mode=seller-pack"
                className="inline-flex min-h-13 items-center justify-between rounded-full bg-[#E94B35] px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(233,75,53,0.2)] transition duration-200 hover:-translate-y-1 hover:bg-[#D83E2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
              >
                Create your Launch Pack
                <span aria-hidden className="ml-6 text-lg">↗</span>
              </Link>
              <a
                href="#pack-formats"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#111111]/20 bg-white/55 px-5 text-sm font-black text-[#111111] transition duration-200 hover:-translate-y-1 hover:border-[#111111]/45 hover:bg-white"
              >
                See the three formats
              </a>
            </div>

            <div className="mt-7 grid max-w-lg grid-cols-3 border-y border-[#111111]/14 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#111111]/42 sm:mt-9 sm:text-[10px]">
              <span>5 sec each</span>
              <span className="text-center">Fast 720p target</span>
              <span className="text-right">Private Library</span>
            </div>

            <Link
              href="/pricing"
              className="mt-4 inline-block text-[10px] font-black uppercase tracking-[0.15em] text-[#111111]/40 hover:text-[#E94B35]"
            >
              Founding Studio · coming soon
            </Link>
          </div>

          <div className="relative" data-home-same-sku-storyboard>
            <div
              className="absolute -right-4 -top-4 hidden h-24 w-24 rounded-full bg-[#E94B35] lg:block"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#D9D0C3] bg-[#FFFDFC] p-2.5 shadow-[0_20px_60px_rgba(17,17,17,0.10)] sm:rounded-[2rem] sm:p-4">
              <div className="flex items-center justify-between gap-4 px-1 pb-2.5 sm:pb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#E94B35]">
                    Pikbo Lab · art-direction board
                  </p>
                  <p className="mt-0.5 text-xs font-black sm:text-sm">
                    Mothcat No. 01 · one coherent SKU
                  </p>
                </div>
                <span className="rounded-full border border-[#111111]/12 bg-[#F7F3EA] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#111111]/45 sm:text-[9px]">
                  Storyboard target
                </span>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] bg-[#E8E0D3] sm:aspect-[16/9] sm:rounded-[1.5rem]">
                <Image
                  src={LAB_ASSET}
                  alt="Original cream, cobalt, and red Mothcat designer-toy art-direction study"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 58vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#111111]/75 via-[#111111]/18 to-transparent p-3 pt-12 text-white sm:p-5 sm:pt-20">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">
                      Input subject
                    </p>
                    <p className="mt-1 text-base font-black sm:text-xl">
                      Same toy. Three selling moments.
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#111111] sm:block">
                    Original Pikbo concept
                  </span>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 sm:mt-3 sm:gap-3">
                {STORYBOARD_FRAMES.map((format) => (
                  <Link
                    key={format.slug}
                    href="/create?mode=seller-pack"
                    data-home-format-preview={format.slug}
                    className="group min-w-0 overflow-hidden rounded-xl border border-[#111111]/10 bg-[#F7F3EA] transition duration-200 hover:-translate-y-1 hover:border-[#E94B35]/50 sm:rounded-2xl"
                    aria-label={`Preview ${format.name} format`}
                  >
                    <div className="relative hidden aspect-[4/3] overflow-hidden sm:block">
                      <Image
                        src={LAB_ASSET}
                        alt=""
                        fill
                        sizes="(max-width: 1023px) 30vw, 18vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        style={{ objectPosition: format.position }}
                      />
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] font-black text-[#E94B35] sm:text-[9px]">
                          {format.number}
                        </span>
                        <span className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-[#111111]/34 sm:text-[8px]">
                          {format.use}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] font-black leading-tight sm:text-sm">
                        {format.name}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-[#111111]/42 sm:text-[9px]">
                        {format.spec}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <p className="px-1 pb-0.5 pt-3 text-[9px] font-semibold leading-4 text-[#111111]/42 sm:text-[10px]">
                Pikbo Lab art-direction storyboard—not a customer Pack or a
                generated result. Public visitors preview formats here; invited
                sellers upload only inside the private Create flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
