# NexaLab visual identity

The rule set screens follow so the product looks like one thing, and like NexaLab rather than a SaaS kit. Tokens are in
`src/tokens.css`, the classes in `src/identity.css`.

## The idea

**Every figure is a reading: a value, its unit, and what it was measured against.** NexaLab teaches by doing an experiment and
reading the result, so the interface reads the same way. A count is never a bare number or a badge; it is `34 học sinh`,
`2 / 3 bước`, `Còn 3 ngày`.

## Look

| Part | Choice | Why |
| --- | --- | --- |
| Ground | cool glass `--bg #f3f6f8`, cards `--surface` white, hairlines `--line` | clear glassware; replaces the warm green-grey paper |
| Ink | `--nx-ink` `#142030`, body text `--text-base` | one dark carries every state that is not an action or a call for the person |
| Action | `--brand` teal, unchanged | continuity with the logo, primary buttons and links |
| Signal | `--nx-signal` phenolphthalein pink, `oklch(0.52 0.2 355)` | the pink a clear solution turns when a reaction works; the **one** colour for "this needs you" |
| Display | Lexend (500 to 700) | drawn for reading fluency; used for page titles, class names and every figure |
| Body | Be Vietnam Pro | designed for Vietnamese; unchanged |

## Rules

1. **No icon in a tinted tile, no pastel chip for a status.** Icons sit inline with text at 14 to 16 px, or are left out.
2. **One attention colour.** Amber for "pending" and red for "late" are both `--nx-signal`. Colour is ink, teal for the
   action or something in motion, pink for the person.
3. **State is a word.** "Quá hạn", "Chờ duyệt", "Đang học": position and weight carry it, a background does not.
4. **Figures are readings.** `.nx-reading` with `.nx-value` (Lexend, tabular) and `.nx-unit` (body face, muted).
5. **One radius per level**: 16 px cards, 10 px controls inside them. Hover changes the edge to ink; nothing moves or grows.
6. **Pictures are facts.** A lab's thumbnail or a course cover stays; a picture added only for colour goes.

## Applied so far

Teacher overview and Class Lab, student `/progress`, the Kit rail on `/labs`, the parent home and the parent's linked-child
progress (`parent.css`), and every skeleton on those screens. Not yet:
student dashboard, lessons, class space, assignments, the lab benches, the admin screens. They already pick up the
new ground, ink and hairlines and the Lexend page title; their own tinted tiles and multi-colour status chips are what is left
to bring across, one screen at a time, with the rules above.
