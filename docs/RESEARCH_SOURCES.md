# Margin V2 — Research Sources and Evidence Policy

**Use:** source register for human reviewer and Codex. Citations support underlying mechanisms, not necessarily the exact wording of example prompts. Do not claim a prompt is “proven to make friends” merely because it references a published paper.

## Books available in the user's private repository

### `book-talk-2025` — Alison Wood Brooks, *Talk: The Science of Conversation and the Art of Being Ourselves* (2025)

Find the already committed PDF in the repo; do not commit a duplicate. Inspect chapter names before citing. Relevant sections in the supplied PDF:

- Chapter 2: **T Is for Topics**. PDF pp. 51–54: topic management and advance topic preparation. PDF pp. 60–68: small talk, topic pyramid, moving into tailored talk, personalized prep and callbacks.
- Chapter 3: **A Is for Asking**. PDF pp. 97–101: follow-up questions, topic-switching, the perils of excessively relying on mirror questions.
- Chapter 4: **L Is for Levity**. Use for framing playful conversational cues, not for making the app generate canned jokes.
- Chapter 5: **K Is for Kindness**. Use for respect, attention and conversational responsiveness.
- Intro PDF pp. 18–20: TALK = Topics, Asking, Levity, Kindness; four mutually reinforcing principles.

The author emphasizes that no single finite script can handle changing context and a partner's unpredictable responses. Therefore, Margin must offer choices rather than a rigid roadmap.

### `book-platonic-2022` — Marisa G. Franco, *Platonic: How the Science of Attachment Can Help You Make—and Keep—Friends* (2022)

Find the existing PDF. Relevant sections in the supplied PDF:

- Chapter 3: **Taking Initiative**. PDF pp. 75–77: reaching out and asking to meet again. PDF pp. 89–92: approach, selecting people to follow up with. PDF pp. 92–96: repeated contact/propinquity, natural opportunities, and inviting people to spend time together. PDF p. 96 has a concise 'how to make a friend' flow graphic.
- Chapters 4–5: **Expressing Vulnerability**, **Pursuing Authenticity**.
- Chapters 7–8: **Offering Generosity**, **Giving Affection**.
- Author's Note pp. 7–8: author explicitly discusses limitations of the friendship research literature and its cultural/sampling bias.

Do not present attachment styles as inferred profile attributes. Do not require personal disclosure or vulnerability. Treat willingness and reciprocity as essential.

## Empirical papers — independently checked links

| Source ID | Study | What it can support | Does NOT support |
|---|---|---|---|
| `aron-1997` | Aron et al. (1997), *The Experimental Generation of Interpersonal Closeness*. DOI [10.1177/0146167297234003](https://doi.org/10.1177/0146167297234003) | A structured 45-minute escalating disclosure **protocol** created greater immediate closeness than comparison small-talk tasks in Study 1 | Automatic long-term friendship, that all questions are individually effective, or that freely skipping questions replicates the procedure |
| `epley-2014` | Epley & Schroeder (2014), *Mistakenly Seeking Solitude*. DOI [10.1037/a0037323](https://doi.org/10.1037/a0037323) | In some commuter settings, conversations with strangers were more pleasant than anticipated | Any specific opener line is most effective or all strangers want to talk |
| `huang-2017` | Huang et al. (2017), *It Doesn't Hurt to Ask: Question-Asking Increases Liking*. DOI [10.1037/pspi0000097](https://doi.org/10.1037/pspi0000097) | Follow-up question-asking is associated with being liked in controlled get-acquainted interactions | Unlimited question-asking or interview-like behavior works in all contexts |
| `sprecher-2013` | Sprecher et al. (2013), *Taking Turns: Reciprocal Self-Disclosure Promotes Liking in Initial Interactions*. DOI [10.1016/j.jesp.2013.03.017](https://doi.org/10.1016/j.jesp.2013.03.017) | Mutual turn-taking disclosure contributes to liking in initial interactions | Any precise number of self-disclosures or questions is optimal |
| `laurenceau-1998` | Laurenceau et al. (1998), *Intimacy as an Interpersonal Process*. DOI [10.1037/0022-3514.74.5.1238](https://doi.org/10.1037/0022-3514.74.5.1238) | Disclosure and perceived responsiveness are associated with intimacy; emotional disclosure can be more predictive than factual disclosure | Always force emotional or private topics |
| `kardas-2022` | Kardas et al. (2022), *Overly Shallow?*. DOI [10.1037/pspa0000281](https://doi.org/10.1037/pspa0000281) | Participants often underestimated positive experiences from deep conversations with strangers | Deep questions are always appropriate, or users should ignore boundaries |
| `hall-2018` | Hall (2018), *How Many Hours Does It Take to Make a Friend?*. DOI [10.1177/0265407518761225](https://doi.org/10.1177/0265407518761225) | Time together, shared leisure, joking/catching up are associated with friendship development | Fixed hour- or question-based milestone thresholds or guaranteed friendship |
| `liu-2023` | Liu et al. (published online 2022; journal 2023), *The Surprise of Reaching Out*. DOI [10.1037/pspi0000402](https://doi.org/10.1037/pspi0000402) | People underestimate how appreciated a thoughtful reach-out may be | Automatic reminders or repeated unsolicited messages are universally welcome |
| `boothby-2018` | Boothby et al. (2018), *The Liking Gap in Conversations*. DOI [10.1177/0956797618783714](https://doi.org/10.1177/0956797618783714) | On average people underestimate how positively partners view a conversation | An app can assume any individual stranger likes the user |

## Implementation evidence rules

1. **No exact-wording claims:** Most Margin V2 cards are original prompts. Tag them `mechanism_supported`, not `tested_protocol`, even if research suggests the class of behavior is useful.
2. **No fixed threshold claims:** No 40-hour, 100-hour, or 5-question trigger for friendship or invitations. Hall's estimates are population-level descriptive associations, not stage transitions.
3. **Context and consent:** Source mechanisms were tested under particular conditions. Do not generalize them unconditionally to crowds, busy people, or people explicitly withdrawing.
4. **Research transparency:** When generating a new card, add a source ID only if it relates directly to the move's mechanism; otherwise classify as `design_hypothesis` and record uncertainty.
5. **Paper verification:** For any new citation, fetch the original article or publisher abstract where possible, confirm authors/year/DOI and findings, and note study design (experiment, diary, longitudinal, survey).
6. **Respect book text:** Summarize underlying guidance; don't paste long quotations, chapter-length sections, or copyrighted inventories into the app. Keep PDF files private. The books can be read by Codex locally but the app should ship only original material and the existing licensed/permitted 36-question dataset.
7. **Book evidence != study evidence:** A claim from a trade book should be marked `book_synthesis` in editorial notes when its underlying primary paper isn't verified. The end-user UI does not need verbose bibliographies; research docs do.

## Source status

All paper titles/DOIs above were checked against publisher, university, or PubMed records in November 2026. The two books and chapter/page references were checked against the uploaded PDFs. The 75 prompt wordings in `content/seed-prompts.json` were authored as original product copy; the source ID explains rationale, **not** item-level experimental validation.
