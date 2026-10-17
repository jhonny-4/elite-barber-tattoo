import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { OwnerGate } from "../../components/owner-gate";
export const metadata: Metadata = {
  title: "Panel administrativo | Elite",
  robots: { index: false, follow: false },
};
export default function Administration() {
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<p className="loading-state">Preparando panel…</p>}>
          <OwnerGate />
        </Suspense>
      </main>
    </>
  );
}
