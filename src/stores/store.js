import { defineStore } from 'pinia'
import { ref } from 'vue'
import stocksService from 'src/services/stocks'

export const useStockStore = defineStore('stockStore', () => {
  const stocksList = ref([])

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
    if (stocksList.value.length > 0) return
    try {
      const response = await stocksService.getStockHistory(symbol)
      console.log('history data', response.data)
      let timeSeriesResponse = response.data.values.map((data) => ({
        x: new Date(data.datetime),
        y: parseFloat(data.close), // ✅ Convert price to float
      }))
      console.log('timeRes', timeSeriesResponse)
      return timeSeriesResponse
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

  return { stocksList, fetchStockList, getFormattedTime, fetchStockHistory }
})
