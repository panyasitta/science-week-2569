"use client";

import type { ReactNode } from "react";
import { competitions } from "./competitions";
import { resultDirectory, type ActivityResult } from "./results";
import type { PublicCertificate } from "./lib/certificate-model";

type FileMatrix = Record<string, Array<Array<string | null>>>;

const paintingLowerResult: ActivityResult = {
  status: "published",
  announcementDate: "31 สิงหาคม 2569",
  entries: [
    {
      award: "รางวัลชนะเลิศ",
      team: "8",
      members: [
        { name: "เด็กหญิงพลอยชมพู ติ๊บถาวงค์", room: "ม.2/2" },
        { name: "เด็กหญิงอภิสรา จิ๋วเดช", room: "ม.2/2" },
        { name: "เด็กหญิงแกมกาญจน์ เขาวิมาร", room: "ม.2/2" },
      ],
    },
    {
      award: "รองชนะเลิศ อันดับ 1",
      team: "12",
      members: [
        { name: "เด็กหญิงศุภาพิชญ์ แท่นทอง", room: "ม.1 ห้อง SM1/1" },
        { name: "เด็กหญิงนรินทร์พร ต้นกล", room: "ม.1 ห้อง SM1/2" },
        { name: "เด็กหญิงสิริธร สรรพการ", room: "ม.1 ห้อง SM1/2" },
      ],
    },
    {
      award: "รองชนะเลิศ อันดับ 2",
      team: "15",
      members: [
        { name: "นายดนุพล ปาลี", room: "ม.3/1" },
        { name: "เด็กหญิงสุกัญญา บัวทอง", room: "ม.3/1" },
        { name: "เด็กหญิงชนกนันท์ ตาแดงสาย", room: "ม.3/1" },
      ],
    },
  ],
};

// File order follows award order and member order on each verified result entry.
// Two Science Show lower-secondary files are intentionally withheld because the names printed
// on the certificates do not match the latest verified result names on the website.
const driveFiles: FileMatrix = {
  "food-web": [
    ["1Y3Rx27iSt2PaNa9LZicet9AvF_lDW7nP", "1nJwpXqX0xrH5rz1kYqYAZswLX8ro89Aq"],
    ["1kphlRJchGJ3y7puY-QMF0CCm0NNXSwSF", "19zZzlmJ9qk3suXX7R496iP1Qy4tsPc3x"],
    ["1Z-f93npm1aMKWf70AUS6QV3JaRcSYmuX", "1cU553OtGhItl6fTnfvqH9iJgE66-lfNe"],
  ],
  "air-rocket": [
    ["1vBxaoTlxR1tOKDEvN0-IFj31hXTdL5Yd", "1vxicvKQhIJIA2TnhIKhtS0Rbl6SarPMW"],
    ["1dZpbH2kQdwbsnP3pBcxE3AZ6kypIafzE", "1Whn_6igmxXGSs6_sPrj0lmtE1q5TL0HI"],
    ["18i0P4hJMzYfDQDZG2QukwtZkubEbA3Vl", "1YEOsiUef2LJRH_eJGOH49JDvwS_xThzo"],
  ],
  "science-quiz-lower": [
    ["10e6meQLwHtkjEpe5W8HXTASBRl1XKIWT", "1Qlt37FvRn_JmfDJgwRBilytA6i0ETw7h"],
    ["116T6sgsV8wRwSme8zeIOMQ0HbvW2oHm7", "1Z6BeKGPXf4WlhoF03Ta3xpOo83_VMKo1"],
    ["1X6QB9nRtmpaWHBRWr3P_UrYAh2nX1nzk", "1EZ2gAeM88cQiemeX9-lANvvLAzQmmiUr"],
  ],
  "science-quiz-upper": [
    ["1JhmVIxQI08mwyXhzfX789r4Bc-JqvILy", "1Sx0neQwHfvkWbJ9vQQ8-OsnOYRvKRS-L"],
    ["1isuDVqi6g9h0MvXkE0hWCgg_7fsZnnM8", "12kinmjH0rw9YVV5hqV_XmqfnDa648WPh"],
    ["1aS_eXofddFFX7aAe8mgIVBsigoSjcJOd", "1mE-42rsZsVYWvBcGAlyQHQFdnOA49idQ"],
  ],
  "painting-lower": [
    ["1ZgFWKNDNr5IkE8IpLjUzduCQdMfZ_EE-", "1-8B5bNwRNq5bsr___KPtZAJGkPekuaMV", "17XUd4Nr-51jjvgfofunOrqbrRc8vLVGW"],
    ["1KeH8ViaD7_L9aEN-xahfa9Jo7NOQG_A6", "1wpjuz8_o2Nt0DhG-kU3Z2RQfBbyrp72k", "1yanY-nxaeaGG2rqicNY0AfNvsRf5Sdfj"],
    ["1UTZiGhKpCcHAJ5li3rvAO2R5GpcvEghE", "1NXNFN4qwxCuZIC-r-J5UW5uM3ienjJIF", "16mNsV2gk0-xDBxz8gdvEEhsCre3tJAn0"],
  ],
  "painting-upper": [
    ["1pxAcArAkgUl_YWAmO7P4YTB00XSmW-gk", "18VsDiZ5NPV8KZTfPSDDJplPpLYH2rIIB", "1mQ2S0QoF516oh1eLNZPqhW6M1ubLfZ3z"],
    ["1DM8M1vyNuAL5Jo92dozJwk31YwEeC7Y4", "1GyLuBNeHArrBUqzrJ5WX_5pvNptDPG0z", "1JqY-pzgpn-75gyv5iX9gq0jHl8Jf9q7S"],
    ["1pq60nu592HouNTDhczr5nfw_XHgv6US8", "1Z8ai82DCLCxiZ7mSCrrAHTv63yROrSkc", "1dI6q6zS5rrqOV3PleGcqyUduGh_5_HD_"],
  ],
  "science-show-lower": [
    [null, "1dNj-CiprvBRrw7n5PCz0uApPnwn4LJ5F", "14FKdJi0h__UAHGv95Uvzuso0qbuSUF56"],
    ["1YLK5zCK8iRvhHOwkzw0AqHdhUWUWzpPJ", null, "1Y1TZRX-wfXOIYXWI5wWpKhJldTeeZ4IR"],
    ["1Z5zkrwcDKTZ63Jv3ufCAtcZP7xt2TptV", "1jid9bpMwvbqiBzL9gG32ewrzCpOF1-Lk", "1CGXjA0bbE1yg3U0vDBT5IDNTDcBKvnKT"],
  ],
  "science-show-upper": [
    ["1MOf_G55mtgcNL1F-NG00vNDuXueE2-JS", "13V3nrsG4Gc7YQK3cTF-4ZfadcOwyFKO7", "1GQ4NwsFa38he_LWHvoGXe4uf9ZNXCB2-"],
    ["1CYBaR2tv1QBGb4NOIYqWvBe-d7Tz6_pX", "18VgMrkhzEUNSnsGWsL8N9qI_dMSliJpK", "1oEWuazsjTDHOtyaypkizblr23ZP9L4Q_"],
    ["1freKvpUOZfxdruolrO6Peuyrzo-K-g9a", "1PjsUPQRn-EpdTRL_u_fkOhLaVwFnJ65b", "1mDQe5rRIecr-YKf7_dm4DNqWtZsazzyr"],
  ],
};

const imageExtension: Record<string, string> = {
  "air-rocket": "png",
};

function makeDriveCertificates(): PublicCertificate[] {
  const activityMap = new Map(competitions.map((activity) => [activity.id, activity]));
  const resultMap: Record<string, ActivityResult> = {
    ...resultDirectory,
    "painting-lower": paintingLowerResult,
  };
  const certificates: PublicCertificate[] = [];

  for (const [activityId, awardFiles] of Object.entries(driveFiles)) {
    const activity = activityMap.get(activityId);
    const result = resultMap[activityId];
    if (!activity || !result) continue;

    result.entries.forEach((entry, entryIndex) => {
      entry.members.forEach((member, memberIndex) => {
        const fileId = awardFiles[entryIndex]?.[memberIndex];
        if (!fileId) return;
        const ext = imageExtension[activityId] ?? "jpg";
        certificates.push({
          id: `drive-${fileId}`,
          activityId,
          activityTitle: activity.shortTitle,
          activityLevel: activity.levelLabel,
          recipientName: member.name,
          recipientRoom: member.room ?? null,
          teamName: entry.team ?? null,
          award: entry.award,
          fileName: `เกียรติบัตร_${member.name}.${ext}`,
          sizeBytes: 0,
          createdAt: "2026-08-25T00:00:00.000Z",
          publishedAt: "2026-08-26T00:00:00.000Z",
          downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        });
      });
    });
  }

  return certificates;
}

const driveCertificates = makeDriveCertificates();
let fetchPatched = false;

function certificateKey(certificate: PublicCertificate): string {
  return [certificate.activityId, certificate.recipientName.trim().toLocaleLowerCase("th"), certificate.award ?? ""].join("::");
}

function mergeCertificates(liveCertificates: PublicCertificate[]): PublicCertificate[] {
  const merged = new Map<string, PublicCertificate>();
  driveCertificates.forEach((certificate) => merged.set(certificateKey(certificate), certificate));
  liveCertificates.forEach((certificate) => merged.set(certificateKey(certificate), certificate));
  return [...merged.values()];
}

function isCertificateListRequest(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, window.location.href);
    return url.pathname.endsWith("/api/certificates") && !url.search;
  } catch {
    return false;
  }
}

function installCertificateFetchPatch(): void {
  if (typeof window === "undefined" || fetchPatched) return;
  fetchPatched = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isCertificateListRequest(input)) return nativeFetch(input, init);

    try {
      const response = await nativeFetch(input, init);
      if (!response.ok) {
        return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), certificates: driveCertificates }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      const payload = await response.clone().json() as { certificates?: PublicCertificate[]; generatedAt?: string };
      const liveCertificates = Array.isArray(payload.certificates) ? payload.certificates : [];
      return new Response(JSON.stringify({ ...payload, certificates: mergeCertificates(liveCertificates) }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch {
      return new Response(JSON.stringify({ generatedAt: new Date().toISOString(), certificates: driveCertificates }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  };
}

export default function CertificateFetchPatch({ children }: { children: ReactNode }) {
  installCertificateFetchPatch();
  return children;
}
