export type ResultStatus = "pending" | "published";

export type ResultMember = {
  name: string;
  room?: string;
};

export type ResultEntry = {
  award: string;
  team?: string;
  title?: string;
  members: ResultMember[];
  score?: string;
  note?: string;
};

export type ActivityResult = {
  status: ResultStatus;
  announcementDate?: string;
  entries: ResultEntry[];
  note?: string;
  documentUrl?: string;
};

const pendingResult = (): ActivityResult => ({
  status: "pending",
  entries: [],
});

// เพิ่มผลการแข่งขันเฉพาะรายการที่คณะกรรมการรับรองแล้ว และเปลี่ยน status เป็น "published"
// แต่ละกิจกรรมเผยแพร่แยกกันได้ จึงไม่จำเป็นต้องรอผลครบทั้ง 11 รายการ
export const resultDirectory: Record<string, ActivityResult> = {
  "food-web": pendingResult(),
  "water-rocket-lower": pendingResult(),
  "science-quiz-lower": pendingResult(),
  "painting-lower": pendingResult(),
  "air-rocket": pendingResult(),
  "science-show-lower": pendingResult(),
  "water-rocket-upper": pendingResult(),
  "science-quiz-upper": pendingResult(),
  "painting-upper": pendingResult(),
  "science-show-upper": pendingResult(),
  "recycled-costume": pendingResult(),
};

export const resultAnnouncementNote = "ประกาศเฉพาะผลที่ผ่านการตรวจสอบและรับรองจากคณะกรรมการแล้ว";
