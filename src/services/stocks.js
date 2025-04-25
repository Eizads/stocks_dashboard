import axios from 'axios'
// import { useDateUtils } from 'src/composables/useDateUtils'

const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getStockQuote = async (symbol) => {
  try {
    const response = await axios.get(`${baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`)
    console.log('stock quote response', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching stock quote:', error)
    if (error.response) {
      console.error('❌ API Error response:', error.response.data)
    }
    return null
  }
}

const getLatestTradingDay = async (symbol) => {
  try {
    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        outputsize: 1170,
        timezone: 'America/New_York',
        apikey: apiKey,
      },
    })

    const data = response.data?.values || []
    console.log('Raw data received:', data.length, 'entries')
    console.log('raw data', data)

    if (data.length === 0) {
      return []
    }

    // Get the most recent date from the data
    const latestDate = data[0].datetime.split(' ')[0] // Split on space to get just the date part
    console.log('latest date', latestDate)

    const filteredData = data.filter((item) => {
      const itemDate = item.datetime.split(' ')[0] // Split on space to get just the date part
      return itemDate === latestDate
    })

    console.log('filtered latest day data only', filteredData)
    return filteredData
  } catch (error) {
    console.error('❌ Error fetching intraday data:', error)
    return []
  }
}
const getMarketStatus = async (exchange) => {
  try {
    const response = await axios.get(
      `${baseUrl}/market_state?exchange=${exchange}&apikey=${apiKey}`,
    )
    console.log('market status response data:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Error fetching market status:', error)
    if (error.response) {
      console.error('❌ API Error response:', error.response.data)
    }
    return null
  }
}
const connectWebSocket = (symbol, onMessageCallback, store) => {
  if (!store) {
    console.error('❌ Store instance is required for WebSocket connection')
    return null
  }

  const handleWebSocketOpen = () => {
    console.log('🔌 WebSocket connected')
    socket?.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbol } }))
  }

  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (!data.price) {
        console.warn('⚠️ Received WebSocket message without price data')
        return
      }

      // Ensure store is available
      if (!store) {
        console.error('❌ Store instance not available for handling WebSocket message')
        return
      }

      store.addLiveData(data)
      onMessageCallback(
        data.price,
        new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      )
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error)
    }
  }

  const handleWebSocketError = (error) => {
    console.error('❌ WebSocket Error:', error)
  }

  const handleWebSocketClose = () => {
    console.warn('🔌 WebSocket disconnected')
    if (shouldReconnect) {
      console.log('🔄 Reconnecting WebSocket in 5 seconds...')
      setTimeout(() => connectWebSocket(symbol, onMessageCallback, store), 5000)
    }
  }

  try {
    if (socket) {
      console.log('🔄 Closing existing WebSocket connection...')
      socket.close()
    }

    socket = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`)
    socket.onopen = handleWebSocketOpen
    socket.onmessage = handleWebSocketMessage
    socket.onerror = handleWebSocketError
    socket.onclose = handleWebSocketClose

    return socket
  } catch (error) {
    console.error('❌ Error creating WebSocket connection:', error)
    return null
  }
}

const disconnectWebSocket = () => {
  shouldReconnect = false
  if (socket) {
    console.log('🔌 Closing WebSocket connection...')
    socket.close()
    socket = null
  }
}

export default {
  getStocksList,
  getStockQuote,
  getLatestTradingDay,
  connectWebSocket,
  disconnectWebSocket,
  getMarketStatus,
}
