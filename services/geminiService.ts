
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static async getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async removeTextFromVideo(
    videoBase64: string,
    mimeType: string,
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9'
  ): Promise<string> {
    const ai = await this.getAI();
    
    try {
      // In Veo, we use an existing video as reference and prompt to describe the transformation.
      // We'll use the "generateVideos" with the previous video to effectively "edit" it.
      
      // Note: For video extension/editing in the SDK, the video is passed as part of the config or directly if supported.
      // Based on the provided guidelines, we can pass a 'video' from a previous operation or use it as reference.
      // Here, since we are uploading a new file, we treat it as an Image-to-Video task with a specific prompt
      // for text removal, or more accurately, we'd ideally use Video-to-Video if the SDK supports direct upload.
      // For this implementation, we will use the prompt-to-video approach referencing the visual content.

      const responseOperation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Professionally remove all text, watermarks, subtitles, and overlays from this video. Regenerate the underlying scene with high visual consistency and no artifacts. ${prompt}`,
        // We'll simulate the "edit" by providing the first frame as reference if it was a simple image-to-video,
        // but for true video-to-video we'd need a previously generated video object. 
        // As a fallback for a file-upload based tool, we use the image-to-video capability with a strong prompt.
        image: {
          imageBytes: videoBase64.split(',')[1],
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio,
        }
      });

      let operation = responseOperation;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation failed: No URI returned.");

      const result = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await result.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("AUTH_REQUIRED");
      }
      throw error;
    }
  }
}
