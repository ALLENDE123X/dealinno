import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="text-xl font-bold tracking-tight">dealinno</div>
        <a href="mailto:hello@dealinno.com" className="text-sm text-zinc-400 hover:text-white transition">Get early access →</a>
      </nav>
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
          Now accepting early access
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">Close deals while<br />you sleep</h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">Dealinno watches your inbox, drafts your scheduling replies, captures your meetings, and sends proposals — before you even open the email.</p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="https://formspree.io/f/placeholder" method="POST">
          <input type="email" name="email" placeholder="your@email.com" required className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
          <button type="submit" className="bg-white text-black font-semibold rounded-lg px-6 py-3 hover:bg-zinc-100 transition">Get early access</button>
        </form>
        <p className="text-zinc-600 text-sm mt-4">No credit card. No visible bot joining your calls.</p>
      </section>
      <section className="max-w-5xl mx-auto px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">The full sales loop, automated</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="text-zinc-600 text-sm font-mono mb-4">01</div>
            <h3 className="text-xl font-semibold mb-3">Scheduling, handled</h3>
            <p className="text-zinc-400 leading-relaxed">Connect Gmail once. When a prospect emails about a meeting, Dealinno drafts the reply with your Calendly link in your voice. You approve in one click.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="text-zinc-600 text-sm font-mono mb-4">02</div>
            <h3 className="text-xl font-semibold mb-3">Meetings, captured</h3>
            <p className="text-zinc-400 leading-relaxed">No visible bot. Dealinno captures audio locally on your device — fully compliant, fully silent. Live transcript and AI assistance in a private overlay only you can see.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="text-zinc-600 text-sm font-mono mb-4">03</div>
            <h3 className="text-xl font-semibold mb-3">Proposals, drafted</h3>
            <p className="text-zinc-400 leading-relaxed">60 seconds after your call ends, a proposal is in your Gmail drafts referencing exactly what the prospect said. Review, hit send. Done.</p>
          </div>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-8 py-16 text-center border-t border-zinc-900">
        <p className="text-zinc-500 text-sm mb-6">Integrates with what you already use</p>
        <div className="flex flex-wrap justify-center gap-6 text-zinc-500 text-sm">
          <span>Gmail</span><span>·</span><span>Google Calendar</span><span>·</span><span>Zoom</span><span>·</span><span>Google Meet</span><span>·</span><span>Calendly</span>
        </div>
      </section>
      <footer className="border-t border-zinc-900 py-8 px-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600 text-sm">
        <span>© 2026 Dealinno</span>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms</Link>
        </div>
      </footer>
    </main>
  )
}
