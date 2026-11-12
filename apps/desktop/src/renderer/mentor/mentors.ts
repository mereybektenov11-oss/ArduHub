// AI mentors of ArduHub (same ids and names as the site's mentorDeck in
// src/content/cabinet.ru.ts) with what the code needs to animate them:
// the waving hand as a polygon in the 384×384 image and the wrist pivot.
// The voice of each mentor lives in sound/sfx.ts.
export type MentorId = "volt" | "oma" | "rezik" | "shina";

export type MentorRig = {
  name: string;
  /** Hand (and held tool) outline, image pixels of the 384×384 art. */
  hand: [number, number][];
  /** Wrist: the hand rotates around this point. */
  pivot: [number, number];
  /** Wave range in degrees (keyframes 25% and 75%). Chosen per mentor so the
   *  rotated hand never uncovers art it overlaps in the flat image. */
  wave: [number, number];
};

export const mentorRigs: Record<MentorId, MentorRig> = {
  volt: {
    name: "Вольтик",
    hand: [
      [20, 90],
      [112, 92],
      [120, 160],
      [96, 178],
      [40, 172],
      [18, 130],
    ],
    pivot: [104, 160],
    wave: [-16, 14],
  },
  oma: {
    name: "Ома",
    hand: [
      [44, 128],
      [116, 126],
      [118, 166],
      [108, 188],
      [50, 186],
    ],
    pivot: [110, 170],
    wave: [-14, -2], // only away from the body: the wrist overlaps it
  },
  rezik: {
    name: "Резик",
    hand: [
      [50, 82],
      [122, 82],
      [126, 140],
      [114, 176],
      [114, 234],
      [78, 234],
      [48, 176],
    ],
    pivot: [98, 218],
    wave: [3, 10], // only towards the face: the lens overlaps the visor
  },
  shina: {
    name: "Шина",
    hand: [
      [262, 76],
      [310, 76],
      [306, 166],
      [262, 166],
    ],
    pivot: [282, 158],
    wave: [-14, 16],
  },
};

export const defaultMentor: MentorId = "volt";

/** The mentor chosen in the account progress, or the default one. */
export function selectedMentor(progressData: unknown): MentorId {
  const id = (progressData as { mentor?: { selectedId?: unknown } } | null)
    ?.mentor?.selectedId;
  return typeof id === "string" && id in mentorRigs
    ? (id as MentorId)
    : defaultMentor;
}
