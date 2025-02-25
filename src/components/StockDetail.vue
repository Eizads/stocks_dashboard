<template>
  <div>
    <h1>stock detail</h1>
    <!-- <ChartTest /> -->
    <StockChart :stockSymbol="route.params.symbol" />
    {{ route.params.symbol }}
    {{ now }}
    {{ store.getFormattedTime() }}
    <!-- {{ new Date(now.getHours(), now.getMinutes(), 9, 0, 0) }}
    {{ new Date(now.getHours(), now.getMinutes(), 16, 0, 0) }} -->
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
// import ChartTest from './ChartTest.vue'
import StockChart from './StockChart.vue'
import { useStockStore } from 'src/stores/store'
export default {
  components: {
    StockChart,
    // ChartTest,
  },
  setup() {
    const route = useRoute()
    const store = useStockStore()
    const now = new Date()
    const start = new Date(now.getHours(), now.getMinutes(), 9, 0, 0)
    const end = new Date(now.getHours(), now.getMinutes(), 16, 0, 0)
    return {
      route,
      now,
      start,
      end,
      store,
    }
  },
}
</script>

<style lang="scss" scoped></style>
