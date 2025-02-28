import { defineStore } from 'pinia'
import { ref } from 'vue'
import stocksService from 'src/services/stocks'

export const useStockStore = defineStore('stockStore', () => {
  const stocksList = ref([])
  let stockHistory = ref([])

  const fetchStockList = async () => {
    if (stocksList.value.length > 0) return // ✅ Prevent duplicate API calls

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
  const fetchStockHistory = async (symbol) => {
    try {
      const response = await stocksService.getStockHistory(symbol)
      // console.log('history data', response.data)
      if (response.data) {
        stockHistory.value = response.data?.values.map((data) => {
          const dateObj = new Date(data.datetime.replace(' ', 'T'))
          return {
            x: dateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }), // format the date to '3:55 PM'
            y: parseFloat(data.close), // ✅ Convert price to float
          }
        })
        console.log('stock history', stockHistory)
        return stockHistory.value
      }
    } catch (error) {
      console.error('Error fetching price history', error)
      return []
    }
  }
  const getFormattedTime = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  return { stocksList, stockHistory, fetchStockList, getFormattedTime, fetchStockHistory }
})
