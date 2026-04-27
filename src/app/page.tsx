export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const HomeClient = nextDynamic(() => import("./HomeClient"), { ssr: false });

export default function Page() {
  return <HomeClient />;
}
