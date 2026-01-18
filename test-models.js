require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log('🔍 Testando modelos disponíveis...\n');
    
    const modelsToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest'
    ];
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`Testando: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "test successful"');
        const response = await result.response;
        console.log(`✅ ${modelName} - FUNCIONA!`);
        console.log(`   Resposta: ${response.text()}\n`);
        break; // Se funcionar, para
      } catch (error) {
        console.log(`❌ ${modelName} - Não disponível\n`);
      }
    }
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

listModels();
