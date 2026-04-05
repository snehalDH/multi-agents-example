// tools.js — fetch GitHub content + write output
// fetch_url: GETs a URL and returns text (truncated at 8000 chars)
// write_output: writes final content to the outputs/ folder

const https = require("https");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "outputs");

const TOOL_DEFINITIONS = {
    functionDeclarations: [
        {
            name: "fetch_url",
            description:
                "Fetch the text content of a URL (e.g. a GitHub raw README). Large responses are truncated at 8000 chars.",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "The full HTTPS URL to fetch",
                    },
                },
                required: ["url"],
            },
        },
        {
            name: "write_output",
            description: "Write the final markdown content to the outputs folder.",
            parameters: {
                type: "object",
                properties: {
                    filename: { type: "string", description: "Output filename (e.g. single_agent_output.md)" },
                    content: { type: "string", description: "Markdown content to write" },
                },
                required: ["filename", "content"],
            },
        },
    ],
};

function fetchUrl(url) {
    return new Promise((resolve) => {
        https
            .get(url, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (data.length > 8000) {
                        data = data.slice(0, 8000) + "\n\n[...truncated at 8000 chars...]";
                    }
                    resolve(data);
                });
            })
            .on("error", (err) => resolve(`Error fetching ${url}: ${err.message}`));
    });
}

async function executeTool(name, args) {
    if (name === "fetch_url") {
        return await fetchUrl(args.url);
    }

    if (name === "write_output") {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        const outPath = path.join(OUTPUT_DIR, args.filename);
        fs.writeFileSync(outPath, args.content, "utf-8");
        return `Written to ${outPath}`;
    }

    return `Unknown tool: ${name}`;
}

module.exports = { TOOL_DEFINITIONS, executeTool };
