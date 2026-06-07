import { Bento } from "./Bento";
import type { LayoutData } from "@/components/layouts/types";

export function BentoTemplate({ data }: { data: LayoutData }) {
  return <Bento data={data} />;
}

export { Bento };