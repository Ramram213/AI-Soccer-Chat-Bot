'use client'

import { Box, Button, Stack, TextField } from '@mui/material'
import { useState, useEffect, useRef } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your one stop shop for soccer. How can I help you today?",
    },
  ])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const updateLastAssistantMessage = (newContent) => {
    setMessages((messages) => {
      if (!messages.length) return messages
      const updated = [...messages]
      const lastIndex = updated.length - 1

      if (updated[lastIndex]?.role === 'assistant') {
        updated[lastIndex] = { ...updated[lastIndex], content: newContent }
        return updated
      }

      return [...updated, { role: 'assistant', content: newContent }]
    })
  }

  const sendMessage = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isLoading) return;
    setIsLoading(true)

    setMessage('')
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: trimmedMessage },
      { role: 'assistant', content: '' },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: trimmedMessage }]),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const errorMessage = errorBody?.error || 'Network response was not ok'
        updateLastAssistantMessage(errorMessage)
        return
      }

      if (!response.body) {
        updateLastAssistantMessage('Streaming is not supported in this browser.')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let receivedText = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (text) {
          receivedText = true
        }
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          if (lastMessage?.role !== 'assistant') return messages
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ]
        })
      }

      if (!receivedText) {
        updateLastAssistantMessage("I'm sorry, I couldn't generate a response. Please try again.")
      }
    } catch (error) {
      console.error('Error:', error)
      updateLastAssistantMessage("I'm sorry, but I encountered an error. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
      <Box
          width="100vw"
          height="100vh"
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
      >
        <Stack
            direction={'column'}
            width="500px"
            height="700px"
            border="1px solid black"
            p={2}
            spacing={3}
        >
          <Stack
              direction={'column'}
              spacing={2}
              flexGrow={1}
              overflow="auto"
              maxHeight="100%"
          >
            {messages.map((message, index) => (
                <Box
                    key={index}
                    display="flex"
                    justifyContent={
                      message.role === 'assistant' ? 'flex-start' : 'flex-end'
                    }
                >
                  <Box
                      bgcolor={
                        message.role === 'assistant'
                            ? 'primary.main'
                            : 'secondary.main'
                      }
                      color="white"
                      borderRadius={16}
                      p={3}
                  >
                    {message.content}
                  </Box>
                </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
          <Stack direction={'row'} spacing={2}>
            <TextField
                label="Message"
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
            />
            <Button
                variant="contained"
                onClick={sendMessage}
                disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </Stack>
        </Stack>
      </Box>
  )
}
