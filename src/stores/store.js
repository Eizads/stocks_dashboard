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
  const getFormattedTime = () =>
    new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  return { stocksList, fetchStockList, getFormattedTime }
})
