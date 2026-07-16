import Link from "next/link"
import { cookies } from "next/headers"
import CTAClient from "./CTAClient"

export default async function CTAStrip() {
        const cookieStore = await cookies()
        const isLoggedIn  = !!cookieStore.get("jwt")
        return <CTAClient isLoggedIn={isLoggedIn} />
}
