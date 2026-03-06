import Landing from "@/components/Landing"
import Card from "@/components/Card"
import HomeFooter from "@/components/HomeFooter"

import SdkUsage from "./sdk-usage/page"
export default function Home() {
        return (
                <>
                        <Landing />
                        <SdkUsage />
                        <Card />
                        <HomeFooter />
                </>
        )
}
