
export const formatSafetyRatings = (ratings: any[]): string => {
  if (!ratings || !Array.isArray(ratings)) return '';
  return ratings
    .filter((r: any) => r.probability && r.probability !== 'NEGLIGIBLE')
    .map((r: any) => `${r.category?.replace('HARM_CATEGORY_', '') || 'Category'}: ${r.probability}`)
    .join(' | ');
};

export const formatPart = (part: any): string => {
  if (part.text) return `Text: "${part.text.substring(0, 300)}${part.text.length > 300 ? '...' : ''}"`;
  if (part.functionCall) return `FunctionCall: ${part.functionCall.name}(${JSON.stringify(part.functionCall.args)})`;
  if (part.inlineData) return `[Image Data]`;
  return JSON.stringify(part);
};

export const extractErrorMessage = (error: any): string => {
  if (!error) return "Unknown Error";

  // 1. If it's already a clean string, try to see if it hides a JSON
  let message = typeof error === 'string' ? error : (error.message || JSON.stringify(error));

  // 2. Try to parse JSON inside the message string (Common in Google SDK errors)
  try {
      const jsonStart = message.indexOf('{');
      const jsonEnd = message.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonStr = message.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.error) {
              // Simply return the error message. 
              return parsed.error.message || JSON.stringify(parsed.error);
          }
          if (parsed.message) return parsed.message;
          return JSON.stringify(parsed, null, 2);
      }
  } catch (e) {
      // Not JSON, continue
  }

  // 3. Check for structured response property (Axios/Fetch style)
  if (error.response && typeof error.response === 'object') {
      const resp = error.response;
      if (resp.data && resp.data.error) {
          return resp.data.error.message || JSON.stringify(resp.data.error);
      }
  }

  // 4. Clean up generic prefixes
  if (message.startsWith("Error:")) {
      message = message.substring(6).trim();
  }
  if (message.startsWith("[GoogleGenAI Error]:")) {
      message = message.substring(20).trim();
  }

  // Removed truncation logic to ensure full message visibility as requested.
  return message;
};
