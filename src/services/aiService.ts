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
export const generateDevelopmentPlan = async (
  employeeName: string,
  role: string,
  performanceSummary: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.0-flash-exp" }, 
      { apiVersion: "v1beta" } 
    ); 

    const prompt = `
      You are a Senior HR Talent Developer.
      Employee: ${employeeName}
      Role: ${role}
      Performance Summary for current period: ${performanceSummary}

      Based on this data, generate a professional 3-month Development Plan.
      Include the following sections in Markdown format:
      ### 1. Key Strengths
      (Highlight what the employee did well based on the scores)
      
      ### 2. Growth Opportunities
      (Identify specific areas for improvement)
      
      ### 3. 3-Month Action Roadmap
      - **Month 1**: Focus and specific tasks
      - **Month 2**: Focus and specific tasks
      - **Month 3**: Focus and specific tasks
      
      ### 4. Recommended Training/Certifications
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("AI Service Error (Development Plan):", error);
    throw new Error("Failed to generate development plan via AI.");
  }
};