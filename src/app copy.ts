import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import env from "dotenv";
import helmet from "helmet";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { AIMessage, BaseMessageLike } from "@langchain/core/messages";
import { z } from "zod";

env.config();

const app: Application = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

const apiKey: string = process.env.GEMINI_API_KEY ?? "";
const genAI = new GoogleGenerativeAI(apiKey);

const model = new ChatGoogleGenerativeAI({
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

const placeSchema = z.object({
	name: z.string().optional().describe("Name of the place"),
	description: z.string().optional().describe("Description of the place"),
	price: z.string().optional().describe("Price range or cost information"),
	image: z
		.string()
		.refine(
			(url) => {
				const supportedFormats = [".jpg", ".jpeg", ".webp", ".png"];
				return supportedFormats.some((format) => url.endsWith(format));
			},
			{
				message: "Image URL must end with .jpg, .jpeg, .webp, or .png",
			}
		)
		.optional()
		.describe("Image URL (if provided)"),
	externalLink: z
		.string()
		.optional()
		.describe("External link for more information"),
});

app.post("/api/v1/get-places", async (req: Request, res: Response) => {
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

		const prompt = new PromptTemplate({
			template: promptTemplate,
			inputVariables: requiredFields,
		});

		const promptText = await prompt.format(req.body);

		const messages: BaseMessageLike[] = [
			{
				type: "system",
				content:
					"You are a world-class travel expert specializing in crafting personalized trips and tours.",
			},
			{
				type: "user",
				content: promptText,
			},
		];

		const response = await model.call(messages);
		console.log("🚀 ~ app.post ~ response:", response);
		return;
		// res.json(filteredResponse);
	} catch (error: any) {
		console.error("Error generating recommendations:", error);
		if (error.name === "InputError") {
			return res.status(400).json({ error: error.message });
		} else if (error.name === "APIError") {
			return res
				.status(503)
				.json({ error: "Failed to communicate with language model" });
		} else {
			return res.status(500).json({ error: "An unexpected error occurred" });
		}
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Node server is running on http://localhost:${PORT}`);
});
