import { Suspense } from "react";
import { Header } from "../../components/shell";
import { OwnerGate } from "../../components/owner-gate";
export default function Page() {
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<p>Preparando jornada…</p>}>
          <OwnerGate professionalView />
        </Suspense>
      </main>
    </>
  );
}
