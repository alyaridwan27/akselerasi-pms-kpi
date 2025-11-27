// src/utils/devSeedKPIs.ts
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export async function seedKPIsForUser(userId: string) {
  try {
    const kpiRef = collection(db, "kpis");

    // Check if the user already has KPIs
    const q = query(kpiRef, where("ownerId", "==", userId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      console.log("🟢 User already has KPIs. Skipping seed.");
      return;
    }

    console.log("🌱 Seeding sample KPIs for:", userId);

    await addDoc(kpiRef, {
      ownerId: userId,
      title: "Complete Customer Onboarding",
      description: "Ensure all assigned customers complete onboarding.",
      targetValue: 100,
      currentValue: 20,
      unit: "%",
      weight: 0.3,
      status: "Active",
      createdAt: new Date(),
    });

    await addDoc(kpiRef, {
      ownerId: userId,
      title: "Close Sales Deals",
      description: "Achieve monthly deal closure targets.",
      targetValue: 10,
      currentValue: 2,
      unit: "Deals",
      weight: 0.7,
      status: "Active",
      createdAt: new Date(),
    });

    console.log("🌱 KPI seeding completed.");
  } catch (error) {
    console.error("❌ Error seeding KPIs:", error);
  }
}