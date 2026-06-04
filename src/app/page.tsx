import HomeClient from "./HomeClient";

// s-maxage=3600 lets CF Edge cache the HTML envelope so warm hits skip
// the Worker entirely. Verified 652ms TTFB on the static homepage was
// Worker cold-start cost; cached hits should be <100ms.
export const revalidate = 3600;

export default function Page() {
  return <HomeClient />;
}
