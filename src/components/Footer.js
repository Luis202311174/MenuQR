"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-100 px-4 py-8 mt-8">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-4 gap-6">

        <div>
          <div className="font-extrabold text-white mb-3 text-xl">
            MenuQR
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            MenuQR is a cloud-native platform empowering local businesses
            with dynamic menu management and intelligent customer engagement.
          </p>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-4">
            Navigation
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:underline text-slate-300">Home</Link></li>
            <li><Link href="/browse" className="hover:underline text-slate-300">Browse Menus</Link></li>
            <li><Link href="/signup-auth?role=owner" className="hover:underline text-slate-300">Business Sign-up</Link></li>
            <li><Link href="/signup-auth?role=user" className="hover:underline text-slate-300">Customer Sign-up</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-4">
            Legal
          </h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="hover:underline text-slate-300">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:underline text-slate-300">Privacy Policy</Link></li>
            <li><Link href="/contact" className="hover:underline text-slate-300">Contact Us</Link></li>
            <li><Link href="/faq" className="hover:underline text-slate-300">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm leading-relaxed text-slate-400">
            "A Capstone Project submitted to the Department of Information Technology, Gordon College."
          </p>
        </div>

      </div>
    </footer>
  );
}