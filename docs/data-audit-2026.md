# 2026 JUPAS Calculation Audit

Last checked: 2026-07-07

## Summary

The app is suitable as a planning and comparison tool, but the calculation is not yet fully official-verified for every programme.

The uploaded 2025 JUPAS admissions score reference says the 2025 candidate scores are calculated using the 2026 programme-specific main admission score formulas. That means those historical candidate scores are the right baseline for a 2026-oriented MVP. However, each institution still says admission scores are for reference only and may not predict future admission outcomes.

## Current App Data Status

- Total programmes in `src/data/programmes.json`: 360
- HKUST: updated from the official HKUST JUPAS calculator data and mostly has structured weighting rules.
- Other institutions: programme rows and score references are present, but most programme-specific formulas/weightings remain raw text instead of structured calculation rules.

Because of that, the app should treat non-structured formulas as reference estimates unless their formula is a simple generic Best 4 / Best 5 / Best 6 calculation.

## Official Source Findings

### JUPAS 2025 Admissions Score Reference

- The 2025 candidate admissions scores are recalculated with 2026 programme-specific main admission score formulas.
- The PDF warns that weightings and calculations may vary each year.
- It also warns that admissions scores should not be used to predict 2026 admission likelihood because selection can also consider band choice, interview performance, subject results, and other criteria.

### HKUST

- HKUST states that each programme uses a specific formula.
- HKUST has official 2026 programme-specific requirements and score formulae.
- HKUST also published expected/simulated 2026 scores based on 2025 admission data for programmes with new 2026 formulas.
- App status: strongest coverage. HKUST has structured `weightingRules` for most programmes.

### CityUHK

- CityUHK uses the 8.5 conversion scale for Category A subjects.
- Citizenship and Social Development is required for admission but not counted in the admission score.
- App status: score scale and CSD handling are aligned, but programme-specific weightings still need structured extraction from the official calculator/page.

### HKU

- HKU has a 2026 JUPAS score calculator.
- HKU uses the 8.5 conversion scale for Category A subjects.
- Programme scoring formulas may vary by programme, and extra subjects may be considered where applicable.
- App status: score scale is aligned, but programme-specific weighting rules need structured extraction.

### CUHK

- CUHK has a 2026 programme-specific requirements and score calculator.
- CUHK states 2026 calculations are based on programme-specific requirements, selection principles, and subject weighting.
- App status: needs structured extraction from CUHK's calculator/PDF before exact programme-level scoring can be claimed.

### PolyU

- PolyU requires CSD Attained for entrance requirements but does not include CSD in the admission score.
- PolyU uses programme/scheme-specific score formulas and subject weightings.
- App status: CSD handling is aligned, but exact scheme/programme weightings need structured extraction.

### HKBU

- HKBU uses the 7-point Category A scale.
- HKBU says scores are calculated from programme weighted admission score formulas and are subject to ongoing review.
- App status: scale is aligned, but programme weighted formulas need structured extraction.

### LingU

- LingU has a 2026 score calculator.
- App status: needs structured extraction from LingU's calculator/PDF.

### EdUHK

- EdUHK generally uses Best 5 excluding CSD.
- EdUHK says subject weightings may be adopted for particular programmes and may vary each year.
- App status: generic Best 5 estimates are reasonable where no weighting applies; weighted programmes need structured extraction.

### HKMU

- HKMU's 2026/27 minimum requirements are Chinese 3, English 3, Math 2, CSD Attained, and two electives at Level 2.
- HKMU says best results are considered for entrance requirements and admission score calculation.
- App status: entrance requirement logic is partly aligned, but programme-specific calculator formulas need structured extraction.

## Implementation Rule

For the MVP, score labels should use three confidence levels:

- `Official structured`: official source URL and structured subject weighting rules exist.
- `Generic formula`: formula is simple Best 4 / Best 5 / Best 6 or equivalent without programme-specific weighting.
- `Reference estimate`: raw formula or weighting text exists but has not been converted into structured rules.

Risk colours and threshold comparisons should still work for reference estimates, but the UI must show that the score itself is an estimate.

## Next Data Work

To make the calculator fully reliable for all nine institutions, build an importer for each official calculator/PDF and convert formulas into structured rules:

1. HKU official calculator/PDF.
2. CUHK 2026 calculator/PDF.
3. CityUHK official calculator.
4. PolyU programme/scheme weighting pages.
5. HKBU official calculator.
6. LingU 2026 calculator/PDF.
7. EdUHK subject weighting documents.
8. HKMU programme calculator data.

Until then, the app should avoid claiming exact official calculation for every programme.
