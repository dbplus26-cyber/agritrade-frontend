"use client";

import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { env } from "@/lib/env";
import { extractApiError } from "@/lib/extract-api-error";
import { useUploadBlogImageMutation } from "@/redux/blog/blog-admin-api";

/**
 * The blog's body editor (TinyMCE Cloud). Images dropped, pasted or picked in
 * the editor upload to the blog's Cloudinary folder straight away and are
 * inserted by URL, so a post body never carries megabytes of base64. The
 * backend sanitizes whatever this produces, so the toolbar offers only what
 * survives that: headings 2-4, emphasis, lists, quotes, links, images and
 * tables.
 *
 * `onChange` says whether a change is the writer's. The editor also reports a
 * change when it merely re-serialises HTML it was handed (stored `<br />`
 * comes back `<br>`), and a form that counted that as an edit would call
 * every opened post unsaved.
 */
export function RichTextEditor({
  value,
  onChange,
  invalid,
  id,
}: {
  value: string;
  onChange: (html: string, edited: boolean) => void;
  invalid?: boolean;
  id?: string;
}) {
  const [upload] = useUploadBlogImageMutation();
  // Set by the writer's own input. The editor's dirty flag covers toolbar
  // commands but only rises after the first typed character has been reported.
  const touched = useRef(false);
  const touch = () => {
    touched.current = true;
  };

  return (
    <div
      className={
        invalid
          ? "rounded-none ring-1 ring-console-red"
          : "rounded-none ring-1 ring-adm-line"
      }
    >
      <Editor
        id={id}
        apiKey={env.TINYMCE_API_KEY || undefined}
        value={value}
        onEditorChange={(html, editor) =>
          onChange(html, touched.current || editor.isDirty())
        }
        onKeyDown={touch}
        onPaste={touch}
        onCut={touch}
        onDrop={touch}
        init={{
          automatic_uploads: true,
          block_formats:
            "Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre",
          branding: false,
          content_style:
            "body { font-family: system-ui, sans-serif; font-size: 16px; line-height: 1.7; color: #1f211c; } img { max-width: 100%; height: auto; }",
          convert_urls: false,
          height: 560,
          images_file_types: "jpeg,jpg,png,webp,gif",
          images_upload_handler: async (blobInfo: {
            blob: () => Blob;
            filename: () => string;
          }) => {
            try {
              const res = await upload({
                blob: blobInfo.blob(),
                filename: blobInfo.filename(),
              }).unwrap();
              return res.data.url;
            } catch (err) {
              throw {
                message: extractApiError(err).message,
                remove: true,
              };
            }
          },
          invalid_styles: {
            "*": "font-family font-size color background-color",
          },
          link_default_protocol: "https",
          link_target_list: [
            { text: "Same tab", value: "" },
            { text: "New tab", value: "_blank" },
          ],
          menubar: false,
          plugins: "autolink link lists image table wordcount code",
          promotion: false,
          resize: true,
          statusbar: true,
          toolbar:
            "undo redo | blocks | bold italic underline strikethrough | bullist numlist blockquote | link image table | alignleft aligncenter alignright | removeformat code",
          toolbar_mode: "sliding",
        }}
      />
    </div>
  );
}
