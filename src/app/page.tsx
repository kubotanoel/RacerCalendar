import { Suspense } from "react";

import { HomeClient } from "@/components/HomeClient";

export default function Page() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <HomeClient />
    </Suspense>
  );
}

function LandingFallback() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-24 text-zinc-500 dark:text-zinc-400">
      Loading personalized calendar tools…
    </div>
  );
}
