// Bundled demo corpus for the Health Data RAG demo. Kept in code (not read from
// disk) so it is always available in the serverless bundle on Vercel.
//
// Two documents power the demo:
//   1. A synthetic patient health summary  → the health-RAG knowledge base
//   2. The developer's profile             → "who built this / what can they do"
//
// The example questions each ship with a pre-written ("canned") answer so the
// demo responds instantly with NO API key. When the visitor adds their own
// OpenAI or Anthropic key, questions are answered live over this same corpus.

export interface SampleDoc {
  filename: string;
  text: string;
}

export const PATIENT_DOC: SampleDoc = {
  filename: "patient-health-summary.md",
  text: `# Patient Health Summary — (Synthetic Demo Record)

> Fictional data for demonstration only. Not a real patient.

**Patient:** Jordan A. Rivera
**MRN:** DEMO-004821
**DOB:** 1979-06-14 (Age 46)
**Sex:** Male
**Summary date:** 2026-06-30
**Primary care physician:** Dr. Elena Park, MD

## Active problems
- Type 2 diabetes mellitus (diagnosed 2018)
- Essential hypertension (diagnosed 2016)
- Hyperlipidemia (diagnosed 2019)

## Medications
- Metformin 1000 mg — twice daily (type 2 diabetes)
- Lisinopril 20 mg — once daily (hypertension)
- Atorvastatin 40 mg — once daily at night (hyperlipidemia)
- Aspirin 81 mg — once daily (cardioprotection)

## Allergies
- Penicillin — causes rash (documented 2005)

## Latest lab results (2026-06-18)
- HbA1c: 7.1% (target < 7.0%)
- Fasting glucose: 138 mg/dL
- Total cholesterol: 182 mg/dL
- LDL cholesterol: 96 mg/dL
- HDL cholesterol: 48 mg/dL
- Triglycerides: 160 mg/dL
- Blood pressure (clinic): 132/84 mmHg
- eGFR: 78 mL/min/1.73m2

## Cardiac history
No prior myocardial infarction. Cardiac stress test in 2024 was normal. Family
history of coronary artery disease (father, heart attack at age 61).

## Immunizations
- Influenza: 2025-10 (current season)
- COVID-19: up to date
- Tetanus (Tdap): 2021

## Care plan
- Continue current medications.
- Reinforce diet and exercise for glucose and lipid control.
- Recheck HbA1c and lipid panel in 3 months.
- Annual diabetic eye and foot exam due.
`,
};

export const PROFILE_DOC: SampleDoc = {
  filename: "luis-cruz-profile.md",
  text: `# Luis Cruz — AI Automation & Full-Stack Engineer

**Role:** AI Automation & Full-Stack Engineer (GoHighLevel, RAG, LLM APIs)
**Rate:** $35.00 / hour
**GitHub:** https://github.com/jeanlimaav-cmd

## Summary
I build modern web applications with AI intelligence — chatbots, workflow
automation, and CRM systems that run without manual work. With 7+ years of
experience in full-stack development and AI integration, I connect LLM APIs,
vector databases, and no-code tools into end-to-end systems that capture leads,
process data, and handle customer conversations automatically. I specialize in
GoHighLevel (GHL) automation — wiring CRM, funnels, and AI agents together with
webhooks and external APIs.

## Tech stack
- AI Integration: LangChain, OpenAI API, Anthropic Claude, vector databases (Pinecone, Qdrant, pgvector)
- Automation: n8n, Make, Zapier, custom Python pipelines
- Frontend: React, TypeScript, Next.js, responsive design
- Backend: Node.js, Python, FastAPI, Express, PostgreSQL, MongoDB
- Deployment: AWS, Docker, Git, CI/CD

## Recent projects
- Built a lead qualification pipeline (n8n + OpenAI) that scores and routes 5,000+ inbound leads monthly.
- Deployed a RAG chatbot answering customer FAQ from a vector-indexed knowledge base.
- Developed a SaaS dashboard with real-time analytics and an intelligent chatbot.
- Wired GoHighLevel CRM to custom forms and webhooks for automated lead capture.
- Launched a multi-language support platform handling 10,000+ conversations monthly.

## Portfolio
- https://automator.ai
- https://spaboostai.com
- https://jetscreative.com
- https://cadernoseplannerdigitalbrasil.com
- https://whatisgc.com

## Contact
Reach out on Upwork or GitHub (https://github.com/jeanlimaav-cmd) to discuss a
GHL automation build, a RAG chatbot, or a custom n8n workflow.
`,
};

// The full corpus handed to the live LLM (both documents).
export const SAMPLE_DOCS: SampleDoc[] = [PATIENT_DOC, PROFILE_DOC];

export interface SampleSource {
  filename: string;
  chunk_index?: number;
  similarity?: number;
}

export interface SampleQA {
  question: string;
  answer: string;
  grounded: boolean;
  sources: SampleSource[];
  latency_ms: number;
}

// Pre-written answers so the demo works with zero API key. Eight are answerable
// from the corpus; the last is deliberately not — showing the honest refusal.
export const SAMPLE_QA: SampleQA[] = [
  {
    question: "What were the patient's latest cholesterol results?",
    answer:
      "As of the 2026-06-18 lab panel, the patient's cholesterol values were: total cholesterol 182 mg/dL, LDL 96 mg/dL, HDL 48 mg/dL, and triglycerides 160 mg/dL. (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 3, similarity: 0.892 }],
    latency_ms: 41,
  },
  {
    question: "Which medications is the patient taking?",
    answer:
      "The patient is currently taking four medications: Metformin 1000 mg twice daily (type 2 diabetes), Lisinopril 20 mg once daily (hypertension), Atorvastatin 40 mg at night (hyperlipidemia), and Aspirin 81 mg once daily (cardioprotection). (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 1, similarity: 0.907 }],
    latency_ms: 38,
  },
  {
    question: "What is the patient's HbA1c, and is it at target?",
    answer:
      "The patient's most recent HbA1c (2026-06-18) was 7.1%, which is slightly above the target of < 7.0%. (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 3, similarity: 0.884 }],
    latency_ms: 40,
  },
  {
    question: "What are the patient's active medical problems?",
    answer:
      "The patient has three active problems: type 2 diabetes mellitus (diagnosed 2018), essential hypertension (diagnosed 2016), and hyperlipidemia (diagnosed 2019). (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 0, similarity: 0.9 }],
    latency_ms: 37,
  },
  {
    question: "Does the patient have any allergies?",
    answer:
      "Yes — the patient is allergic to penicillin, which causes a rash (documented 2005). (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 2, similarity: 0.913 }],
    latency_ms: 35,
  },
  {
    question: "What does the care plan recommend next?",
    answer:
      "The care plan is to continue current medications, reinforce diet and exercise for glucose and lipid control, recheck HbA1c and the lipid panel in 3 months, and complete the due annual diabetic eye and foot exam. (Source: patient-health-summary.md)",
    grounded: true,
    sources: [{ filename: "patient-health-summary.md", chunk_index: 5, similarity: 0.879 }],
    latency_ms: 43,
  },
  {
    question: "Who built this app and what can they do?",
    answer:
      "This demo was built by Luis Cruz, an AI Automation & Full-Stack Engineer specializing in GoHighLevel, RAG, and LLM APIs, with 7+ years of experience. He builds RAG systems, AI chatbots, and workflow automation using React, TypeScript, Next.js, Node.js, Python, and vector databases such as pgvector, Pinecone, and Qdrant. GitHub: github.com/jeanlimaav-cmd. (Source: luis-cruz-profile.md)",
    grounded: true,
    sources: [{ filename: "luis-cruz-profile.md", chunk_index: 0, similarity: 0.861 }],
    latency_ms: 44,
  },
  {
    question: "What's the developer's hourly rate and tech stack?",
    answer:
      "Luis Cruz's rate is $35/hour. His stack spans React, TypeScript, Next.js, Node.js, Python, and FastAPI, with AI tooling including LangChain and the OpenAI and Anthropic APIs, vector databases such as pgvector, Pinecone, and Qdrant, and automation via n8n, Make, and Zapier. (Source: luis-cruz-profile.md)",
    grounded: true,
    sources: [{ filename: "luis-cruz-profile.md", chunk_index: 1, similarity: 0.85 }],
    latency_ms: 42,
  },
  {
    question: "What is the patient's home address?",
    answer: "The documents don't contain this.",
    grounded: false,
    sources: [],
    latency_ms: 33,
  },
];

export const EXAMPLE_QUESTIONS = SAMPLE_QA.map((qa) => qa.question);
