from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PROGRAMMES = ROOT / "src" / "data" / "programmes.json"

CITYU_PDF = Path("/Users/chunyinchoi/Desktop/2026_JUPAS_AdmissionScoreFormulaAndScores.pdf")
EDUHK_PDF = Path("/Users/chunyinchoi/Downloads/EdUHK_Entrance Requirements and Admission Score Calculation.pdf")
LINGU_PDF = Path("/Users/chunyinchoi/Downloads/Admission Requirements_JUPAS (UG Website).pdf")
HKU_INFO_PDF = Path("/Users/chunyinchoi/Desktop/HKU-JUPAS-Admissions-Information-2026.pdf")


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\n", " ")).strip()


def number_or_none(value: Any) -> float | None:
    text = clean(value)
    if not text or text in {"-", "–", "New Programme in 2026 JUPAS"}:
        return None
    match = re.search(r"\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else None


def subject_aliases(label: str) -> list[str]:
    text = clean(label)
    text = text.replace("Mathematics (Compulsory Part)", "Mathematics")
    text = text.replace("Maths", "Mathematics")
    text = text.replace("Math,", "Math /")
    text = text.replace("Math and", "Mathematics /")
    text = text.replace("Math ", "Mathematics ")
    text = text.replace("English", "English Language")
    text = text.replace("Chinese Language Language", "Chinese Language")
    text = text.replace("Mathematics Extended Part Module 1 (Calculus & Statistics)", "M1")
    text = text.replace("Mathematics Extended Part Module 2 (Algebra & Calculus)", "M2")
    text = text.replace("Mathematics Extended Part (Module 1 or 2)", "M1/M2")
    text = text.replace("Information and Communication Technology", "ICT")
    text = text.replace("Literature in English", "English Literature")
    text = text.replace("Business, Accounting and Financial Studies", "BAFS")
    text = text.replace("Design and Applied Technology", "DAT")

    pieces = re.split(r"\s*/\s*|\s*,\s*|\s+or\s+|\s+and\s+", text)
    subjects: list[str] = []
    for piece in pieces:
        item = clean(piece)
        if not item:
            continue
        item = item.replace("Mathematics", "Mathematics Compulsory Part")
        item = item.replace("Chinese", "Chinese Language") if item == "Chinese" else item
        item = item.replace("English Language Language", "English Language")
        if item in {"M1", "Module 1"}:
            subjects.append("M1")
        elif item in {"M2", "Module 2"}:
            subjects.append("M2")
        elif item in {"M1/M2", "M1 M2"}:
            subjects.extend(["M1", "M2"])
        elif item in {"ICT", "Information Communication Technology"}:
            subjects.append("ICT")
        elif item in {"DAT"}:
            subjects.append("Design and Applied Technology")
        elif item in {
            "other elective subjects",
            "Other elective subjects",
            "Other Subjects",
            "Specified ApL subject(s)",
            "Combined Science",
            "Integrated Science",
            "Applied Learning",
            "N/A",
            "A",
        }:
            continue
        elif item:
            subjects.append(item)
    return sorted(set(subjects))


def formula_type(formula: str) -> str:
    text = formula.lower()
    if "3 core + 2 elective" in text:
        return "THREE_CORE_PLUS_TWO_ELECTIVE"
    if "best 5" in text and "0.5 x 6th" in text:
        return "BEST_5_PLUS_BONUS"
    if "best 6" in text:
        return "BEST_6"
    if "best 4" in text and not re.search(r"\beng\b|\bchin\b|math", text):
        return "BEST_4"
    if "best 5" in text and not re.search(r"\beng\b|\bchin\b|math", text):
        return "BEST_5"
    if "eng + math + best 3" in text:
        return "ENG_MATH_PLUS_BEST_3"
    return "CUSTOM_WEIGHTED"


def parse_colon_weights(raw: str) -> list[dict[str, Any]]:
    text = clean(raw)
    if text in {"", "1"}:
        return []
    rules: list[dict[str, Any]] = []
    matches = list(re.finditer(r"(\d+(?:\.\d+)?):\s*(.*?)(?=\s+\d+(?:\.\d+)?:|$)", text))
    for match in matches:
        multiplier = float(match.group(1))
        subjects = subject_aliases(match.group(2))
        if subjects:
            rules.append({"subjects": subjects, "multiplier": multiplier})
    return rules


def parse_x_weights(raw: str) -> list[dict[str, Any]]:
    text = clean(raw)
    if not text or text.upper() == "N/A":
        return []
    rules: list[dict[str, Any]] = []
    for subject_text, multiplier_text in re.findall(r"(.+?)\s*\(x\s*(\d+(?:\.\d+)?)\)", text):
        subjects = subject_aliases(subject_text)
        if subjects:
            rules.append({"subjects": subjects, "multiplier": float(multiplier_text)})
    return merge_rules(rules)


def merge_rules(rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_multiplier: dict[float, set[str]] = {}
    for rule in rules:
        by_multiplier.setdefault(float(rule["multiplier"]), set()).update(rule["subjects"])
    return [
        {"subjects": sorted(subjects), "multiplier": multiplier}
        for multiplier, subjects in sorted(by_multiplier.items(), key=lambda item: item[0], reverse=True)
        if subjects
    ]


def update_cityu(programmes: list[dict[str, Any]]) -> int:
    by_code = {p["jupasCode"]: p for p in programmes if p.get("institution") == "CityUHK"}
    count = 0
    source = {
        "name": "CityUHK Admission Score Formula and Admissions Scores for 2026 JUPAS",
        "localPath": str(CITYU_PDF),
        "retrievedDate": "2026-07-07",
    }
    with pdfplumber.open(CITYU_PDF) as pdf:
        last_formula = ""
        last_weighting = ""
        for page_number, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                for row in table:
                    first = clean(row[0] if row else "")
                    match = re.search(r"JS\d{4}", first)
                    if not match:
                        continue
                    code = match.group(0)
                    programme = by_code.get(code)
                    if not programme:
                        continue
                    formula = clean(row[1]) or last_formula
                    weighting = clean(row[2]) or last_weighting
                    if clean(row[1]):
                        last_formula = formula
                    if clean(row[2]):
                        last_weighting = weighting
                    programme.update(
                        {
                            "formulaRaw": formula,
                            "formulaType": formula_type(formula),
                            "weightingRaw": weighting,
                            "weightingRules": parse_colon_weights(weighting),
                            "median": number_or_none(row[3]),
                            "lowerQuartile": number_or_none(row[4]),
                            "scoreScale": "SCALE_8_5",
                            "sourcePage": page_number,
                            "dataQuality": "complete",
                            "source": source,
                        }
                    )
                    count += 1
    return count


def update_eduhk(programmes: list[dict[str, Any]]) -> int:
    by_code = {p["jupasCode"]: p for p in programmes if p.get("institution") == "EdUHK"}
    count = 0
    source = {
        "name": "EdUHK Entrance Requirements and Admission Score Calculation 2026",
        "localPath": str(EDUHK_PDF),
        "retrievedDate": "2026-07-07",
    }
    with pdfplumber.open(EDUHK_PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables():
                for row in table:
                    cells = [clean(cell) for cell in row]
                    matches = re.findall(r"JS\d{4}", " ".join(cells))
                    if not matches:
                        continue
                    weighting = ""
                    for cell in cells:
                        if "(x" in cell:
                            weighting = cell
                            break
                    for code in matches:
                        programme = by_code.get(code)
                        if not programme:
                            continue
                        code_weighting = weighting
                        if code == "JS8002":
                            code_weighting = "Visual Arts (x1.5) Specified ApL subject(s) (x1.5)"
                        elif code == "JS8003":
                            code_weighting = "Chinese Language (x1.5) English Language (x1.5) Chinese Literature (x1.5) ICT (x1.5)"
                        programme.update(
                            {
                                "formulaRaw": "Any best 5 HKDSE subjects, excluding Citizenship and Social Development",
                                "formulaType": "BEST_5",
                                "weightingRaw": code_weighting or "N/A",
                                "weightingRules": parse_x_weights(code_weighting),
                                "scoreScale": "SCALE_7",
                                "sourcePage": page_number,
                                "dataQuality": "complete",
                                "source": source,
                            }
                        )
                        count += 1
    return count


def update_lingu(programmes: list[dict[str, Any]]) -> int:
    by_code = {p["jupasCode"]: p for p in programmes if p.get("institution") == "LingU"}
    seen: set[str] = set()
    source = {
        "name": "Lingnan University Admission Requirements JUPAS 2026",
        "localPath": str(LINGU_PDF),
        "retrievedDate": "2026-07-07",
    }
    rules_by_code: dict[str, list[dict[str, Any]]] = {}
    with pdfplumber.open(LINGU_PDF) as pdf:
        current_code = ""
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [clean(cell) for cell in row]
                    code_match = re.search(r"JS\d{4}", " ".join(cells[:2]))
                    if code_match:
                        current_code = code_match.group(0)
                    if not current_code:
                        continue
                    subject = ""
                    multiplier = ""
                    if len(cells) >= 6 and re.fullmatch(r"\d+(?:\.\d+)?", cells[5] or ""):
                        subject, multiplier = cells[4], cells[5]
                    elif len(cells) >= 4 and re.fullmatch(r"\d+(?:\.\d+)?", cells[3] or ""):
                        subject, multiplier = cells[2], cells[3]
                    if subject and multiplier:
                        subjects = subject_aliases(subject)
                        if subjects:
                            rules_by_code.setdefault(current_code, []).append(
                                {"subjects": subjects, "multiplier": float(multiplier)}
                            )
    for code, rules in rules_by_code.items():
        programme = by_code.get(code)
        if not programme:
            continue
        merged = merge_rules(rules)
        programme.update(
            {
                "formulaRaw": "Any Best Five Subject mechanism",
                "formulaType": "BEST_5",
                "weightingRaw": "; ".join(
                    f"{', '.join(rule['subjects'])} (x{rule['multiplier']:g})" for rule in merged
                ),
                "weightingRules": merged,
                "scoreScale": "SCALE_7",
                "dataQuality": "complete",
                "source": source,
            }
        )
        seen.add(code)
    return len(seen)


def update_hku_weighting_boxes(programmes: list[dict[str, Any]]) -> int:
    by_code = {p["jupasCode"]: p for p in programmes if p.get("institution") == "HKU"}
    source = {
        "name": "HKU JUPAS Admissions Information 2026",
        "localPath": str(HKU_INFO_PDF),
        "retrievedDate": "2026-07-07",
    }
    box_subjects = {
        "1": ["Chinese Language"],
        "2": ["Biology", "Chemistry", "Economics", "ICT", "M1", "M2", "Physics"],
        "3": ["Biology", "Chemistry"],
        "4": ["Biology", "Chemistry", "M1", "M2", "Physics"],
        "5": ["Biology", "Chemistry", "M1", "M2", "Physics"],
        "6": ["Biology", "Chemistry", "M1", "M2", "Physics"],
        "7": ["Biology", "Chemistry", "ICT", "Physics"],
        "8": ["Biology", "Chemistry", "Economics", "ICT", "M1", "M2", "Physics"],
        "9": ["Chinese Language"],
        "10": [
            "Biology",
            "Chemistry",
            "Combined Science",
            "Design and Applied Technology",
            "ICT",
            "Integrated Science",
            "M1",
            "M2",
            "Physics",
            "Technology and Living",
        ],
    }
    box_multiplier = {"3": 1.3, "5": 1.3, "10": 2.0}
    code_to_box = {
        "JS6054": "1",
        "JS6286": "1",
        "JS6298": "2",
        "JS6107": "3",
        "JS6119": "4",
        "JS6688": "5",
        "JS6901": "6",
        "JS6224": "7",
        "JS6999": "8",
        "JS6274": "9",
        "JS6602": "10",
    }
    count = 0
    for programme in by_code.values():
        key = code_to_box.get(programme["jupasCode"])
        if not key:
            programme["source"] = source
            continue
        subjects = [s for s in box_subjects.get(key, []) if s not in {"Combined Science", "Integrated Science"}]
        if not subjects:
            continue
        multiplier = box_multiplier.get(key, 1.5)
        if programme["jupasCode"] == "JS6602":
            programme["formulaRaw"] = "2 x Eng + 2 x Math + Best 4 Subjects with [ Weighting 10 ]"
        programme.update(
            {
                "weightingRules": [{"subjects": subjects, "multiplier": multiplier}],
                "weightingRaw": f"Weighting {key}: {', '.join(subjects)} (x{multiplier:g})",
                "scoreScale": "SCALE_8_5",
                "dataQuality": "complete",
                "source": source,
            }
        )
        count += 1
    return count


def main() -> None:
    programmes = json.loads(PROGRAMMES.read_text(encoding="utf-8"))
    counts = {
        "CityUHK": update_cityu(programmes),
        "EdUHK": update_eduhk(programmes),
        "LingU": update_lingu(programmes),
        "HKU weighting boxes": update_hku_weighting_boxes(programmes),
    }
    PROGRAMMES.write_text(json.dumps(programmes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for key, value in counts.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
