// src/services/aiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Interface definitions for TypeScript safety
 */
export interface AIAnalysisResult {
  score: number;
  justification: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Function to analyze KPI evidence against a rubric
 * Used by Managers to audit performance
 */
export const analyzeKPIEvidence = async (
  rubric: string, 
  kpiTitle: string, 
  evidenceRawText: string
): Promise<AIAnalysisResult> => {
  try {
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.0-flash-exp" }, 
      { apiVersion: "v1beta" } 
    ); 

    const prompt = `
      You are an expert Performance Auditor. 
      KPI Title: ${kpiTitle}
      Scoring Rubric: ${rubric}
      
      Evidence content:
      ---
      ${evidenceRawText}
      ---

      Analyze the evidence based on the rubric and provide:
      1. A numerical score.
      2. A brief justification.

      Return ONLY a JSON object: {"score": number, "justification": "string"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson) as AIAnalysisResult;

  } catch (error: any) {
    console.error("AI Service Error (KPI Analysis):", error);
    if (error.message?.includes("404")) {
      throw new Error("Gemini 2.0 Flash not found. Ensure 'v1beta' is configured.");
    }
    throw error;
  }
};

/**
 * Function to generate a personalized development plan
 * Used by HR to create growth roadmaps for employees
 */
export const generateDevelopmentPlan = async (name: string, role: string, summary: string) => {
  // Use the state-of-the-art Flash model for speed and reasoning
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a Senior Performance Consultant. Your goal is to help an employee improve.
    
    EMPLOYEE PROFILE:
    - Name: ${name}
    - Role: ${role}
    
    PERFORMANCE DATA & MANAGER COMMENTS:
    ${summary}
    
    INSTRUCTIONS:
    1. Read the "Detailed Findings" provided above. These contain the specific reasons the manager gave a low score.
    2. Identify the root causes (e.g., technical skill vs. time management).
    3. Create a 3-month action plan.
    4. Month 1: Focus on immediate "Quick Wins" based on the manager's harshest comments.
    5. Month 2: Focus on skill building and training.
    6. Month 3: Focus on sustained performance and hitting the original KPI targets.
    
    Output the plan in Markdown. Do not include generic filler text.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
};