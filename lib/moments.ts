export const MOMENT_IDS = [
  "capsule-reveal",
  "hangar-ignition",
  "colorblock-pedestal",
  "softroom-morning",
  "gallery-spotlight",
  "alley-drop-flash",
] as const;

export type MomentId = (typeof MOMENT_IDS)[number];

export type PikboMoment = {
  id: MomentId;
  name: string;
  index: string;
  toyType: string;
  desire: string;
  sellerUse: string;
  useLabel: string;
  media: string;
  alt: string;
  objectPosition: string;
  evidence: "Official Concept";
};

export const MOMENTS: readonly PikboMoment[] = [
  {
    id: "capsule-reveal",
    name: "Capsule Reveal",
    index: "01",
    toyType: "Blind box",
    desire: "Open the capsule. Reveal the character collectors chase.",
    sellerUse: "Blind-box reveal / collector launch",
    useLabel: "Reveal",
    media: "/moments/capsule-reveal.jpg",
    alt: "Original abstract blind-box toy emerging from an ivory paper package on a navy display plinth",
    objectPosition: "50% 53%",
    evidence: "Official Concept",
  },
  {
    id: "hangar-ignition",
    name: "Hangar Ignition",
    index: "02",
    toyType: "Mecha",
    desire: "Wake the machine. Bring your toy into a cinematic arrival.",
    sellerUse: "Mecha drop / hero launch",
    useLabel: "Drop",
    media: "/moments/hangar-ignition.jpg",
    alt: "Original angular mecha collectible entering a brutalist concrete exhibition stage",
    objectPosition: "42% 50%",
    evidence: "Official Concept",
  },
  {
    id: "colorblock-pedestal",
    name: "Colorblock Pedestal",
    index: "03",
    toyType: "Sofubi / vinyl",
    desire: "Put your collectible on a bold designer showcase stage.",
    sellerUse: "Product reveal / listing display",
    useLabel: "Display",
    media: "/moments/colorblock-pedestal.jpg",
    alt: "Original cobalt-blue sofubi character on a sunlit artist studio table",
    objectPosition: "39% 51%",
    evidence: "Official Concept",
  },
  {
    id: "softroom-morning",
    name: "Softroom Morning",
    index: "04",
    toyType: "Art plush",
    desire: "Let your plush character wake inside a handcrafted world.",
    sellerUse: "Plush launch / social storytelling",
    useLabel: "Story",
    media: "/moments/softroom-morning.jpg",
    alt: "Long-limbed handmade plush character walking through a blue stitched miniature landscape",
    objectPosition: "56% 50%",
    evidence: "Official Concept",
  },
  {
    id: "gallery-spotlight",
    name: "Gallery Spotlight",
    index: "05",
    toyType: "Art sculpture",
    desire: "Frame your sculpture like a collectible piece of art.",
    sellerUse: "Art-toy showcase / premium display",
    useLabel: "Exhibit",
    media: "/moments/gallery-spotlight.jpg",
    alt: "Original ivory loop sculpture with a smoke-glass core on a stone museum pedestal",
    objectPosition: "66% 50%",
    evidence: "Official Concept",
  },
  {
    id: "alley-drop-flash",
    name: "Alley Drop Flash",
    index: "06",
    toyType: "Street vinyl",
    desire: "Turn your toy drop into a street-level collector moment.",
    sellerUse: "Social drop / campaign teaser",
    useLabel: "Tease",
    media: "/moments/alley-drop-flash.jpg",
    alt: "Original black white and vermilion street toy photographed with direct flash in a tiled underpass",
    objectPosition: "67% 52%",
    evidence: "Official Concept",
  },
] as const;

export const DEFAULT_MOMENT_ID: MomentId = "capsule-reveal";

export function parseMomentId(value: unknown): MomentId | null {
  return typeof value === "string" &&
    MOMENT_IDS.includes(value as MomentId)
    ? (value as MomentId)
    : null;
}

export function getMoment(id: MomentId): PikboMoment {
  return MOMENTS.find((moment) => moment.id === id) ?? MOMENTS[0];
}
