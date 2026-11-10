// test/unit/rich-text-editor.test.tsx
//
// The editor reports a change both when the writer edits and when it merely
// re-serialises HTML it was handed (a stored `<br />` comes back `<br>`). The
// post form's unsaved-changes guard hangs on telling the two apart: get it
// wrong one way and every opened post claims to be unsaved, the other way and
// an hour's writing leaves without a warning.
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RichTextEditor } from "@/components/admin/blog/rich-text-editor";

interface EditorProps {
  onCut: () => void;
  onDrop: () => void;
  onEditorChange: (html: string, editor: { isDirty: () => boolean }) => void;
  onKeyDown: () => void;
  onPaste: () => void;
}

const captured = vi.hoisted(() => ({ props: null as EditorProps | null }));

vi.mock("@tinymce/tinymce-react", () => ({
  Editor: (props: EditorProps) => {
    captured.props = props;
    return null;
  },
}));
vi.mock("@/redux/blog/blog-admin-api", () => ({
  useUploadBlogImageMutation: () => [vi.fn()],
}));

const pristine = { isDirty: () => false };

const mount = () => {
  const onChange = vi.fn();
  render(<RichTextEditor value="<p>x<br /></p>" onChange={onChange} />);
  if (!captured.props) throw new Error("editor did not render");
  return { editor: captured.props, onChange };
};

beforeEach(() => {
  captured.props = null;
});

describe("RichTextEditor change reporting", () => {
  it("does not call the editor's own re-serialising an edit", () => {
    const { editor, onChange } = mount();
    editor.onEditorChange("<p>x<br></p>", pristine);
    expect(onChange).toHaveBeenCalledWith("<p>x<br></p>", false);
  });

  it.each(["onKeyDown", "onPaste", "onCut", "onDrop"] as const)(
    "counts the first change after %s as the writer's",
    (input) => {
      const { editor, onChange } = mount();
      editor[input]();
      // The editor's dirty flag is still down for the first typed character.
      editor.onEditorChange("<p>xy</p>", pristine);
      expect(onChange).toHaveBeenCalledWith("<p>xy</p>", true);
    },
  );

  it("counts a toolbar command, which the editor flags itself", () => {
    const { editor, onChange } = mount();
    editor.onEditorChange("<p><strong>x</strong></p>", { isDirty: () => true });
    expect(onChange).toHaveBeenCalledWith("<p><strong>x</strong></p>", true);
  });
});
