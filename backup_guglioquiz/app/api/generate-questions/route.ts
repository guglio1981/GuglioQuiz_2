import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { TOPIC_LABELS, type Topic, type Difficulty } from '@/lib/types'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

interface GeneratedQuestion {
  topic: string
  question_text: string
  question_type: 'multiple' | 'true_false'
  options: string[]
  correct_answer: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topics, count, difficulty } = body as {
      topics: Topic[]
      count: number
      difficulty: Difficulty
    }

    if (!topics || !count || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: topics, count, difficulty' },
        { status: 400 }
      )
    }

    const topicsList = topics.map(t => TOPIC_LABELS[t] || t).join(', ')
    const difficultyText = difficulty === 'difficile' ? 'difficili e sfidanti' : 'di media difficoltà'

    const prompt = `Genera esattamente ${count} domande quiz in italiano per un gioco a quiz multiplayer.

ARGOMENTI: ${topicsList}
DIFFICOLTÀ: ${difficultyText}

REGOLE:
1. Le domande devono essere ${difficultyText}
2. Ogni domanda può essere:
   - A risposta multipla (4 opzioni, una sola corretta)
   - Vero/Falso (2 opzioni: "Vero" e "Falso")
3. Distribuisci equamente le domande tra gli argomenti
4. Per "anagrammi": fornisci una parola anagrammata e chiedi quale sia la parola originale
5. Per "ragionamento_rapido": includi calcoli mentali, sequenze logiche o indovinelli
6. Per "avvenimenti_storici": chiedi in quale anno è avvenuto un evento specifico (4 opzioni anno)
7. Le domande devono essere varie e interessanti
8. La risposta corretta deve essere ESATTAMENTE uguale a una delle opzioni

RISPONDI SOLO CON UN ARRAY JSON VALIDO, senza altro testo prima o dopo:
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

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI')
    }
    
    const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions in response')
    }
    
    return NextResponse.json(questions)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate questions', details: errorMessage },
      { status: 500 }
    )
  }
}
