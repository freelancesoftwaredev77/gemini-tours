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
	model: "gemini-1.5-flash",

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

app.get("/", (req: Request, res: Response) => {
	res.status(200).send("Welcome to gemini tours!!");
});

app.post("/api/v1/get-places", async (req: Request, res: Response) => {
	const { number, monthYear, duration, destination } = req.body;

	try {
		let prompt: string = `
       You are a world-class travel expert specializing in crafting personalized trips and tours.
      I'm looking for ${number} trips to ${destination} in ${monthYear} for ${duration}. 
      Extract details from reputable travel websites, including and i want at least 10 results:

      - Trip Name: The official name of the trip or tour.
      - Description: A detailed description highlighting unique aspects, activities, and accommodations. Minimum 200 characters.
      - Price: The price per person (or total if applicable) including currency.
      - Image: A direct link to a high-resolution image representative of the trip. Ensure the link is valid.
      - Reference: A link to the official website or booking page.
      
      Ensure all information is accurate and current, and that the links are valid and not expired. Return your results as a JSON array with the following structure:	
      
	  [
        {
          "tripName": "string",
          "description": "string",
          "price": "string",
          "image": "string",
          "reference": "string"
        }
      ]`;

		console.log("Sending prompt to Gemini API:", prompt);
		let result: GenerateContentResult = await model.generateContent(prompt);

		const responseText = result.response.text();
		console.log("Received response from Gemini API:", responseText);

		const responseData = JSON.parse(responseText);

		return res.status(200).send({
			message: "success",
			data: responseData,
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
