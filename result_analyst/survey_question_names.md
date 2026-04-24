# Survey Question Codebook

This survey export contains 24 CSV columns in total. The first column is `timestamp`, which is metadata rather than a survey item. This codebook documents the remaining 23 survey items and their allowed answers.

## Standard Likert Scale Used In This Survey

The repeated understanding items and the post-use evaluation items use the same five-point agreement scale:

- `1 = Strongly disagree`
- `2 = Disagree`
- `3 = Neutral`
- `4 = Agree`
- `5 = Strongly agree`

## Pre/Post Repeated Questions

These six items were asked twice:

- `Pre`: theory-only condition
- `Post`: tool-supported visualiser condition

| Section | Item ID | Asked in | Question | Allowed answers | Notes / mapping |
| --- | --- | --- | --- | --- | --- |
| Pre/Post repeated questions | Q1 | Pre (theory-only) and Post (tool-supported visualiser) | I felt confident about what the algorithm was doing while it was running. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Confidence in operation` |
| Pre/Post repeated questions | Q2 | Pre (theory-only) and Post (tool-supported visualiser) | I understand the underlying logic and mathematical rules (e.g., heuristics, weights) that dictate this algorithm's choices. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Logic and math rules` |
| Pre/Post repeated questions | Q3 | Pre (theory-only) and Post (tool-supported visualiser) | I have a clear mental model of how this specific algorithm searches through a grid or graph. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Mental model` |
| Pre/Post repeated questions | Q4 | Pre (theory-only) and Post (tool-supported visualiser) | I can identify what makes this algorithm different from other search algorithms (e.g., heuristic-guided vs cost-based). | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Differentiation` |
| Pre/Post repeated questions | Q5 | Pre (theory-only) and Post (tool-supported visualiser) | I can easily identify the most important variables this algorithm prioritizes to make its decisions. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Key variables` |
| Pre/Post repeated questions | Q6 | Pre (theory-only) and Post (tool-supported visualiser) | I am confident that I could explain how this algorithm works to someone else. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Notebook label: `Explain to others` |

CSV export notes:

- The pre/post CSV headers contain minor formatting inconsistencies such as `4.I can...` instead of `4. I can...`.
- The post versions of repeated items may appear with suffixes such as `.1` because the survey export duplicated question text across columns.
- This codebook normalises punctuation and spacing so the wording is consistent without changing meaning.

## Consent Question

| Section | Item ID | Asked in | Question | Allowed answers | Notes / mapping |
| --- | --- | --- | --- | --- | --- |
| Consent | C1 | Survey start | Consent to participate (please tick all statements to continue) | Multi-select, all statements required | A respondent must select all four statements to proceed. |

Required statements:

- `I understand participation is voluntary and I can withdraw at any time.`
- `I understand I will answer only rating and tick-box questions (no knowledge test).`
- `I understand my responses will be anonymised.`
- `I consent to participate.`

## Demographic / Context Questions

| Section | Item ID | Asked in | Question | Allowed answers | Notes / mapping |
| --- | --- | --- | --- | --- | --- |
| Demographic / Context | D1 | Survey start | Which best describes you? | Single choice | Options observed in `survey_result.csv` are listed below. |
| Demographic / Context | D2 | Survey start | Prior familiarity with pathfinding algorithms | Single choice | Options observed in `survey_result.csv` are listed below. |
| Demographic / Context | D3 | Survey start | How often do you use visual learning tools for algorithms? | Single choice | Options observed in `survey_result.csv` are listed below. |

Options for `D1`:

- `Year 1 undergraduate`
- `Year 2 undergraduate`
- `Year 3 undergraduate`
- `Year 4 / Final-year undergraduate`
- `Postgraduate`
- `University Lecturer`
- `Worker`
- `Self-learner (not currently studying CS)`

Options for `D2`:

- `Never heard of them`
- `Heard of them but not confident`
- `Used in class before`

Options for `D3`:

- `Never`
- `Rarely`
- `Sometimes`
- `Often`

## Preference Questions

The following three questions use the same single-choice answer set:

- `Tool-supported learning (interactive visualiser + Insight Panel explanations)`
- `Traditional/theory-first learning (notes/lecture/textbook/pseudocode)`
- `No difference`

| Section | Item ID | Asked in | Question | Allowed answers | Notes / mapping |
| --- | --- | --- | --- | --- | --- |
| Preference questions | P1 | Post-use | Overall, which learning method was easier for you to follow when learning how a pathfinding algorithm works? | Tool-supported learning (interactive visualiser + Insight Panel explanations); Traditional/theory-first learning (notes/lecture/textbook/pseudocode); No difference | Single choice |
| Preference questions | P2 | Post-use | If a complete beginner wanted to learn pathfinding, which learning method would you recommend first? | Tool-supported learning (interactive visualiser + Insight Panel explanations); Traditional/theory-first learning (notes/lecture/textbook/pseudocode); No difference | Single choice |
| Preference questions | P3 | Post-use | If you had only 15-30 minutes to learn a new pathfinding algorithm, which learning method would help you most? | Tool-supported learning (interactive visualiser + Insight Panel explanations); Traditional/theory-first learning (notes/lecture/textbook/pseudocode); No difference | Single choice |

## Post-Use Evaluation Questions

These four items are post-use only and use the standard five-point agreement scale documented above.

| Section | Item ID | Asked in | Question | Allowed answers | Notes / mapping |
| --- | --- | --- | --- | --- | --- |
| Post-use evaluation questions | E1 | Post-use only | This visualiser's features meet my learning needs. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Post-use evaluation item |
| Post-use evaluation questions | E2 | Post-use only | I could use this visualiser successfully without much instruction. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Post-use evaluation item |
| Post-use evaluation questions | E3 | Post-use only | This visualiser is easy to use. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Post-use evaluation item |
| Post-use evaluation questions | E4 | Post-use only | This visualiser helped me understand the algorithm more effectively than theory alone. | 1 = Strongly disagree; 2 = Disagree; 3 = Neutral; 4 = Agree; 5 = Strongly agree | Post-use evaluation item |

## Short Labels Used In The Notebook

This mapping applies to both the pre and post versions of the six repeated understanding items.

| Item ID | Notebook label |
| --- | --- |
| Q1 | Confidence in operation |
| Q2 | Logic and math rules |
| Q3 | Mental model |
| Q4 | Differentiation |
| Q5 | Key variables |
| Q6 | Explain to others |
