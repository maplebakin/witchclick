# Clean Cursing archive: editorial differentiation audit

Reviewed October 8, 2026. This is a focused qualitative sample of existing archive content, not an exhaustive audit of every published working.

## Finding

Several different ritual archetypes repeatedly use the same sequence: settle the breath, visualize an object or cord, send another person's energy back, and conclude with immediate relief. That weakens the value of the stored `generator.type` taxonomy. The current universal tag set also obscures distinctions between archetypes.

## Editorial mechanics to preserve

| Archetype | Primary ritual action | Distinctive reader outcome |
| --- | --- | --- |
| Reveal | Separate observed facts from assumptions | Articulate what is known |
| Return | Assign responsibility through two objects or columns | Stop doing someone else's work |
| Mirror | Compare an asserted promise with a documented action | Recognize a repeating pattern |
| Sever | Deliberately break a connection or obligation symbolically | Name what ends |
| Echo | Give a silenced statement voice on paper or aloud | Hear one's own position |
| Smoke | Clear a physical surface or move air without requiring smoke | Release the compulsion to decode |
| Threshold | Cross a real or symbolic boundary | Mark a forward choice |
| Knife | Draw a precise distinction | State an enforceable boundary |

## Changes in this PR

- Mirror: promise-versus-action comparison replaces the generic floating-thread visualization.
- Return: responsibility is sorted using two objects or pieces of paper.
- Smoke: ambiguity is sorted into known versus unknown, and dispersed without smoke or fire.
- Knife: the family-relationship excuse is separated from the conduct it supposedly excuses, without requiring visual imagination or a blade.
- Threshold: removes the instruction to place a lit candle on the floor or wait for it to burn low.

## Remaining editorial work

1. Audit all published workings for fire, wax, smoke, blade, and unattended-flame instructions; the template warning should not be the only protection.
2. Flag methods that require mental imagery and offer a nonvisual equivalent where missing.
3. Avoid guaranteed statements such as 'the fog is gone' or claims about another person's future accountability.
4. Review repeated invocations and universal tags; not every working should imply mirroring and returning.
5. Review archetype distribution from the content metadata. This sample does not establish how well represented each of the eight types is.
6. Add a stable archive lint/test workflow once desired editorial checks are defined; avoid brittle keyword-only quality gates.

## Editorial principle

Keep the teeth. Differentiate the action. Do not promise to control other people, and do not demand a particular sensory or cognitive experience from the reader.
