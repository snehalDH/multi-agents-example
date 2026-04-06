require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const { executeTool } = require(path.join(__dirname, "../tools"));
const { buildWorkerSystemPrompt } = require("./prompt");

// Workers only get fetch_url — least privilege principle
const FETCH_TOOL = {
    functionDeclarations: [
        {
            name: "fetch_url",
            description: "Fetch the text content of a URL. Large responses are truncated at 8000 chars.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The full HTTPS URL to fetch" },
                },
                required: ["url"],
            },
        },
    ],
};

class WorkerAgent {
    constructor(name, sections) {
        // sections: [{ name, url }, ...]
        this.name = name;
        this.sections = sections;
    }

    async run() {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: buildWorkerSystemPrompt(this.name),
            tools: [FETCH_TOOL],
        });

        const sectionList = this.sections.map((s) => `- ${s.name}: ${s.url}`).join("\n");
        const goal = `Fetch these course sections and generate 2 interval review questions per section:\n${sectionList}\n\nStart by fetching the first URL.`;

        const chat = model.startChat();
        let currentMessage = goal;

        for (let i = 0; i < 20; i++) {
            const response = await chat.sendMessage(currentMessage);
            const calls = response.response.functionCalls();

            let text = "";
            try {
                text = response.response.text();
            } catch (_) {}

            if (!calls || calls.length === 0) {
                return text || `Worker '${this.name}' produced no output`;
            }

            const functionResponses = [];
            for (const call of calls) {
                const result = await executeTool(call.name, call.args);
                functionResponses.push({
                    functionResponse: { name: call.name, response: { result: String(result) } },
                });
            }
            currentMessage = functionResponses;
        }

        return `Worker '${this.name}' hit max steps`;
    }
}

module.exports = WorkerAgent;
