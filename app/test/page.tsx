"use client";

import { useEffect, useState } from "react";
import { INaturalistResponse } from "@/types/inaturalist";
import Image from "next/image";

export default function TestPage() {
  const [data, setData] = useState<INaturalistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/observations?perPage=10");
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">iNaturalist API Test</h1>

        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-foreground text-background px-4 py-2 rounded mb-4 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Fetch Mushroom Observations"}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {data && (
          <div>
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <p>Total Results: {data.total_results}</p>
              <p>Page: {data.page}</p>
              <p>Results on this page: {data.results.length}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.results.map((observation) => (
                <div
                  key={observation.id}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-4"
                >
                  {observation.photos[0] && (
                    <div className="relative w-full h-48 mb-2">
                      <Image
                        src={observation.photos[0].url.replace("square", "medium")}
                        alt={observation.taxon.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <h3 className="font-bold">{observation.taxon.name}</h3>
                  {observation.taxon.preferred_common_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {observation.taxon.preferred_common_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    ID: {observation.id} | Quality: {observation.quality_grade}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
