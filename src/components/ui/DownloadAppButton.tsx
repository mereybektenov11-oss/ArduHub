import Boxicon from "@/components/icons/Boxicon";
import { desktopAppRu as app } from "@/content/ru";
import { TextureButton } from "./texture-button";

// Direct link to the Windows installer of the desktop app.
export default function DownloadAppButton({
  variant = "glass",
  size = "lg",
}: {
  variant?: "glass" | "primary";
  size?: "lg" | "default";
}) {
  return (
    <TextureButton asChild variant={variant} size={size}>
      <a href={app.downloadUrl} download>
        <Boxicon name="windows" />
        {app.download}
      </a>
    </TextureButton>
  );
}
