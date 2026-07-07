# 2026 JUPAS Calculation Audit

Last checked: 2026-07-07

## Summary

The app is suitable as a planning and comparison tool, but the calculation is not yet fully official-verified for every programme.

The uploaded 2025 JUPAS admissions score reference says the 2025 candidate scores are calculated using the 2026 programme-specific main admission score formulas. That means those historical candidate scores are the right baseline for a 2026-oriented MVP. However, each institution still says admission scores are for reference only and may not predict future admission outcomes.

## Current App Data Status

- Total programmes in `src/data/programmes.json`: 360
- HKUST: updated from the official HKUST JUPAS calculator data and mostly has structured weighting rules.
- CityUHK: updated from the attached 2026 admission score formula PDF. All 58 programmes now have 2026 formula/source metadata; 38 have subject weighting rules above the default x1.
- EdUHK: updated from the attached 2026 entrance requirements and admission score calculation PDF. All 26 programmes now have 2026 source metadata; 24 have heavier-subject weighting rules.
- LingU: updated from the attached 2026 JUPAS admission requirements PDF. All 23 programmes now have structured subject weighting rules.
- HKU: all 55 programmes now have 2026 source metadata from the attached HKU documents. The 11 programmes with explicit visible HKU weighting boxes have structured weighting rules.
- PolyU, CUHK, HKBU, and HKMU: programme rows and score references are present, but most programme-specific formulas/weightings remain raw text instead of structured calculation rules.

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
- App status: score scale, CSD handling, 2026 formula text, median/LQ reference scores, and available subject weighting rules have been imported from the attached 2026 PDF.

### HKU

- HKU has a 2026 JUPAS score calculator.
- HKU uses the 8.5 conversion scale for Category A subjects.
- Programme scoring formulas may vary by programme, and extra subjects may be considered where applicable.
- App status: score scale is aligned. The attached HKU PDFs were used to add source metadata and structured weighting rules for visible weighting boxes, including JS6054, JS6286, JS6298, JS6107, JS6119, JS6688, JS6901, JS6224, JS6999, JS6274, and JS6602. Remaining HKU formulas still need a dedicated formula-rule model for exact treatment of every arithmetic pattern.

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
- App status: scale is aligned, but the attached prospectus points to a QR/external score-calculation method. The detailed linked weighting table still needs to be resolved and imported.

### LingU

- LingU has a 2026 score calculator.
- App status: structured subject weighting rules have been imported from the attached 2026 admission requirements PDF.

### EdUHK

- EdUHK generally uses Best 5 excluding CSD.
- EdUHK says subject weightings may be adopted for particular programmes and may vary each year.
- App status: generic Best 5 plus heavier-subject weightings have been imported from the attached 2026 PDF.

### HKMU

- HKMU's 2026/27 minimum requirements are Chinese 3, English 3, Math 2, CSD Attained, and two electives at Level 2.
- HKMU says best results are considered for entrance requirements and admission score calculation.
- App status: entrance requirement logic is partly aligned, but programme-specific calculator formulas need structured extraction.

## Implementation Rule

For the MVP, score labels should use three confidence levels:

- `Official structured`: official source metadata and structured subject weighting rules exist.
- `Generic formula`: formula is simple Best 4 / Best 5 / Best 6 or equivalent without programme-specific weighting.
- `Reference estimate`: raw formula or weighting text exists but has not been converted into structured rules.

Risk colours and threshold comparisons should still work for reference estimates, but the UI must show that the score itself is an estimate.

## Next Data Work

To make the calculator fully reliable for all nine institutions, build an importer for each official calculator/PDF and convert formulas into structured rules:

1. Finish HKU formula-rule modelling for every arithmetic pattern.
2. CUHK 2026 calculator/PDF.
3. PolyU programme/scheme weighting pages.
4. HKBU official QR-linked calculator/weighting table.
5. HKMU programme calculator data.
6. HSUHK 2025 admissions score reference if HSUHK programmes are added to the app dataset.

Until then, the app should avoid claiming exact official calculation for every programme.
