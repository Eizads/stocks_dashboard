import axios from 'axios'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'

const {
  getToday,
  getYesterday,
  getDayBeforeYesterday,
  getLastTradingDay,
  marketOpen,
  beforeMarket,
  afterMarket,
} = useDateUtils()
const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true // Track whether reconnection is allowed

const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

const getClosingPrice = (data) => {
  if (!data || data.length === 0) return null
  // Find the last price of the day (3:59 PM)
  // Sort data by datetime to ensure we get the latest entry
  const sortedData = [...data].sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
  // Get the first (latest) entry which should be 3:59 PM
  return parseFloat(sortedData[0].close)
}

const getStockHistory = async (symbol) => {
  const now = new Date()
  let fridayData = []
  let thursdayData = []
  let mondayData = []
  const store = useStockStore()

  if (now.getDay() === 1) {
    // Case: Today is Monday
    console.log('📡 Fetching Monday data...')
    const mondayResponse = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${getToday()} 09:30:00`,
        end_date: `${getToday()} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (mondayResponse.data.values) {
      mondayData = mondayResponse.data.values
      console.log('monday history data', mondayData)

      // If after hours on Monday, use Monday's closing price
      if (afterMarket()) {
        const mondayClose = getClosingPrice(mondayData)
        if (mondayClose) store.setClosingPrice(mondayClose)
      }
    }

    // Get Friday's data
    console.log('📡 Fetching Friday data...')
    const fridayResponse = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${getLastTradingDay()} 09:30:00`,
        end_date: `${getLastTradingDay()} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (fridayResponse.data.values) {
      fridayData = fridayResponse.data.values
      console.log('friday history data', fridayData)

      // If before market or during market hours on Monday, use Friday's closing price
      if (beforeMarket() || marketOpen()) {
        const fridayClose = getClosingPrice(fridayData)
        if (fridayClose) store.setClosingPrice(fridayClose)
      }
    }

    // Get Thursday's data
    console.log('📡 Fetching Thursday data...')
    const thursdayResponse = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${getDayBeforeYesterday()} 09:30:00`,
        end_date: `${getDayBeforeYesterday()} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (thursdayResponse.data.values) {
      thursdayData = thursdayResponse.data.values
      console.log('thursday history data', thursdayData)

      // If before market on Monday, use Thursday's closing price for calculations
      if (beforeMarket()) {
        const thursdayClose = getClosingPrice(thursdayData)
        if (thursdayClose) store.setPreviousClosingPrice(thursdayClose)
      }
    }

    const combinedData = [...mondayData, ...fridayData, ...thursdayData]
    console.log('combined history data', combinedData)
    return combinedData
  } else if (now.getDay() === 0 || now.getDay() === 6) {
    // Case: Weekend, fetch last three trading days
    const lastTradingDay = getLastTradingDay()
    const dayBeforeLastTradingDay = getDayBeforeYesterday()
    const twoDaysBeforeLastTradingDay = new Date(dayBeforeLastTradingDay)
    twoDaysBeforeLastTradingDay.setDate(twoDaysBeforeLastTradingDay.getDate() - 1)
    const twoDaysBeforeLastTradingDayStr = new Intl.DateTimeFormat('en-CA').format(
      twoDaysBeforeLastTradingDay,
    )

    console.log('📡 Fetching last three trading days data...')
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
    // Normal case: Fetch today, yesterday, and day before yesterday data
    console.log('📡 Fetching regular stock history...')
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

      if (beforeMarket()) {
        // Before market: Use yesterday's data and day before yesterday's closing price
        const yesterdayData = data.filter((entry) => entry.datetime.startsWith(getYesterday()))
        const dayBeforeData = data.filter((entry) =>
          entry.datetime.startsWith(getDayBeforeYesterday()),
        )

        const yesterdayClose = getClosingPrice(yesterdayData)
        const dayBeforeClose = getClosingPrice(dayBeforeData)

        if (yesterdayClose) store.setClosingPrice(yesterdayClose)
        if (dayBeforeClose) store.setPreviousClosingPrice(dayBeforeClose)
      } else if (marketOpen()) {
        // During market: Use yesterday's closing price
        const yesterdayData = data.filter((entry) => entry.datetime.startsWith(getYesterday()))
        const yesterdayClose = getClosingPrice(yesterdayData)
        if (yesterdayClose) store.setClosingPrice(yesterdayClose)
      } else if (afterMarket()) {
        // After market: Use today's closing price
        const todayData = data.filter((entry) => entry.datetime.startsWith(getToday()))
        const todayClose = getClosingPrice(todayData)
        if (todayClose) store.setClosingPrice(todayClose)
      }
    }

    return response.data?.values || []
  }
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
