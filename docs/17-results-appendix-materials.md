# Appendix Results Materials

Source basis:
- Notebook: `/Users/truongphuc/Desktop/imgg/pathfindingredesign/result+analyst/interactive_pathfinding_algorithms_1.ipynb`
- CSV: `/Users/truongphuc/Desktop/imgg/pathfindingredesign/result+analyst/evaluating.csv`

## Suggested Appendix Intro

This appendix reports supporting quality-control, robustness, and exploratory outputs used to contextualise the main findings. These materials are not primary evidence for the research question, but they are useful for demonstrating data quality, response-pattern checks, and the stability of the main interpretation.

## Appendix Table A1

**Appendix Table A1. Data quality and response-pattern summary.**

| Metric | Value |
|---|---:|
| Respondents | 38 |
| Missing cells | 0 |
| Duplicate timestamps | 0 |
| Full straightliners across 12 repeated items | 8 |
| Section-wise straightliners (pre constant, post constant) | 9 |
| Composite improved | 13 |
| Composite unchanged | 13 |
| Composite declined | 12 |

Suggested sentence:

The dataset contained 38 valid responses, no missing cells, and no duplicate timestamps. Response-pattern checks identified 8 full straightliners across the 12 repeated items and 9 section-wise straightliners, which were retained in the main analysis but examined through a sensitivity check.

## Appendix Table A2

**Appendix Table A2. Sensitivity analysis for the composite score with and without full straightliners.**

| Sample | N | Pre mean | Post mean | Mean delta | Wilcoxon p | Rank-biserial |
|---|---:|---:|---:|---:|---:|---:|
| Full sample | 38 | 3.14 | 3.30 | +0.15 | 0.389 | +0.197 |
| Exclude full straightliners | 30 | 3.18 | 3.38 | +0.19 | 0.389 | +0.197 |

Suggested sentence:

Excluding full straightliners increased the composite mean change slightly, from +0.15 to +0.19, but did not materially alter the overall conclusion: the direction remained positive while the Wilcoxon result remained non-significant.

## Appendix Table A3

**Appendix Table A3. Technical validation matrix and tested scope.**

| Test area | Tested scope | Actual result | Evidence | Boundary |
|---|---|---|---|---|
| Algorithm correctness | BFS shortest-step path; Dijkstra weighted-path choice | Behaviour matched expected path selection in both representative scenarios | `tests/pathfindingAlgorithmsBehavior.test.js`; `npm test` | Supports representative unweighted and weighted pathfinding behaviour, but does not establish exhaustive correctness across every algorithm or grid pattern. |
| Playback control logic | Pause, step, resume, and completion state transitions | Controller state transitions matched expected behaviour | `tests/animationController.test.js`; `npm test` | Supports pacing-control logic at code level, but does not establish full synchronisation with every live interface update. |
| Replay-history persistence | Run serialisation and local history storage | Serialisation and history storage matched expected behaviour, including five-run trimming | `tests/runPersistence.test.js`; `npm test` | Supports replay-history persistence at the data layer, but does not establish full browser replay UI behaviour. |
| AI fallback handling | Failed or non-OK explanation requests; missing DOM state | Fallback handling behaved as expected in tested client-side failure scenarios | `tests/aiExplainFallback.test.js`; `npm test` | Supports deterministic fallback and fail-safe client handling, but does not establish full server or network integration. |
| Weight/path explanation logic | Weighted and unweighted explanation cases | Explanation outputs matched expected base-cost and weight-cost behaviour in tested cases | `tests/weightImpactAnalyzer.test.js`; `npm test` | Supports selected explanation logic, but does not establish full explanation-panel synchronisation during live runs. |
| Metadata/schema integrity | Algorithm description objects and required fields | Schema completeness matched the required structure for all eight algorithm entries | `tests/algorithmDescriptionsSchema.test.js`; `npm test` | Supports metadata completeness, but does not establish correctness of every rendered text path in the interface. |

Suggested sentence:

The automated technical checks can therefore be summarised as a behaviour-level validation matrix rather than as full end-to-end assurance. They support confidence in selected core functions of algorithm execution, control logic, persistence, fallback handling, explanation logic, and metadata integrity, while still leaving browser-level interaction and full live synchronisation as residual boundaries.

## Appendix Figure A1

Exported asset:
- [appendix-figure-a1-prior-familiarity.png](/Users/truongphuc/Desktop/folder/pathfindingredesign/docs/thesis-figures/appendix-figure-a1-prior-familiarity.png)

**Appendix Figure A1. Composite improvement by prior familiarity (exploratory, N = 38).**

Exploratory summary statistics:

| Prior familiarity | n | Median improvement | IQR |
|---|---:|---:|---:|
| Never heard of them | 17 | +0.00 | 0.33 |
| Heard of them but not confident | 13 | +0.00 | 0.50 |
| Used in class before | 8 | +0.08 | 0.25 |

Kruskal-Wallis result:
- `H = 1.41`
- `p = 0.495`

Suggested sentence:

The exploratory familiarity analysis did not show a clear between-group difference in composite improvement. Although the "used in class before" subgroup had a slightly higher median gain than the other groups, the overall Kruskal-Wallis result was non-significant (_p_ = 0.495), so these subgroup differences should be interpreted cautiously.
