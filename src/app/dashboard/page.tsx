"use client";

import Head from "next/head";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Food Lover");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);

  useEffect(() => {
    setUserName("Food Lover");

    setSuggestions([
      { id: 1, name: "Crispy Sisig", source: "Sisig Haus" },
      { id: 2, name: "Karinderya Kare-Kare", source: "Hapunan" },
      { id: 3, name: "Tapsilog", source: "Silog Express" },
    ]);

    setFavorites([
      { id: 1, name: "Adobo Rice Meal", source: "Bahay Kainan" },
      { id: 2, name: "Pancit Canton", source: "Lutong Tita" },
    ]);

    setMenus([
      { id: 1, name: "Hamburger", source: "Burger Stop" },
      { id: 2, name: "Sushi Platter", source: "Sushi Corner" },
      { id: 3, name: "Noodle Soup", source: "Noodle Station" },
      { id: 4, name: "Taco Combo", source: "Latino Bites" },
    ]);
  }, []);

  return (
    <>
      <Head>
        <title>MenuQR Dashboard</title>
      </Head>
      <div className="min-h-screen bg-[#FCFBF4] text-[#333]">
        <main className="max-w-6xl mx-auto p-6">
          <div className="mb-8 rounded-xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold">Welcome, {userName}!</h1>
            <p className="text-gray-600 mt-1">Your dashboard is now static with suggestions, saved menus, and all menus.</p>
          </div>

          <div className="grid gap-6">
            <section className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-2xl font-bold mb-4">Suggestions</h2>
              {suggestions.length ? (
                <ul className="space-y-3">
                  {suggestions.map((item) => (
                    <li key={item.id} className="border p-3 rounded-md">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.source}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No suggestions yet.</p>
              )}
            </section>

            <section className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-2xl font-bold mb-4">Saved Menus</h2>
              {favorites.length ? (
                <ul className="space-y-3">
                  {favorites.map((item) => (
                    <li key={item.id} className="border p-3 rounded-md">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.source}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No saved menus yet.</p>
              )}
            </section>

            <section className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-2xl font-bold mb-4">Menus</h2>
              {menus.length ? (
                <ul className="space-y-3">
                  {menus.map((item) => (
                    <li key={item.id} className="border p-3 rounded-md">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.source}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No menus available yet.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
