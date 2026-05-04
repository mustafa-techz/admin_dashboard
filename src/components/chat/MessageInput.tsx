"use client";

import { useRef, useState, useCallback } from "react";
import { Send, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
  disabledReason?: string;
  isSending?: boolean;
}

export default function MessageInput({
  onSend,
  onUploadImage,
  disabled = false,
  disabledReason,
  isSending = false,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if (disabled || isSending) return;
    if (!text.trim() && !imageFile) return;

    let imageUrl: string | undefined;

    if (imageFile) {
      setUploadProgress(true);
      try {
        imageUrl = await onUploadImage(imageFile);
      } catch (err) {
        console.error("Image upload failed:", err);
        setUploadProgress(false);
        return;
      }
      setUploadProgress(false);
      clearImage();
    }

    onSend(text.trim(), imageUrl);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !disabled && !isSending && !uploadProgress && (text.trim() || imageFile);

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur px-3 py-2 shrink-0">
      {/* Image preview strip */}
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-xl border border-border"
          />
          <button
            onClick={clearImage}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {uploadProgress && (
        <div className="h-0.5 w-full bg-border rounded-full mb-2 overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
        </div>
      )}

      {/* Disabled reason */}
      {disabled && disabledReason && (
        <p className="text-xs text-muted-foreground text-center py-2 font-medium">
          {disabledReason}
        </p>
      )}

      {!disabled && (
        <div className="flex items-end gap-2">
          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground transition-all min-h-[40px]"
            style={{ maxHeight: "120px" }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200",
              canSend
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSending || uploadProgress ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
