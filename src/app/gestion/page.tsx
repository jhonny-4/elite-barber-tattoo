import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "../../components/shell";
import { Dashboard } from "../../components/dashboard";
export const metadata: Metadata = {
  title: "Gestión demo | Elite",
  robots: { index: false, follow: false },
};
export default function Management() {
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<p className="loading-state">Abriendo gestión…</p>}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}
