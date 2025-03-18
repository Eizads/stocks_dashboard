import axios from 'axios'
import { useDateUtils } from 'src/composables/useDateUtils'

const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getClosingPrice = (data) => {
  if (!data || data.length === 0) return null
  const sortedData = [...data].sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
  return parseFloat(sortedData[0].close)
}

const getStockHistory = async (symbol, store) => {
  const {
    getToday,
    getYesterday,
    getDayBeforeYesterday,
    getLastTradingDay,
    marketOpen,
    beforeMarket,
    afterMarket,
  } = useDateUtils()

  const now = new Date()
  let fridayData = []
  let thursdayData = []
  let mondayData = []

  if (now.getDay() === 1) {
    // Case: Today is Monday
    const [mondayResponse, fridayResponse, thursdayResponse] = await Promise.all([
      axios.get(`${baseUrl}/time_series`, {
        params: {
          symbol,
          interval: '1min',
          start_date: `${getToday()} 09:30:00`,
          end_date: `${getToday()} 16:00:00`,
          apikey: apiKey,
        },
      }),
      axios.get(`${baseUrl}/time_series`, {
        params: {
          symbol,
          interval: '1min',
          start_date: `${getLastTradingDay()} 09:30:00`,
          end_date: `${getLastTradingDay()} 16:00:00`,
          apikey: apiKey,
        },
      }),
      axios.get(`${baseUrl}/time_series`, {
        params: {
          symbol,
          interval: '1min',
          start_date: `${getDayBeforeYesterday()} 09:30:00`,
          end_date: `${getDayBeforeYesterday()} 16:00:00`,
          apikey: apiKey,
        },
      }),
    ])

    mondayData = mondayResponse.data?.values || []
    fridayData = fridayResponse.data?.values || []
    thursdayData = thursdayResponse.data?.values || []

    if (afterMarket()) {
      const mondayClose = getClosingPrice(mondayData)
      if (mondayClose) store.setClosingPrice(mondayClose)
    } else if (beforeMarket() || marketOpen()) {
      const fridayClose = getClosingPrice(fridayData)
      if (fridayClose) store.setClosingPrice(fridayClose)

      if (beforeMarket()) {
        const thursdayClose = getClosingPrice(thursdayData)
        if (thursdayClose) store.setPreviousClosingPrice(thursdayClose)
      }
    }

    return [...mondayData, ...fridayData, ...thursdayData]
  } else if (now.getDay() === 0 || now.getDay() === 6) {
    // Case: Weekend
    const lastTradingDay = getLastTradingDay()
    const dayBeforeLastTradingDay = getDayBeforeYesterday()
    const twoDaysBeforeLastTradingDay = new Date(dayBeforeLastTradingDay)
    twoDaysBeforeLastTradingDay.setDate(twoDaysBeforeLastTradingDay.getDate() - 1)
    const twoDaysBeforeLastTradingDayStr = new Intl.DateTimeFormat('en-CA').format(
      twoDaysBeforeLastTradingDay,
    )

    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${twoDaysBeforeLastTradingDayStr} 09:30:00`,
        end_date: `${lastTradingDay} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (response.data?.values) {
      const lastClose = getClosingPrice(response.data.values)
      if (lastClose) store.setClosingPrice(lastClose)
    }

    return response.data?.values || []
  } else {
    // Normal case: Regular trading day
    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${getDayBeforeYesterday()} 09:30:00`,
        end_date: `${getToday()} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (response.data?.values) {
      const data = response.data.values
      const yesterdayData = data.filter((entry) => entry.datetime.startsWith(getYesterday()))
      const dayBeforeData = data.filter((entry) =>
        entry.datetime.startsWith(getDayBeforeYesterday()),
      )
      const todayData = data.filter((entry) => entry.datetime.startsWith(getToday()))

      if (beforeMarket()) {
        const yesterdayClose = getClosingPrice(yesterdayData)
        const dayBeforeClose = getClosingPrice(dayBeforeData)
        if (yesterdayClose) store.setClosingPrice(yesterdayClose)
        if (dayBeforeClose) store.setPreviousClosingPrice(dayBeforeClose)
      } else if (marketOpen()) {
        const yesterdayClose = getClosingPrice(yesterdayData)
        if (yesterdayClose) store.setClosingPrice(yesterdayClose)
      } else if (afterMarket()) {
        const todayClose = getClosingPrice(todayData)
        if (todayClose) store.setClosingPrice(todayClose)
      }
    }

    return response.data?.values || []
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
  connectWebSocket,
  getStockHistory,
  disconnectWebSocket,
}
