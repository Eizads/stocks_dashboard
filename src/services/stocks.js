import axios from 'axios'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'

const { getToday, getYesterday, getLastTradingDay, isWeekday } = useDateUtils()
let startDate, endDate
const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true // ✅ Track whether reconnection is allowed
const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getStockHistory = (symbol) => {
  const now = new Date()
  if (isWeekday(now)) {
    startDate = `${getYesterday()} 09:30:00`
    endDate = `${getToday()} 16:00:00`
  } else {
    startDate = `${getLastTradingDay()} 09:30:00`
    endDate = `${getLastTradingDay()} 16:00:00`
  }
  return axios.get(`${baseUrl}/time_series`, {
    params: {
      symbol,
      interval: '1min', // ✅ Fetch 1-minute interval prices
      start_date: startDate, // ✅ Fetch from 9 AM (Market Open)
      end_date: endDate, // ✅ Fetch until now
      apikey: apiKey,
    },
  })
}

//websocket function for live updates
const connectWebSocket = (symbol, onMessageCallback) => {
  const store = useStockStore()
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
    store.addLiveData(data)
    console.log('data from websocket ', data)
    if (data.price) {
      onMessageCallback(
        data.price,
        // data.timestamp,
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
const disconnectWebSocket = () => {
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
