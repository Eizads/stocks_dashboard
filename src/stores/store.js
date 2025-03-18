import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import stocksService from 'src/services/stocks'
import { useDateUtils } from 'src/composables/useDateUtils'
import { LocalStorage } from 'quasar'
import LZString from 'lz-string'

export const useStockStore = defineStore('stockStore', () => {
  const { getToday, getYesterday, isWeekday, getLastTradingDay } = useDateUtils()
  const storedStocks = LocalStorage.getItem('stocksList')

  let stockHistoryYesterday = ref([])
  let stockHistoryToday = ref([])
  const watchList = ref(LocalStorage.getItem('watchList') || [])
  const liveData = ref([])
  const selectedStock = ref(LocalStorage.getItem('selectedStock') || null)
  const closingPrice = ref(LocalStorage.getItem('closingPrice') || null)
  const previousClosingPrice = ref(LocalStorage.getItem('previousClosingPrice') || null)
  const modalViewed = ref(LocalStorage.getItem('modalViewed') || false)

  let parsedStocks = []

  if (storedStocks) {
    try {
      const decompressed = LZString.decompress(storedStocks)
      parsedStocks = decompressed ? JSON.parse(decompressed) : [] // ✅ Ensure valid array
    } catch (error) {
      console.error('❌ Error parsing stocks from LocalStorage:', error)
      parsedStocks = [] // ✅ Fallback to empty array
    }
  }
  const stocksList = ref(parsedStocks) // ✅ Safe initialization

  const setSelectedStock = (stock) => {
    selectedStock.value = { ...stock } // Updates store reactively
    LocalStorage.set('selectedStock', selectedStock.value)
  }
  const fetchStockList = async () => {
    if (stocksList.value && stocksList.value.length > 0) {
      console.log('✅ Using cached stocks from LocalStorage')
      return // Prevent duplicate API calls
    }

    try {
      console.log('🔄 Fetching stock data from API...')
      const response = await stocksService.getStocksList()
      stocksList.value = response.data?.data ?? []
      console.log('fetched stocks list', stocksList.value)

      // ✅ Compress and store in LocalStorage
      LocalStorage.set('stocksList', LZString.compress(JSON.stringify(stocksList.value)))
      return response.data
    } catch (error) {
      console.error('Error fetching stocks', error)
      stocksList.value = []
    }
  }

  const fetchStockHistory = async (symbol) => {
    try {
      const response = await stocksService.getStockHistory(symbol)
      if (response) {
        console.log('res is', response)

        const now = new Date()
        // let day = now.getDay()

        const dayBefore = new Date()
        dayBefore.setDate(now.getDate() - 1) // ✅ Get previous day as Date object

        let yesterday, today

        if (isWeekday(now) && isWeekday(dayBefore)) {
          // ✅ If today and yesterday are weekdays, use normal yesterday/today
          yesterday = getYesterday()
          today = getToday()
        } else if (isWeekday(now) && !isWeekday(dayBefore)) {
          // ✅ If today is Monday, but yesterday was a weekend → Get Friday's data
          yesterday = getLastTradingDay()

          today = getToday()
          console.log('yesterday,today', yesterday, today)
        } else {
          // ✅ If today is a weekend, get last Friday's data
          yesterday = getLastTradingDay() // Friday
          today = getLastTradingDay() // Use the same Friday data
        }

        console.log('📅 Fetching data for:')
        console.log('➡️ Yesterday:', yesterday)
        console.log('➡️ Today:', today)
        let yesterdayData, todayData
        // if (day === 1) {
        // ✅ Filter history data for the correct dates
        yesterdayData = response?.filter((data) => data.datetime?.startsWith(yesterday))
        todayData = response?.filter((data) => data.datetime?.startsWith(today))
        // } else {
        //   // ✅ Filter history data for the correct dates
        //   yesterdayData = response.data?.filter((data) => data.datetime?.startsWith(yesterday))
        //   todayData = response.data?.filter((data) => data.datetime?.startsWith(today))
        // }

        console.log("📊 Filtered Yesterday's Data:", yesterdayData)
        console.log("📊 Filtered Today's Data:", todayData)

        // ✅ Format yesterday's data
        stockHistoryYesterday.value = yesterdayData?.map((data) => {
          const dateObj = new Date(data.datetime.replace(' ', 'T'))
          return {
            x: dateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            y: parseFloat(data.close), // ✅ Convert price to float
          }
        })

        // ✅ Format today's data
        stockHistoryToday.value = todayData?.map((data) => {
          const dateObj = new Date(data.datetime.replace(' ', 'T'))
          return {
            x: dateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            y: parseFloat(data.close), // ✅ Convert price to float
          }
        })

        console.log("📊 Formatted Yesterday's Stock History:", stockHistoryYesterday.value)
        console.log("📊 Formatted Today's Stock History:", stockHistoryToday.value)

        return {
          todayData: stockHistoryToday.value,
          yesterdayData: stockHistoryYesterday.value,
        }
      }
    } catch (error) {
      console.error('❌ Error fetching price history:', error)
      return { todayData: [], yesterdayData: [] } // ✅ Return consistent empty structure
    }
  }

  const getFormattedTime = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  const addToWatchList = (stock) => {
    const exists = watchList.value.find(
      (s) => s.exchange === stock.exchange && s.symbol === stock.symbol,
    )
    if (!exists) {
      watchList.value.push(stock)
      LocalStorage.set('watchList', watchList.value) // ✅ Persist watchlist

      console.log('WatchList Updated:', watchList.value)
    }
  }

  const removeFromWatchList = (stock) => {
    // Ensure the stock exists before removing it
    const exists = watchList.value.some(
      (s) => s.exchange === stock.exchange && s.symbol === stock.symbol,
    )

    if (exists) {
      const updatedWatchlist = watchList.value.filter(
        (s) => !(s.exchange === stock.exchange && s.symbol === stock.symbol), // Remove matching stock
      )
      watchList.value = [...updatedWatchlist]
      console.log(`Removed ${stock.exchange}-${stock.symbol} from watchlist`)
      LocalStorage.set('watchList', watchList.value) // ✅ Persist watchlist
    } else {
      console.log(`⚠️ Stock ${stock.exchange}-${stock.symbol} not found in watchlist`)
    }

    console.log('📋 Updated Watchlist:', watchList.value)
  }
  const isInWatchList = (stock) => {
    return watchList.value.some((s) => s.exchange === stock.exchange && s.symbol === stock.symbol)
  }
  const addLiveData = (newData) => {
    if (!liveData.value.some((p) => p.price === newData.price)) {
      liveData.value = [...liveData.value, newData]
      console.log('live ----------', liveData.value)
    }
    if (liveData.value.length > 10) {
      // Keep only the last 100 entries
      liveData.value.shift()
    }
  }
  const latestStockPrice = computed(() => {
    return liveData.value.length > 0 ? liveData.value[liveData.value.length - 1].price : ''
  })
  const latestStockTime = computed(() => {
    let time, formattedTime
    if (liveData.value.length > 0) {
      time = liveData.value[liveData.value.length - 1].timestamp * 1000
      formattedTime = new Date(time).toLocaleString('en-US', {
        month: 'short', // "Mar"
        day: 'numeric', // "12"
        hour: 'numeric', // "10"
        minute: '2-digit', // "42"
        hour12: true, // "a.m." or "p.m."
        timeZoneName: 'short', // "EDT"
      })
    }
    console.log('store formatted time from live', formattedTime)

    return formattedTime
  })

  const setClosingPrice = (price) => {
    closingPrice.value = price
    LocalStorage.set('closingPrice', price)
  }

  const setPreviousClosingPrice = (price) => {
    previousClosingPrice.value = price
    LocalStorage.set('previousClosingPrice', price)
  }

  // 🌟 WATCHERS: Automatically Sync State with Quasar LocalStorage

  watch(
    stocksList,
    (newValue) => {
      LocalStorage.set('stocksList', LZString.compress(JSON.stringify(newValue)))
    },
    { deep: true },
  )
  watch(
    modalViewed,
    (newValue) => {
      LocalStorage.set('modalViewed', newValue)
    },
    { deep: true },
  )

  watch(
    watchList,
    (newValue) => {
      LocalStorage.set('watchList', newValue)
    },
    { deep: true },
  )

  watch(
    selectedStock,
    (newValue) => {
      LocalStorage.set('selectedStock', newValue)
    },
    { deep: true },
  )

  watch(
    closingPrice,
    (newValue) => {
      LocalStorage.set('closingPrice', newValue)
    },
    { deep: true },
  )

  watch(
    previousClosingPrice,
    (newValue) => {
      LocalStorage.set('previousClosingPrice', newValue)
    },
    { deep: true },
  )

  return {
    stocksList,
    stockHistoryYesterday,
    stockHistoryToday,
    watchList,
    fetchStockList,
    getFormattedTime,
    fetchStockHistory,
    addToWatchList,
    removeFromWatchList,
    isInWatchList,
    liveData,
    addLiveData,
    latestStockPrice,
    selectedStock,
    setSelectedStock,
    closingPrice,
    previousClosingPrice,
    latestStockTime,
    setClosingPrice,
    setPreviousClosingPrice,
    modalViewed,
  }
})
