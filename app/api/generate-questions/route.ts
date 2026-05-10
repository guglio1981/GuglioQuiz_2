import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { TOPIC_LABELS, type Topic, type Difficulty } from '@/lib/types'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Mapping from our topics to Open Trivia DB categories
const TRIVIA_CATEGORY_MAP: Partial<Record<Topic, number>> = {
  storia: 23, // History
  geografia: 22, // Geography
  tecnologia: 30, // Science: Gadgets
  informatica: 18, // Science: Computers
  inglese: 10, // Books (closest to language/literature)
  serie_tv: 14, // Television
  religione: 20, // Mythology (closest)
  matematica: 19, // Science: Mathematics
  italiano: 10, // Books/Literature
  cultura_generale: 9, // General Knowledge
  cinema: 11, // Entertainment: Film
  libri: 10, // Entertainment: Books
  musica: 12, // Entertainment: Music
  televisione: 14, // Entertainment: Television
  giochi_tavolo: 16, // Entertainment: Board Games
  cartoni_animati: 32, // Entertainment: Cartoon & Animations
  scienze_natura: 17, // Science & Nature
  sport: 21, // Sports
  politica: 24, // Politics
  arte: 25, // Art
  celebrita: 26, // Celebrities
  animali: 27, // Animals
  veicoli: 28, // Vehicles
}

// Topics that need AI generation (no trivia DB equivalent)
const AI_ONLY_TOPICS: Topic[] = ['ragionamento_rapido', 'economia_diritto', 'lingue_straniere']

// Topics with images
const IMAGE_TOPICS: Topic[] = ['indovina_logo', 'indovina_bandiera', 'indovina_anno']

// Logo data - famous companies/brands
const LOGO_DATA = [
  { name: 'Apple', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
  { name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  { name: 'Nike', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' },
  { name: 'McDonald\'s', url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg' },
  { name: 'Amazon', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
  { name: 'Coca-Cola', url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg' },
  { name: 'Adidas', url: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg' },
  { name: 'Ferrari', url: 'https://upload.wikimedia.org/wikipedia/it/thumb/d/d1/Logo_Ferrari.svg/512px-Logo_Ferrari.svg.png' },
  { name: 'BMW', url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg' },
  { name: 'Mercedes-Benz', url: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg' },
  { name: 'Pepsi', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Pepsi_logo_2014.svg' },
  { name: 'Spotify', url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg' },
  { name: 'Netflix', url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'YouTube', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg' },
  { name: 'Instagram', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { name: 'Facebook', url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' },
  { name: 'Twitter/X', url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg' },
  { name: 'WhatsApp', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { name: 'Starbucks', url: 'https://upload.wikimedia.org/wikipedia/en/d/d3/Starbucks_Corporation_Logo_2011.svg' },
]

// Flag data - countries with flag URLs
const FLAG_DATA = [
  { name: 'Italia', url: 'https://flagcdn.com/w320/it.png' },
  { name: 'Francia', url: 'https://flagcdn.com/w320/fr.png' },
  { name: 'Germania', url: 'https://flagcdn.com/w320/de.png' },
  { name: 'Spagna', url: 'https://flagcdn.com/w320/es.png' },
  { name: 'Regno Unito', url: 'https://flagcdn.com/w320/gb.png' },
  { name: 'Stati Uniti', url: 'https://flagcdn.com/w320/us.png' },
  { name: 'Giappone', url: 'https://flagcdn.com/w320/jp.png' },
  { name: 'Cina', url: 'https://flagcdn.com/w320/cn.png' },
  { name: 'Brasile', url: 'https://flagcdn.com/w320/br.png' },
  { name: 'Argentina', url: 'https://flagcdn.com/w320/ar.png' },
  { name: 'Australia', url: 'https://flagcdn.com/w320/au.png' },
  { name: 'Canada', url: 'https://flagcdn.com/w320/ca.png' },
  { name: 'Messico', url: 'https://flagcdn.com/w320/mx.png' },
  { name: 'India', url: 'https://flagcdn.com/w320/in.png' },
  { name: 'Russia', url: 'https://flagcdn.com/w320/ru.png' },
  { name: 'Sudafrica', url: 'https://flagcdn.com/w320/za.png' },
  { name: 'Egitto', url: 'https://flagcdn.com/w320/eg.png' },
  { name: 'Grecia', url: 'https://flagcdn.com/w320/gr.png' },
  { name: 'Portogallo', url: 'https://flagcdn.com/w320/pt.png' },
  { name: 'Olanda', url: 'https://flagcdn.com/w320/nl.png' },
  { name: 'Belgio', url: 'https://flagcdn.com/w320/be.png' },
  { name: 'Svizzera', url: 'https://flagcdn.com/w320/ch.png' },
  { name: 'Austria', url: 'https://flagcdn.com/w320/at.png' },
  { name: 'Polonia', url: 'https://flagcdn.com/w320/pl.png' },
  { name: 'Svezia', url: 'https://flagcdn.com/w320/se.png' },
  { name: 'Norvegia', url: 'https://flagcdn.com/w320/no.png' },
  { name: 'Danimarca', url: 'https://flagcdn.com/w320/dk.png' },
  { name: 'Finlandia', url: 'https://flagcdn.com/w320/fi.png' },
  { name: 'Irlanda', url: 'https://flagcdn.com/w320/ie.png' },
  { name: 'Turchia', url: 'https://flagcdn.com/w320/tr.png' },
]

// Historical events by year
const YEAR_EVENTS = [
  { year: 1969, event: 'L\'uomo sbarca sulla Luna', wrong: ['Cade il Muro di Berlino', 'Fine della Seconda Guerra Mondiale', 'Primo volo dei fratelli Wright'] },
  { year: 1989, event: 'Cade il Muro di Berlino', wrong: ['L\'uomo sbarca sulla Luna', 'Nascita dell\'Euro', 'Attentato alle Torri Gemelle'] },
  { year: 1945, event: 'Fine della Seconda Guerra Mondiale', wrong: ['Inizio della Prima Guerra Mondiale', 'Scoperta della penicillina', 'Prima trasmissione TV'] },
  { year: 2001, event: 'Attentato alle Torri Gemelle', wrong: ['Cade il Muro di Berlino', 'Nascita di Facebook', 'Primo iPhone'] },
  { year: 1492, event: 'Colombo scopre l\'America', wrong: ['Inizio del Rinascimento', 'Caduta dell\'Impero Romano', 'Invenzione della stampa'] },
  { year: 1789, event: 'Rivoluzione Francese', wrong: ['Dichiarazione d\'Indipendenza USA', 'Congresso di Vienna', 'Napoleone diventa imperatore'] },
  { year: 1914, event: 'Inizio della Prima Guerra Mondiale', wrong: ['Rivoluzione Russa', 'Fine della Seconda Guerra Mondiale', 'Crollo di Wall Street'] },
  { year: 1929, event: 'Crollo di Wall Street', wrong: ['Inizio della Prima Guerra Mondiale', 'Fine della Seconda Guerra Mondiale', 'Nascita dell\'ONU'] },
  { year: 1961, event: 'Primo uomo nello spazio (Gagarin)', wrong: ['L\'uomo sbarca sulla Luna', 'Lancio dello Sputnik', 'Fondazione NASA'] },
  { year: 2007, event: 'Lancio del primo iPhone', wrong: ['Nascita di Facebook', 'Fondazione di Google', 'Lancio di WhatsApp'] },
  { year: 2004, event: 'Nascita di Facebook', wrong: ['Lancio del primo iPhone', 'Nascita di Twitter', 'Fondazione di Amazon'] },
  { year: 1776, event: 'Dichiarazione d\'Indipendenza USA', wrong: ['Rivoluzione Francese', 'Fine della Guerra Civile Americana', 'Fondazione degli USA'] },
  { year: 1969, event: 'Woodstock Festival', wrong: ['Morte di Elvis', 'Nascita dei Beatles', 'Live Aid'] },
  { year: 1990, event: 'Nascita del World Wide Web', wrong: ['Lancio del primo iPhone', 'Fondazione di Google', 'Nascita di Facebook'] },
  { year: 1953, event: 'Scoperta del DNA', wrong: ['Scoperta della penicillina', 'Primo trapianto di cuore', 'Clonazione della pecora Dolly'] },
]

interface GeneratedQuestionWithImage extends GeneratedQuestion {
  image_url?: string
}

// Generate image-based questions
function generateImageQuestions(
  topic: Topic,
  count: number,
  usedHashes: Set<string>
): GeneratedQuestionWithImage[] {
  const questions: GeneratedQuestionWithImage[] = []
  
  if (topic === 'indovina_logo') {
    const shuffledLogos = [...LOGO_DATA].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(count, shuffledLogos.length); i++) {
      const correct = shuffledLogos[i]
      const hash = hashQuestion(`logo_${correct.name}`)
      if (usedHashes.has(hash)) continue
      usedHashes.add(hash)
      
      // Get 3 random wrong answers
      const wrongOptions = shuffledLogos
        .filter(l => l.name !== correct.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(l => l.name)
      
      const options = [correct.name, ...wrongOptions].sort(() => Math.random() - 0.5)
      
      questions.push({
        topic: 'indovina_logo',
        question_text: 'A quale azienda appartiene questo logo?',
        question_type: 'multiple',
        options,
        correct_answer: correct.name,
        image_url: correct.url,
      })
    }
  } else if (topic === 'indovina_bandiera') {
    const shuffledFlags = [...FLAG_DATA].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(count, shuffledFlags.length); i++) {
      const correct = shuffledFlags[i]
      const hash = hashQuestion(`flag_${correct.name}`)
      if (usedHashes.has(hash)) continue
      usedHashes.add(hash)
      
      const wrongOptions = shuffledFlags
        .filter(f => f.name !== correct.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(f => f.name)
      
      const options = [correct.name, ...wrongOptions].sort(() => Math.random() - 0.5)
      
      questions.push({
        topic: 'indovina_bandiera',
        question_text: 'A quale nazione appartiene questa bandiera?',
        question_type: 'multiple',
        options,
        correct_answer: correct.name,
        image_url: correct.url,
      })
    }
  } else if (topic === 'indovina_anno') {
    const shuffledEvents = [...YEAR_EVENTS].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(count, shuffledEvents.length); i++) {
      const event = shuffledEvents[i]
      const hash = hashQuestion(`year_${event.event}`)
      if (usedHashes.has(hash)) continue
      usedHashes.add(hash)
      
      // Generate wrong year options
      const yearOffsets = [-10, -5, 5, 10, -15, 15, -20, 20]
      const wrongYears = yearOffsets
        .map(offset => event.year + offset)
        .filter(y => y > 1400 && y <= 2024)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(y => y.toString())
      
      const options = [event.year.toString(), ...wrongYears].sort(() => Math.random() - 0.5)
      
      questions.push({
        topic: 'indovina_anno',
        question_text: `In che anno e successo: "${event.event}"?`,
        question_type: 'multiple',
        options,
        correct_answer: event.year.toString(),
      })
    }
  }
  
  return questions
}

interface TriviaQuestion {
  category: string
  type: string
  difficulty: string
  question: string
  correct_answer: string
  incorrect_answers: string[]
}

interface GeneratedQuestion {
  topic: string
  question_text: string
  question_type: 'multiple' | 'true_false'
  options: string[]
  correct_answer: string
}

// Decode HTML entities
function decodeHTML(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&agrave;/g, 'à')
    .replace(/&egrave;/g, 'è')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
}

// Generate a simple hash of a question for deduplication
function hashQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
}

// Fetch questions from Open Trivia DB with token for no repeats
async function fetchTriviaQuestions(
  category: number,
  count: number,
  difficulty: Difficulty,
  usedHashes: Set<string>
): Promise<TriviaQuestion[]> {
  const difficultyParam = difficulty === 'difficile' ? 'hard' : 'medium'
  
  // Request more questions than needed to filter out duplicates
  const requestCount = Math.min(count * 2, 50)
  const url = `https://opentdb.com/api.php?amount=${requestCount}&category=${category}&difficulty=${difficultyParam}&type=multiple`
  
  try {
    const response = await fetch(url, { cache: 'no-store' })
    const data = await response.json()
    
    if (data.response_code === 0 && data.results) {
      // Filter out questions we've already used
      const newQuestions = data.results.filter((q: TriviaQuestion) => {
        const hash = hashQuestion(q.question)
        if (usedHashes.has(hash)) return false
        usedHashes.add(hash)
        return true
      })
      return newQuestions.slice(0, count)
    }
    return []
  } catch {
    return []
  }
}

// Translate questions using Groq
async function translateQuestions(questions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> {
  if (questions.length === 0) return []
  
  const prompt = `Traduci le seguenti domande quiz dall'inglese all'italiano. 
Mantieni ESATTAMENTE la stessa struttura JSON. La risposta corretta tradotta deve essere IDENTICA a una delle opzioni tradotte.
Non aggiungere note o commenti, rispondi SOLO con il JSON.

DOMANDE DA TRADURRE:
${JSON.stringify(questions, null, 2)}

RISPONDI SOLO CON L'ARRAY JSON TRADOTTO:`

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
    })

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const translated = JSON.parse(jsonMatch[0])
      // Validate each question has correct_answer in options
      return translated.filter((q: GeneratedQuestion) => 
        q.options && q.correct_answer && q.options.includes(q.correct_answer)
      )
    }
  } catch {
    // If translation fails, return original questions
  }
  
  return questions
}

// Generate AI-only questions (anagrammi, ragionamento_rapido, etc.)
async function generateAIQuestions(
  topics: Topic[],
  count: number,
  difficulty: Difficulty,
  usedHashes: Set<string>,
  seed?: number
): Promise<GeneratedQuestion[]> {
  const topicsList = topics.map(t => TOPIC_LABELS[t] || t).join(', ')
  const difficultyText = difficulty === 'difficile' ? 'difficili e sfidanti' : 'di media difficoltà'
  const randomSeed = seed || Date.now()

  const prompt = `Genera esattamente ${count} domande quiz ORIGINALI e UNICHE in italiano per un gioco a quiz multiplayer.
Usa questo seed per variare le domande: ${randomSeed}

ARGOMENTI: ${topicsList}
DIFFICOLTÀ: ${difficultyText}

REGOLE SPECIFICHE PER ARGOMENTO:
- "ragionamento_rapido": includi calcoli mentali veloci, sequenze logiche o indovinelli (4 opzioni)
- "economia_diritto": domande su economia, finanza o diritto base (4 opzioni)
- "lingue_straniere": domande su traduzioni o grammatica di lingue (4 opzioni)
- "storia": domande su eventi storici, personaggi storici, date importanti
- "geografia": domande su capitali, nazioni, fiumi, montagne, continenti
- "tecnologia": domande su invenzioni, dispositivi, innovazioni tecnologiche
- "informatica": domande su programmazione, hardware, software, internet
- "matematica": domande su formule, teoremi, calcoli, geometria
- "italiano": domande su grammatica italiana, letteratura italiana, autori italiani
- "inglese": domande su grammatica inglese, letteratura inglese, autori inglesi
- "serie_tv": domande su serie TV famose, attori, trame, personaggi
- "religione": domande su religioni del mondo, testi sacri, figure religiose
- "cultura_generale": domande di cultura generale varia
- "cinema": domande su film, registi, attori, premi Oscar
- "libri": domande su libri famosi, autori, letteratura mondiale
- "musica": domande su cantanti, band, canzoni, generi musicali
- "televisione": domande su programmi TV, conduttori, show televisivi
- "giochi_tavolo": domande su giochi da tavolo famosi, regole, strategie
- "cartoni_animati": domande su cartoni animati, anime, personaggi animati
- "scienze_natura": domande su biologia, fisica, chimica, natura
- "sport": domande su sport, atleti, record, competizioni
- "politica": domande su politica, leader mondiali, eventi politici
- "arte": domande su artisti, opere d'arte, movimenti artistici
- "celebrita": domande su personaggi famosi, gossip, vita delle star
- "animali": domande su animali, specie, habitat, comportamenti
- "veicoli": domande su auto, moto, aerei, navi, trasporti

REGOLE GENERALI:
1. Ogni domanda DEVE avere esattamente 4 opzioni DIVERSE tra loro
2. La risposta corretta deve essere ESATTAMENTE uguale a una delle opzioni
3. Le domande devono essere VERIFICABILI e CORRETTE (non inventare fatti)
4. Distribuisci equamente tra gli argomenti richiesti
5. NON ripetere mai la stessa domanda

RISPONDI SOLO CON UN ARRAY JSON VALIDO:
[
  {
    "topic": "nome_argomento",
    "question_text": "testo della domanda",
    "question_type": "multiple",
    "options": ["opzione1", "opzione2", "opzione3", "opzione4"],
    "correct_answer": "risposta corretta esatta"
  }
]`

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    prompt,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from AI')
  }
  
  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0])
  
  // Filter out duplicates
  const uniqueQuestions = questions.filter(q => {
    const hash = hashQuestion(q.question_text)
    if (usedHashes.has(hash)) return false
    usedHashes.add(hash)
    return true
  })
  
  // Validate each question
  return uniqueQuestions.filter(q => 
    q.options && 
    q.correct_answer && 
    q.options.length === 4 &&
    q.options.includes(q.correct_answer)
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topics, count, difficulty, usedQuestionHashes = [] } = body as {
      topics: Topic[]
      count: number
      difficulty: Difficulty
      usedQuestionHashes?: string[]
    }

    if (!topics || !count || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: topics, count, difficulty' },
        { status: 400 }
      )
    }

    // Track used questions to avoid duplicates
    const usedHashes = new Set<string>(usedQuestionHashes)
    
    // Generate a unique seed for this request
    const seed = Date.now() + Math.random() * 1000000

    // Separate topics into categories
    const triviaTopics = topics.filter(t => TRIVIA_CATEGORY_MAP[t] !== undefined)
    const aiTopics = topics.filter(t => AI_ONLY_TOPICS.includes(t))
    const imageTopics = topics.filter(t => IMAGE_TOPICS.includes(t))
    const otherTopics = topics.filter(t => !TRIVIA_CATEGORY_MAP[t] && !AI_ONLY_TOPICS.includes(t) && !IMAGE_TOPICS.includes(t))
    
    // Calculate how many questions per topic
    const questionsPerTopic = Math.ceil(count / topics.length)
    
    const allQuestions: GeneratedQuestion[] = []
    
    // Fetch from Open Trivia DB for supported topics
    for (const topic of triviaTopics) {
      const categoryId = TRIVIA_CATEGORY_MAP[topic]
      if (!categoryId) continue
      
      const triviaQuestions = await fetchTriviaQuestions(categoryId, questionsPerTopic, difficulty, usedHashes)
      
      const formattedQuestions: GeneratedQuestion[] = triviaQuestions.map(q => {
        const options = [...q.incorrect_answers, q.correct_answer]
          .map(decodeHTML)
          .sort(() => Math.random() - 0.5) // Shuffle options
        
        return {
          topic,
          question_text: decodeHTML(q.question),
          question_type: 'multiple' as const,
          options,
          correct_answer: decodeHTML(q.correct_answer),
        }
      })
      
      allQuestions.push(...formattedQuestions)
    }
    
    // Translate trivia questions to Italian
    if (allQuestions.length > 0) {
      const translated = await translateQuestions(allQuestions)
      allQuestions.length = 0
      allQuestions.push(...translated)
    }
    
    // Generate image-based questions
    for (const topic of imageTopics) {
      const imageQuestions = generateImageQuestions(topic, questionsPerTopic, usedHashes)
      allQuestions.push(...imageQuestions)
    }
    
    // Generate AI questions for AI-only topics
    if (aiTopics.length > 0) {
      const aiCount = Math.max(questionsPerTopic * aiTopics.length, 1)
      try {
        const aiQuestions = await generateAIQuestions(aiTopics, aiCount, difficulty, usedHashes, seed)
        allQuestions.push(...aiQuestions)
      } catch (e) {
        console.error('AI question generation failed:', e)
      }
    }
    
    // Generate AI questions for topics not covered by trivia DB
    if (otherTopics.length > 0 || allQuestions.length < count) {
      const topicsToGenerate = otherTopics.length > 0 ? otherTopics : topics
      let remaining = count - allQuestions.length
      let attempts = 0
      
      while (remaining > 0 && attempts < 3) {
        try {
          const fillQuestions = await generateAIQuestions(topicsToGenerate, remaining, difficulty, usedHashes, seed + 1 + attempts)
          allQuestions.push(...fillQuestions)
        } catch (e) {
          console.error(`Fill question generation failed (attempt ${attempts + 1}):`, e)
        }
        remaining = count - allQuestions.length
        attempts++
      }
    }
    
    // If we still don't have enough questions, generate more with AI (fallback)
    if (allQuestions.length < count) {
      let remaining = count - allQuestions.length
      let attempts = 0
      
      while (remaining > 0 && attempts < 3) {
        try {
          const extraQuestions = await generateAIQuestions(topics, remaining, difficulty, usedHashes, seed + 10 + attempts)
          allQuestions.push(...extraQuestions)
        } catch (e) {
          console.error(`Extra question generation failed (attempt ${attempts + 1}):`, e)
        }
        remaining = count - allQuestions.length
        attempts++
      }
    }
    
    // Shuffle and limit to requested count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5)
    const finalQuestions = shuffled.slice(0, count)
    
    // Return questions along with their hashes for future deduplication
    const questionHashes = finalQuestions.map(q => hashQuestion(q.question_text))
    
    return NextResponse.json({
      questions: finalQuestions,
      hashes: questionHashes
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate questions', details: errorMessage },
      { status: 500 }
    )
  }
}
