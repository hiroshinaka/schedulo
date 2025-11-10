import React from 'react';
import { Link } from 'react-router-dom';
export default function Landing(){
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <section className="bg-gradient-to-r from-sky-50 to-white py-20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Schedulo — simple calendar & scheduler</h1>
            <p className="text-lg text-slate-600 mb-8">Organize your time, book meetings, and keep your life in sync. Fast, private, and delightful.</p>
            <div className="flex justify-center gap-4">
              <Link to="/login" className="px-6 py-3 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-700">Get started</Link>
              <Link to="/app" className="px-6 py-3 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Open calendar</Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">Easy scheduling</h3>
              <p className="text-slate-600">Quickly create events and share availability with others.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Integrations</h3>
              <p className="text-slate-600">Connect your calendar and keep everything in one place.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Privacy-first</h3>
              <p className="text-slate-600">Your schedule stays yours — no unnecessary tracking.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
