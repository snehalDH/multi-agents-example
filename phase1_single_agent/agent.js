require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { TOOL_DEFINITIONS, executeTool } = require(path.join(__dirname, "../tools"));

const OUTPUT_FILE = "single_agent_output.md";

// First 5 sections of microsoft/generative-ai-for-beginners
const SECTIONS = [
    {
        name: "00 - Course Setup",
        url: "https://raw.githubusercontent.com/microsoft/generative-ai-for-beginners/main/00-course-setup/README.md",
    },
    {
        name: "01 - Introduction to Generative AI and LLMs",
        url: "https://raw.githubusercontent.com/microsoft/generative-ai-for-beginners/main/01-introduction-to-genai/README.md",
    },
    {
        name: "02 - Exploring and Comparing Different LLMs",
        url: "https://raw.githubusercontent.com/microsoft/generative-ai-for-beginners/main/02-exploring-and-comparing-different-llms/README.md",
    },
    {
        name: "03 - Using Generative AI Responsibly",
        url: "https://raw.githubusercontent.com/microsoft/generative-ai-for-beginners/main/03-using-generative-ai-responsibly/README.md",
    },
    {
        name: "04 - Prompt Engineering Fundamentals",
        url: "https://raw.githubusercontent.com/microsoft/generative-ai-for-beginners/main/04-prompt-engineering-fundamentals/README.md",
    },
];

const SECTION_LIST = SECTIONS.map((s) => `- ${s.name}: ${s.url}`).join("\n");

const SYSTEM_PROMPT = `You are a learning materials analyst for the Microsoft "Generative AI for Beginners" course.

Your job is to read the first 5 course sections and produce a structured Knowledge Map.

Follow these steps exactly:
1. Call fetch_url for each of the 5 section URLs listed in your goal message (one at a time)
2. After reading all 5 sections, call write_output with filename "single_agent_output.md" containing the full Knowledge Map

The Knowledge Map must include:
## Overview
A brief description of the course and these 5 sections.

## Section Summaries
For each of the 5 sections:
- Key concepts covered
- Learning objectives
- Prerequisites

## Concept Connections
How the 5 sections build on each other (dependency chain).

## Review Questions
Exactly 2 interval review questions per section (10 questions total).
Each question must have:
- The question text
- 3 bullet points a good answer should cover`;

const GOAL_PROMPT = `Fetch and analyze these 5 course sections in order:\n${SECTION_LIST}\n\nStart by fetching the first URL now.`;

async function runAgent() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        tools: [TOOL_DEFINITIONS],
    });

    const chat = model.startChat();
    const MAX_STEPS = 25;
    let currentMessage = GOAL_PROMPT;
    let finalText = "";

    console.log("=".repeat(50));
    console.log("PHASE 1: SINGLE AGENT — GenAI Beginners Reader");
    console.log("=".repeat(50));
    console.log(`\nReading ${SECTIONS.length} sections...\n`);

    for (let step = 1; step <= MAX_STEPS; step++) {
        console.log(`\nStep ${step}`);

        const response = await chat.sendMessage(currentMessage);
        const calls = response.response.functionCalls();

        let text = "";
        try { text = response.response.text(); } catch (_) {}
        if (text) finalText = text;

        if (!calls || calls.length === 0) {
            console.log("\nAgent done — no more tool calls.");
            if (finalText) {
                console.log("Saving last text response to file.");
                const outputDir = path.join(__dirname, "../outputs");
                fs.mkdirSync(outputDir, { recursive: true });
                fs.writeFileSync(path.join(outputDir, OUTPUT_FILE), finalText, "utf-8");
                console.log(`✓ Written to outputs/${OUTPUT_FILE}`);
            }
            break;
        }

        const functionResponses = [];
        for (const call of calls) {
            console.log(`  Tool: ${call.name}(${JSON.stringify(call.args).slice(0, 80)}...)`);

            if (call.name === "write_output") {
                await executeTool(call.name, call.args);
                console.log(`\n✓ Agent called write_output — done!`);
                console.log(`✓ Output saved to outputs/${OUTPUT_FILE}`);
                return;
            }

            const result = await executeTool(call.name, call.args);
            console.log(`  Result: ${String(result).slice(0, 100)}...`);
            functionResponses.push({
                functionResponse: { name: call.name, response: { result: String(result) } },
            });
        }

        currentMessage = functionResponses;

        if (step === MAX_STEPS) {
            console.log(`\nMax steps reached.`);
            if (finalText) {
                const outputDir = path.join(__dirname, "../outputs");
                fs.mkdirSync(outputDir, { recursive: true });
                fs.writeFileSync(path.join(outputDir, OUTPUT_FILE), finalText, "utf-8");
                console.log(`✓ Written to outputs/${OUTPUT_FILE}`);
            }
        }
    }
}

runAgent().catch(console.error);
