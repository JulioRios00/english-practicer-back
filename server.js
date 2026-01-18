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

  } catch (error) {
    console.error('Erro ao analisar pronúncia:', error);
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`✅ Gemini API configurada`);
});
