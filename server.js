require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'English Practice API está rodando!' });
});

// Rota para analisar pronúncia
app.post('/api/analyze-pronunciation', async (req, res) => {
  try {
    const { originalText, transcribedText } = req.body;

    if (!originalText || !transcribedText) {
      return res.status(400).json({ 
        error: 'originalText e transcribedText são obrigatórios' 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY ausente - usando fallback local para análise de frases');
      return res.json({
        score: 70,
        incorrectWords: [],
        feedback: 'Servidor em modo offline para IA. Continue praticando! 😊',
        suggestions: 'Tente novamente mais tarde ou configure a chave GEMINI_API_KEY.'
      });
    }

    // Configurar o modelo Gemini 2.5 Flash (disponível e gratuito)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    // Prompt para análise de pronúncia
    const prompt = `
Você é um professor de inglês especializado em pronúncia. 

Texto original: "${originalText}"
O que o aluno falou: "${transcribedText}"

Analise a pronúncia do aluno de forma breve e objetiva:
1. Pontuação: 0 a 100
2. Palavras erradas (máximo 3)
3. Dicas MUITO curtas (máximo 1 linha por palavra)
4. Um elogio motivador bem breve

IMPORTANTE: Seja CONCISO. Dicas devem ter no máximo 15 palavras.

Responda em JSON:
{
  "score": número,
  "incorrectWords": [
    {
      "word": "palavra",
      "userPronounced": "como falou",
      "tip": "dica bem curta em 1 linha"
    }
  ],
  "feedback": "elogio breve (máximo 1 frase)",
  "suggestions": "sugestão geral bem breve (máximo 1 frase)"
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Tentar extrair JSON da resposta
      let analysis;
      try {
        // Remover possíveis markdown code blocks
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleanText);
      } catch (parseError) {
        // Se não conseguir parsear, retornar resposta em texto
        analysis = {
          score: 70,
          feedback: text,
          incorrectWords: [],
          suggestions: 'Continue praticando!'
        };
      }

      res.json(analysis);
    } catch (modelError) {
      console.error('Erro no Gemini (frases), usando fallback local:', modelError);
      // Fallback simplificado quando há limite ou erro do modelo
      res.json({
        score: 70,
        incorrectWords: [],
        feedback: 'Servidor atingiu o limite de IA. Sua frase foi recebida. 😊',
        suggestions: 'Tente novamente em alguns segundos ou continue praticando.'
      });
    }

  } catch (error) {
    console.error('Erro ao analisar pronúncia:', error);
    res.status(500).json({ 
      error: 'Erro ao processar análise',
      details: error.message 
    });
  }
});

// Rota para analisar pronúncia de palavra individual
app.post('/api/analyze-word-pronunciation', async (req, res) => {
  try {
    const { expectedWord, spokenWord } = req.body;

    console.log('📝 Analisando pronúncia de palavra:', { expectedWord, spokenWord });

    if (!expectedWord || !spokenWord) {
      return res.status(400).json({ 
        error: 'expectedWord e spokenWord são obrigatórios' 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY ausente - usando fallback local para análise de palavra');
      const isCorrect = spokenWord.toLowerCase().trim() === expectedWord.toLowerCase().trim();
      return res.json({
        isCorrect,
        confidence: isCorrect ? 100 : 60,
        feedback: isCorrect ? 'Soou correto! 🎉' : 'Continue praticando, quase lá!'
      });
    }

    // Configurar o modelo Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    const prompt = `
Você é um professor de inglês especializado em pronúncia.

A palavra esperada era: "${expectedWord}"
O aluno pronunciou: "${spokenWord}"

Analise se a pronúncia está correta ou próxima o suficiente. Seja generoso com pequenas variações devido ao reconhecimento de voz.

Responda APENAS em formato JSON:
{
  "isCorrect": true ou false,
  "confidence": número de 0 a 100,
  "feedback": "mensagem curta e encorajadora"
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 Resposta do Gemini:', text);
      
      let analysis;
      try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleanText);
        console.log('✅ Análise parseada:', analysis);
      } catch (parseError) {
        console.warn('⚠️ Erro ao parsear JSON, usando fallback:', parseError);
        const isCorrect = spokenWord.toLowerCase().trim() === expectedWord.toLowerCase().trim();
        analysis = {
          isCorrect,
          confidence: isCorrect ? 100 : 50,
          feedback: isCorrect ? 'Perfeito!' : 'Tente novamente!'
        };
      }

      res.json(analysis);
    } catch (modelError) {
      console.error('Erro no Gemini, usando fallback:', modelError);
      const isCorrect = spokenWord.toLowerCase().trim() === expectedWord.toLowerCase().trim();
      res.json({
        isCorrect,
        confidence: isCorrect ? 90 : 60,
        feedback: isCorrect ? 'Soou correto! 🎉' : 'Quase lá, tente mais uma vez.'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao analisar pronúncia da palavra:', error);
    res.status(500).json({ 
      error: 'Erro ao processar análise',
      details: error.message 
    });
  }
});

// Rota para obter textos de prática
app.get('/api/practice-texts', (req, res) => {
  const texts = [
    // BEGINNER (40 frases)
    { id: 1, level: 'beginner', text: 'Hello, my name is Sarah.', translation: 'Olá, meu nome é Sarah.' },
    { id: 2, level: 'beginner', text: 'I like to read books.', translation: 'Eu gosto de ler livros.' },
    { id: 3, level: 'beginner', text: 'The weather is beautiful today.', translation: 'O tempo está lindo hoje.' },
    { id: 4, level: 'beginner', text: 'Nice to meet you.', translation: 'Prazer em conhecê-lo.' },
    { id: 5, level: 'beginner', text: 'How are you today?', translation: 'Como você está hoje?' },
    { id: 6, level: 'beginner', text: 'I am from Brazil.', translation: 'Sou do Brasil.' },
    { id: 7, level: 'beginner', text: 'What is your name?', translation: 'Qual é o seu nome?' },
    { id: 8, level: 'beginner', text: 'I speak English and Portuguese.', translation: 'Falo inglês e português.' },
    { id: 9, level: 'beginner', text: 'Do you like pizza?', translation: 'Você gosta de pizza?' },
    { id: 10, level: 'beginner', text: 'I have a cat and a dog.', translation: 'Tenho um gato e um cachorro.' },
    { id: 11, level: 'beginner', text: 'Where do you live?', translation: 'Onde você mora?' },
    { id: 12, level: 'beginner', text: 'The sun is shining today.', translation: 'O sol está brilhando hoje.' },
    { id: 13, level: 'beginner', text: 'I like coffee in the morning.', translation: 'Gosto de café pela manhã.' },
    { id: 14, level: 'beginner', text: 'What time is it?', translation: 'Que horas são?' },
    { id: 15, level: 'beginner', text: 'I study English every day.', translation: 'Estudo inglês todos os dias.' },
    { id: 16, level: 'beginner', text: 'Can you help me please?', translation: 'Você pode me ajudar, por favor?' },
    { id: 17, level: 'beginner', text: 'I am happy today.', translation: 'Estou feliz hoje.' },
    { id: 18, level: 'beginner', text: 'Do you have a sister?', translation: 'Você tem uma irmã?' },
    { id: 19, level: 'beginner', text: 'I like playing soccer.', translation: 'Gosto de jogar futebol.' },
    { id: 20, level: 'beginner', text: 'The book is on the table.', translation: 'O livro está na mesa.' },
    { id: 21, level: 'beginner', text: 'I go to school on Monday.', translation: 'Vou para a escola na segunda-feira.' },
    { id: 22, level: 'beginner', text: 'She has blue eyes.', translation: 'Ela tem olhos azuis.' },
    { id: 23, level: 'beginner', text: 'My favorite color is red.', translation: 'Minha cor favorita é vermelha.' },
    { id: 24, level: 'beginner', text: 'I eat breakfast at seven.', translation: 'Como café da manhã às sete.' },
    { id: 25, level: 'beginner', text: 'Do you like music?', translation: 'Você gosta de música?' },
    { id: 26, level: 'beginner', text: 'I am learning English.', translation: 'Estou aprendendo inglês.' },
    { id: 27, level: 'beginner', text: 'What is your job?', translation: 'Qual é o seu trabalho?' },
    { id: 28, level: 'beginner', text: 'I work in an office.', translation: 'Trabalho em um escritório.' },
    { id: 29, level: 'beginner', text: 'The milk is cold.', translation: 'O leite está frio.' },
    { id: 30, level: 'beginner', text: 'I like watching movies.', translation: 'Gosto de assistir filmes.' },
    { id: 31, level: 'beginner', text: 'Where is the bathroom?', translation: 'Onde fica o banheiro?' },
    { id: 32, level: 'beginner', text: 'I have brown hair.', translation: 'Tenho cabelo marrom.' },
    { id: 33, level: 'beginner', text: 'Do you speak Spanish?', translation: 'Você fala espanhol?' },
    { id: 34, level: 'beginner', text: 'I like ice cream.', translation: 'Gosto de sorvete.' },
    { id: 35, level: 'beginner', text: 'The car is fast.', translation: 'O carro é rápido.' },
    { id: 36, level: 'beginner', text: 'I go to the gym on Tuesday.', translation: 'Vou à academia na terça-feira.' },
    { id: 37, level: 'beginner', text: 'My friend is very kind.', translation: 'Meu amigo é muito gentil.' },
    { id: 38, level: 'beginner', text: 'I have a phone and a laptop.', translation: 'Tenho um telefone e um laptop.' },
    { id: 39, level: 'beginner', text: 'The sky is blue.', translation: 'O céu é azul.' },
    { id: 40, level: 'beginner', text: 'I sleep eight hours.', translation: 'Durmo oito horas.' },

    // INTERMEDIATE (40 frases)
    { id: 41, level: 'intermediate', text: 'I have been learning English for three years.', translation: 'Tenho estudado inglês há três anos.' },
    { id: 42, level: 'intermediate', text: 'She works as a software developer in a tech company.', translation: 'Ela trabalha como desenvolvedora de software em uma empresa de tecnologia.' },
    { id: 43, level: 'intermediate', text: 'If I had more time, I would travel around the world.', translation: 'Se eu tivesse mais tempo, viajaria ao redor do mundo.' },
    { id: 44, level: 'intermediate', text: 'The meeting was postponed because of the weather.', translation: 'A reunião foi adiada por causa do clima.' },
    { id: 45, level: 'intermediate', text: 'I am interested in learning about different cultures.', translation: 'Tenho interesse em aprender sobre diferentes culturas.' },
    { id: 46, level: 'intermediate', text: 'She suggested that we should visit the museum on Saturday.', translation: 'Ela sugeriu que devêssemos visitar o museu no sábado.' },
    { id: 47, level: 'intermediate', text: 'I would appreciate it if you could send me the files.', translation: 'Eu agradeceria se você pudesse me enviar os arquivos.' },
    { id: 48, level: 'intermediate', text: 'The project requires more research and planning.', translation: 'O projeto requer mais pesquisa e planejamento.' },
    { id: 49, level: 'intermediate', text: 'Although it was raining, we went to the beach.', translation: 'Embora estivesse chovendo, fomos à praia.' },
    { id: 50, level: 'intermediate', text: 'I have already finished my homework.', translation: 'Já terminei meu dever de casa.' },
    { id: 51, level: 'intermediate', text: 'She is considering changing jobs next year.', translation: 'Ela está considerando trocar de emprego no próximo ano.' },
    { id: 52, level: 'intermediate', text: 'The new restaurant serves excellent Italian food.', translation: 'O novo restaurante serve excelente comida italiana.' },
    { id: 53, level: 'intermediate', text: 'I am looking forward to the concert next month.', translation: 'Estou ansioso para o concerto no próximo mês.' },
    { id: 54, level: 'intermediate', text: 'He apologized for being late to the meeting.', translation: 'Ele pediu desculpas por chegar atrasado à reunião.' },
    { id: 55, level: 'intermediate', text: 'Despite the challenges, the team managed to complete the project.', translation: 'Apesar dos desafios, a equipe conseguiu completar o projeto.' },
    { id: 56, level: 'intermediate', text: 'I prefer to work in a quiet environment.', translation: 'Prefiro trabalhar em um ambiente tranquilo.' },
    { id: 57, level: 'intermediate', text: 'She has a talent for playing the piano.', translation: 'Ela tem talento para tocar piano.' },
    { id: 58, level: 'intermediate', text: 'The book I read last week was fascinating.', translation: 'O livro que li na semana passada foi fascinante.' },
    { id: 59, level: 'intermediate', text: 'I am thinking of taking a cooking class.', translation: 'Estou pensando em fazer um curso de culinária.' },
    { id: 60, level: 'intermediate', text: 'It is important to maintain a healthy lifestyle.', translation: 'É importante manter um estilo de vida saudável.' },
    { id: 61, level: 'intermediate', text: 'The company announced a new product launch.', translation: 'A empresa anunciou o lançamento de um novo produto.' },
    { id: 62, level: 'intermediate', text: 'I would like to improve my communication skills.', translation: 'Gostaria de melhorar minhas habilidades de comunicação.' },
    { id: 63, level: 'intermediate', text: 'She has been to more than twenty countries.', translation: 'Ela esteve em mais de vinte países.' },
    { id: 64, level: 'intermediate', text: 'The weather forecast predicts rain tomorrow.', translation: 'A previsão do tempo prevê chuva amanhã.' },
    { id: 65, level: 'intermediate', text: 'I have never tried sushi before.', translation: 'Nunca tinha experimentado sushi antes.' },
    { id: 66, level: 'intermediate', text: 'She managed to solve the problem quickly.', translation: 'Ela conseguiu resolver o problema rapidamente.' },
    { id: 67, level: 'intermediate', text: 'The article discusses the importance of education.', translation: 'O artigo discute a importância da educação.' },
    { id: 68, level: 'intermediate', text: 'I am confident that the team will succeed.', translation: 'Tenho confiança de que o time terá sucesso.' },
    { id: 69, level: 'intermediate', text: 'He recommended that we visit this restaurant.', translation: 'Ele recomendou que visitássemos este restaurante.' },
    { id: 70, level: 'intermediate', text: 'The conference will take place in March.', translation: 'A conferência ocorrerá em março.' },
    { id: 71, level: 'intermediate', text: 'I have been practicing English for months.', translation: 'Tenho praticado inglês por meses.' },
    { id: 72, level: 'intermediate', text: 'She is excited about the new opportunity.', translation: 'Ela está animada sobre a nova oportunidade.' },
    { id: 73, level: 'intermediate', text: 'The film was well received by critics.', translation: 'O filme foi bem recebido pelos críticos.' },
    { id: 74, level: 'intermediate', text: 'I found the documentary very informative.', translation: 'Achei o documentário muito informativo.' },
    { id: 75, level: 'intermediate', text: 'She prefers tea to coffee in the afternoon.', translation: 'Ela prefere chá ao café à tarde.' },
    { id: 76, level: 'intermediate', text: 'The museum is closed on Mondays.', translation: 'O museu está fechado nas segundas-feiras.' },
    { id: 77, level: 'intermediate', text: 'I appreciate your help with the project.', translation: 'Agradeço sua ajuda no projeto.' },
    { id: 78, level: 'intermediate', text: 'She has been working there for five years.', translation: 'Ela tem trabalhado lá há cinco anos.' },
    { id: 79, level: 'intermediate', text: 'The presentation was informative and interesting.', translation: 'A apresentação foi informativa e interessante.' },
    { id: 80, level: 'intermediate', text: 'I think we should schedule a meeting next week.', translation: 'Acho que devemos agendar uma reunião na próxima semana.' },

    // ADVANCED (40 frases)
    { id: 81, level: 'advanced', text: 'The technological advancements have revolutionized communication.', translation: 'Os avanços tecnológicos revolucionaram a comunicação.' },
    { id: 82, level: 'advanced', text: 'Notwithstanding the economic downturn, the company maintained profitability.', translation: 'Apesar da recessão econômica, a empresa manteve lucratividade.' },
    { id: 83, level: 'advanced', text: 'The paradigm shift in renewable energy has profound implications.', translation: 'A mudança de paradigma em energia renovável tem implicações profundas.' },
    { id: 84, level: 'advanced', text: 'Consequently, we must reconsider our strategic approach to sustainability.', translation: 'Consequentemente, devemos reconsiderar nossa abordagem estratégica para sustentabilidade.' },
    { id: 85, level: 'advanced', text: 'The multifaceted nature of this issue demands comprehensive analysis.', translation: 'A natureza multifacetada deste problema exige análise abrangente.' },
    { id: 86, level: 'advanced', text: 'Furthermore, the implementation of artificial intelligence presents unprecedented challenges.', translation: 'Além disso, a implementação da inteligência artificial apresenta desafios sem precedentes.' },
    { id: 87, level: 'advanced', text: 'The correlation between climate change and economic development cannot be ignored.', translation: 'A correlação entre mudança climática e desenvolvimento econômico não pode ser ignorada.' },
    { id: 88, level: 'advanced', text: 'In light of recent developments, we must reassess our organizational structure.', translation: 'À luz dos desenvolvimentos recentes, devemos reavaliar nossa estrutura organizacional.' },
    { id: 89, level: 'advanced', text: 'The intellectual discourse surrounding globalization remains contentious.', translation: 'O discurso intelectual em torno da globalização permanece controverso.' },
    { id: 90, level: 'advanced', text: 'Inherent to this argument is the assumption that progress is measurable.', translation: 'Inerente a este argumento está a suposição de que o progresso é mensurável.' },
    { id: 91, level: 'advanced', text: 'The complexities of international diplomacy require sophisticated negotiation skills.', translation: 'As complexidades da diplomacia internacional exigem habilidades de negociação sofisticadas.' },
    { id: 92, level: 'advanced', text: 'Predicated upon rigorous research, our conclusions are fundamentally sound.', translation: 'Baseado em pesquisa rigorosa, nossas conclusões são fundamentalmente sólidas.' },
    { id: 93, level: 'advanced', text: 'The philosophical implications of consciousness remain largely unexplored.', translation: 'As implicações filosóficas da consciência permanecem largamente inexploradas.' },
    { id: 94, level: 'advanced', text: 'Notwithstanding our efforts, the project encountered insurmountable obstacles.', translation: 'Apesar de nossos esforços, o projeto encontrou obstáculos intransponíveis.' },
    { id: 95, level: 'advanced', text: 'The extrapolation of data suggests unprecedented growth in emerging markets.', translation: 'A extrapolação de dados sugere crescimento sem precedentes nos mercados emergentes.' },
    { id: 96, level: 'advanced', text: 'Consequently, stakeholders must navigate increasingly complex regulatory environments.', translation: 'Consequentemente, as partes interessadas devem navegar ambientes regulatórios cada vez mais complexos.' },
    { id: 97, level: 'advanced', text: 'The dichotomy between theory and practice remains perpetually relevant.', translation: 'A dicotomia entre teoria e prática permanece perpetuamente relevante.' },
    { id: 98, level: 'advanced', text: 'Nevertheless, the integration of innovative technologies offers substantial advantages.', translation: 'No entanto, a integração de tecnologias inovadoras oferece vantagens substanciais.' },
    { id: 99, level: 'advanced', text: 'The epistemological framework underpinning our analysis merits careful examination.', translation: 'O marco epistemológico subjacente à nossa análise merece exame cuidadoso.' },
    { id: 100, level: 'advanced', text: 'Henceforth, organizations must prioritize ethical considerations in business operations.', translation: 'Doravante, as organizações devem priorizar considerações éticas nas operações comerciais.' },
    { id: 101, level: 'advanced', text: 'The proliferation of misinformation in digital spaces poses existential threats.', translation: 'A proliferação de desinformação em espaços digitais representa ameaças existenciais.' },
    { id: 102, level: 'advanced', text: 'Arguably, the most pressing contemporary issue is environmental degradation.', translation: 'Pode-se argumentar que a questão contemporânea mais urgente é a degradação ambiental.' },
    { id: 103, level: 'advanced', text: 'The homogenization of global culture presents both opportunities and risks.', translation: 'A homogeneização da cultura global apresenta tanto oportunidades quanto riscos.' },
    { id: 104, level: 'advanced', text: 'Underlying this phenomenon is a complex interplay of socioeconomic factors.', translation: 'Subjacente a este fenômeno está uma interação complexa de fatores socioeconômicos.' },
    { id: 105, level: 'advanced', text: 'The trajectory of human civilization suggests inevitable paradigmatic transformations.', translation: 'A trajetória da civilização humana sugere transformações paradigmáticas inevitáveis.' },
    { id: 106, level: 'advanced', text: 'Notwithstanding technological advances, fundamental human needs remain unchanged.', translation: 'Apesar dos avanços tecnológicos, as necessidades humanas fundamentais permanecem inalteradas.' },
    { id: 107, level: 'advanced', text: 'The confluence of multiple disciplines illuminates previously obscure phenomena.', translation: 'A confluência de múltiplas disciplinas ilumina fenômenos previamente obscuros.' },
    { id: 108, level: 'advanced', text: 'Consequently, interdisciplinary approaches have become increasingly indispensable.', translation: 'Consequentemente, abordagens interdisciplinares tornaram-se cada vez mais indispensáveis.' },
    { id: 109, level: 'advanced', text: 'The ontological status of abstract entities remains philosophically contentious.', translation: 'O status ontológico de entidades abstratas permanece filosoficamente controverso.' },
    { id: 110, level: 'advanced', text: 'Predicated upon empirical evidence, this hypothesis demonstrates remarkable validity.', translation: 'Baseada em evidências empíricas, esta hipótese demonstra validade notável.' },
    { id: 111, level: 'advanced', text: 'The ubiquity of digital technologies has fundamentally altered human interaction.', translation: 'A ubiquidade das tecnologias digitais alterou fundamentalmente a interação humana.' },
    { id: 112, level: 'advanced', text: 'Nevertheless, critical analyses reveal substantial methodological limitations.', translation: 'No entanto, análises críticas revelam limitações metodológicas substanciais.' },
    { id: 113, level: 'advanced', text: 'The intersection of climate science and economic policy remains contentious.', translation: 'A intersecção da ciência climática e política econômica permanece controversa.' },
    { id: 114, level: 'advanced', text: 'Henceforth, cognitive science must address fundamental questions about consciousness.', translation: 'Doravante, a ciência cognitiva deve abordar questões fundamentais sobre consciência.' },
    { id: 115, level: 'advanced', text: 'The hermeneutic complexities of textual interpretation demand sophisticated frameworks.', translation: 'As complexidades hermenêuticas da interpretação textual exigem marcos sofisticados.' },
    { id: 116, level: 'advanced', text: 'Inherent to postmodern discourse is the deconstruction of established narratives.', translation: 'Inerente ao discurso pós-moderno está a desconstrução de narrativas estabelecidas.' },
    { id: 117, level: 'advanced', text: 'The accumulation of capital has historically engendered profound social inequalities.', translation: 'O acúmulo de capital historicamente gerou profundas desigualdades sociais.' },
    { id: 118, level: 'advanced', text: 'Consequently, redistributive mechanisms have become increasingly controversial in policy debates.', translation: 'Consequentemente, mecanismos redistributivos tornaram-se cada vez mais controversos em debates de política.' },
    { id: 119, level: 'advanced', text: 'The phenomenological perspective offers valuable insights into subjective experience.', translation: 'A perspectiva fenomenológica oferece insights valiosos sobre a experiência subjetiva.' },
    { id: 120, level: 'advanced', text: 'Nevertheless, empirical validation of phenomenological claims remains theoretically problematic.', translation: 'No entanto, a validação empírica de afirmações fenomenológicas permanece teoricamente problemática.' }
  ];

  res.json(texts);
});

// Rota para obter palavras de vocabulário com imagens
app.get('/api/vocabulary-words', (req, res) => {
  const vocabularyWords = [
    // BEGINNER (40 words)
    { id: 1, level: 'beginner', word: 'Apple', translation: 'Maçã', phonetic: '/ˈæp.əl/', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop' },
    { id: 2, level: 'beginner', word: 'Cat', translation: 'Gato', phonetic: '/kæt/', imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop' },
    { id: 3, level: 'beginner', word: 'Book', translation: 'Livro', phonetic: '/bʊk/', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop' },
    { id: 4, level: 'beginner', word: 'House', translation: 'Casa', phonetic: '/haʊs/', imageUrl: 'https://images.unsplash.com/photo-1570129477492-45f003313e78?w=400&h=400&fit=crop' },
    { id: 5, level: 'beginner', word: 'Tree', translation: 'Árvore', phonetic: '/triː/', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop' },
    { id: 6, level: 'beginner', word: 'Coffee', translation: 'Café', phonetic: '/ˈkɔː.fi/', imageUrl: 'https://images.unsplash.com/photo-1495474472645-4c71bcdd2e18?w=400&h=400&fit=crop' },
    { id: 7, level: 'beginner', word: 'Dog', translation: 'Cachorro', phonetic: '/dɔːɡ/', imageUrl: 'https://images.unsplash.com/photo-1633722715463-d30628519e8f?w=400&h=400&fit=crop' },
    { id: 8, level: 'beginner', word: 'Car', translation: 'Carro', phonetic: '/kɑːr/', imageUrl: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=400&fit=crop' },
    { id: 9, level: 'beginner', word: 'Water', translation: 'Água', phonetic: '/ˈwɔː.tər/', imageUrl: 'https://images.unsplash.com/photo-1509803874385-db7c23652552?w=400&h=400&fit=crop' },
    { id: 10, level: 'beginner', word: 'Phone', translation: 'Telefone', phonetic: '/foʊn/', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop' },
    { id: 11, level: 'beginner', word: 'Flower', translation: 'Flor', phonetic: '/ˈflaʊ.ər/', imageUrl: 'https://images.unsplash.com/photo-1552763519-72a48cb0b645?w=400&h=400&fit=crop' },
    { id: 12, level: 'beginner', word: 'Mountain', translation: 'Montanha', phonetic: '/ˈmaʊn.tɪn/', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
    { id: 13, level: 'beginner', word: 'Beach', translation: 'Praia', phonetic: '/biːtʃ/', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop' },
    { id: 14, level: 'beginner', word: 'Music', translation: 'Música', phonetic: '/ˈmjuː.zɪk/', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop' },
    { id: 15, level: 'beginner', word: 'Pizza', translation: 'Pizza', phonetic: '/ˈpiːt.sə/', imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=400&fit=crop' },
    { id: 16, level: 'beginner', word: 'Sun', translation: 'Sol', phonetic: '/sʌn/', imageUrl: 'https://images.unsplash.com/photo-1533108768551-21a9b850a68e?w=400&h=400&fit=crop' },
    { id: 17, level: 'beginner', word: 'Moon', translation: 'Lua', phonetic: '/muːn/', imageUrl: 'https://images.unsplash.com/photo-1509803874385-db7c23652552?w=400&h=400&fit=crop' },
    { id: 18, level: 'beginner', word: 'Chair', translation: 'Cadeira', phonetic: '/tʃer/', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop' },
    { id: 19, level: 'beginner', word: 'Table', translation: 'Mesa', phonetic: '/ˈteɪ.bəl/', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop' },
    { id: 20, level: 'beginner', word: 'Bird', translation: 'Pássaro', phonetic: '/bɜːrd/', imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=400&fit=crop' },
    { id: 21, level: 'beginner', word: 'Fish', translation: 'Peixe', phonetic: '/fɪʃ/', imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop' },
    { id: 22, level: 'beginner', word: 'Bread', translation: 'Pão', phonetic: '/bred/', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop' },
    { id: 23, level: 'beginner', word: 'Milk', translation: 'Leite', phonetic: '/mɪlk/', imageUrl: 'https://images.unsplash.com/photo-1608270861620-7298b101ff00?w=400&h=400&fit=crop' },
    { id: 24, level: 'beginner', word: 'Shoes', translation: 'Sapatos', phonetic: '/ʃuːz/', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop' },
    { id: 25, level: 'beginner', word: 'Hat', translation: 'Chapéu', phonetic: '/hæt/', imageUrl: 'https://images.unsplash.com/photo-1533545914191-f28b7d76e3a9?w=400&h=400&fit=crop' },
    { id: 26, level: 'beginner', word: 'Ball', translation: 'Bola', phonetic: '/bɔːl/', imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=400&fit=crop' },
    { id: 27, level: 'beginner', word: 'Door', translation: 'Porta', phonetic: '/dɔːr/', imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop' },
    { id: 28, level: 'beginner', word: 'Window', translation: 'Janela', phonetic: '/ˈwɪn.doʊ/', imageUrl: 'https://images.unsplash.com/photo-1543783207-ecfc68d195c0?w=400&h=400&fit=crop' },
    { id: 29, level: 'beginner', word: 'Clock', translation: 'Relógio', phonetic: '/klɑːk/', imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=400&fit=crop' },
    { id: 30, level: 'beginner', word: 'Pencil', translation: 'Lápis', phonetic: '/ˈpen.səl/', imageUrl: 'https://images.unsplash.com/photo-1513313941411-a4a4f3019b47?w=400&h=400&fit=crop' },
    { id: 31, level: 'beginner', word: 'Bag', translation: 'Bolsa', phonetic: '/bæɡ/', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop' },
    { id: 32, level: 'beginner', word: 'Lamp', translation: 'Lâmpada', phonetic: '/læmp/', imageUrl: 'https://images.unsplash.com/photo-1565636151875-2f38f10b0b38?w=400&h=400&fit=crop' },
    { id: 33, level: 'beginner', word: 'Star', translation: 'Estrela', phonetic: '/stɑːr/', imageUrl: 'https://images.unsplash.com/photo-1504275107127-966a6c539ece?w=400&h=400&fit=crop' },
    { id: 34, level: 'beginner', word: 'Cloud', translation: 'Nuvem', phonetic: '/klaʊd/', imageUrl: 'https://images.unsplash.com/photo-1495226215383-ef14643559b8?w=400&h=400&fit=crop' },
    { id: 35, level: 'beginner', word: 'Rain', translation: 'Chuva', phonetic: '/reɪn/', imageUrl: 'https://images.unsplash.com/photo-1508689040525-c7ee990b00b7?w=400&h=400&fit=crop' },
    { id: 36, level: 'beginner', word: 'Snow', translation: 'Neve', phonetic: '/snoʊ/', imageUrl: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400&h=400&fit=crop' },
    { id: 37, level: 'beginner', word: 'Fire', translation: 'Fogo', phonetic: '/faɪər/', imageUrl: 'https://images.unsplash.com/photo-1524634126288-917f179abfb1?w=400&h=400&fit=crop' },
    { id: 38, level: 'beginner', word: 'Ice', translation: 'Gelo', phonetic: '/aɪs/', imageUrl: 'https://images.unsplash.com/photo-1545252864-c0c3a28b67c7?w=400&h=400&fit=crop' },
    { id: 39, level: 'beginner', word: 'Hand', translation: 'Mão', phonetic: '/hænd/', imageUrl: 'https://images.unsplash.com/photo-1603015635529-a2d0008aa25c?w=400&h=400&fit=crop' },
    { id: 40, level: 'beginner', word: 'Eye', translation: 'Olho', phonetic: '/aɪ/', imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c006a4c8?w=400&h=400&fit=crop' },

    // INTERMEDIATE (40 words) - continuing from ID 41
    { id: 41, level: 'intermediate', word: 'Butterfly', translation: 'Borboleta', phonetic: '/ˈbʌt.ər.flaɪ/', imageUrl: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&h=400&fit=crop' },
    { id: 42, level: 'intermediate', word: 'Elephant', translation: 'Elefante', phonetic: '/ˈel.ɪ.fənt/', imageUrl: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&h=400&fit=crop' },
    { id: 43, level: 'intermediate', word: 'Rainbow', translation: 'Arco-íris', phonetic: '/ˈreɪn.boʊ/', imageUrl: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&h=400&fit=crop' },
    { id: 44, level: 'intermediate', word: 'Thunder', translation: 'Trovão', phonetic: '/ˈθʌn.dər/', imageUrl: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=400&h=400&fit=crop' },
    { id: 45, level: 'intermediate', word: 'Lightning', translation: 'Relâmpago', phonetic: '/ˈlaɪt.nɪŋ/', imageUrl: 'https://images.unsplash.com/photo-1492011221367-f47e3ccd77a0?w=400&h=400&fit=crop' },
    { id: 46, level: 'intermediate', word: 'Garden', translation: 'Jardim', phonetic: '/ˈɡɑːr.dən/', imageUrl: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&h=400&fit=crop' },
    { id: 47, level: 'intermediate', word: 'Forest', translation: 'Floresta', phonetic: '/ˈfɔːr.ɪst/', imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=400&fit=crop' },
    { id: 48, level: 'intermediate', word: 'Ocean', translation: 'Oceano', phonetic: '/ˈoʊ.ʃən/', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop' },
    { id: 49, level: 'intermediate', word: 'Island', translation: 'Ilha', phonetic: '/ˈaɪ.lənd/', imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop' },
    { id: 50, level: 'intermediate', word: 'Bridge', translation: 'Ponte', phonetic: '/brɪdʒ/', imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=400&fit=crop' },
    { id: 51, level: 'intermediate', word: 'Castle', translation: 'Castelo', phonetic: '/ˈkæs.əl/', imageUrl: 'https://images.unsplash.com/photo-1549891483-53994097ce42?w=400&h=400&fit=crop' },
    { id: 52, level: 'intermediate', word: 'Library', translation: 'Biblioteca', phonetic: '/ˈlaɪ.brer.i/', imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=400&fit=crop' },
    { id: 53, level: 'intermediate', word: 'Museum', translation: 'Museu', phonetic: '/mjuːˈziː.əm/', imageUrl: 'https://images.unsplash.com/photo-1566127444979-b3d2b8f86243?w=400&h=400&fit=crop' },
    { id: 54, level: 'intermediate', word: 'Stadium', translation: 'Estádio', phonetic: '/ˈsteɪ.di.əm/', imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=400&fit=crop' },
    { id: 55, level: 'intermediate', word: 'Helicopter', translation: 'Helicóptero', phonetic: '/ˈhel.ɪ.kɑːp.tər/', imageUrl: 'https://images.unsplash.com/photo-1520016468830-600fea3a84e3?w=400&h=400&fit=crop' },
    { id: 56, level: 'intermediate', word: 'Airplane', translation: 'Avião', phonetic: '/ˈer.pleɪn/', imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=400&fit=crop' },
    { id: 57, level: 'intermediate', word: 'Bicycle', translation: 'Bicicleta', phonetic: '/ˈbaɪ.sɪ.kəl/', imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=400&fit=crop' },
    { id: 58, level: 'intermediate', word: 'Motorcycle', translation: 'Motocicleta', phonetic: '/ˈmoʊ.tər.saɪ.kəl/', imageUrl: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?w=400&h=400&fit=crop' },
    { id: 59, level: 'intermediate', word: 'Umbrella', translation: 'Guarda-chuva', phonetic: '/ʌmˈbrel.ə/', imageUrl: 'https://images.unsplash.com/photo-1508556919343-67a56f538fb5?w=400&h=400&fit=crop' },
    { id: 60, level: 'intermediate', word: 'Sunglasses', translation: 'Óculos de sol', phonetic: '/ˈsʌn.ɡlæs.ɪz/', imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: 61, level: 'intermediate', word: 'Backpack', translation: 'Mochila', phonetic: '/ˈbæk.pæk/', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: 62, level: 'intermediate', word: 'Keyboard', translation: 'Teclado', phonetic: '/ˈkiː.bɔːrd/', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop' },
    { id: 63, level: 'intermediate', word: 'Camera', translation: 'Câmera', phonetic: '/ˈkæm.rə/', imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop' },
    { id: 64, level: 'intermediate', word: 'Painting', translation: 'Pintura', phonetic: '/ˈpeɪn.tɪŋ/', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop' },
    { id: 65, level: 'intermediate', word: 'Sculpture', translation: 'Escultura', phonetic: '/ˈskʌlp.tʃər/', imageUrl: 'https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=400&h=400&fit=crop' },
    { id: 66, level: 'intermediate', word: 'Waterfall', translation: 'Cachoeira', phonetic: '/ˈwɔː.tər.fɔːl/', imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&h=400&fit=crop' },
    { id: 67, level: 'intermediate', word: 'Volcano', translation: 'Vulcão', phonetic: '/vɑːlˈkeɪ.noʊ/', imageUrl: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=400&h=400&fit=crop' },
    { id: 68, level: 'intermediate', word: 'Telescope', translation: 'Telescópio', phonetic: '/ˈtel.ɪ.skoʊp/', imageUrl: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=400&h=400&fit=crop' },
    { id: 69, level: 'intermediate', word: 'Microscope', translation: 'Microscópio', phonetic: '/ˈmaɪ.krə.skoʊp/', imageUrl: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=400&h=400&fit=crop' },
    { id: 70, level: 'intermediate', word: 'Laboratory', translation: 'Laboratório', phonetic: '/ˈlæb.rə.tɔːr.i/', imageUrl: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=400&fit=crop' },
    { id: 71, level: 'intermediate', word: 'Aquarium', translation: 'Aquário', phonetic: '/əˈkwer.i.əm/', imageUrl: 'https://images.unsplash.com/photo-1520990543452-6c4d3b3e0c23?w=400&h=400&fit=crop' },
    { id: 72, level: 'intermediate', word: 'Envelope', translation: 'Envelope', phonetic: '/ˈen.və.loʊp/', imageUrl: 'https://images.unsplash.com/photo-1526554850534-7c78330d5f90?w=400&h=400&fit=crop' },
    { id: 73, level: 'intermediate', word: 'Compass', translation: 'Bússola', phonetic: '/ˈkʌm.pəs/', imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=400&h=400&fit=crop' },
    { id: 74, level: 'intermediate', word: 'Anchor', translation: 'Âncora', phonetic: '/ˈæŋ.kər/', imageUrl: 'https://images.unsplash.com/photo-1578519606226-7750f3f1a896?w=400&h=400&fit=crop' },
    { id: 75, level: 'intermediate', word: 'Sailboat', translation: 'Veleiro', phonetic: '/ˈseɪl.boʊt/', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop' },
    { id: 76, level: 'intermediate', word: 'Lighthouse', translation: 'Farol', phonetic: '/ˈlaɪt.haʊs/', imageUrl: 'https://images.unsplash.com/photo-1545143261-94ae9e2eefce?w=400&h=400&fit=crop' },
    { id: 77, level: 'intermediate', word: 'Fountain', translation: 'Fonte', phonetic: '/ˈfaʊn.tən/', imageUrl: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?w=400&h=400&fit=crop' },
    { id: 78, level: 'intermediate', word: 'Pyramid', translation: 'Pirâmide', phonetic: '/ˈpɪr.ə.mɪd/', imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=400&fit=crop' },
    { id: 79, level: 'intermediate', word: 'Desert', translation: 'Deserto', phonetic: '/ˈdez.ərt/', imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=400&fit=crop' },
    { id: 80, level: 'intermediate', word: 'Jungle', translation: 'Selva', phonetic: '/ˈdʒʌŋ.ɡəl/', imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=400&fit=crop' },

    // ADVANCED (40 words) - continuing from ID 81
    { id: 81, level: 'advanced', word: 'Constellation', translation: 'Constelação', phonetic: '/ˌkɑːn.stəˈleɪ.ʃən/', imageUrl: 'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?w=400&h=400&fit=crop' },
    { id: 82, level: 'advanced', word: 'Observatory', translation: 'Observatório', phonetic: '/əbˈzɜːr.və.tɔːr.i/', imageUrl: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=400&h=400&fit=crop' },
    { id: 83, level: 'advanced', word: 'Glacier', translation: 'Geleira', phonetic: '/ˈɡleɪ.ʃər/', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
    { id: 84, level: 'advanced', word: 'Archipelago', translation: 'Arquipélago', phonetic: '/ˌɑːr.kəˈpel.ə.ɡoʊ/', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
    { id: 85, level: 'advanced', word: 'Chandelier', translation: 'Lustre', phonetic: '/ˌʃæn.dəˈlɪr/', imageUrl: 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=400&fit=crop' },
    { id: 86, level: 'advanced', word: 'Silhouette', translation: 'Silhueta', phonetic: '/ˌsɪl.uˈet/', imageUrl: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=400&h=400&fit=crop' },
    { id: 87, level: 'advanced', word: 'Kaleidoscope', translation: 'Caleidoscópio', phonetic: '/kəˈlaɪ.də.skoʊp/', imageUrl: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop' },
    { id: 88, level: 'advanced', word: 'Labyrinth', translation: 'Labirinto', phonetic: '/ˈlæb.ə.rɪnθ/', imageUrl: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=400&h=400&fit=crop' },
    { id: 89, level: 'advanced', word: 'Metropolis', translation: 'Metrópole', phonetic: '/məˈtrɑː.pə.lɪs/', imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop' },
    { id: 90, level: 'advanced', word: 'Oasis', translation: 'Oásis', phonetic: '/oʊˈeɪ.sɪs/', imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=400&fit=crop' },
    { id: 91, level: 'advanced', word: 'Prism', translation: 'Prisma', phonetic: '/ˈprɪz.əm/', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop' },
    { id: 92, level: 'advanced', word: 'Sanctuary', translation: 'Santuário', phonetic: '/ˈsæŋk.tʃu.er.i/', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop' },
    { id: 93, level: 'advanced', word: 'Tapestry', translation: 'Tapeçaria', phonetic: '/ˈtæp.ə.stri/', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop' },
    { id: 94, level: 'advanced', word: 'Aqueduct', translation: 'Aqueduto', phonetic: '/ˈæk.wɪ.dʌkt/', imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=400&fit=crop' },
    { id: 95, level: 'advanced', word: 'Colosseum', translation: 'Coliseu', phonetic: '/ˌkɑː.ləˈsiː.əm/', imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop' },
    { id: 96, level: 'advanced', word: 'Cathedral', translation: 'Catedral', phonetic: '/kəˈθiː.drəl/', imageUrl: 'https://images.unsplash.com/photo-1542332213-31f87348057f?w=400&h=400&fit=crop' },
    { id: 97, level: 'advanced', word: 'Amphitheater', translation: 'Anfiteatro', phonetic: '/ˈæm.fɪ.θiː.ə.tər/', imageUrl: 'https://images.unsplash.com/photo-1580121441575-41bcb5c6b47c?w=400&h=400&fit=crop' },
    { id: 98, level: 'advanced', word: 'Basilica', translation: 'Basílica', phonetic: '/bəˈzɪl.ɪ.kə/', imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=400&h=400&fit=crop' },
    { id: 99, level: 'advanced', word: 'Monastery', translation: 'Mosteiro', phonetic: '/ˈmɑː.nə.ster.i/', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop' },
    { id: 100, level: 'advanced', word: 'Ziggurat', translation: 'Zigurate', phonetic: '/ˈzɪɡ.ə.ræt/', imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=400&fit=crop' },
    { id: 101, level: 'advanced', word: 'Mausoleum', translation: 'Mausoléu', phonetic: '/ˌmɔː.səˈliː.əm/', imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=400&fit=crop' },
    { id: 102, level: 'advanced', word: 'Pagoda', translation: 'Pagode', phonetic: '/pəˈɡoʊ.də/', imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=400&fit=crop' },
    { id: 103, level: 'advanced', word: 'Minaret', translation: 'Minarete', phonetic: '/ˌmɪn.əˈret/', imageUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400&h=400&fit=crop' },
    { id: 104, level: 'advanced', word: 'Acropolis', translation: 'Acrópole', phonetic: '/əˈkrɑː.pə.lɪs/', imageUrl: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=400&fit=crop' },
    { id: 105, level: 'advanced', word: 'Pantheon', translation: 'Panteão', phonetic: '/ˈpæn.θi.ɑːn/', imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop' },
    { id: 106, level: 'advanced', word: 'Necropolis', translation: 'Necrópole', phonetic: '/nəˈkrɑː.pə.lɪs/', imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=400&fit=crop' },
    { id: 107, level: 'advanced', word: 'Sarcophagus', translation: 'Sarcófago', phonetic: '/sɑːrˈkɑː.fə.ɡəs/', imageUrl: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400&h=400&fit=crop' },
    { id: 108, level: 'advanced', word: 'Catacombs', translation: 'Catacumbas', phonetic: '/ˈkæt.ə.koʊmz/', imageUrl: 'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=400&h=400&fit=crop' },
    { id: 109, level: 'advanced', word: 'Citadel', translation: 'Cidadela', phonetic: '/ˈsɪt.ə.del/', imageUrl: 'https://images.unsplash.com/photo-1549891483-53994097ce42?w=400&h=400&fit=crop' },
    { id: 110, level: 'advanced', word: 'Fortress', translation: 'Fortaleza', phonetic: '/ˈfɔːr.trəs/', imageUrl: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&h=400&fit=crop' },
    { id: 111, level: 'advanced', word: 'Barricade', translation: 'Barricada', phonetic: '/ˌber.ɪˈkeɪd/', imageUrl: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&h=400&fit=crop' },
    { id: 112, level: 'advanced', word: 'Pavilion', translation: 'Pavilhão', phonetic: '/pəˈvɪl.jən/', imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=400&fit=crop' },
    { id: 113, level: 'advanced', word: 'Conservatory', translation: 'Conservatório', phonetic: '/kənˈsɜːr.və.tɔːr.i/', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop' },
    { id: 114, level: 'advanced', word: 'Arboretum', translation: 'Arboreto', phonetic: '/ˌɑːr.bəˈriː.t̬əm/', imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=400&fit=crop' },
    { id: 115, level: 'advanced', word: 'Herbarium', translation: 'Herbário', phonetic: '/hɜːrˈber.i.əm/', imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=400&fit=crop' },
    { id: 116, level: 'advanced', word: 'Terrarium', translation: 'Terrário', phonetic: '/təˈrer.i.əm/', imageUrl: 'https://images.unsplash.com/photo-1593642532973-d31b6557fa68?w=400&h=400&fit=crop' },
    { id: 117, level: 'advanced', word: 'Planetarium', translation: 'Planetário', phonetic: '/ˌplæn.ɪˈter.i.əm/', imageUrl: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&h=400&fit=crop' },
    { id: 118, level: 'advanced', word: 'Auditorium', translation: 'Auditório', phonetic: '/ˌɔː.dɪˈtɔːr.i.əm/', imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=400&fit=crop' },
    { id: 119, level: 'advanced', word: 'Symposium', translation: 'Simpósio', phonetic: '/sɪmˈpoʊ.zi.əm/', imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=400&fit=crop' },
    { id: 120, level: 'advanced', word: 'Ephemeral', translation: 'Efêmero', phonetic: '/ɪˈfem.ər.əl/', imageUrl: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&h=400&fit=crop' },

    // Extra words for new categories
    { id: 121, level: 'intermediate', word: 'Laptop', translation: 'Laptop', phonetic: '/ˈlæp.tɒp/', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop' },
    { id: 122, level: 'intermediate', word: 'Smartphone', translation: 'Smartphone', phonetic: '/ˈsmɑːrt.foʊn/', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop' },
    { id: 123, level: 'intermediate', word: 'Tablet', translation: 'Tablet', phonetic: '/ˈtæb.lət/', imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop' },
    { id: 124, level: 'intermediate', word: 'Headphones', translation: 'Fones de ouvido', phonetic: '/ˈhed.foʊnz/', imageUrl: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=400&h=400&fit=crop' },
    { id: 125, level: 'advanced', word: 'Robot', translation: 'Robô', phonetic: '/ˈroʊ.bɑːt/', imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop' },
    { id: 126, level: 'advanced', word: 'Satellite', translation: 'Satélite', phonetic: '/ˈsæt̬.əl.aɪt/', imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=400&fit=crop' },
    { id: 127, level: 'beginner', word: 'Knife', translation: 'Faca', phonetic: '/naɪf/', imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=400&fit=crop' },
    { id: 128, level: 'beginner', word: 'Spoon', translation: 'Colher', phonetic: '/spuːn/', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop' },
    { id: 129, level: 'beginner', word: 'Fork', translation: 'Garfo', phonetic: '/fɔːrk/', imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&h=400&fit=crop' },
    { id: 130, level: 'beginner', word: 'Pan', translation: 'Frigideira', phonetic: '/pæn/', imageUrl: 'https://images.unsplash.com/photo-1576618032623-6932c4a5d7fe?w=400&h=400&fit=crop' },
    { id: 131, level: 'intermediate', word: 'Oven', translation: 'Forno', phonetic: '/ˈʌv.ən/', imageUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&h=400&fit=crop' },
    { id: 132, level: 'intermediate', word: 'Recipe', translation: 'Receita', phonetic: '/ˈres.ə.pi/', imageUrl: 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=400&h=400&fit=crop' },
    { id: 133, level: 'intermediate', word: 'Chess', translation: 'Xadrez', phonetic: '/tʃes/', imageUrl: 'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?w=400&h=400&fit=crop' },
    { id: 134, level: 'beginner', word: 'Puzzle', translation: 'Quebra-cabeça', phonetic: '/ˈpʌz.əl/', imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop' },
    { id: 135, level: 'beginner', word: 'Dice', translation: 'Dados', phonetic: '/daɪs/', imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop' },
    { id: 136, level: 'intermediate', word: 'Controller', translation: 'Controle', phonetic: '/kənˈtroʊ.lər/', imageUrl: 'https://images.unsplash.com/photo-1580247817800-8c3652d61de5?w=400&h=400&fit=crop' },
    { id: 137, level: 'intermediate', word: 'Joystick', translation: 'Joystick', phonetic: '/ˈdʒɔɪ.stɪk/', imageUrl: 'https://images.unsplash.com/photo-1582719478248-6c9a7ae0898e?w=400&h=400&fit=crop' },
    { id: 138, level: 'intermediate', word: 'Arcade', translation: 'Arcade', phonetic: '/ɑːrˈkeɪd/', imageUrl: 'https://images.unsplash.com/photo-1595871986625-d4dffd47fbda?w=400&h=400&fit=crop' }
  ];

  // Helper to derive category for each word
  const sets = {
    nature: new Set(['tree','sun','moon','bird','fish','flower','mountain','beach','cloud','rain','snow','fire','ice','butterfly','rainbow','thunder','lightning','forest','ocean','island','waterfall','volcano','desert','jungle','glacier','archipelago','oasis']),
    food: new Set(['apple','coffee','pizza','bread','milk','water']),
    cooking: new Set(['knife','spoon','fork','pan','oven','recipe']),
    technology: new Set(['laptop','smartphone','tablet','headphones','robot','satellite']),
    games: new Set(['chess','puzzle','dice','controller','joystick','arcade']),
    objects: new Set(['book','phone','bag','lamp','pencil','ball','shoes','hat','car','door','window','clock','camera','keyboard','backpack','umbrella','sunglasses','compass','anchor','sailboat','bridge','bicycle','motorcycle','airplane','helicopter','table','chair','hand','eye','water']),
    places: new Set(['house','garden','castle','library','museum','stadium','lighthouse','pyramid','island','beach','desert','jungle','oasis']),
    science: new Set(['telescope','microscope','laboratory','aquarium','planetarium','observatory','kaleidoscope','volcano','glacier','satellite']),
    architecture: new Set(['colosseum','cathedral','amphitheater','basilica','monastery','ziggurat','mausoleum','pagoda','minaret','acropolis','pantheon','necropolis','sarcophagus','catacombs','citadel','fortress','barricade','pavilion','conservatory','arboretum','herbarium','terrarium','auditorium','symposium','aqueduct','archipelago']),
  };

  const getCategory = (word) => {
    const w = String(word || '').toLowerCase();
    if (sets.cooking.has(w)) return 'cooking';
    if (sets.technology.has(w)) return 'technology';
    if (sets.games.has(w)) return 'games';
    if (sets.nature.has(w)) return 'nature';
    if (sets.food.has(w)) return 'food';
    if (sets.objects.has(w)) return 'objects';
    if (sets.places.has(w)) return 'places';
    if (sets.science.has(w)) return 'science';
    if (sets.architecture.has(w)) return 'architecture';
    return 'general';
  };

  const categorized = vocabularyWords.map(word => ({
    ...word,
    category: getCategory(word.word)
  }));

  const requestedCategory = (req.query.category || '').toString().toLowerCase();
  const filtered = requestedCategory && requestedCategory !== 'all'
    ? categorized.filter(w => w.category === requestedCategory)
    : categorized;

  // Shuffle for random order each request (Fisher–Yates)
  const shuffled = filtered.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  res.json(shuffled);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`✅ Gemini API configurada`);
});
