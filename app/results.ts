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
  "food-web": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        members: [
          { name: "เด็กหญิงสิริพรรธน์ เอกสมาธิกุล" },
          { name: "เด็กหญิงศิรานันต์ เอกสมาธิกุล" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        members: [
          { name: "นายดนุพล ปาลี" },
          { name: "เด็กหญิงชนกนันท์ ตาแดงสาย" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        members: [
          { name: "เด็กชายณัฐวัฒน์ บำรุง" },
          { name: "เด็กชายพิชากร คำวาท" },
        ],
      },
    ],
  },
  "water-rocket-lower": pendingResult(),
  "science-quiz-lower": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        team: "61",
        members: [
          { name: "เด็กหญิงมณีภรณ์ อนุกูล", room: "ม.3 ห้อง SM3" },
          { name: "เด็กหญิงปิยภัทร เขียวดวงดี", room: "ม.3 ห้อง SM3" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        team: "58",
        members: [
          { name: "เด็กหญิงกฤษณรัตน์ อุทรณ์", room: "ม.2 ห้อง SM2" },
          { name: "เด็กหญิงพิชากร คำวาท", room: "ม.2 ห้อง SM2" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        team: "62",
        members: [
          { name: "เด็กหญิงพิมพ์พร เงินทอง", room: "ม.3 ห้อง SM3" },
          { name: "เด็กหญิงศิรานันต์ เอกสมาธิกุล", room: "ม.3 ห้อง SM3" },
        ],
      },
    ],
  },
  "painting-lower": pendingResult(),
  "air-rocket": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        members: [
          { name: "เด็กหญิงโชติการ์ ยะลา", room: "ม.2/SM2" },
          { name: "เด็กหญิงธัญพร เทศรังสี", room: "ม.2/SM2" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        members: [
          { name: "เด็กหญิงวนิศรา แก้วงาม", room: "ม.3/1" },
          { name: "เด็กหญิงจิราพัชร อุประ", room: "ม.3/1" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        members: [
          { name: "เด็กชายกันทรากร โหน่งบึ้ง", room: "ม.2/1" },
          { name: "เด็กชายภูรชา นันตาดี", room: "ม.2/1" },
        ],
      },
    ],
  },
  "science-show-lower": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        members: [
          { name: "เด็กหญิงกันต์มล สุขนุ่ม" },
          { name: "เด็กหญิงปภัสรา เครือแจ้" },
          { name: "เด็กหญิงปทิตตา เจิมขุนทด" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        members: [
          { name: "เด็กหญิงภาสินี คำไวโย" },
          { name: "เด็กหญิงธัญยรัตน์ วงศ์อ่อน" },
          { name: "เด็กหญิงพิมพกานต์ ยอดแสน" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        members: [
          { name: "เด็กหญิงภัทรภรณ์ อังศุภัทร์" },
          { name: "เด็กหญิงพัชราภา ภู่รพ" },
          { name: "เด็กหญิงณัฐชานันท์ แซ่เติ๋น" },
        ],
      },
    ],
  },
  "water-rocket-upper": pendingResult(),
  "science-quiz-upper": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        team: "รถขนงัว",
        members: [
          { name: "นางสาวพรสินี สมวงศ์", room: "ม.6/1" },
          { name: "นางสาวชาลิสา โพธาเมือง", room: "ม.6/1" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        team: "ลูกสาวมี๊ละเอียดกับม๊าเปล์",
        members: [
          { name: "นางสาวอาทิติยา ทิงาเครือ", room: "ม.6/1" },
          { name: "นางสาวณัฎฐธิดา สายสมบัติ", room: "ม.6/1" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        team: "With tha ya sart",
        members: [
          { name: "นางสาวธัญพิมล ทองสุข", room: "ม.5 ห้อง SM5" },
          { name: "นางสาวภัควลัญชญ์ จีนาวุฒิ", room: "ม.5 ห้อง SM5" },
        ],
      },
    ],
  },
  "painting-upper": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        members: [
          { name: "นางสาวกัญญาภัค ยิ่งสุข ทุตะกิจ" },
          { name: "นางสาวณิชาภัทร คำถาเครือ" },
          { name: "นางสาวมนัสนันท์ สิทธิวะ" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        members: [
          { name: "นางสาวสโรชา มุ้งม่าน" },
          { name: "นางสาวปรายฟ้า ต้วนยี่" },
          { name: "นางสาวเสาวลักษณ์ บุญหล้า" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        members: [
          { name: "นายเกียรติภูมิ เจริญทั่ว" },
          { name: "นางสาวปภาดา ดอกกุหลาบ" },
          { name: "นางสาวสุพัตรา รจนา" },
        ],
      },
    ],
  },
  "science-show-upper": {
    status: "published",
    announcementDate: "26 สิงหาคม 2569",
    entries: [
      {
        award: "รางวัลชนะเลิศ",
        members: [
          { name: "นางสาวณัฐวดี วงษ์สา" },
          { name: "นางสาวเอื้องฟ้า แสงทอง" },
          { name: "นางสาวจรรยพร สิทธิวงศ์" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 1",
        members: [
          { name: "นางสาวจารวี จารุวัฒนชัย" },
          { name: "นางสาวทิวาพร สุวรรณบุตร" },
          { name: "นางสาวสุกัลยา มาคำสาย" },
        ],
      },
      {
        award: "รองชนะเลิศ อันดับ 2",
        members: [
          { name: "นางสาวจันทนี อยู่พ่วง" },
          { name: "นางสาวพิชชาภา ปานไธสง" },
          { name: "นางสาวพิชญา ใจเปี้ย" },
        ],
      },
    ],
  },
  "recycled-costume": pendingResult(),
};

export const resultAnnouncementNote = "ประกาศเฉพาะผลที่ผ่านการตรวจสอบและรับรองจากคณะกรรมการแล้ว";
