"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const generative_ai_1 = require("@google/generative-ai");
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const zod_1 = require("zod");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
const apiKey = (_a = process.env.GEMINI_API_KEY) !== null && _a !== void 0 ? _a : "";
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
const model = new google_genai_1.ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey,
    temperature: 0.7,
});
const promptTemplate = `.

Here are my preferences:

* **Interests:** {interests}
* **Budget (per person):** {budget}
* **Accommodation:** {accommodation}

Please recommend different trips based on the preferences provided above.

For each recommended place, provide the following:
* Name: [Name of the place]
* Description: [Description of the place]
* Price: [Price range or cost information]
* Image: 
* External Link: [Optional: URL for more information]
`;
const placeSchema = zod_1.z.object({
    name: zod_1.z.string().optional().describe("Name of the place"),
    description: zod_1.z.string().optional().describe("Description of the place"),
    price: zod_1.z.string().optional().describe("Price range or cost information"),
    image: zod_1.z
        .string()
        .refine((url) => {
        const supportedFormats = [".jpg", ".jpeg", ".webp", ".png"];
        return supportedFormats.some((format) => url.endsWith(format));
    }, {
        message: "Image URL must end with .jpg, .jpeg, .webp, or .png",
    })
        .optional()
        .describe("Image URL (if provided)"),
    externalLink: zod_1.z
        .string()
        .optional()
        .describe("External link for more information"),
});
app.post("/api/v1/get-places", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requiredFields = [
            "number",
            "destination",
            "monthYear",
            "duration",
            "interests",
            "budget",
            "accommodation",
        ];
        for (const field of requiredFields) {
            if (!(field in req.body)) {
                return res
                    .status(400)
                    .json({ error: `Missing required field: ${field}` });
            }
        }
        const prompt = new prompts_1.PromptTemplate({
            template: promptTemplate,
            inputVariables: requiredFields,
        });
        const promptText = yield prompt.format(req.body);
        const messages = [
            {
                type: "system",
                content: "You are a world-class travel expert specializing in crafting personalized trips and tours.",
            },
            {
                type: "user",
                content: promptText,
            },
        ];
        const response = yield model.call(messages);
        console.log("🚀 ~ app.post ~ response:", response);
        return;
        // res.json(filteredResponse);
    }
    catch (error) {
        console.error("Error generating recommendations:", error);
        if (error.name === "InputError") {
            return res.status(400).json({ error: error.message });
        }
        else if (error.name === "APIError") {
            return res
                .status(503)
                .json({ error: "Failed to communicate with language model" });
        }
        else {
            return res.status(500).json({ error: "An unexpected error occurred" });
        }
    }
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node server is running on http://localhost:${PORT}`);
});
