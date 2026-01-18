require('dotenv').config();

async function testAPI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  console.log('🔑 API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NÃO ENCONTRADA');
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
    console.log('\n🔍 Consultando modelos disponíveis na API...\n');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Erro da API:', data.error.message);
      if (data.error.status === 'PERMISSION_DENIED') {
        console.log('\n⚠️  A chave de API pode estar inválida ou sem permissões.');
        console.log('Verifique em: https://makersuite.google.com/app/apikey');
      }
      return;
    }
    
    if (data.models) {
      console.log('✅ Modelos disponíveis:');
      data.models
        .filter(m => m.name.includes('gemini'))
        .forEach(model => {
          console.log(`   - ${model.name.replace('models/', '')}`);
        });
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAPI();
