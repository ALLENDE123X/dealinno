import Link from 'next/link'

export default function Terms() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 max-w-4xl mx-auto border-b border-zinc-900">
        <Link href="/" className="text-xl font-bold tracking-tight">dealinno</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-zinc-400 mb-12">Last updated: May 26, 2026</p>
        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance</h2>
            <p>By using Dealinno, you agree to these Terms of Service.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Service</h2>
            <p>Dealinno provides AI-powered sales workflow automation including scheduling assistance, meeting capture, transcription, and document generation. The service requires connection to your Google account.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Your Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for complying with call recording consent laws in your jurisdiction</li>
              <li>You must review all AI-generated content before sending</li>
              <li>You must not use Dealinno to send spam or violate anti-spam laws</li>
              <li>You are responsible for all content sent using Dealinno</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Payments</h2>
            <p>Dealinno is a paid service billed monthly. You can cancel at any time from your account settings.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
            <p>Dealinno is provided as-is. We are not liable for damages arising from use of the service including errors in AI-generated content.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Contact</h2>
            <p>Questions: <a href="mailto:hello@dealinno.com" className="text-blue-400 hover:underline">hello@dealinno.com</a></p>
          </section>
        </div>
      </div>
      <footer className="border-t border-zinc-900 py-8 px-8 max-w-4xl mx-auto flex gap-6 text-zinc-600 text-sm">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
      </footer>
    </main>
  )
}
