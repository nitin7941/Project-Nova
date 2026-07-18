import { FeatureWorkbench } from "@/components/FeatureWorkbench";
import { featureBySlug } from "@/lib/features";

export default function Page() {
  return <FeatureWorkbench feature={featureBySlug("tests")!} />;
}
