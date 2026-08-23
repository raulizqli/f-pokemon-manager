import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function LandingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-poke-sage">Full-Stack Exam Project</p>
          <h1 className="font-serif text-5xl font-bold leading-tight text-poke-dark">
            Manage your personal Pokémon collection
          </h1>
          <p className="text-lg text-poke-dark/70">
            Explore the PokéAPI, save your favorites, track caught Pokémon, and get AI-powered insights
            about your collection — all in one responsive web app.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button className="px-6 py-3 text-base">Start collecting</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="px-6 py-3 text-base">
                Log in
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="rounded-3xl border border-poke-dark/10 bg-white p-8 shadow-lg">
            <div className="grid grid-cols-3 gap-4">
              {['#FFD166', '#E63946', '#457B9D', '#4A5D4E', '#F4F1EA', '#2A342D'].map((color) => (
                <div key={color} className="h-16 w-16 rounded-2xl" style={{ backgroundColor: color }} />
              ))}
            </div>
            <p className="mt-6 text-center font-serif text-lg text-poke-dark/70">
              Built with React, Express, PostgreSQL & PokéAPI
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
