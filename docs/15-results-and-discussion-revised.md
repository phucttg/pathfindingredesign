# Revised Chapter 4-5 Draft

Source basis:
- Notebook: `/Users/truongphuc/Desktop/imgg/pathfindingredesign/result+analyst/interactive_pathfinding_algorithms_1.ipynb`
- CSV: `/Users/truongphuc/Desktop/imgg/pathfindingredesign/result+analyst/evaluating.csv`

This draft renumbers figures for the dissertation rather than preserving notebook numbering.

## 4. Results

This chapter reports the empirical findings of the evaluation in relation to the project's learning and usability objectives. The strongest evidence for learning change comes from the six repeated pre-use and post-use understanding items (Q1-Q6) and the derived composite based on them. By contrast, the post-use evaluation items, preference questions, and helpful-feature selections are interpreted as supporting evidence rather than direct causal proof of learning gain. This distinction is important because the dataset suggests a broadly positive direction of change, but not one strong enough to support a confirmatory claim of overall improvement.

### 4.1 Participant overview

The final dataset contained 38 valid responses. The sample was predominantly undergraduate, which is appropriate for a study focused on educational support for learning pathfinding algorithms. Final-year undergraduates formed the largest subgroup, with 10 participants (26.3%), followed by Year 3 undergraduates with 8 (21.1%), Year 2 undergraduates with 7 (18.4%), and Year 1 undergraduates with 6 (15.8%). The remaining respondents were 4 postgraduates (10.5%), 1 university lecturer (2.6%), 1 worker (2.6%), and 1 self-learner not currently studying computer science (2.6%).

Prior familiarity with pathfinding algorithms was limited rather than high. Seventeen respondents (44.7%) reported that they had never heard of pathfinding algorithms before, 13 (34.2%) had heard of them but were not confident, and only 8 (21.1%) had used them in class before. A similar pattern appeared in the use of visual learning tools for algorithms. Fourteen respondents (36.8%) said that they used such tools rarely, 12 (31.6%) sometimes, 8 (21.1%) never, and only 4 (10.5%) often. Taken together, these descriptive results indicate that the study primarily reflects the experience of novice or near-novice learners rather than advanced users with strong prior mental models. Figure 1 summarises the participant profile, prior familiarity, and frequency of visual-tool use.

**[Insert Figure 1 here]**  
**Figure 1. Participant profile, prior familiarity, and use of visual learning tools (N = 38).**

### 4.2 Pre-test vs post-test

#### 4.2.1 Descriptive paired summary

The clearest descriptive headline comes from the paired composite score, calculated as the mean of the six repeated understanding items. The composite rose from a pre-test mean of 3.14 to a post-test mean of 3.30, giving a mean change of +0.15 on the five-point scale. At participant level, however, the pattern was heterogeneous rather than uniformly positive: 13 respondents (34.2%) improved, 13 (34.2%) remained unchanged, and 12 (31.6%) declined.

Table 3 presents the descriptive paired summary for the composite and the six repeated items. Five of the six items increased in mean score, while one item decreased. The largest positive movement appeared in Q1, which asked whether participants felt confident about what the algorithm was doing while it was running (+0.29). Q6, which concerned confidence in explaining how the algorithm works to someone else, also rose notably (+0.26). Q3, which focused on having a clear mental model of how the algorithm searches through a grid or graph, increased by +0.24. By contrast, the weakest descriptive pattern appeared in Q2, which asked about understanding the underlying logic and mathematical rules, including heuristics and weights. This item fell slightly from 3.08 to 3.00, yielding a mean change of -0.08. Q5, focused on identifying the most important variables the algorithm prioritises, showed only minimal improvement (+0.05).

Taken descriptively, this pattern suggests that the current design was more effective in supporting confidence, mental-model formation, and explainability than in helping learners internalise deeper formal logic such as heuristics, weights, and prioritisation rules.

**Table 3. Paired pre-test and post-test descriptive summary for the composite and Q1-Q6.**

| Item | Pre mean | Post mean | Mean delta | Improved % | Same % | Declined % |
|---|---:|---:|---:|---:|---:|---:|
| Composite | 3.14 | 3.30 | +0.15 | 34.2 | 34.2 | 31.6 |
| Q1 | 3.11 | 3.39 | +0.29 | 34.2 | 50.0 | 15.8 |
| Q2 | 3.08 | 3.00 | -0.08 | 21.1 | 52.6 | 26.3 |
| Q3 | 3.24 | 3.47 | +0.24 | 36.8 | 39.5 | 23.7 |
| Q4 | 3.11 | 3.26 | +0.16 | 23.7 | 52.6 | 23.7 |
| Q5 | 3.21 | 3.26 | +0.05 | 28.9 | 39.5 | 31.6 |
| Q6 | 3.13 | 3.39 | +0.26 | 39.5 | 39.5 | 21.1 |

#### 4.2.2 Inferential results

While Table 3 reports the size and direction of change, Table 4 shows whether that movement is strong enough to support a firm inferential claim. To keep the judgement process transparent, it reports both the raw p values and the adjusted p values used for item-level judgement.

For the composite score, the raw p value was 0.389. In plain terms, this points to a small positive shift, but not one strong enough to support a confirmatory claim of overall learning gain across the full sample.

The same caution applies at item level. Raw p values are shown for transparency, but the adjusted values are the ones used for judgement across Q1-Q6. Some items produce lower raw p values than others, especially Q1 (0.135), Q3 (0.239), Q4 (0.305), and Q6 (0.287). However, after adjustment, none of the item-level values remain low enough to support a confirmatory claim: Q1 rises to 0.808, while Q2-Q6 are all 1.000. The item-level evidence is therefore still suggestive rather than confirmatory.

Taken together, the inferential evidence suggests that the tool may be helping, but it does not provide firm proof of overall learning improvement across the full sample.

**Table 4. Inferential summary for the composite and Q1-Q6, showing question focus, raw p values, and adjusted p values used for item-level judgement.**

| Item | Question focus | Raw p | Adjusted p for judgement |
|---|---|---:|---:|
| Composite | Mean of Q1-Q6 | 0.389 | — |
| Q1 | Confidence in operation | 0.135 | 0.808 |
| Q2 | Logic and math rules | 0.657 | 1.000 |
| Q3 | Mental model | 0.239 | 1.000 |
| Q4 | Differentiation | 0.305 | 1.000 |
| Q5 | Key variables | 0.827 | 1.000 |
| Q6 | Explain to others | 0.287 | 1.000 |

Size and direction of change are reported in Table 3. Raw p values are shown for transparency. Adjusted p values are used for item-level judgement; the composite is judged using its raw p value.

#### 4.2.3 Visual interpretation of item-level paired change

Figure 3 provides the clearest visual interpretation of item-level paired change. Each point represents the mean paired difference for one item, calculated as post-test minus pre-test, while the horizontal bars show bootstrap 95% confidence intervals around that mean difference. Values to the right of zero indicate higher post-test scores, whereas values to the left indicate lower post-test scores. The plot is therefore useful not only for identifying whether each item moved in a positive or negative direction, but also for judging how much uncertainty surrounds that movement.

**[Insert Figure 3 here]**  
**Figure 3. Item-level paired change with bootstrap 95% confidence intervals (Q1-Q6, N = 38).**

The strongest positive movement appears in Q1, with a mean difference of +0.29, marking confidence in following what the algorithm is doing as the clearest directionally positive outcome. Q6 shows the next strongest positive movement at +0.26, followed closely by Q3 at +0.24. Q4 remains positive but more modest at +0.16, while Q5 is only slightly above zero at +0.05. By contrast, Q2 is the only item with a negative mean difference, at -0.08. Read together, these positions suggest that the tool appears stronger in supporting confidence, explainability, and mental-model formation than in deeper rule-based understanding.

The confidence intervals are equally important for interpretation. Although most points lie on the positive side of zero, every confidence interval crosses the zero line, including those for Q1, Q6, and Q3. This means that the figure supports a visually meaningful and directionally positive pattern, but not a confirmatory item-level claim. The most defensible interpretation is therefore that the visualiser appears more effective in making algorithm behaviour easier to follow, model, and explain than in strengthening deeper formal understanding of logic, rules, and key-variable prioritisation, while the remaining uncertainty means that this pattern should still be read as suggestive rather than confirmatory.

### 4.3 Post-use usability evaluation

The four post-use evaluation items are presented in Figure 7 as descriptive evidence of perceived usefulness and usability rather than as primary evidence of paired learning change. The chart shows a broadly similar pattern across the four items. All mean ratings sit above the neutral midpoint of 3.0, ranging from 3.3 to 3.5. "More effective than theory alone" is highest at 3.5, "Features meet learning needs" follows at 3.4, and "Can use without much instruction" and "Easy to use" are both at 3.3. The differences between items are therefore modest rather than pronounced.

The summary values beneath the chart show medians of either 3.0 or 3.5, while the proportion of positive ratings (4-5) ranges from 47.4% to 50.0% across the four items. The error bars also overlap substantially, reinforcing the impression of a generally consistent and moderately positive post-use pattern rather than a sharply differentiated one. Figure 7 should therefore be read as descriptive post-use sentiment about usefulness and usability at the end of interaction.

**[Insert Figure 7 here]**  
**Figure 7. Post-use evaluation items for perceived usefulness and usability (N = 38).**

### 4.4 Learning method preference and helpful features

The learning-preference questions show that respondents did not converge on one universally preferred learning mode across all contexts. When asked which method was easier to follow, the sample was split evenly: 17 respondents (44.7%) selected tool-supported learning, 17 (44.7%) selected traditional or theory-first learning, and 4 (10.5%) reported no difference. For recommending a first learning method to a complete beginner, 20 respondents (52.6%) preferred traditional or theory-first learning, compared with 13 (34.2%) who preferred the tool-supported approach and 5 (13.2%) who selected no difference. By contrast, when asked which method would help most if they had only 15-30 minutes to learn a new pathfinding algorithm, the balance shifted towards tool-supported learning: 18 respondents (47.4%) chose the tool, compared with 13 (34.2%) who chose traditional learning and 7 (18.4%) who selected no difference.

This pattern suggests that the tool was not seen as a universal replacement for theory-first learning. Instead, its value appears to be contextual. Traditional learning retained credibility as an introductory route, whereas the visualiser was perceived as especially useful for rapid orientation, short-session exploration, and immediate interpretive support. Figure 5 summarises these contextual preference shifts.

**[Insert Figure 5 here]**  
**Figure 5. Learning method preference across learning contexts (N = 38).**

The helpful-feature question reinforces this interpretation. The most frequently selected feature was pause/step controls, chosen by 18 respondents (47.4%), followed closely by clear animation of visited nodes at 17 (44.7%). Ability to place walls easily and playback speed options were each selected by 11 respondents (28.9%), while ability to place weights easily was selected by 10 (26.3%). The Insight Panel step-by-step explanations were selected by 9 respondents (23.7%). Figure 6 shows these results in full.


### 4.6 Evaluation of educational and user-facing outcomes

This section evaluates the extent to which the artefact met the project's four objectives. Rather than repeating the descriptive and inferential results, it draws on three evidence streams already reported: the paired learning measures in Tables 3 and 4 and Figure 3, the contextual preference patterns in Figure 5, and the post-use evaluation ratings in Figure 7. The purpose is therefore evaluative synthesis: to judge what the artefact achieved, where that support is bounded, and how far the objectives were met.

#### 4.6.1 Evaluation framework and evidence base

The evaluation follows a criterion-to-evidence-to-judgement logic. Each objective is assessed against a plain-language success criterion and then judged using the most relevant evidence from the paired learning measures, the contextual preference results, and the post-use evaluation ratings. This makes it possible to evaluate educational usefulness and user-facing value without turning the section into a repetition of earlier results.

The resulting judgement is intentionally bounded. The study provides pre/post and contextual evidence about perceived understanding, interpretability, and usability, but it does not provide a direct controlled comparison against an animation-first baseline. The conclusions in this section should therefore be read as defensible within that scope rather than as claims of experimental superiority.

#### 4.6.2 Judgement against project objectives

For Objective 1, the criterion is whether the visualiser functioned as an interactive exploratory learning environment that users experienced as usable and relevant rather than as a passive display. Figure 7 places all four post-use evaluation items above neutral, while Figure 5 shows that the tool was valued particularly in exploratory and short-session contexts. This does not imply universal preference across all learning situations, but it does support the claim that the artefact worked as a usable exploratory environment. On this basis, Objective 1 is judged as Met.

For Objective 2, the criterion is whether the Insight Panel and explanation layer made algorithm behaviour easier to follow, model, and explain. Tables 3 and 4 and Figure 3 support this most clearly in the items aligned with confidence in operation, mental-model formation, and explanation, where Q1, Q3, and Q6 show the strongest directional movement. However, the same evidence also defines the boundary of this claim: deeper rule-level understanding remains weaker, all confidence intervals in Figure 3 cross zero, and the paired inferential results remain non-confirmatory. On this basis, Objective 2 is judged as Partially met.

For Objective 3, the criterion is whether learner-controlled pacing appears educationally useful rather than merely present as a feature. Figure 5 suggests that the artefact was valued most in short-session and exploratory use, which is consistent with the intended role of pacing and reflection support. Even so, the support here is contextual rather than feature-specific, because the present evidence does not isolate pacing controls as a separate driver of value. On this basis, Objective 3 is judged as Partially met.

For Objective 4, the criterion is whether the evaluation produced defensible evidence about educational usefulness, perceived understanding, opacity reduction, and usability relative to the design aim. The paired measures in Tables 3 and 4 are directionally positive, and Figure 7 shows moderate above-neutral post-use ratings, with the strongest rating attached to the claim that the visualiser helped users understand the algorithm more effectively than theory alone. At the same time, the study does not provide a direct head-to-head baseline experiment, and the overall learning-related signal does not support a confirmatory claim of broader learning gain. On this basis, Objective 4 is judged as Partially met.

Across the four objectives, the strongest support lies in interactive exploratory use and user-facing value, while interpretability, pacing, and broader educational effectiveness remain more bounded.

#### 4.6.3 Overall evaluative judgement

The most defensible overall judgement is that the project was partially successful. The strongest evidence supports the artefact as an exploratory and usable learning tool that made algorithm behaviour more legible during interaction and carried meaningful contextual value for short-session and guided exploration. The weaker area remains confirmatory educational effectiveness, because the learning-related signal is directionally positive but not strong enough to support a firm overall claim.

This judgement also aligns with the broader aim of the project. The artefact appears to have reduced perceived opacity and made algorithm behaviour easier to follow, model, and explain, especially during active interaction. However, the current evidence does not justify a strong claim of experimentally demonstrated superiority over animation-first learning or a confirmed overall learning-gain effect across the full sample.

### 4.7 Testing strategy and validation coverage

This project required a multi-layered testing strategy because it makes both educational and software claims. Analytical and statistical testing is needed to assess whether the learning-related signal is directionally positive and robust enough for inference; user-facing evaluation is needed to judge whether the artefact is experienced as useful and usable; and targeted automated technical checks are needed to verify selected core behaviours that user perception alone cannot confirm. The purpose of this section is therefore not to restate the earlier results, but to judge what was validated, how that validation was structured, and where the remaining boundary still lies.

#### 4.7.1 Multi-layered testing framework

The testing framework can be read top-down. Analytical and statistical testing answers whether the paired learning signal is directionally positive and strong enough to support a confirmatory judgement. User-facing evaluation answers whether the artefact is experienced as useful, usable, and contextually valuable in practice. Targeted automated technical checks answer whether selected core software behaviours operate correctly at code level, including algorithm behaviour, pacing control, run persistence, fallback handling, explanation logic, and schema integrity. Each layer therefore validates a different question, and together they provide a broader basis for judgement than any single method could provide on its own.

This distinction matters because survey evidence alone is insufficient for this kind of project. A user study can show whether respondents felt more confident or found the tool useful, but it cannot verify whether weighted routing actually prefers the lower-cost path, whether pause and step controls behave correctly, whether run history persists consistently, or whether fallback behaviour remains safe when AI explanation requests fail. Technical testing is therefore necessary as a complement to the educational evaluation, even though the resulting validation record remains proportionate rather than exhaustive. The purpose of the framework is not to multiply evidence for its own sake, but to separate what can be judged from learning measures, from user-facing perception, and from direct technical validation.

#### 4.7.2 Targeted automated technical checks

At the time of writing, the automated suite passes six lightweight Node-based checks and provides targeted technical validation rather than full end-to-end assurance. As summarised in Appendix Table A3, the tested scope covers algorithm and explanation behaviour, including representative pathfinding correctness and weighted versus unweighted explanation logic. It also covers control and persistence behaviour through pacing controls and replay-history handling, together with fallback handling and schema integrity for explanation failure cases and algorithm metadata. These checks support confidence within the tested scope, but they do not establish exhaustive whole-system correctness.

#### 4.7.3 Residual boundary of technical validation

Even with these additions, the remaining technical boundary should still be stated clearly. The automated suite does not yet establish full replay UI behaviour, full explanation-panel synchronisation across every live animation path, full browser-level end-to-end interaction coverage, or full AI and server integration assurance. Those areas remain outside the tested scope and should be treated as residual risks rather than validated claims.

The most defensible judgement is therefore that the artefact is validated within the tested scope through a combination of analytical testing, user-facing evaluation, and targeted automated technical checks. The resulting testing record is rigorous within scope, but not exhaustive beyond it.

## 5. Analysis and Discussion

Overall, the project can be judged as partially successful. Against the aims of improving the interpretability of pathfinding algorithms and supporting learners' perceived understanding, the results are encouraging but limited. The strongest outcomes lie in usability-adjacent support, pacing control, and making algorithmic decisions more legible during exploration. The weakest area lies in demonstrating a robust overall learning gain across the whole sample. In other words, the tool appears to have delivered value in the way users engaged with and interpreted algorithm behaviour, but the current dataset does not justify a definitive claim that the Insight Panel produced a broad and reliable improvement in learning outcomes.

### 5.1 Answering H1

H1 proposed that the Insight Panel would improve users' understanding of pathfinding algorithms. On the basis of the current results, the most defensible interpretation is that the study provides partial rather than conclusive support for this hypothesis. The overall direction of the findings is positive. The composite score increased from 3.14 to 3.30, five of the six repeated items moved upward, and the largest gains appeared in the dimensions most closely aligned with the design intention of the tool: confidence in following the algorithm while it runs, formation of a mental model of the search process, and confidence in explaining the algorithm to someone else.

At the same time, this pattern is directionally positive but not confirmatory. The composite result was non-significant, and none of the item-level results remained significant after Holm adjustment. The current evidence therefore supports the conclusion that the Insight Panel and associated interaction design moved learners in the intended direction, but not strongly enough to confirm H1 in a statistical sense. The strongest claim justified by the present data is that the tool appears promising as a mechanism for reducing perceived opacity and improving perceived understanding during interaction.

### 5.2 Baseline comparison: Clement's Pathfinding Visualizer versus the present tool

The comparison with Clement Mihailescu's Pathfinding Visualizer should be framed as a conceptual design comparison rather than a direct experimental one, because the current survey did not measure both tools head-to-head under identical conditions. As a baseline, Clement's visualiser is already a strong animation-first educational tool. It offers multiple algorithms, maze generation, speed control, and direct grid manipulation, all of which make pathfinding behaviour visible and interactive.

The key difference lies in what each tool tries to make available to the learner. An animation-first baseline primarily makes behaviour visible. The present tool attempts to go one step further by making decision logic more legible while the animation is unfolding. The Insight Panel, live metrics, and playback support are designed to answer not only what happened, but why a node was selected, what variables mattered, and how the algorithm's internal state changed from one step to the next. The contribution of the present project is therefore not experimental superiority over the baseline, but a design response to a decision-level interpretability gap that animation alone does not fully address.

### 5.3 Why the design appears to have worked in some areas

The results are consistent with the broader literature suggesting that the value of algorithm visualisation depends on how learners engage with it, not simply on the presence of animation. The helpful-feature results in Figure 6 are especially informative here. Participants did not respond most strongly to text explanation alone. Instead, the most valued features were pause/step controls, clear animation of visited nodes, and direct manipulation such as wall placement. These are all features that support active inspection, pacing, and iterative exploration.

The paired results point in the same direction. Q1, Q3, and Q6 show the strongest positive movement, which suggests that the tool worked best where it supported confidence, mental-model formation, and verbal explainability. This aligns with the idea that the visualiser's strongest contribution lies in perceived interpretability rather than in formal conceptual mastery. Figures 3 and 4 reinforce this interpretation by showing a mixed but positive pattern rather than a uniform or dramatic shift.

### 5.4 What worked and what did not

Several aspects of the project worked well. First, the tool appears to have supported exploratory learning, especially in short sessions. Figure 5 shows that respondents were more likely to favour the tool-supported approach when the task was framed as rapid orientation over 15-30 minutes rather than as a full beginner's introduction. Second, the top feature selections show that pacing and visibility were central rather than peripheral to the user experience. Third, the strongest upward movement occurred in confidence-based and explanation-based items, which aligns closely with the intended purpose of the Insight Panel.

However, some parts of the project were clearly less successful. The most obvious weakness is Q2, which concerns the underlying logic and mathematical rules that govern algorithmic choice. Its slight decline suggests that the current explanation flow may not yet make heuristic logic, weighting, or cost updates sufficiently clear. More broadly, the current explanation layer seems stronger at helping learners follow the process than at supporting formal rule internalisation. In that sense, the tool appears better at making visible behaviour understandable than at teaching the deeper abstraction behind it.

### 5.5 Limitations and threats to validity

The study has several limitations that restrict the strength of the conclusions. First, the evaluation relies heavily on self-reported understanding rather than on an objective knowledge test. Perceived understanding and actual conceptual mastery are related, but they are not identical. Second, the primary paired results were mixed and statistically non-significant at the composite level, while the item-level corrected results were all non-significant after Holm adjustment. This does not invalidate the positive descriptive pattern, but it does mean that the findings should be presented cautiously.

Third, the dataset includes 8 full straightliners across the repeated item set. These cases were retained in the main analysis, although Appendix Table A2 shows that excluding them does not materially change the overall interpretation. Fourth, the study did not collect task-completion data, time-on-task logs, or event-tracking data, so it cannot show whether learners became faster or more accurate at interpreting algorithms. Fifth, the study did not directly measure opacity as a standalone construct. The most defensible interpretation is therefore not that opacity reduction was measured directly, but that the results suggest improved perceived interpretability or a suggested reduction in perceived opacity.

Finally, the baseline comparison remains conceptual rather than experimental. The project can justify its design contribution relative to an animation-first baseline, but it cannot claim direct empirical superiority over Clement's visualiser on the basis of the current dataset alone. In addition, the technical validation evidence is selective rather than absent: the project now includes targeted automated checks for core algorithm behaviour, animation-control logic, replay-history persistence, AI fallback handling, weight-impact explanation logic, and algorithm-description schema completeness, but it still does not establish full browser-level end-to-end replay flow or explanation-panel synchronisation across all live interaction paths.

### 5.6 Implications

Despite these limitations, the project has useful implications for teaching and learning. For instructors, the findings suggest that explanation-augmented visualisation may be especially valuable when algorithms are taught comparatively rather than in isolation. A tool that shows not only the path but also the decision process can help students distinguish why BFS expands differently from DFS, why Dijkstra differs from A*, and why heuristic-heavy variants appear more goal-directed while sacrificing guarantees.

For students, the tool appears particularly suited to guided self-study and short-session experimentation. The preference pattern in Figure 5, together with the importance of pause/step controls in Figure 6, suggests that explanation plus learner-controlled pacing may be especially useful when users want to build a quick mental model before or alongside formal study. At the same time, Appendix Figure A1 indicates that the exploratory familiarity analysis did not show a strong differential effect by prior familiarity, so any subgroup implications should remain cautious.

### 5.7 Overall outcome synthesis

The discussion above can be synthesised into four overall outcomes. First, the visualiser improved perceived interpretability more clearly than it improved formal rule understanding. This is most visible in the stronger movement for Q1, Q3, and Q6 than for Q2 and Q5. Second, learner-controlled pacing and visible progression emerged as the strongest parts of the educational support package, with pause or step controls, animation clarity, and grid interaction carrying more weight than explanation text in isolation. Third, the educational signal was promising but statistically non-confirmatory: the descriptive direction was positive, yet the composite result was non-significant and no item-level result remained significant after Holm adjustment. Fourth, the project therefore succeeded more strongly as an explainable interactive prototype than as definitive evidence of learning-effect superiority over animation-first approaches.

These outcomes also allow the objectives to be judged more explicitly. Objective 1 was met, because the results show that users engaged with the system as an exploratory environment and valued direct manipulation features. Objective 2 was partially met, because the evidence supports improved perceived interpretability during interaction, but not strong confirmation of deeper rule-level understanding. Objective 3 was met, because pacing controls were both highly valued and closely tied to the contexts in which the tool was seen as most useful. Objective 4 was partially met, because the evaluation produced meaningful evidence of educational usefulness and a suggested reduction in perceived opacity, but not a strong confirmatory learning-effect result or a direct head-to-head baseline comparison.

From the perspective of the overall aim, the project can therefore be judged as partially achieved. This overall judgement is supported by the evaluation evidence reported in Chapter 4 and by the more limited technical validation of selected artefact components. The system was successfully designed, implemented, and evaluated as an education-oriented interactive pathfinding visualiser with real-time explanation support, pacing control, and exploratory interaction. More importantly, it responded directly to the original motivation of reducing the black-box character of existing pathfinding tools by making decision points more visible and more interpretable during execution. However, the current evaluation does not prove strong improvement in deeper conceptual mastery or establish experimental superiority over an animation-first baseline. The most defensible overall conclusion is therefore that the project makes a credible contribution to decision-level interpretability in pathfinding education, while also identifying the next problem clearly: how to convert improved perceived interpretability into stronger evidence of conceptual learning.
