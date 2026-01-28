import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey.trim() === '') {
    console.error('❌ GEMINI_API_KEY is not set in environment variables!');
    console.error('Please add GEMINI_API_KEY=your_key_here to server/.env file');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

interface ProductSearchResult {
    name: string;
    brand: string;
    description: string;
    images: string[];
    colors: string[];
    sizes: string[];
    category: string;
    subcategory?: string;
    suggestedPrice?: number;
}

export async function searchProductWithAI(productName: string): Promise<ProductSearchResult> {
    try {
        // Using Gemini 2.0 Flash - fast and versatile multimodal model
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
        });

        const prompt = `You are a beauty and cosmetics product expert. Search for information about "${productName}" and provide detailed product information.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just pure JSON):
{
    "name": "Full product name",
    "brand": "Brand name",
    "description": "Detailed product description (2-3 sentences)",
    "images": ["image_url_1", "image_url_2", "image_url_3"],
    "colors": ["Color 1", "Color 2"],
    "sizes": ["Size 1", "Size 2"],
    "category": "One of: Makeup, Skin Care, Hair Care, Fragrance, Bath & Body, Tools, Men, Gifts",
    "subcategory": "Appropriate subcategory based on category",
    "suggestedPrice": 25.99
}

Important:
- For images, use placeholder URLs like "https://via.placeholder.com/400x400?text=Product+Image+1"
- If colors/sizes don't apply, use empty arrays []
- Price should be a reasonable estimate in USD
- Description should be professional and detailed
- Category must match one of the listed options exactly`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean the response - remove markdown code blocks if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const productData = JSON.parse(cleanedText);

        return {
            name: productData.name || productName,
            brand: productData.brand || 'Unknown',
            description: productData.description || 'No description available',
            images: Array.isArray(productData.images) ? productData.images : [],
            colors: Array.isArray(productData.colors) ? productData.colors : [],
            sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
            category: productData.category || 'Makeup',
            subcategory: productData.subcategory || '',
            suggestedPrice: productData.suggestedPrice || 0,
        };
    } catch (error) {
        console.error('AI product search error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw new Error(`Failed to search for product with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function searchProductImages(productName: string): Promise<string[]> {
    // Placeholder function for image search
    // In production, you could use Google Custom Search API
    return [
        `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}+1`,
        `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}+2`,
        `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}+3`,
    ];
}
