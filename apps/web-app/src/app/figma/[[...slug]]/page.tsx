import { FigmaRuntime } from "@/components/figma/FigmaRuntime";
import { notFound } from "next/navigation";

export default function FigmaCatchAllPage() {
  if (process.env["FIGMA_RUNTIME_ENABLED"] !== "true") {
    notFound();
  }

  return <FigmaRuntime />;
}
