import Landing from "../../components/Landing";
import { buildMetadata } from "../../lib/metadata";

export const metadata = buildMetadata("hi");

export default function HindiPage() {
  return <Landing lang="hi" />;
}
