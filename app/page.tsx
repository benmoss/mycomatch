import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 md:p-12">
      <main className="max-w-3xl text-center">
        <h1 className="text-6xl md:text-7xl font-serif font-bold text-forest mb-6 tracking-tight">🍄 MycoMatch</h1>
        <p className="text-xl md:text-2xl mb-12 text-sage leading-relaxed">
          Practice identifying mushrooms with real observations from iNaturalist
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <Link
            href="/quiz"
            className="bg-terracotta hover:bg-clay text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.05] active:scale-[0.98]"
          >
            Start Practice
          </Link>
          <Link
            href="/test"
            className="border-2 border-sage/30 text-forest px-8 py-4 rounded-xl font-semibold text-lg hover:bg-sage/10 hover:border-sage/50 transition-all hover:scale-[1.05] active:scale-[0.98]"
          >
            API Test
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 border-2 border-sage/20 bg-sand/20 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-4xl mb-3">📸</div>
            <h3 className="font-serif font-bold text-xl text-forest mb-3">Real Photos</h3>
            <p className="text-sm text-forest/70 leading-relaxed">
              Study actual mushroom observations from the field
            </p>
          </div>
          <div className="p-8 border-2 border-sage/20 bg-sand/20 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-serif font-bold text-xl text-forest mb-3">Test Your Skills</h3>
            <p className="text-sm text-forest/70 leading-relaxed">
              Multiple choice quizzes to reinforce learning
            </p>
          </div>
          <div className="p-8 border-2 border-sage/20 bg-sand/20 rounded-2xl hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-serif font-bold text-xl text-forest mb-3">Track Progress</h3>
            <p className="text-sm text-forest/70 leading-relaxed">
              Monitor your improvement over time
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
