# Navigation review

The user's report was reproduced against the V2 production build in an isolated Chrome session at phone and desktop widths. This review covers finding collections, moving through questions, switching people, scroll position, browser history, and navigation accessibility.

| Finding | Observed cause | Change |
| --- | --- | --- |
| Original 36 was effectively hidden | Its button was absent on a fresh Talk screen. It appeared only after selecting Deepen, requiring prior knowledge of the taxonomy. | A permanent Original 36 choice beside Conversation prompts in Talk, plus a direct entry on People and the unnamed-conversation screen. |
| Question browser felt incomplete | The Original 36 browser rendered only the current set's 12 questions, with no number labels or search. | Browse all 36 opens every question, with numbers, set labels, current/used indicators, search and explicit All/Unused/Used filters. A collection selector also allows jumps to other categories and Plans. |
| Backward movement was unreliable | Previous used temporary visit history. A reload disabled it even when the person was on question 18. | Previous means the preceding card in collection order, including already used cards as an explicit review. It works after reload. Next still prefers unused cards and now crosses original set boundaries. |
| Browsing could change history accidentally | A small plus/check button beside each browser entry toggled used history, adjacent to the jump target. | Browser entries only navigate. Mark used/Mark unused remain deliberate actions on the selected card. |
| Categories were hard to scan on phones | A select control hid all five category names. | All five categories are visible buttons. At narrow widths they wrap across two rows with touch targets of at least 44px. |
| Starting/switching screens could land halfway down the page | New content reused the old document scroll; CSS smooth scrolling made attempted resets asynchronous. | Every destination starts at the top with an immediate scroll reset. Browser scroll restoration is controlled explicitly. |
| Browser Back could leave the application | People, Talk, Plans and categories all used local React state with the same URL. | Named hash destinations and browser history support Back/Forward, refresh and direct collection links such as `#talk/36`. URLs contain no personal notes or names. |
| Long cards pushed movement controls away | Prompt controls were below the card; short phone screens required scrolling to reach them. | Previous/Next now sit above the card and remain at the top while scrolling on phones. Skip and Mark used stay below the card. This avoids covering the text with a large fixed toolbar. |
| Changing people was indirect | The main path was an unlabelled return through People; Edit notes was the only profile action near the current name. | A Change person action is beside the current conversation identity. Returning-user home copy is shorter, and saved people remain directly selectable. |
| Inactive sets had weak contrast | Gray inactive labels failed the accessibility check when the complete Original 36 flow was tested. | Darkened set labels while retaining the sage selected state. |

## Interaction details

The saved original numeric question IDs and histories, 75-card seed and migration/storage version are unchanged. Selecting a card never marks it used. Used cards remain hidden by default; explicitly choosing a used card from the browser turns on Show used for that review. Reload returns to the normal unused-first behavior. Skip remains session-only. Choosing a set with no unused cards explicitly opens its first card for review instead of appearing to ignore the selected set.

The collection browser's All/Unused/Used filters are independent of the main screen's Show used setting. The browser is an explicit library view, so All is its default. Topic filtering is optional and collapsible, and is omitted for the original 36 because that collection has no topic tags.

## Verification scope

Navigation regressions cover a cold start into the original 36, all 36 browser entries, search, direct jumps to questions 12/24/36, movement across set boundaries, Previous after reload, unchanged histories after browsing, collection switching, explicit used-card review, scroll reset, browser Back/Forward, and navigation control clearance at 360 × 640. The original V2 interaction suite is retained. Desktop checks use 1280 × 900. Axe checks both the browser dialog and the original-question view.

This is an implementation and interaction review, not a usability study with new participants. Real-device browser controls, larger text settings and screen-reader use still benefit from hands-on checking.

Validation: TypeScript and the Next.js production build passed, along with 14 unit tests and all eight Chrome browser scenarios. Axe reported no WCAG A/AA violations in the checked navigation views and browser dialog. Screenshots were inspected at 360 × 640 and 1280 × 900; the existing interaction suite also runs at 360 × 800. The original question text, saved-data schema, content seed and manifest are unchanged.
