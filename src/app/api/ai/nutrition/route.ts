import { NextRequest, NextResponse } from "next/server";

interface NutritionResponse {
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  source?: string;
}

const FALLBACK_NUTRITION: Record<string, NutritionResponse> = {
  burger: {
    servingSize: "1 burger",
    calories: 520,
    protein: 25,
    carbs: 40,
    fat: 30,
    fiber: 3,
    sugar: 5,
    sodium: 820,
  },
  fries: {
    servingSize: "1 serving",
    calories: 365,
    protein: 4,
    carbs: 48,
    fat: 17,
    fiber: 4,
    sugar: 0,
    sodium: 260,
  },
  pizza: {
    servingSize: "1 slice",
    calories: 285,
    protein: 12,
    carbs: 36,
    fat: 10,
    fiber: 2,
    sugar: 3,
    sodium: 640,
  },
  coffee: {
    servingSize: "1 cup",
    calories: 5,
    protein: 0,
    carbs: 1,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 5,
  },
  salad: {
    servingSize: "1 bowl",
    calories: 180,
    protein: 4,
    carbs: 15,
    fat: 12,
    fiber: 4,
    sugar: 4,
    sodium: 210,
  },
};

function buildFallbackNutrition(name: string): NutritionResponse {
  const normalizedName = name.toLowerCase();

  for (const key of Object.keys(FALLBACK_NUTRITION)) {
    if (normalizedName.includes(key)) {
      return {
        ...FALLBACK_NUTRITION[key],
        source: "estimate based on common item",
      };
    }
  }

  return {
    servingSize: "1 serving",
    calories: 250,
    protein: 8,
    carbs: 30,
    fat: 12,
    fiber: 3,
    sugar: 5,
    sodium: 350,
    source: "basic estimate",
  };
}

async function fetchFromNutritionApiNinjas(name: string): Promise<NutritionResponse | null> {
  const apiKey = process.env.NUTRITION_API_NINJAS_KEY;
  if (!apiKey) return null;

  const endpoint = `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(name)}`;
  const response = await fetch(endpoint, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as Array<{
    calories?: number;
    serving_size_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
    fat_total_g?: number;
    protein_g?: number;
    carbohydrates_total_g?: number;
  }>;

  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }

  const item = result[0];
  return {
    servingSize: item.serving_size_g ? `${item.serving_size_g} g` : "1 serving",
    calories: item.calories ?? undefined,
    protein: item.protein_g ?? undefined,
    carbs: item.carbohydrates_total_g ?? undefined,
    fat: item.fat_total_g ?? undefined,
    fiber: item.fiber_g ?? undefined,
    sugar: item.sugar_g ?? undefined,
    sodium: item.sodium_mg ?? undefined,
    source: "Nutrition API Ninjas",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return new NextResponse("Menu name is required", { status: 400 });
    }

    const nutrition = await fetchFromNutritionApiNinjas(name);
    if (nutrition) {
      return NextResponse.json(nutrition);
    }

    const fallbackNutrition = buildFallbackNutrition(name);
    return NextResponse.json(fallbackNutrition);
  } catch (error: any) {
    console.error("AI nutrition generation failed:", error);
    return new NextResponse(error?.message || "Failed to generate nutrition facts", {
      status: 500,
    });
  }
}
