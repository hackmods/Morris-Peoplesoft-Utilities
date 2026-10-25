# Contextual PeopleCode reference

Use **Inspect** to lock the intended visible field, then **PCode**. With no locked
field, use the documentation or agent task form; no placeholder code is generated.

DOM IDs can be ambiguous. Verify the record and field in App Designer, correcting
the hints if needed. Choose **FieldChange** or **RowInit**, describe the intended
component-buffer row/scroll context, and confirm that you verified it. Select
**Preview contextual example**, review, then explicitly copy. Every name/event/
context/confirmation edit invalidates the example. Current host, environment,
feature and UI scope are checked again before preview/copy; settings changes can
make the action unavailable. No typed context or example is saved or sent to AI.

The example only obtains row/record/field references. It adds no validation rule,
write, save, SQL, business action or guessed scroll traversal. Test adapted logic
in the required App Designer event. A DOM occurrence such as `$0` is not a row
number or PeopleCode scroll path. The browser cannot verify the intended event,
buffer layout, definitions or server code. Component/page events and other server
contexts need a different, explicitly designed example.

The built-in syntax and context assumptions were checked 2026-10-21 against
[Oracle's PeopleTools 8.62 PeopleCode Developer's Guide](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tpcd-b112025.pdf)
(current context and buffer references, chapters 4–5; event descriptions, chapter 6)
and [PeopleCode Language Reference](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tpcl-b112025.pdf)
(`GetRow`). This is a documentation review, not execution validation on your system.

The reference buttons open fixed local destinations through the extension worker;
they do not expose Options to websites or attach page text, values or session URLs.
Only a bounded PeopleTools version hint can accompany the docs destination.
