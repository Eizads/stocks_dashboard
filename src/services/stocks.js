import axios from 'axios'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'

const { getToday, getYesterday, getLastTradingDay } = useDateUtils()
// let startDate, endDate
const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
const baseUrl = 'https://api.twelvedata.com'
let socket = null
let shouldReconnect = true // Track whether reconnection is allowed
const getStocksList = () => {
  return axios.get(`${baseUrl}/stocks`)
}

// const getStockHistory = (symbol) => {
//   const now = new Date()
//   const yesterday = new Date()
//   yesterday.setDate(yesterday.getDate() - 1) // ✅ Convert `getYesterday()` to a Date object
//   console.log('checking weekday', !isWeekday(yesterday))
//   console.log('last tradung day', getLastTradingDay())

//   if (isWeekday(now) && isWeekday(yesterday)) {
//     startDate = `${getYesterday()} 09:30:00`
//     endDate = `${getToday()} 16:00:00`
//   } else if (isWeekday(now) && !isWeekday(yesterday)) {
//     startDate = `${getLastTradingDay()} 09:30:00`
//     endDate = `${getLastTradingDay()} 16:00:00`
//   } else {
//     startDate = `${getLastTradingDay()} 09:30:00`
//     endDate = `${getLastTradingDay()} 16:00:00`
//   }
//   return axios.get(`${baseUrl}/time_series`, {
//     params: {
//       symbol,
//       interval: '1min', // Fetch 1-minute interval prices
//       start_date: startDate, // Fetch from 9 AM (Market Open)
//       end_date: endDate, // Fetch until now
//       apikey: apiKey,
//     },
//   })
// }
const getStockHistory = async (symbol) => {
  const now = new Date()
  let startDate, endDate
  let fridayData = []
  let mondayData = []

  if (now.getDay() === 1) {
    // ✅ Case: Today is Monday, fetch both Friday & Monday separately
    console.log('📡 Fetching Monday data...')
    const mondayResponse = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: `${getToday()} 09:30:00`, // ✅ Fetch Monday's data
        end_date: `${getToday()} 16:00:00`,
        apikey: apiKey,
      },
    })

    if (mondayResponse.data.values) {
      mondayData = mondayResponse.data.values
      console.log('monday history data', mondayData)
    }

    startDate = `${getLastTradingDay()} 09:30:00` // ✅ Get Friday's data
    endDate = `${getLastTradingDay()} 16:00:00` // ✅ Fetch until Friday close

    console.log('📡 Fetching Friday data...')
    const fridayResponse = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: startDate,
        end_date: endDate,
        apikey: apiKey,
      },
    })

    if (fridayResponse.data.values) {
      fridayData = fridayResponse.data.values
      console.log('friday history data', fridayData)
    }

    console.log('combined history data', [...mondayData, ...fridayData])
    const combinedData = [...mondayData, ...fridayData] // ✅ Combine both datasets
    return combinedData || []
  } else if (now.getDay() === 0 || now.getDay() === 6) {
    // ✅ Normal case: Fetch last trading day data
    startDate = `${getLastTradingDay()} 09:30:00`
    endDate = `${getLastTradingDay()} 16:00:00`

    console.log('📡 Fetching last trading day stock history...')
    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: startDate,
        end_date: endDate,
        apikey: apiKey,
      },
    })

    return response.data?.values || []
  } else {
    // ✅ Normal case: Fetch yesterday & today data
    startDate = `${getYesterday()} 09:30:00`
    endDate = `${getToday()} 16:00:00`

    console.log('📡 Fetching regular stock history...')
    const response = await axios.get(`${baseUrl}/time_series`, {
      params: {
        symbol,
        interval: '1min',
        start_date: startDate,
        end_date: endDate,
        apikey: apiKey,
      },
    })

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
