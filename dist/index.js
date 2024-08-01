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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
const apiKey = (_a = process.env.GEMINI_API_KEY) !== null && _a !== void 0 ? _a : "";
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
let model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
            type: generative_ai_1.FunctionDeclarationSchemaType.ARRAY,
            items: {
                type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                properties: {
                    tripName: {
                        type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                    },
                    description: {
                        type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                    },
                    price: {
                        type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                    },
                    image: {
                        type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                    },
                    reference: {
                        type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                    },
                },
            },
        },
    },
});
app.get("/", (req, res) => {
    res.status(200).send("Welcome to gemini tours!!");
});
app.post("/api/v1/get-places", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { number, monthYear, duration, destination } = req.body;
    try {
        let prompt = `
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
        let result = yield model.generateContent(prompt);
        const responseText = result.response.text();
        console.log("Received response from Gemini API:", responseText);
        const responseData = JSON.parse(responseText);
        return res.status(200).send({
            message: "success",
            data: responseData,
        });
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
