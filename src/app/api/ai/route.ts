import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAIContext, formatContextForPrompt } from "@/lib/aiContext";

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { answer: "Please provide a valid question." },
        { status: 400 }
      );
    }

    // ── Retrieve session ──
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // ── Build personalized context ──
    let personalContext = "";
    let userName = "Guest";
    let userRole = "GUEST";

    if (user?.id) {
      userName = user.name || "User";
      userRole = user.role || "STUDENT";

      try {
        const ctx = await buildAIContext(user);
        personalContext = formatContextForPrompt(ctx);
      } catch (contextErr) {
        console.error("[AI Context Error]", contextErr);
        personalContext =
          "\n[Note: Could not retrieve student learning data at this time. Answer general questions only.]\n";
      }
    }

    // ── Build conversation history for multi-turn context (trimmed for token efficiency) ──
    let conversationHistory = "";
    if (Array.isArray(history) && history.length > 0) {
      // Keep last 6 exchanges to save tokens on free tier
      const recentHistory = history.slice(-6);
      conversationHistory = "\n=== CONVERSATION HISTORY ===\n";
      for (const msg of recentHistory) {
        if (msg.role === "user") {
          conversationHistory += `Student: ${msg.content}\n`;
        } else {
          conversationHistory += `Assistant: ${msg.content}\n`;
        }
      }
    }

    // ── Build system prompt ──
    const systemPrompt = buildSystemPrompt(
      userName,
      userRole,
      personalContext,
      conversationHistory
    );

    const fullPrompt = `${systemPrompt}\n\nStudent's Question:\n${question}`;

    // Array of models to try in sequence for maximum reliability across environments
    const modelsToTry = [
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
        });
        if (response && response.text) {
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`[AI Model Fallback] ${model} failed:`, e?.message || e);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to respond.");
    }

    return NextResponse.json({
      answer: response.text,
    });
  } catch (err: any) {
    console.error("[AI Route Error]", err);

    const errorMessage = err?.message || err?.toString() || "Unknown error";

    // Detect rate limit errors
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
      return NextResponse.json(
        {
          answer: "I'm a little busy right now! 😅 The AI quota has been temporarily exceeded. Please wait a moment and try again shortly.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        answer: `Sorry, Kaputra AI encountered an error. Please try again later.`,
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  userName: string,
  userRole: string,
  personalContext: string,
  conversationHistory: string
): string {
  const isLoggedIn = userRole !== "GUEST";
  const isParent = userRole === "PARENT";
  const isStudent = userRole === "STUDENT";

  return `You are Kaputra AI, the personal AI Learning Assistant for Kaputra Academy.

=== YOUR IDENTITY ===
- You are a friendly, encouraging, and knowledgeable tutor.
- You help students understand their learning progress, analyze test results, and provide personalized study recommendations.
- You also assist parents by providing insights about their children's academic performance.
- You answer general questions about Kaputra Academy programs, pricing, registration, and policies.

=== ACADEMY INFORMATION ===
- Kaputra Academy follows the Singapore Curriculum.
- We have two main class types: Regular Class and Competition Class.
- Competition Class requires passing a Placement Test (minimum score: 60%).
- Students who do not pass the Placement Test are recommended for Regular Class.
- Learning methods available: Semi-Private (instructor-assigned schedule) and Private (student-chosen schedule).
- Camp Programs are available for seasonal intensive learning experiences.
- Students register through the Student Dashboard or Parent Dashboard.
- Payment is done via Virtual Account (Midtrans) for BCA, BNI, BRI, Permata, and Mandiri banks.
- The Placement Test fee is IDR 300,000.
- Tuition varies by class. Check the enrollment page for current pricing.
- Students can access: class videos, learning materials, quizzes, mock tests, academic reports, and attendance records.

=== CURRENT USER ===
Name: ${userName}
Role: ${userRole}
${isLoggedIn ? "Status: Logged In" : "Status: Guest (not logged in)"}

${personalContext}

${conversationHistory}

=== RESPONSE RULES ===

1. **Personalized Responses**: When the user asks about their learning progress, test scores, quiz results, or academic performance, ALWAYS use the data provided in the STUDENT CONTEXT or PARENT CONTEXT above. NEVER fabricate scores, answers, or academic data.

2. **Test Analysis**: When explaining wrong answers:
   - Show what the student answered and what the correct answer was.
   - Explain WHY the correct answer is right in simple, educational terms.
   - Identify patterns in mistakes to suggest weak areas.
   - Be encouraging: "You got this question wrong, but here's how to understand it better..."

3. **Progress Tracking**: When asked "How am I doing?":
   - Reference actual scores, completion rates, and trends.
   - Compare recent performance to earlier attempts if data is available.
   - Identify weak topics and strong topics from the context data.
   - Give specific, actionable study recommendations.

4. **Parent Mode**: When a parent asks about their child:
   - Reference the specific child's data from the context.
   - Use the child's name in responses.
   - Provide constructive and balanced feedback.
   - Suggest actionable next steps.

5. **Security**: 
   - NEVER reveal data about other students.
   - If the context doesn't contain the requested information, say "I don't have that specific data available right now."
   - NEVER make up or guess student data.

6. **Tone and Style**:
   - Be friendly, warm, and encouraging like a patient tutor.
   - Use age-appropriate language.
   - Never just state the correct answer — guide the student to understand the concept.
   - Celebrate achievements: "Great job on improving your score!"
   - Motivate after setbacks: "Don't worry about that score — here's how we can improve together."
   - Use emojis sparingly for warmth (🎯 📚 ✨ 💪).

7. **Conversation Memory**: Reference previous messages in the conversation history naturally. If the student says "explain it more simply," understand what "it" refers to from context.

8. **General Questions**: For questions about programs, pricing, registration, schedules, etc., use the Academy Information above. Combine it with the student's context when relevant (e.g., "Based on your Placement Test score, I'd recommend...").

9. **Out of Scope**: If someone asks about topics completely unrelated to education or Kaputra Academy, politely redirect: "I'm here to help with your learning at Kaputra Academy! Is there anything about your classes, scores, or study plan I can help with?"

10. **Formatting**: Use clear formatting with line breaks and bullet points for readability. Keep responses concise but thorough.`;
}