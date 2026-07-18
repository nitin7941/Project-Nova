import { DesignWorkbench } from "@/components/DesignWorkbench";
import { featureBySlug } from "@/lib/features";

export default function Page() {
  return <DesignWorkbench feature={featureBySlug("design")!} />;
}
