import { defineStore } from 'pinia'
import stocksService from 'src/services/stocks'
import { useDateUtils } from 'src/composables/useDateUtils'
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
      watchList: LocalStorage.getItem(STORAGE_KEYS.WATCH_LIST) || [],
      liveData: [],
      selectedStock: LocalStorage.getItem(STORAGE_KEYS.SELECTED_STOCK) || null,
      closingPrice: LocalStorage.getItem(STORAGE_KEYS.CLOSING_PRICE) || null,
      previousClosingPrice: LocalStorage.getItem(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE) || null,
      modalViewed: LocalStorage.getItem(STORAGE_KEYS.MODAL_VIEWED) || false,
      webSocket: null,
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

    async fetchStockHistory(symbol) {
      try {
        const response = await stocksService.getStockHistory(symbol, this)
        if (!response) return { todayData: [], yesterdayData: [] }

        const { getToday, getYesterday, getLastTradingDay, isWeekday } = useDateUtils()
        const now = new Date()
        const dayBefore = new Date(now)
        dayBefore.setDate(now.getDate() - 1)

        const yesterday =
          isWeekday(now) && isWeekday(dayBefore) ? getYesterday() : getLastTradingDay()
        const today = isWeekday(now) ? getToday() : getLastTradingDay()

        const yesterdayData = response.filter((data) => data.datetime?.startsWith(yesterday))
        const todayData = response.filter((data) => data.datetime?.startsWith(today))

        this.stockHistoryYesterday = this.formatHistoryData(yesterdayData)
        this.stockHistoryToday = this.formatHistoryData(todayData)

        return {
          todayData: this.stockHistoryToday,
          yesterdayData: this.stockHistoryYesterday,
        }
      } catch (error) {
        console.error('❌ Error fetching price history:', error)
        return { todayData: [], yesterdayData: [] }
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

    // Helper Methods
    formatHistoryData(data) {
      return (
        data?.map((entry) => ({
          x: new Date(entry.datetime.replace(' ', 'T')).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          y: parseFloat(entry.close),
        })) || []
      )
    },
  },
})
