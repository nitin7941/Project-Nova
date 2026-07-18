import { DocsWorkbench } from "@/components/DocsWorkbench";
import { featureBySlug } from "@/lib/features";

export default function Page() {
  return <DocsWorkbench feature={featureBySlug("docs")!} />;
}
