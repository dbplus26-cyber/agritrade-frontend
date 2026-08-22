// usePhotoStaging owns the staged-photo lifecycle for the record forms
// (supplier, buyer, driver, commodity). The object-URL assertions are the
// point of the hook: a form that never revokes its preview URLs leaks them for
// the tab's life, so the replace/unmount revocations are pinned here. jsdom
// does not implement object URLs, so URL.createObjectURL/revokeObjectURL are
// mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePhotoStaging } from "@/hooks/use-photo-staging";

const EXISTING = "https://res.cloudinary.com/demo/image/upload/existing.jpg";
const fileA = new File(["a"], "a.png", { type: "image/png" });
const fileB = new File(["b"], "b.png", { type: "image/png" });

const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
  let n = 0;
  createObjectURL.mockImplementation(() => `blob:mock-${String(++n)}`);
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
});

const render = (existingUrl: string | null = EXISTING) =>
  renderHook(({ url }) => usePhotoStaging(url), {
    initialProps: { url: existingUrl },
  });

describe("usePhotoStaging", () => {
  it("previews the record's photo until a file is staged, then the staged URL wins", () => {
    const { result } = render();
    expect(result.current.previewUrl).toBe(EXISTING);

    act(() => {
      result.current.onSelectFile(fileA);
    });
    expect(createObjectURL).toHaveBeenCalledWith(fileA);
    expect(result.current.previewUrl).toBe("blob:mock-1");
    expect(result.current.photoFile).toBe(fileA);
    expect(result.current.removePhoto).toBe(false);
  });

  it("remove hides the preview, raises the flag and clears the native input", () => {
    const { result } = render();
    const input = { value: "C:\\fakepath\\old.png" } as HTMLInputElement;
    result.current.fileInputRef.current = input;

    act(() => {
      result.current.onRemove();
    });
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.removePhoto).toBe(true);
    expect(result.current.photoFile).toBeNull();
    expect(input.value).toBe("");
  });

  it("selecting a file after remove un-removes", () => {
    const { result } = render();
    act(() => {
      result.current.onRemove();
    });
    act(() => {
      result.current.onSelectFile(fileA);
    });
    expect(result.current.removePhoto).toBe(false);
    expect(result.current.previewUrl).toBe("blob:mock-1");
  });

  it("revokes the previous object URL when the staged file is replaced", () => {
    const { result } = render();
    act(() => {
      result.current.onSelectFile(fileA);
    });
    act(() => {
      result.current.onSelectFile(fileB);
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
    expect(result.current.previewUrl).toBe("blob:mock-2");
    expect(revokeObjectURL).not.toHaveBeenCalledWith("blob:mock-2");
  });

  it("revokes the object URL on unmount", () => {
    const { result, unmount } = render();
    act(() => {
      result.current.onSelectFile(fileA);
    });
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
  });

  it("reset drops the staged file and the flag, revokes the URL and clears the input", () => {
    const { result } = render();
    const input = { value: "C:\\fakepath\\a.png" } as HTMLInputElement;
    result.current.fileInputRef.current = input;

    act(() => {
      result.current.onSelectFile(fileA);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.previewUrl).toBe(EXISTING);
    expect(result.current.photoFile).toBeNull();
    expect(result.current.removePhoto).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
    expect(input.value).toBe("");
  });
});
