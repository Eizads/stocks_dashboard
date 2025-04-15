import { defineStore } from 'pinia'
import stocksService from 'src/services/stocks'
import { LocalStorage } from 'quasar'
import LZString from 'lz-string'

const STORAGE_KEYS = {
  STOCKS_LIST: 'stocksList',
  WATCH_LIST: 'watchList',
  SELECTED_STOCK: 'selectedStock',
  CLOSING_PRICE: 'closingPrice',
  PREVIOUS_CLOSING_PRICE: 'previousClosingPrice',
  MODAL_VIEWED: 'modalViewed',
}

const MAX_LIVE_DATA_POINTS = 10

export const useStockStore = defineStore('stockStore', {
  state: () => {
    const storedStocks = LocalStorage.getItem(STORAGE_KEYS.STOCKS_LIST)
    let parsedStocks = []

    if (storedStocks) {
      try {
        const decompressed = LZString.decompress(storedStocks)
        parsedStocks = decompressed ? JSON.parse(decompressed) : []
      } catch (error) {
        console.error('❌ Error parsing stocks from LocalStorage:', error)
        parsedStocks = []
      }
    }

    return {
      stocksList: parsedStocks,
      stockHistoryYesterday: [],
      stockHistoryToday: [],
      stockHistoryDayBefore: [],
      watchList: LocalStorage.getItem(STORAGE_KEYS.WATCH_LIST) || [],
      liveData: [],
      selectedStock: LocalStorage.getItem(STORAGE_KEYS.SELECTED_STOCK) || null,
      closingPrice: LocalStorage.getItem(STORAGE_KEYS.CLOSING_PRICE) || null,
      previousClosingPrice: LocalStorage.getItem(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE) || null,
      modalViewed: LocalStorage.getItem(STORAGE_KEYS.MODAL_VIEWED) || false,
      webSocket: null,
      lastQuote: null,
    }
  },

  getters: {
    latestStockPrice: (state) => {
      return state.liveData.length > 0 ? state.liveData[state.liveData.length - 1].price : ''
    },
    latestStockTime: (state) => {
      if (state.liveData.length === 0) return null

      const time = state.liveData[state.liveData.length - 1].timestamp * 1000
      return new Date(time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      })
    },
    effectiveClosingPrice: (state) => {
      // If we have live data, use the latest price
      if (state.liveData.length > 0) {
        return state.liveData[state.liveData.length - 1].price
      }
      // If we have today's historical data, use the last price
      if (state.stockHistoryToday.length > 0) {
        return state.stockHistoryToday[state.stockHistoryToday.length - 1].y
      }
      // Fall back to quote close or stored closing price
      return state.lastQuote?.close || state.closingPrice
    },
    effectivePreviousClosingPrice: (state) => {
      // If we have yesterday's data, use the last price
      if (state.stockHistoryYesterday.length > 0) {
        return state.stockHistoryYesterday[state.stockHistoryYesterday.length - 1].y
      }
      // Fall back to quote previous close or stored previous closing price
      return state.lastQuote?.previousClose || state.previousClosingPrice
    },
  },

  actions: {
    // Stock Selection and Price Actions
    setSelectedStock(stock) {
      this.selectedStock = { ...stock }
      LocalStorage.set(STORAGE_KEYS.SELECTED_STOCK, this.selectedStock)
    },

    setClosingPrice(price) {
      this.closingPrice = price
      LocalStorage.set(STORAGE_KEYS.CLOSING_PRICE, price)
    },

    setPreviousClosingPrice(price) {
      this.previousClosingPrice = price
      LocalStorage.set(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE, price)
    },

    // WebSocket Actions
    connectToWebSocket(symbol, onMessageCallback) {
      try {
        // Disconnect existing connection if any
        this.disconnectWebSocket()

        // Create new connection
        this.webSocket = stocksService.connectWebSocket(symbol, onMessageCallback, this)

        if (!this.webSocket) {
          console.error('❌ Failed to establish WebSocket connection')
        }
      } catch (error) {
        console.error('❌ Error connecting to WebSocket:', error)
      }
    },

    disconnectWebSocket() {
      if (this.webSocket) {
        stocksService.disconnectWebSocket()
        this.webSocket = null
        this.liveData = []
      }
    },

    // Live Data Actions
    addLiveData(newData) {
      if (!newData?.price || this.liveData.some((p) => p.price === newData.price)) {
        return
      }

      this.liveData.push(newData)
      if (this.liveData.length > MAX_LIVE_DATA_POINTS) {
        this.liveData.shift()
      }
    },

    // Data Fetching Actions
    async fetchStockList() {
      if (this.stocksList.length > 0) {
        console.log('✅ Using cached stocks from LocalStorage')
        return
      }

      try {
        console.log('🔄 Fetching stock data from API...')
        const response = await stocksService.getStocksList()
        this.stocksList = response.data?.data ?? []

        LocalStorage.set(
          STORAGE_KEYS.STOCKS_LIST,
          LZString.compress(JSON.stringify(this.stocksList)),
        )
        return response.data
      } catch (error) {
        console.error('❌ Error fetching stocks:', error)
        this.stocksList = []
      }
    },

    async getStockQuote(symbol) {
      try {
        const response = await stocksService.getStockQuote(symbol)
        this.lastQuote = response.data
        return response.data
      } catch (error) {
        console.error('❌ Error fetching stock quote:', error)
        return null
      }
    },

    async fetchStockInteraday(symbol) {
      try {
        const response = await stocksService.getStockInteraday(symbol)

        // Store the data directly since it's already formatted in the service
        this.stockHistoryToday = response.todayData || []
        this.stockHistoryYesterday = response.yesterdayData || []
        this.stockHistoryDayBefore = response.dayBeforeYesterdayData || []

        console.log('📊 Intraday Data Stats:', {
          today: `${this.stockHistoryToday.length} entries`,
          yesterday: `${this.stockHistoryYesterday.length} entries`,
          dayBefore: `${this.stockHistoryDayBefore.length} entries`,
        })

        return {
          todayData: this.stockHistoryToday,
          yesterdayData: this.stockHistoryYesterday,
          dayBeforeYesterdayData: this.stockHistoryDayBefore,
          dates: response.dates,
        }
      } catch (error) {
        console.error('❌ Error fetching intraday data:', error)
        return {
          todayData: [],
          yesterdayData: [],
          dayBeforeYesterdayData: [],
          dates: null,
        }
      }
    },

    // Watchlist Actions
    addToWatchList(stock) {
      if (this.isInWatchList(stock)) return

      this.watchList.push(stock)
      LocalStorage.set(STORAGE_KEYS.WATCH_LIST, this.watchList)
      console.log('📋 WatchList Updated:', this.watchList)
    },

    removeFromWatchList(stock) {
      if (!this.isInWatchList(stock)) {
        console.log(`⚠️ Stock ${stock.exchange}-${stock.symbol} not found in watchlist`)
        return
      }

      this.watchList = this.watchList.filter(
        (s) => !(s.exchange === stock.exchange && s.symbol === stock.symbol),
      )
      LocalStorage.set(STORAGE_KEYS.WATCH_LIST, this.watchList)
      console.log(`✅ Removed ${stock.exchange}-${stock.symbol} from watchlist`)
    },

    isInWatchList(stock) {
      return this.watchList.some((s) => s.exchange === stock.exchange && s.symbol === stock.symbol)
    },
  },
})
