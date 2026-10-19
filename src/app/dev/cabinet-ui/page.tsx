import UiGallery from "@/components/cabinet/UiGallery";
import "../../app/cabinet.css";
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main className="cabinet cab-main">
      <UiGallery />
    </main>
  );
}
