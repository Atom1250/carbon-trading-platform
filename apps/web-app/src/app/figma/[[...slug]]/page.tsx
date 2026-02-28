import { FigmaRuntime } from "@/components/figma/FigmaRuntime";
import { notFound } from "next/navigation";

export default function FigmaCatchAllPage() {
  if (process.env["FIGMA_RUNTIME_ENABLED"] !== "true" || process.env["NODE_ENV"] === "production") {
    notFound();
  }

  return <FigmaRuntime />;
}
