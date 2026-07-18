import { TestsWorkbench } from "@/components/TestsWorkbench";
import { featureBySlug } from "@/lib/features";

export default function Page() {
  return <TestsWorkbench feature={featureBySlug("tests")!} />;
}
