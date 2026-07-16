import HomeNavbar from "@/components/HomeNavBar";
import HomeSections from "@/components/HomeSections";

export default function Home() {
       return (
              <div className="relative w-full overflow-hidden">
                     <HomeNavbar />
                     <HomeSections />
              </div>
       );
}
