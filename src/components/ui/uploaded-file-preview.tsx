type UploadedFilePreviewProps = {
  url: string;
  contentType: string;
  alt: string;
  className?: string;
};

export function UploadedFilePreview({
  url,
  contentType,
  alt,
  className = "max-h-96 w-full rounded-lg border border-slate-300 bg-white object-contain",
}: UploadedFilePreviewProps) {
  if (contentType === "application/pdf") {
    return (
      <iframe
        src={url}
        title={alt}
        className="h-96 w-full rounded-lg border border-slate-300 bg-white"
      />
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
