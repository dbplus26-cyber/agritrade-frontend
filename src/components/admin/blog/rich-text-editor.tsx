"use client";

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
 */
export function RichTextEditor({
  value,
  onChange,
  invalid,
  id,
}: {
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const [upload] = useUploadBlogImageMutation();

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
        onEditorChange={(html) => onChange(html)}
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
          images_upload_handler: async (blobInfo: { blob: () => Blob }) => {
            try {
              const res = await upload(blobInfo.blob()).unwrap();
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
