import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import stocksService from 'src/services/stocks'
import { useDateUtils } from 'src/composables/useDateUtils'

export const useStockStore = defineStore('stockStore', () => {
  const { getToday, getYesterday, isWeekday, getLastTradingDay } = useDateUtils()
  const stocksList = ref([])
  let stockHistoryYesterday = ref([])
  let stockHistoryToday = ref([])
  const watchList = ref([])
  const liveData = ref([])
  const selectedStock = ref(null)
  const closingPrice = ref([])

  const setSelectedStock = (stock) => {
    selectedStock.value = { ...stock } // Updates store reactively
  }
  const fetchStockList = async () => {
    if (stocksList.value.length > 0) return // Prevent duplicate API calls

    try {
      const response = await stocksService.getStocksList()
      stocksList.value = response.data?.data ?? []
      console.log('stocks list', stocksList.value)
      return response.data
    } catch (error) {
      console.error('Error fetching stocks', error)
      stocksList.value = []
    }
  }
  // const fetchStockHistory = async (symbol) => {
  //   try {
  //     const response = await stocksService.getStockHistory(symbol)
  //     if (response.data) {
  //       console.log('history data', response.data)
  //       const now = new Date()
  //       let yesterday, today

  //       if (isWeekday(now) && isWeekday(dayBefore)) {
  //         // If today is a weekday, use yesterday and today
  //         yesterday = getYesterday()
  //         today = getToday()
  //       } else if (isWeekday(now) && !isWeekday(dayBefore)) {
  //         yesterday = getLastTradingDay()
  //         today = getToday()
  //       } else {
  //         // If today is a weekend, get last Friday
  //         yesterday = getLastTradingDay() // Friday
  //         today = getLastTradingDay() // Use the same Friday data
  //       }

  //       console.log('📅 Fetching data for:')
  //       console.log('➡️ Yesterday:', yesterday)
  //       console.log('➡️ Today:', today)

  //       const yesterdayData = response.data?.values.filter((data) =>
  //         data.datetime?.startsWith(yesterday),
  //       )
  //       const todayData = response.data?.values.filter((data) => data.datetime?.startsWith(today))
  //       console.log()
  //       console.log("📊 Yesterday's Data:", yesterdayData)
  //       console.log("📊 Today's Data:", todayData)
  //       // const todayData = historyData.filter((data) => data.datetime?.startsWith(today))
  //       stockHistoryYesterday.value = yesterdayData?.map((data) => {
  //         const dateObj = new Date(data.datetime.replace(' ', 'T'))
  //         return {
  //           x: dateObj.toLocaleTimeString('en-US', {
  //             hour: 'numeric',
  //             minute: '2-digit',
  //             hour12: true,
  //           }), // format the date to '3:55 PM'
  //           y: parseFloat(data.close), // Convert price to float
  //         }
  //       })
  //       stockHistoryToday.value = todayData?.map((data) => {
  //         const dateObj = new Date(data.datetime.replace(' ', 'T'))
  //         return {
  //           x: dateObj.toLocaleTimeString('en-US', {
  //             hour: 'numeric',
  //             minute: '2-digit',
  //             hour12: true,
  //           }), // format the date to '3:55 PM'
  //           y: parseFloat(data.close), // Convert price to float
  //         }
  //       })
  //       console.log('stock history', stockHistoryYesterday.value)
  //       return {
  //         todayData: stockHistoryToday.value,
  //         yesterdayData: stockHistoryYesterday.value,
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error fetching price history', error)
  //     return { todayData: [], yesterdayData: [] }
  //   }
  // }

  const fetchStockHistory = async (symbol) => {
    try {
      const response = await stocksService.getStockHistory(symbol)
      if (response) {
        console.log('📊 Raw history data:', response.data)
        console.log('res is', response)

        const now = new Date()
        let day = now.getDay()

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
        if (day === 1) {
          // ✅ Filter history data for the correct dates
          yesterdayData = response?.filter((data) => data.datetime?.startsWith(yesterday))
          todayData = response?.filter((data) => data.datetime?.startsWith(today))
        } else {
          // ✅ Filter history data for the correct dates
          yesterdayData = response.data?.filter((data) => data.datetime?.startsWith(yesterday))
          todayData = response.data?.filter((data) => data.datetime?.startsWith(today))
        }

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
    } else {
      console.log(`⚠️ Stock ${stock.exchange}-${stock.symbol} not found in watchlist`)
    }

    console.log('📋 Updated Watchlist:', watchList.value)
  }
  const addLiveData = (newData) => {
    if (!liveData.value.some((p) => p.price === newData.price)) {
      liveData.value = [...liveData.value, newData]
      // console.log('live ----------', liveData.value)
    }
    if (liveData.value.length > 100) {
      // Keep only the last 100 entries
      liveData.value.shift()
    }
  }
  const latestStockPrice = computed(() => {
    return liveData.value.length > 0 ? liveData.value[liveData.value.length - 1].price : ''
  })
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
    liveData,
    addLiveData,
    latestStockPrice,
    selectedStock,
    setSelectedStock,
    closingPrice,
  }
})
