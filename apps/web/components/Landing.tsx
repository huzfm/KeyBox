import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* 🌐 Navbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600">LicenseFlow</h1>
        <nav className="flex gap-6">
          <a href="#features" className="hover:text-blue-600 font-medium">
            Features
          </a>
          <a href="#pricing" className="hover:text-blue-600 font-medium">
            Pricing
          </a>
          <a href="#contact" className="hover:text-blue-600 font-medium">
            Contact
          </a>
        </nav>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
          <Link href="/login">Login</Link>
        </button>
      </header>

      {/* 🎯 Hero Section */}
      <section className="text-center py-24 px-6 bg-linear-to-b from-blue-50 to-white">
        <h2 className="text-4xl font-bold mb-4 text-gray-900 leading-tight">
          Smart & Secure{" "}
          <span className="text-blue-600">License Management</span> for Modern
          Software Teams
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Generate, validate, revoke and monitor licenses with ease. A complete
          solution backed with automation, security, and analytics.
        </p>
        <button className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg text-lg hover:bg-blue-700">
          Get Started Free →
        </button>
      </section>

      {/* ⚙️ Features */}
      <section id="features" className="py-20 px-10">
        <h3 className="text-3xl font-bold text-center mb-10">
          Powerful Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            [
              "License Creation",
              "Create secure license keys with product and user binding.",
            ],
            [
              "Real-time Validation",
              "REST API endpoints for verifying licenses on any platform.",
            ],
            [
              "Auto Expiry & Revocation",
              "Automated cron jobs to expire or revoke compromised keys.",
            ],
            [
              "Role-Based Access",
              "Admin & Developer access controls for secure collaboration.",
            ],
            [
              "Analytics Dashboard",
              "Track activations, product usage, and performance metrics.",
            ],
            [
              "Multi-Platform Ready",
              "Desktop, web, SaaS, plugins & offline support.",
            ],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="bg-white shadow-md rounded-xl p-8 text-center"
            >
              <h4 className="text-xl font-bold mb-3">{title}</h4>
              <p className="text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 💸 Pricing */}
      <section id="pricing" className="py-20 bg-gray-100 text-center">
        <h3 className="text-3xl font-bold mb-10">
          Simple, Transparent Pricing
        </h3>

        <div className="flex flex-col md:flex-row justify-center gap-10 max-w-4xl mx-auto">
          {[
            ["Starter", "$0", "Up to 50 licenses"],
            ["Pro", "$29/mo", "Up to 1000 licenses"],
            ["Enterprise", "Custom", "Unlimited licenses + Priority Support"],
          ].map(([plan, price, desc]) => (
            <div
              key={plan}
              className="bg-white p-8 rounded-xl shadow-md w-full md:w-1/3"
            >
              <h4 className="font-bold text-2xl mb-3">{plan}</h4>
              <p className="text-4xl font-bold mb-4">{price}</p>
              <p className="mb-6 text-gray-600">{desc}</p>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 📩 Contact */}
      <section id="contact" className="py-20 text-center">
        <h3 className="text-3xl font-bold mb-6">Contact Us</h3>
        <p className="text-gray-600 mb-6">Need help? Reach out anytime.</p>
        <a
          href="mailto:support@licenseflow.com"
          className="text-blue-600 font-medium underline"
        >
          support@licenseflow.com
        </a>
      </section>

      {/* 🦶 Footer */}
      <footer className="py-6 text-center bg-gray-200 text-gray-700">
        © {new Date().getFullYear()} LicenseFlow. All rights reserved.
      </footer>
    </main>
  );
}
