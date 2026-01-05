import HomeNavbar from "@/components/HomeNavBar";
import HomeSections from "@/components/HomeSections";
import HomeFooter from "@/components/HomeFooter";
import Card from "@/components/Card";
export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[35px_35px] " />

      <main className="relative z-10">
        <HomeNavbar />
        <HomeSections />

        {/* <HomeFooter /> */}
      </main>
    </div>
  );
}
