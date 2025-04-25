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
  // QUOTE_CACHE: 'quoteCache',
  // TRADING_DAY_CACHE: 'tradingDayCache',
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
      stockHistoryToday: [],
      watchList: LocalStorage.getItem(STORAGE_KEYS.WATCH_LIST) || [],
      liveData: [],
      selectedStock: LocalStorage.getItem(STORAGE_KEYS.SELECTED_STOCK) || null,
      closingPrice: LocalStorage.getItem(STORAGE_KEYS.CLOSING_PRICE) || null,
      previousClosingPrice: LocalStorage.getItem(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE) || null,
      modalViewed: LocalStorage.getItem(STORAGE_KEYS.MODAL_VIEWED) || false,
      webSocket: null,
      lastQuote: null,
      stockQuote: null,
      // quoteCache: LocalStorage.getItem(STORAGE_KEYS.QUOTE_CACHE) || {},
      // tradingDayCache: LocalStorage.getItem(STORAGE_KEYS.TRADING_DAY_CACHE) || {},
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
    isMarketOpen: (state) => {
      console.log('has market status', state.marketStatus?.is_market_open)
      return state.marketStatus?.is_market_open || false
    },
  },

  actions: {
    // Stock Selection and Price Actions
    setSelectedStock(stock) {
      this.selectedStock = { ...stock }
      LocalStorage.set(STORAGE_KEYS.SELECTED_STOCK, this.selectedStock)
    },

    setClosingPrice(price) {
      this.closingPrice = price !== null && price !== undefined ? Number(price) : null
      LocalStorage.set(STORAGE_KEYS.CLOSING_PRICE, this.closingPrice)
    },

    setPreviousClosingPrice(price) {
      this.previousClosingPrice = price !== null && price !== undefined ? Number(price) : null
      LocalStorage.set(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE, this.previousClosingPrice)
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

    async fetchStockQuote(symbol) {
      try {
        // const cachedData = this.quoteCache[symbol]

        // Check if we have cached data
        // if (cachedData?.data) {
        //   console.log('📦 Using cached quote data for', symbol)
        //   this.stockQuote = cachedData.data

        //   // Update store values from cache
        //   const currentClose = cachedData.data?.close ? Number(cachedData.data.close) : null
        //   const previousClose = cachedData.data?.previous_close
        //     ? Number(cachedData.data.previous_close)
        //     : null

        //   if (!isNaN(currentClose)) this.closingPrice = currentClose
        //   if (!isNaN(previousClose)) this.previousClosingPrice = previousClose

        //   return cachedData.data
        // }

        // If no cache, make API call
        console.log('🔄 Fetching fresh quote data for', symbol)
        const response = await stocksService.getStockQuote(symbol)
        if (!response) return null

        // Update cache with new data
        // this.quoteCache = {
        //   ...this.quoteCache,
        //   [symbol]: {
        //     data: response,
        //     timestamp: Date.now(), // Keep timestamp for reference, even though we're not using it for expiration
        //   },
        // }
        // LocalStorage.set(STORAGE_KEYS.QUOTE_CACHE, this.quoteCache)

        // Store the quote response
        this.stockQuote = response

        // Update closing prices from quote response
        const currentClose = response?.close ? Number(response.close) : null
        const previousClose = response?.previous_close ? Number(response.previous_close) : null

        if (!isNaN(currentClose)) {
          this.closingPrice = currentClose
          LocalStorage.set(STORAGE_KEYS.CLOSING_PRICE, currentClose)
        }

        if (!isNaN(previousClose)) {
          this.previousClosingPrice = previousClose
          LocalStorage.set(STORAGE_KEYS.PREVIOUS_CLOSING_PRICE, previousClose)
        }

        console.log('Quote response processed:', {
          currentClose,
          previousClose,
          rawResponse: response,
        })

        return response
      } catch (error) {
        console.error('❌ Error fetching stock quote:', error)
        this.stockQuote = null
        return null
      }
    },

    async fetchLatestTradingDay(symbol) {
      try {
        // const cachedData = this.tradingDayCache[symbol]

        // Check if we have cached data
        // if (cachedData?.data) {
        //   console.log('📦 Using cached trading day data for', symbol)

        //   // Format the cached data
        //   const formattedData = cachedData.data.map((dataPoint) => ({
        //     x: new Date(dataPoint.datetime).toLocaleTimeString('en-US', {
        //       hour: 'numeric',
        //       minute: '2-digit',
        //       hour12: true,
        //     }),
        //     y: parseFloat(dataPoint.close),
        //   }))

        //   // Store the data in stockHistoryToday
        //   this.stockHistoryToday = formattedData

        //   // Only update closing price if we don't have it from quote
        //   if (formattedData.length > 0 && !this.closingPrice) {
        //     const lastPrice = formattedData[formattedData.length - 1].y
        //     this.setClosingPrice(lastPrice)
        //   }

        //   return formattedData
        // }

        // If no cache, make API call
        console.log('🔄 Fetching fresh trading day data for', symbol)
        const response = await stocksService.getLatestTradingDay(symbol)

        // Update cache with new data
        // this.tradingDayCache = {
        //   ...this.tradingDayCache,
        //   [symbol]: {
        //     data: response,
        //     timestamp: Date.now(),
        //   },
        // }
        // LocalStorage.set(STORAGE_KEYS.TRADING_DAY_CACHE, this.tradingDayCache)

        // Format the data for the chart
        const formattedData = response.map((dataPoint) => ({
          x: new Date(dataPoint.datetime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          y: parseFloat(dataPoint.close),
        }))

        // Store the data in stockHistoryToday
        this.stockHistoryToday = formattedData

        // Only update closing price if we don't have it from quote
        if (formattedData.length > 0 && !this.closingPrice) {
          const lastPrice = formattedData[formattedData.length - 1].y
          this.setClosingPrice(lastPrice)
        }

        console.log('formattedData from store', formattedData)

        return formattedData
      } catch (error) {
        console.error('❌ Error fetching latest trading day data:', error)
        return []
      }
    },

    async fetchMarketStatus(exchange) {
      try {
        const response = await stocksService.getMarketStatus(exchange)
        if (response.length > 0) {
          this.marketStatus = response[0]
          console.log('market status response from store', response)
          return response
        } else {
          console.error('❌ No market status data received')
          return null
        }
      } catch (error) {
        console.error('❌ Error fetching market status:', error)
        return null
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
