import CategoriesSection from "@/components/CategoriesSection";


export default function Home() {

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(121,84,255,0.14),_transparent_40%),linear-gradient(135deg,_#ffffff_0%,_#f8f5ff_100%)]">
      <Header />

      <main className="flex-1">
        <Hero />

        {/* Add the CategoriesSection after Hero */}
        <CategoriesSection />

      </main>

      <Footer />
    </div>
  );
}