import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">🍄 MycoMatch</h1>
        <p className="text-xl mb-8 text-gray-600 dark:text-gray-400">
          Practice identifying mushrooms with real observations from iNaturalist
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/quiz"
            className="bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Start Practice
          </Link>
          <Link
            href="/test"
            className="border border-gray-300 dark:border-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            API Test
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-3xl mb-2">📸</div>
            <h3 className="font-semibold mb-2">Real Photos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Study actual mushroom observations from the field
            </p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold mb-2">Test Your Skills</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Multiple choice quizzes to reinforce learning
            </p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor your improvement over time
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
