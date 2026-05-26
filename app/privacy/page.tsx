import Link from 'next/link'

export default function Privacy() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 max-w-4xl mx-auto border-b border-zinc-900">
        <Link href="/" className="text-xl font-bold tracking-tight">dealinno</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-zinc-400 mb-12">Last updated: May 26, 2026</p>
        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
            <p>Dealinno is an AI-powered sales workflow tool that automates scheduling, meeting capture, and proposal generation. This Privacy Policy explains how we collect, use, and protect your information.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Gmail API Usage</h2>
            <p className="mb-4">Dealinno uses the Gmail API to read incoming emails and create draft replies on your behalf. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We read email threads to detect scheduling requests and generate context-aware draft replies</li>
              <li>We create Gmail drafts that you review and approve before sending — we never send emails without your explicit approval</li>
              <li>We do not read, store, or process emails unrelated to your sales workflow</li>
              <li>We do not share your email content with any third parties</li>
              <li>We do not use your Gmail data to serve advertising</li>
              <li>You can revoke Gmail access at any time via myaccount.google.com/permissions</li>
            </ul>
            <p className="mt-4">Our use of information from Gmail APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-400 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Google Calendar API Usage</h2>
            <p>We read your Google Calendar to check availability for scheduling and detect upcoming meetings. We do not create, modify, or delete events without your instruction. Calendar data is never shared with third parties.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Meeting Recording</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Audio is captured locally on your device, not streamed to our servers during the meeting</li>
              <li>After the meeting, audio is sent to Deepgram for transcription over an encrypted connection</li>
              <li>Transcripts are stored encrypted and associated only with your account</li>
              <li>You are responsible for complying with call recording consent laws in your jurisdiction</li>
              <li>You can delete any transcript at any time from your account</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Account info:</strong> Name, email, Google account identifier</li>
              <li><strong className="text-white">Email content:</strong> Scheduling-related threads, stored temporarily</li>
              <li><strong className="text-white">Calendar data:</strong> Event times and attendees for your sales meetings</li>
              <li><strong className="text-white">Transcripts:</strong> Text transcriptions of meetings you record</li>
              <li><strong className="text-white">Generated documents:</strong> Proposals and follow-ups created by Dealinno</li>
              <li><strong className="text-white">Usage data:</strong> Feature usage and performance metrics</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Supabase:</strong> Database and authentication</li>
              <li><strong className="text-white">Deepgram:</strong> Audio transcription</li>
              <li><strong className="text-white">Anthropic Claude:</strong> AI content generation</li>
              <li><strong className="text-white">Stripe:</strong> Payment processing</li>
              <li><strong className="text-white">Vercel:</strong> Application hosting</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Security</h2>
            <p>All data is encrypted in transit and at rest. We do not sell your personal data.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Retention and Deletion</h2>
            <p>Data is retained while your account is active. You can delete data at any time. All personal data is deleted within 30 days of account deletion.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
            <p>Questions: <a href="mailto:privacy@dealinno.com" className="text-blue-400 hover:underline">privacy@dealinno.com</a></p>
          </section>
        </div>
      </div>
      <footer className="border-t border-zinc-900 py-8 px-8 max-w-4xl mx-auto flex gap-6 text-zinc-600 text-sm">
        <Link href="/" className="hover:text-white transition">Home</Link>
        <Link href="/terms" className="hover:text-white transition">Terms</Link>
      </footer>
    </main>
  )
}
