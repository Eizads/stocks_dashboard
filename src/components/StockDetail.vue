<template>
  <div>
    <h1>stock detail</h1>
    <ChartTest />
    <StockChart :stockSymbol="route.params.symbol" />

    {{ route.params.symbol }}
  </div>
</template>

<script>
// import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ChartTest from './ChartTest.vue'
// import stocksService from 'src/services/stocks.js'
import StockChart from './StockChart.vue'
export default {
  components: {
    StockChart,
    ChartTest,
  },
  setup() {
    const route = useRoute()
    // const selectedStock = ref([])
    // onMounted(async () => {
    //   try {
    //     const response = await stocksService.getStockDetail(route.params.symbol)
    //     return (selectedStock.value = response.data)
    //   } catch (error) {
    //     console.error('stock not found', error)
    //     return []
    //   }
    // })
    return {
      // selectedStock,
      route,
    }
  },
}
</script>

<style lang="scss" scoped></style>
