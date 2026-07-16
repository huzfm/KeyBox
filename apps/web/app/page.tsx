import Landing from "@/components/Landing"
import HowItWorks from "@/components/HowItWorks"
import WhyKeyBox from "@/components/WhyKeyBox"
import Card from "@/components/Card"
import SdkUsage from "./sdk-usage/page"
import FAQ from "@/components/FAQ"
import CTAStrip from "@/components/CTAStrip"
import HomeFooter from "@/components/HomeFooter"

export default function Home() {
        return (
                <>
                        <Landing />
                        <HowItWorks />
                        <WhyKeyBox />
                        <Card />
                        <SdkUsage />
                        <FAQ />
                        <CTAStrip />
                        <HomeFooter />
                </>
        )
}
