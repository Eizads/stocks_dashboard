import axios from 'axios'

const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true // ✅ Track whether reconnection is allowed

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getStockHistory = (symbol) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0] // Format as YYYY-MM-DD

  return axios.get(`${baseUrl}/time_series`, {
    params: {
      symbol,
      interval: '5min', // ✅ Fetch 5-minute interval prices
      start_date: `${today} 09:30:00`, // ✅ Fetch from 9 AM (Market Open)
      end_date: now.toISOString(), // ✅ Fetch until now
      apikey: apiKey,
    },
  })
}

//websocket function for live updates
const connectWebSocket = (symbol, onMessageCallback) => {
  if (socket) {
    console.log('🛑 Closing existing WebSocket before opening a new one...')
    socket.close()
  }
  socket = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`)
  socket.onopen = () => {
    console.log('web socket connected')
    socket.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbol } }))
  }
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('data from websocket ', data)
    if (data.price) {
      onMessageCallback(
        data.price,
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      )
    }
  }
  socket.onerror = (error) => {
    console.error('Websocket Error', error)
  }
  socket.onclose = () => {
    console.warn('Websocket disconnected')
    if (shouldReconnect) {
      console.log('Reconnecting WebSocket in 5 seconds...')
      setTimeout(() => connectWebSocket(symbol, onMessageCallback), 5000)
    }
  }
  return socket
}
export function disconnectWebSocket() {
  shouldReconnect = false
  if (socket) {
    console.log('🛑 Unsubscribing and Closing WebSocket...')
    socket.close()
    socket = null // Clear the WebSocket instance
  }
}
export default {
  getStocksList,
  connectWebSocket,
  getStockHistory,
  disconnectWebSocket,
}
