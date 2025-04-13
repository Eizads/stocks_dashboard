import axios from 'axios'
import { useDateUtils } from 'src/composables/useDateUtils'

const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getStockQuote = (symbol) => {
  return axios.get(`${baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`)
}
const getStockInteraday = async (symbol) => {
  try {
    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '5min',
        outputsize: '234',
        apikey: apiKey,
      },
    })

    const data = response.data?.values || []

    // Group data by dates
    const groupedData = data.reduce((acc, entry) => {
      const date = entry.datetime.split(' ')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(entry)
      return acc
    }, {})

    // Sort dates in descending order
    const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a))

    // Get the three most recent dates
    const [mostRecent, secondMostRecent, thirdMostRecent] = sortedDates

    console.log('📅 Dates in response:', {
      mostRecent,
      secondMostRecent,
      thirdMostRecent,
      totalDates: sortedDates.length,
    })

    console.log('todayData', groupedData[mostRecent])
    console.log('yesterdayData', groupedData[secondMostRecent])
    console.log('dayBeforeYesterdayData', groupedData[thirdMostRecent])
    // Return data organized by relative days
    return {
      todayData: groupedData[mostRecent] || [],
      yesterdayData: groupedData[secondMostRecent] || [],
      dayBeforeYesterdayData: groupedData[thirdMostRecent] || [],
      dates: {
        today: mostRecent,
        yesterday: secondMostRecent,
        dayBeforeYesterday: thirdMostRecent,
      },
      allData: data,
    }
  } catch (error) {
    console.error('❌ Error fetching intraday data:', error)
    return {
      todayData: [],
      yesterdayData: [],
      dayBeforeYesterdayData: [],
      dates: {
        today: null,
        yesterday: null,
        dayBeforeYesterday: null,
      },
      allData: [],
    }
  }
}

const getClosingPrice = (data) => {
  if (!data || data.length === 0) return null
  const sortedData = [...data].sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
  return parseFloat(sortedData[0].close)
}

const getStockHistory = async (symbol, store) => {
  const {
    getToday,
    getLastTradingDay,
    getDayBeforeYesterday,
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
    console.log('📅 Monday case - Dates:', {
      today: getToday(),
      lastTradingDay: getLastTradingDay(),
      dayBeforeYesterday: getDayBeforeYesterday(),
      currentTime: now.toLocaleTimeString(),
    })

    // Using new getStockInteraday function instead of multiple API calls
    const stockData = await getStockInteraday(symbol)

    console.log('📊 API Responses:', {
      mondayData: stockData.todayData,
      fridayData: stockData.yesterdayData,
      thursdayData: stockData.dayBeforeYesterdayData,
    })

    mondayData = stockData.todayData || []
    fridayData = stockData.yesterdayData || []
    thursdayData = stockData.dayBeforeYesterdayData || []

    console.log('marketOpen', marketOpen())
    console.log('beforeMarket', beforeMarket())
    console.log('afterMarket', afterMarket())

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

    // Return only today's data (Monday) and yesterday's data (Friday)
    return {
      todayData: mondayData,
      yesterdayData: fridayData,
    }
  } else if (now.getDay() === 0 || now.getDay() === 6) {
    // Case: Weekend
    const lastTradingDay = getLastTradingDay()
    // Parse the date string correctly by adding time component
    const lastTradingDayDate = new Date(`${lastTradingDay}T00:00:00`)
    const dayBeforeLastTradingDayDate = new Date(lastTradingDayDate)
    dayBeforeLastTradingDayDate.setDate(lastTradingDayDate.getDate() - 1)
    const dayBeforeLastTradingDay = new Intl.DateTimeFormat('en-CA').format(
      dayBeforeLastTradingDayDate,
    )

    // Calculate two days before by subtracting 1 from dayBeforeLastTradingDayDate
    const twoDaysBeforeLastTradingDay = new Date(dayBeforeLastTradingDayDate)
    twoDaysBeforeLastTradingDay.setDate(twoDaysBeforeLastTradingDay.getDate() - 1)
    const twoDaysBeforeLastTradingDayStr = new Intl.DateTimeFormat('en-CA').format(
      twoDaysBeforeLastTradingDay,
    )

    console.log('📅 Weekend case - Dates:', {
      lastTradingDay,
      dayBeforeLastTradingDay,
      twoDaysBeforeLastTradingDayStr,
    })

    // Using new getStockInteraday function instead of direct API call
    const stockData = await getStockInteraday(symbol)

    if (stockData.allData) {
      console.log('📊 Total data points received:', stockData.allData.length)

      const lastTradingDayData = stockData.todayData
      const dayBeforeData = stockData.yesterdayData

      console.log('📊 Filtered data points:', {
        lastTradingDay: lastTradingDayData.length,
        dayBefore: dayBeforeData.length,
      })

      const lastClose = getClosingPrice(lastTradingDayData)
      const dayBeforeClose = getClosingPrice(dayBeforeData)

      console.log('💰 Closing prices:', {
        lastClose,
        dayBeforeClose,
      })

      if (lastClose) {
        store.setClosingPrice(lastClose)
        console.log('✅ Set closing price:', lastClose)
      }
      if (dayBeforeClose) {
        store.setPreviousClosingPrice(dayBeforeClose)
        console.log('✅ Set previous closing price:', dayBeforeClose)
      }
    }

    return stockData.allData || []
  } else {
    // Normal case: Regular trading day
    // Using new getStockInteraday function instead of direct API call
    const stockData = await getStockInteraday(symbol)

    if (stockData.allData) {
      const yesterdayData = stockData.yesterdayData
      const dayBeforeData = stockData.dayBeforeYesterdayData
      const todayData = stockData.todayData

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

    return stockData.allData || []
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
  connectWebSocket,
  getStockHistory,
  disconnectWebSocket,
  getStockInteraday,
}
