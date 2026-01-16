import Landing from "@/components/Landing";
import Card from "@/components/Card";
import HomeFooter from "@/components/HomeFooter";

import Docs from "./docs/page";
export default function Home() {
  return (
    <>
      <Landing />
      <Docs />
      <Card />
      <HomeFooter />
    </>
  );
}
