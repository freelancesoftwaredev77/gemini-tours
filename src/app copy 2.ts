import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import env from "dotenv";
import helmet from "helmet";
import {
	FunctionDeclarationSchemaType,
	GenerateContentResult,
	GenerativeModel,
	GoogleGenerativeAI,
} from "@google/generative-ai";

env.config();

const app: Application = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

const apiKey: string = process.env.GEMINI_API_KEY ?? "";
const genAI = new GoogleGenerativeAI(apiKey);

let model: GenerativeModel = genAI.getGenerativeModel({
	model: "gemini-1.5-pro",
	generationConfig: {
		responseMimeType: "application/json",
		responseSchema: {
			type: FunctionDeclarationSchemaType.ARRAY,
			items: {
				type: FunctionDeclarationSchemaType.OBJECT,
				properties: {
					tripName: {
						type: FunctionDeclarationSchemaType.STRING,
					},
					description: {
						type: FunctionDeclarationSchemaType.STRING,
					},
					price: {
						type: FunctionDeclarationSchemaType.STRING,
					},
					image: {
						type: FunctionDeclarationSchemaType.STRING,
					},
					reference: {
						type: FunctionDeclarationSchemaType.STRING,
					},
				},
			},
		},
	},
});

app.post("/api/v1/get-places", async (req: Request, res: Response) => {
	const { number, monthYear, duration, destination } = req?.body;
	try {
		let prompt: string = `
      List at least 10 trips You are a world-class travel expert specializing in crafting personalized trips and tours. 
      I'm looking for ${number} trips to ${destination} in ${monthYear} for ${duration}. 
      Extract details from reputable travel websites, including:

      - **Trip Name:** The official name of the trip or tour.
      - **Description:** A detailed description highlighting unique aspects, activities, and accommodations. Minimum 100 characters.
      - **Price:** The price per person (or total if applicable) including currency.
      - **Image:** An object with two properties:
          - **url:** A direct link to a high-resolution image representative of the trip.
      - **Reference:** A link to the official website or booking page.
      
      Ensure all information is accurate and current. Return your results as a JSON array with the following structure:	
	{ "type": "object",
  	"properties": {
    	"tripName": { "type": "string" },
    	"description": { "type": "string" },
    	"price": { "type": "string" },
    	"image": { "type": "string" },
    	"reference": { "type": "string" },
 	 }
	}`;
		let result: GenerateContentResult = await model.generateContent(prompt);

		console.log(result.response.text());
		return res.status(200)?.send({
			message: "success",
			data: JSON.parse(result?.response?.text()),
		});
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
