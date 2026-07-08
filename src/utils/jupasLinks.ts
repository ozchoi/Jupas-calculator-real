import type { Institution, Programme } from "../types/programme";

const jupasInstitutionSlug: Partial<Record<Institution, string>> = {
  HKU: "hku",
  CUHK: "cuhk",
  HKUST: "hkust",
  PolyU: "polyu",
  CityUHK: "cityuhk",
  HKBU: "hkbu",
  EdUHK: "eduhk",
  LingU: "lingnanu",
  HKMU: "hkmu",
  HSUHK: "sssdp",
  SFU: "sssdp",
  HKCHC: "sssdp",
  TWC: "sssdp",
  "VTC-THEi": "sssdp",
  UOWCHK: "sssdp",
  HKSYU: "sssdp",
  SSSDP: "sssdp",
};

export function jupasProgrammeUrl(programme: Programme): string {
  const slug = programme.category === "SSSDP" ? "sssdp" : jupasInstitutionSlug[programme.institution];
  return `https://www.jupas.edu.hk/en/programme/${slug ?? "search"}/${programme.jupasCode}/`;
}
