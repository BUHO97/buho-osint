import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { GraphData, NodeType, OsintNode, SearchCriteria } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJson = (text: string): string => {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/) || [null, text];
    let jsonString = jsonMatch[1] || text;
    jsonString = jsonString.trim();
    if (jsonString.startsWith('```json')) jsonString = jsonString.replace('```json', '');
    if (jsonString.startsWith('```')) jsonString = jsonString.replace('```', '');
    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
    return jsonString;
};

export const searchSocialNetworksTool: FunctionDeclaration = {
  name: "buscar_redes_sociales",
  description: "Ejecuta una búsqueda externa para encontrar perfiles o menciones en redes sociales.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      plataforma: {
        type: Type.STRING,
        description: "La red social donde buscar.",
        enum: [
          "facebook",
          "instagram",
          "x",
          "todas"
        ]
      },
      termino_busqueda: {
        type: Type.STRING,
        description: "El nombre, nombre de usuario, alias o hashtag a buscar."
      },
      tipo_busqueda: {
        type: Type.STRING,
        description: "Define si se busca un perfil específico o menciones generales.",
        enum: [
          "perfil",
          "menciones"
        ]
      }
    },
    required: [
      "plataforma",
      "termino_busqueda"
    ]
  }
};

export const performOsintSearch = async (criteria: SearchCriteria): Promise<GraphData> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      Eres un analista de inteligencia OSINT (Open Source Intelligence) experto y visualizador de datos.
      Tu objetivo es investigar a la persona u organización indicada y estructurar la información en un formato de grafo JSON estricto.
      
      Reglas:
      1. Utiliza la herramienta de búsqueda de Google para encontrar información real, perfiles sociales, noticias recientes, ubicaciones y conexiones.
      2. Asigna un valor de 'heat' (0-100) a cada nodo basado en su relevancia, controversia o importancia en la red (0 = irrelevante, 100 = crítico/núcleo).
      3. Categoriza los nodos correctamente (person, organization, location, social, event).
      4. Extrae URLs reales si están disponibles en la búsqueda.
      5. EVITA HOMÓNIMOS: Utiliza estrictamente los datos de país, edad y contexto proporcionados para filtrar personas con el mismo nombre.
      6. La respuesta debe contener UNICAMENTE un bloque de código JSON válido.
    `;

    // Construct a specific prompt based on available criteria
    let promptDetails = `Objetivo Principal: "${criteria.query}".`;
    if (criteria.country) promptDetails += `\nPaís/Región obligatoria: ${criteria.country}.`;
    if (criteria.ageOrDob) promptDetails += `\nEdad o Fecha de Nacimiento aproximada: ${criteria.ageOrDob}.`;
    if (criteria.additionalInfo) promptDetails += `\nContexto Adicional (Profesión, palabras clave): ${criteria.additionalInfo}.`;

    const prompt = `
      Realiza una investigación OSINT estricta basada en estos parámetros:
      ${promptDetails}
      
      Genera un JSON con la siguiente estructura:
      {
        "nodes": [
          { "id": "unique_id", "label": "Nombre corto", "type": "person|organization|location|social", "description": "Breve resumen", "heat": 85, "url": "http..." }
        ],
        "links": [
          { "source": "id_nodo_origen", "target": "id_nodo_destino", "relationship": "tipo de relación" }
        ]
      }
      
      Asegúrate de incluir al objetivo principal como el nodo central con heat 100.
      Intenta encontrar al menos 10-15 nodos relacionados para crear un grafo denso.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
        temperature: 0.4, // Lower temperature for more precise/factual results
      },
    });

    const text = response.text || "{}";
    const jsonString = extractJson(text);

    try {
      const data: GraphData = JSON.parse(jsonString);
      return data;
    } catch (parseError) {
      console.error("JSON Parsing Error", parseError, jsonString);
      throw new Error("Error al procesar los datos de inteligencia. El formato recibido no fue válido.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const performDeepDive = async (node: OsintNode): Promise<GraphData> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      Eres un investigador OSINT especializado en trazado de conexiones profundas.
      Tu tarea es expandir el grafo de conocimiento centrado en una entidad específica.
      Busca relaciones ocultas, sub-organizaciones, socios clave o eventos pasados que no sean obvios.
    `;

    const prompt = `
      Investigación Profunda sobre la entidad: "${node.label}" (ID: ${node.id}).
      Contexto: ${node.description}
      
      Objetivo: Encuentra entre 5 y 10 NUEVAS conexiones específicas relacionadas directamente con ${node.label}.
      
      Genera un JSON con la estructura estándar de nodos y enlaces.
      IMPORTANTE:
      1. Usa exactamente "${node.id}" como el ID del nodo origen para las nuevas conexiones.
      2. No inventes información, usa Google Search.
      3. Prioriza nodos con alto "heat" (relevancia).
      
      Estructura JSON esperada:
      {
        "nodes": [ ... nuevos nodos encontrados ... ],
        "links": [ ... enlaces conectando "${node.id}" con los nuevos nodos ... ]
      }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
        temperature: 0.4, 
      },
    });

    const text = response.text || "{}";
    const jsonString = extractJson(text);

    try {
      const data: GraphData = JSON.parse(jsonString);
      return data;
    } catch (parseError) {
      console.error("JSON Parsing Error during deep dive", parseError, jsonString);
      throw new Error("Error al expandir la investigación.");
    }

  } catch (error) {
    console.error("Gemini API Deep Dive Error:", error);
    throw error;
  }
};

export const searchSocialMentions = async (node: OsintNode): Promise<GraphData> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = `
      Eres un investigador digital especializado en SOCMINT (Social Media Intelligence).
      Tu objetivo es localizar y verificar perfiles en redes sociales (Twitter, LinkedIn, Facebook, Instagram, Reddit, Telegram, TikTok, YouTube).
    `;

    const prompt = `
      Realiza una búsqueda SOCMINT enfocada exclusivamente en encontrar PERFILES de redes sociales para: "${node.label}" (Contexto: ${node.description}).
      
      Prioridad: Encontrar enlaces directos a perfiles (no solo menciones).
      
      Reglas para los nodos encontrados:
      1. TYPE: Debe ser siempre "social".
      2. LABEL: El nombre de usuario (ej. @elonmusk) o el nombre completo en la red.
      3. HEAT (Nivel de Certeza/Relevancia):
         - 95-100: Cuentas VERIFICADAS (tick azul) o cuentas oficiales corporativas.
         - 80-94: Cuentas con alta probabilidad de ser la persona correcta (coincidencia de foto/bio/ubicación).
         - 50-79: Posibles perfiles, pero sin verificación clara.
      
      Genera un JSON que conecte al nodo ID "${node.id}" con los perfiles encontrados.
      
      Estructura JSON:
      {
        "nodes": [ 
          { "id": "soc_linkedin_1", "label": "Nombre en LinkedIn", "type": "social", "description": "Perfil profesional (Coincidencia de cargo/ubicación)", "url": "https://linkedin.com/in/...", "heat": 85 },
          { "id": "soc_twitter_1", "label": "@usuario_oficial", "type": "social", "description": "Cuenta verificada de Twitter", "url": "https://twitter.com/...", "heat": 100 }
        ],
        "links": [ 
          { "source": "${node.id}", "target": "soc_linkedin_1", "relationship": "social_profile" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [
            { googleSearch: {} },
            // Adding definition for future agentic use, though Google Search is primarily used here.
            { functionDeclarations: [searchSocialNetworksTool] }
        ],
        systemInstruction: systemInstruction,
        temperature: 0.3, 
      },
    });

    const text = response.text || "{}";
    const jsonString = extractJson(text);

    try {
      const data: GraphData = JSON.parse(jsonString);
      return data;
    } catch (parseError) {
      console.error("JSON Parsing Error during social search", parseError, jsonString);
      throw new Error("Error al buscar perfiles sociales.");
    }

  } catch (error) {
    console.error("Gemini API Social Search Error:", error);
    throw error;
  }
};

export const enrichNodeData = async (node: OsintNode): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Genera un perfil detallado enriquecido para la entidad: "${node.label}" (${node.type}).
      Descripción actual conocida: ${node.description}.
      
      Usa Google Search para encontrar la información más reciente y verídica.
      
      Provee un reporte en formato texto (Markdown simple) que incluya:
      1. BIOGRAFÍA / RESUMEN CORPORATIVO DETALLADO (Dependiendo si es persona u organización).
      2. DATOS CLAVE (Fecha nacimiento/fundación, Ubicación exacta, Roles actuales).
      3. ACTIVIDAD RECIENTE (Noticias o eventos de los últimos 12 meses).
      4. TEMAS ASOCIADOS (Palabras clave, controversias o logros).
      
      Sé conciso pero informativo. No uses JSON, devuelve texto legible formateado con viñetas.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4, 
      },
    });

    return response.text || "No se encontró información adicional.";

  } catch (error) {
    console.error("Gemini API Enrichment Error:", error);
    throw error;
  }
};

// --- Reporting Services ---

export const generateAIReportAnalysis = async (nodes: OsintNode[]): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    // Prepare data summary for the model (limit size to avoid token overflow if huge)
    const summaryData = nodes.map(n => `- [${n.type.toUpperCase()}] ${n.label}: ${n.description} (Relevancia: ${n.heat}%)`).join('\n');

    const prompt = `
        Actúa como un Analista de Inteligencia Senior.
        Analiza los siguientes datos recolectados durante una investigación OSINT:
        
        ${summaryData}
        
        Escribe un reporte ejecutivo de inteligencia en texto plano (sin markdown, solo párrafos y títulos en mayúsculas).
        El reporte debe incluir las siguientes secciones obligatorias:
        
        1. RESUMEN EJECUTIVO: Un párrafo sintetizando los hallazgos principales.
        2. ANÁLISIS DE ENTIDADES: Detalles sobre las personas y organizaciones clave detectadas y sus relaciones.
        3. HUELLA GEOGRÁFICA: Análisis de las ubicaciones encontradas.
        4. CONCLUSIÓN Y RIESGOS: Evaluación final de la red.
        
        Mantén un tono profesional, objetivo y conciso.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            temperature: 0.5
        }
    });

    return response.text || "No se pudo generar el análisis.";
};

export const generateAIImage = async (prompt: string): Promise<string | null> => {
    try {
        const model = 'gemini-2.5-flash-image';
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }]
            }
        });

        // Search for inline data in response parts
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Error generating AI image:", e);
        return null;
    }
};
