import MapEditor from "@/components/map/MapEditor";
import { mapRu } from "@/content/map.ru";
export const metadata = {
  title: mapRu.editor,
  robots: { index: false, follow: false },
};
export default function MapEditorPage() {
  return <MapEditor />;
}
