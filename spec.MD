# Implement Keyboard Reaction & Key Finding Test

Implement an interactive web-based **Keyboard Reaction / Key Finding Test** in the existing project.

Before modifying code:

1. Inspect the existing repository structure.
2. Identify the current frontend framework, routing, styling system, component conventions, and test framework.
3. Reuse the existing stack and conventions.
4. Do not introduce a new framework unless absolutely necessary.
5. Run the existing application/tests before making changes where practical.
6. After implementation, run relevant tests/build/lint and fix issues caused by the implementation.

## Reference behavior

Use this website as UX/interaction inspiration:

https://reactiontimetests.org/typing

Do NOT copy its visual design directly.

The important interaction model is:

* Show one random keyboard target at a time.
* User must locate and press the requested key.
* Measure the time from when the target becomes visible until the correct key is pressed.
* Immediately show the next target after a correct response.
* Record incorrect key presses.
* Repeat until the configured number of trials is completed.
* Show detailed results after the test.

This test differs from the reference site because it must support:

* English keys
* Thai keyboard keys
* numbers
* punctuation/symbol keys
* function keys
* modifier keys
* editing/navigation keys

The primary purpose is **not typing speed/WPM**.

The purpose is measuring:

1. how long users take to locate a keyboard key,
2. how long they take to press it correctly,
3. how many mistakes they make,
4. which keys cause hesitation or unusually long search times.

---

# 1. Core Test Concept

The screen displays a single target such as:

```text
F5
```

or

```text
ก
```

or

```text
+
```

or

```text
Backspace
```

The participant physically presses the corresponding keyboard key.

Once the correct key is detected:

```text
record result
→ generate/display next target
→ restart timer
```

There should be **no artificial delay between trials**.

Use a high-resolution timer such as:

```js
performance.now()
```

rather than `Date.now()` for reaction-time measurement.

---

# 2. Important Thai Keyboard Requirement

Thai characters must NOT require the participant to change the operating-system keyboard language.

This is critical.

The test should measure the user's knowledge of the **physical Thai Kedmanee keyboard layout**, not whether Windows/macOS is currently switched to Thai input.

Therefore do NOT validate Thai targets using:

```js
event.key === "ก"
```

because that depends on the currently selected OS keyboard language.

Instead validate primarily using:

```js
KeyboardEvent.code
```

together with modifier state such as:

```js
event.shiftKey
```

Example concept:

```js
{
  id: "thai-ko-kai",
  display: "ก",
  code: "KeyD",
  shiftRequired: false,
  category: "thai"
}
```

The displayed target is:

```text
ก
```

but the expected physical keyboard position is:

```text
KeyD
```

This means that if the participant's computer is currently using English input and they physically press the D key, it should still count as the correct answer for `ก`.

---

# 3. Thai Shift Requirement

The participant does NOT need to switch language to Thai.

However:

> If the requested Thai character normally requires Shift on a Thai Kedmanee keyboard, Shift must still be pressed.

Represent this explicitly in the key definition.

For example:

```js
{
  display: "Thai shifted character",
  code: "KeyX",
  shiftRequired: true,
  category: "thai"
}
```

Correct:

```text
Shift + physical key
```

Incorrect:

```text
physical key without Shift
```

Do not rely on the generated Unicode character for validation.

---

# 4. Key Definition Architecture

Do NOT hard-code the logic as a large conditional statement.

Create a reusable key definition/configuration structure.

Suggested model:

```ts
type TestKey = {
  id: string;
  display: string;
  code: string;
  shiftRequired?: boolean;
  ctrlRequired?: boolean;
  altRequired?: boolean;
  metaRequired?: boolean;
  category:
    | "english"
    | "thai"
    | "number"
    | "symbol"
    | "function"
    | "modifier"
    | "editing"
    | "navigation";
  description?: string;
};
```

Examples:

```js
{
  id: "f5",
  display: "F5",
  code: "F5",
  shiftRequired: false,
  category: "function"
}
```

```js
{
  id: "equal",
  display: "=",
  code: "Equal",
  shiftRequired: false,
  category: "symbol"
}
```

```js
{
  id: "plus",
  display: "+",
  code: "Equal",
  shiftRequired: true,
  category: "symbol"
}
```

```js
{
  id: "bracket-left",
  display: "[",
  code: "BracketLeft",
  shiftRequired: false,
  category: "symbol"
}
```

```js
{
  id: "backspace",
  display: "Backspace",
  code: "Backspace",
  category: "editing"
}
```

```js
{
  id: "delete",
  display: "Delete",
  code: "Delete",
  category: "editing"
}
```

```js
{
  id: "digit-7",
  display: "7",
  code: "Digit7",
  shiftRequired: false,
  category: "number"
}
```

```js
{
  id: "bracket-right",
  display: "]",
  code: "BracketRight",
  shiftRequired: false,
  category: "symbol"
}
```

---

# 5. Special Handling for Shift

`Shift` itself must also be testable.

Example target:

```text
Shift
```

Either left or right Shift should be accepted unless the configuration explicitly distinguishes them.

Accept:

```text
ShiftLeft
ShiftRight
```

Consider supporting:

```ts
acceptableCodes?: string[];
```

Example:

```js
{
  id: "shift",
  display: "Shift",
  acceptableCodes: ["ShiftLeft", "ShiftRight"],
  category: "modifier"
}
```

When the target itself is Shift, pressing Shift must complete the trial.

Do not interpret it as merely a modifier for another key.

---

# 6. Required Initial Key Pool

At minimum include and test:

```text
F5
=
[
Backspace
Delete
Shift
+
7
]
```

Also create extensible pools for:

### English

```text
A-Z
```

Support lowercase/uppercase configuration if necessary.

### Numbers

```text
0-9
```

### Symbols

For example:

```text
-
=
[
]
\
;
'
,
.
/
`
```

and Shift combinations such as:

```text
!
@
#
$
%
^
&
*
(
)
_
+
{
}
|
:
"
<
>
?
~
```

### Function keys

At least:

```text
F1-F12
```

### Editing/navigation

At least:

```text
Backspace
Delete
Enter
Tab
Escape
Space
ArrowUp
ArrowDown
ArrowLeft
ArrowRight
Home
End
PageUp
PageDown
```

### Modifiers

At least:

```text
Shift
Ctrl
Alt
```

Be careful with browser/OS shortcuts.

Do not include combinations that would cause unsafe or destructive browser behavior unless properly prevented.

---

# 7. Thai Kedmanee Mapping

Create a dedicated Thai Kedmanee mapping file/module.

For example:

```text
keyboardLayouts/
  english.ts
  thaiKedmanee.ts
  specialKeys.ts
```

or equivalent structure suitable for the current project.

The Thai configuration must map:

```text
displayed Thai character
→ physical KeyboardEvent.code
→ whether Shift is required
```

Example conceptual format:

```js
{
  display: "ก",
  code: "KeyD",
  shiftRequired: false
}
```

Build the mapping based on the standard Thai Kedmanee keyboard layout.

Do not determine correctness based on the active OS input language.

---

# 8. Test Setup Screen

Before beginning the test, display a configuration panel.

Required setting:

## Number of trials

Allow the tester to choose how many random targets will appear.

Suggested presets:

```text
10
20
30
50
100
```

Also support a custom value.

Validate the value:

```text
minimum: 1
maximum: reasonable safe limit such as 500
integer only
```

---

# 9. Key Categories

Allow the test administrator/user to select which key groups participate in randomization.

Checkboxes/toggles:

```text
☑ Thai
☑ English
☑ Numbers
☑ Symbols
☑ Function keys
☑ Editing / Navigation
☑ Modifier keys
```

Default can have all enabled.

At least one category must be selected before starting.

---

# 10. Randomization

Generate the requested number of trials from the active key pool.

Requirements:

* Avoid excessive repetition of the same key.
* Do not allow the exact same target to appear twice consecutively unless unavoidable.
* Randomize across the selected categories.
* Store the generated sequence for the session.
* Do not regenerate previous trials if React/state rerenders.

Preferably use a balanced randomization strategy rather than allowing one category to dominate purely by chance.

For example:

```text
20 questions
Thai enabled
English enabled
Special enabled
```

should produce a reasonably mixed sample.

---

# 11. Start Screen

Match the simplicity of the reference reaction test.

Before starting, show something like:

```text
Keyboard Reaction Test

20 Keys

Press any key to start
```

Important:

The key used to start the test must NOT count as the answer to Trial #1.

Flow:

```text
keydown
→ enter test mode
→ display first target
→ requestAnimationFrame()
→ record targetShownAt
```

The timer should begin when the target has actually been rendered rather than substantially before rendering.

---

# 12. Main Test UI

During the test, keep the interface intentionally minimal.

Example:

```text
12 / 20

        ก

Press the indicated key
```

The target must be:

* large,
* high contrast,
* centered,
* immediately readable.

Do not display the physical answer such as:

```text
ก = D
```

during the test.

That would invalidate the experiment.

Do not show keyboard-layout hints during active testing.

---

# 13. Correct Key Handling

On each `keydown`:

1. Ignore key auto-repeat:

```js
if (event.repeat) return;
```

2. Capture:

```text
event.code
event.key
event.shiftKey
event.ctrlKey
event.altKey
event.metaKey
timestamp
```

3. Compare against the current target.

4. If correct:

```text
reactionTime =
performance.now() - targetShownAt
```

5. Save trial result.

6. Immediately move to next target.

---

# 14. Wrong Key Handling

If the participant presses the wrong key:

* increment the error count for the current trial,
* record what they pressed,
* keep the same target visible,
* DO NOT reset the reaction timer,
* allow them to continue searching until they press the correct key.

Example:

Target:

```text
F5
```

Participant presses:

```text
F4
F6
F5
```

Result:

```text
reaction time = target shown → final correct F5
errors = 2
incorrect keys = [F4, F6]
```

This is important because the experiment measures the complete time required to find and successfully press the correct key.

---

# 15. Shift Validation

Modifier validation must be exact enough for the experiment.

For:

```text
+
```

expected:

```text
code = Equal
shiftKey = true
```

Pressing:

```text
=
```

without Shift must count as incorrect.

For:

```text
=
```

pressing:

```text
Shift + =
```

should normally count as incorrect because it produces the shifted layer of that physical key.

Apply the same concept to Thai shifted characters.

---

# 16. Avoid Counting Modifier Prelude as an Error

Special attention is required for Shift combinations.

Example target:

```text
+
```

Normal browser key events are:

```text
keydown Shift
keydown Equal with shiftKey=true
```

The initial:

```text
keydown Shift
```

must NOT count as an incorrect attempt.

Otherwise every Shift-based target would automatically produce an error.

Implement a small input state machine.

For a target requiring Shift:

```text
Shift keydown
→ mark Shift held
→ do not score yet

required physical key keydown while Shift held
→ evaluate combination
```

The same behavior must work for Thai shifted targets.

---

# 17. Result Data Model

Record every trial individually.

Suggested structure:

```ts
type TrialResult = {
  trialIndex: number;

  targetId: string;
  displayedTarget: string;
  category: string;

  expectedCode: string | string[];
  shiftRequired: boolean;

  reactionTimeMs: number;

  errorCount: number;

  incorrectAttempts: {
    code: string;
    key: string;
    shiftKey: boolean;
    timeFromTargetMs: number;
  }[];

  startedAt: number;
  completedAt: number;
};
```

Also calculate aggregate statistics.

---

# 18. Required Metrics

The final result must include:

## Overall

```text
Average reaction time
Median reaction time
Fastest reaction time
Slowest reaction time
Total incorrect presses
Accuracy
Total test duration
```

Accuracy can be calculated consistently and clearly documented, for example based on:

```text
correct responses /
(correct responses + incorrect attempts)
```

---

# 19. Key Finding Metrics

This is one of the most important requirements.

Identify:

### Slowest keys

Sort keys by average or individual reaction time.

Example:

```text
1. ฐ — 1842 ms
2. [ — 1450 ms
3. F5 — 1312 ms
```

### Most mistaken keys

Example:

```text
1. + — 4 mistakes
2. ฐ — 3 mistakes
3. Delete — 2 mistakes
```

### Hesitation keys

Define a transparent hesitation rule.

A recommended approach:

```text
hesitation threshold =
max(
  1000 ms,
  session median + 1 standard deviation
)
```

or implement another statistically defensible threshold.

Document the exact rule in code.

A key is marked as hesitant if its reaction time exceeds the threshold.

Display:

```text
Key
Reaction Time
Difference from user median
Errors
```

Do NOT use arbitrary labels without showing the underlying measurement.

---

# 20. Per-Key Results Table

Show a detailed table after completion.

Columns:

```text
#
Target
Category
Reaction Time
Errors
Incorrect Keys
Status
```

Example:

```text
1 | F5        | Function | 532 ms  | 0 | -       | Normal
2 | ก         | Thai     | 821 ms  | 0 | -       | Normal
3 | +         | Symbol   | 1450 ms | 2 | =, -    | Hesitation
4 | Backspace | Editing  | 620 ms  | 0 | -       | Normal
```

Allow sorting by:

```text
reaction time
errors
trial number
key
category
```

---

# 21. Category Analysis

Calculate performance by key category.

Example:

```text
Thai
Average: 820 ms
Errors: 7

English
Average: 510 ms
Errors: 2

Symbols
Average: 1100 ms
Errors: 12
```

This is useful for determining whether the participant struggles more with:

```text
Thai layout
English layout
numbers
symbols
function keys
navigation/editing keys
```

---

# 22. Visual Result Summary

Create a simple result dashboard.

Include:

```text
Average Reaction Time
Median Reaction Time
Errors
Accuracy
Hesitation Keys
```

Also show a horizontal bar chart or equivalent visualization:

```text
reaction time by key
```

Sort slowest to fastest or allow sorting.

A second visualization may show:

```text
errors by key
```

Keep visualizations simple and readable.

---

# 23. Detailed Timeline

Store when incorrect attempts occurred.

Example:

```text
Target: +

0 ms       target displayed
610 ms     Shift pressed
940 ms     wrong key: -
1310 ms    Shift pressed
1670 ms    correct: Shift + =
```

The UI does not necessarily need to show the full timeline initially, but the data should exist for later usability analysis.

---

# 24. Export

Provide:

```text
Export CSV
```

and preferably:

```text
Export JSON
```

CSV should use UTF-8 so Thai characters are preserved correctly.

Suggested CSV columns:

```text
trial
target
category
expected_code
shift_required
reaction_time_ms
error_count
incorrect_keys
hesitation
```

Also include aggregate/session metadata where appropriate.

---

# 25. Session Metadata

Store basic non-sensitive session information such as:

```text
session id
test start timestamp
test end timestamp
number of trials
enabled categories
```

Do not collect personal information unless already required elsewhere in the project.

---

# 26. Browser Behavior

Prevent browser default behavior only when necessary during an active test.

Examples:

```text
F5
Tab
Space
Backspace
Alt
```

Some keys may:

* refresh the browser,
* move focus,
* scroll,
* navigate,
* activate menus.

During active test mode, use:

```js
event.preventDefault()
```

when appropriate.

F5 is particularly important because pressing it must be recorded as a response rather than refreshing the page.

Do not globally block keyboard behavior when the user is outside test mode.

---

# 27. Focus Handling

The keyboard listener must remain reliable.

During active testing:

* keyboard events should be captured at the appropriate window/document level;
* clicking an irrelevant element should not break the test;
* avoid text inputs during the active test;
* prevent accidental focus behavior from Tab.

If the browser/window loses focus:

```text
pause or invalidate the current trial
```

Do not silently include several seconds of tab-switching time as keyboard-search time.

A simple acceptable solution:

```text
window blur
→ pause test
→ show "Test paused — click to continue"
→ restart current trial timer when resumed
```

Mark the trial/session appropriately if needed.

---

# 28. Test State Machine

Do not implement the test as loosely connected booleans.

Use explicit states such as:

```text
SETUP
READY
RUNNING
PAUSED
COMPLETED
```

Potential flow:

```text
SETUP
  ↓
READY
  ↓ any key
RUNNING
  ↓ window blur
PAUSED
  ↓ resume
RUNNING
  ↓ final correct response
COMPLETED
```

---

# 29. UX Feedback

When a wrong key is pressed:

Do not make the feedback so strong that it reveals the answer.

Small feedback is sufficient, such as:

```text
Incorrect
```

or a brief border animation.

When correct:

Do not introduce a long success animation.

The next trial should appear immediately so the timing workflow stays consistent.

---

# 30. Restart

After completion provide:

```text
Test Again
```

and:

```text
Change Settings
```

`Test Again`:

* keeps the current settings,
* generates a new randomized sequence,
* resets all previous measurements.

`Change Settings` returns to configuration.

---

# 31. Accessibility and Display

The interface must work well at normal desktop/laptop widths.

Keyboard targets should be visually clear.

Use:

* large target text,
* high contrast,
* readable Thai font,
* sufficient spacing.

Do not require mouse interaction while the actual test is running.

---

# 32. Desktop Requirement

This experiment is primarily designed for a **physical desktop/laptop keyboard**.

If the application detects a likely touch/mobile environment, display a warning such as:

```text
This test is designed for a physical keyboard.
For reliable results, use a desktop or laptop computer.
```

Do not attempt to substitute an on-screen keyboard.

---

# 33. Important Experimental Integrity Rules

Do NOT:

* show where the target key is located during testing,
* display keyboard hints,
* highlight the answer on a keyboard diagram,
* automatically change keyboard layout,
* reset the timer after a wrong answer,
* count Shift prelude as an error for a Shift combination,
* use WPM as the primary metric,
* depend only on `event.key`,
* allow F5 to refresh the page during testing.

The objective is to measure:

```text
visual recognition
+
keyboard-location recall
+
physical key acquisition
+
successful key press
```

---

# 34. Component / Module Structure

Use a maintainable structure appropriate for the current codebase.

Conceptually something similar to:

```text
KeyboardReactionTest/
  KeyboardReactionTest
  TestSetup
  TestReady
  TestRunner
  TestResults

keyboard/
  keyDefinitions
  englishLayout
  thaiKedmaneeLayout
  specialKeys
  keyboardMatcher

analytics/
  calculateReactionStats
  calculateHesitation
  exportResults
```

Do not force this exact structure if the existing repository has a better convention.

---

# 35. Keyboard Matching Logic

Centralize keyboard matching.

For example:

```ts
function matchesTarget(
  event: KeyboardEvent,
  target: TestKey
): boolean
```

It should consider:

```text
event.code
required modifiers
acceptable alternate codes
modifier-only targets
```

Do not duplicate matching logic inside UI components.

---

# 36. Unit Tests

Add tests for keyboard matching and analytics.

At minimum test:

```text
F5 matches F5
F4 does not match F5

Equal matches "="
Shift + Equal does not match "="

Shift + Equal matches "+"
Equal without Shift does not match "+"

Thai physical code works regardless of event.key value

Thai Shift target requires Shift

ShiftLeft matches generic Shift
ShiftRight matches generic Shift

Shift prelude is not counted as an incorrect attempt for "+"
wrong key increments error count
wrong key does not reset reaction timer
event.repeat is ignored
```

Also test:

```text
median calculation
average calculation
hesitation detection
random sequence length
no immediate duplicate where avoidable
```

---

# 37. Acceptance Scenario

A test session configured for:

```text
Trials: 10

Categories:
Thai
English
Numbers
Symbols
Function
Editing
Modifier
```

might generate:

```text
ก
F5
+
7
[
Shift
Backspace
ภ
]
Delete
```

For:

```text
Target: ก
```

the participant can remain in English input mode.

They press the physical key where `ก` is located on a Thai Kedmanee keyboard.

It counts as correct.

For:

```text
Target: Thai shifted character
```

they must press:

```text
Shift + corresponding physical key
```

For:

```text
Target: +
```

they must press:

```text
Shift + =
```

For:

```text
Target: Shift
```

either:

```text
ShiftLeft
```

or:

```text
ShiftRight
```

is accepted.

If they press two incorrect keys before the correct one:

```text
errorCount = 2
```

and reaction time remains:

```text
target appearance → final successful keypress
```

---

# 38. Final Results Example

At the end show something conceptually like:

```text
Test Complete

Average reaction time
742 ms

Median
681 ms

Fastest
312 ms

Slowest
1,842 ms

Errors
8

Accuracy
71.4%

Hesitation Keys
ฐ    1842 ms
+    1450 ms
F5   1312 ms
```

Then:

```text
Performance by Category

Thai       910 ms
English    480 ms
Numbers    570 ms
Symbols   1050 ms
Function   730 ms
Editing    620 ms
```

Followed by the complete per-trial table and export controls.

---

# 39. Implementation Quality

Requirements:

* Use strongly typed models if the project uses TypeScript.
* Keep keyboard definitions data-driven.
* Separate measurement logic from presentation.
* Avoid unnecessary dependencies.
* Avoid unnecessary rerenders during timing-sensitive portions.
* Use `performance.now()` for timing.
* Ensure listeners are correctly registered and cleaned up.
* Avoid stale state/closure issues.
* Preserve all existing project behavior.

Pay particular attention to React/event-state timing if this is a React application.

Use refs where appropriate for timing-critical values such as:

```text
current target
targetShownAt
trial index
```

while keeping UI state correctly synchronized.

---

# 40. Deliverables

After implementation provide:

1. Summary of what was implemented.
2. Files created.
3. Files modified.
4. Explanation of the keyboard mapping architecture.
5. Explanation of how Thai physical-key detection works.
6. Explanation of Shift handling.
7. Reaction-time calculation method.
8. Error-counting method.
9. Hesitation-detection method.
10. Tests added.
11. Build/test/lint results.
12. Any limitations caused by browser or operating-system keyboard-event behavior.

Do not stop after creating the UI.

Verify the complete interaction from:

```text
setup
→ start
→ random target
→ correct/wrong detection
→ Thai physical-key handling
→ Shift handling
→ timing
→ completion
→ statistics
→ CSV/JSON export
```

and fix any issues found.
