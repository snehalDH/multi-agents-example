require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { TOOL_DEFINITIONS, executeTool } = require(path.join(__dirname, "../tools"));
const { SYSTEM_PROMPT } = require("./prompt");

const OUTPUT_FILE = "single_agent_output.md";
const OUTPUT_DIR = path.join(__dirname, "../outputs");
const MAX_STEPS = 25;

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

const GOAL_PROMPT = `Fetch and analyze these 5 course sections in order:\n${SECTION_LIST}\n\nStart by fetching the first URL now.`;

function saveOutput(text) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, OUTPUT_FILE), text, "utf-8");
    console.log(`✓ Written to outputs/${OUTPUT_FILE}`);
}

async function runAgent() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        tools: [TOOL_DEFINITIONS],
    });

    const chat = model.startChat();
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

        try {
            const text = response.response.text();
            if (text) finalText = text;
        } catch (_) {}

        if (!calls || calls.length === 0) {
            console.log("\nAgent done — no more tool calls.");
            if (finalText) saveOutput(finalText);
            break;
        }

        const functionResponses = [];
        for (const call of calls) {
            console.log(`  Tool: ${call.name}(${JSON.stringify(call.args).slice(0, 80)}...)`);

            if (call.name === "write_output") {
                await executeTool(call.name, call.args);
                console.log(`✓ Agent called write_output — done!`);
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
            if (finalText) saveOutput(finalText);
        }
    }
}

runAgent().catch(console.error);
