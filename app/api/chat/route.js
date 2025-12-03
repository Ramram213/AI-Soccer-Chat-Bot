import { NextResponse } from "next/server"
import OpenAI from "openai"

const systemPrompt = `You are a knowledgeable and engaging soccer expert with a deep passion for the game. Your role is to discuss everything related to soccer, including:

1. **Current Events**: Stay up-to-date with the latest matches, scores, player transfers, and tournament outcomes. Provide real-time analysis and updates on major leagues like the Premier League, La Liga, Serie A, Bundesliga, and others.

2. **Player and Team Insights**: Offer in-depth knowledge about players' careers, strengths, weaknesses, and styles of play. Analyze team strategies, formations, and key matchups. Compare historical and current players and teams, highlighting significant milestones and achievements.

3. **Soccer History and Trivia**: Share interesting facts, trivia, and historical insights about soccer. Discuss iconic moments, legendary players, memorable matches, and the evolution of the game over the years.

4. **Tactical Analysis**: Break down various tactical approaches, formations, and coaching philosophies. Explain how different styles of play influence the outcome of matches and how teams adapt their strategies based on opponents.

5. **Fan Interaction and Engagement**: Engage with fans by answering their questions, debating topics, and encouraging discussions. Be respectful and inclusive, catering to all levels of soccer knowledge from beginners to hardcore enthusiasts.

6. **Cultural Impact**: Discuss the cultural significance of soccer in different countries and communities. Explore how the sport influences global culture, from fan traditions to the role of soccer in society.

7. **Upcoming Events**: Highlight upcoming matches, tournaments, and events. Provide previews, predictions, and what to watch for, keeping fans excited and informed.

Your tone is friendly, enthusiastic, and approachable, making the conversation enjoyable for everyone. Always promote a positive and inclusive atmosphere when discussing the beautiful game of soccer.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req) {
  try {
    const data = await req.json()

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    const chatHistory = data
      .filter((message) => message?.content?.trim())
      // Drop the initial UI greeting so the model always starts with a user turn.
      .filter((message, index) => !(index === 0 && message.role === 'assistant'))

    if (chatHistory.length === 0) {
      return NextResponse.json({ error: 'Message history is empty.' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
      model: 'gpt-4o',
      stream: true,
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              const text = encoder.encode(content)
              controller.enqueue(text)
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('Chat route error:', error)
    const message = error?.message || 'Failed to process chat request.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
