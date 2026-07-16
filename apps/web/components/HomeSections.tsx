import { cookies } from "next/headers"
import HeroClient from "./HeroClient"

export default async function HomeSections() {
        const cookieStore = await cookies()
        const isLoggedIn  = !!cookieStore.get("jwt")

        return <HeroClient isLoggedIn={isLoggedIn} />
}
