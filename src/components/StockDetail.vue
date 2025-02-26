<template>
  <div>
    <h1>stock detail</h1>
    <ChartTestLine />
    <!-- <StockChart :stockSymbol="route.params.symbol" /> -->
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
// import StockChart from './StockChart.vue'
import ChartTestLine from './ChartTestLine.vue'
import { useStockStore } from 'src/stores/store'
export default {
  components: {
    // StockChart,
    ChartTestLine,
  },
  setup() {
    const route = useRoute()
    const store = useStockStore()
    // const now = new Date()
    // const start = new Date(now.getHours(), now.getMinutes(), 9, 0, 0)
    // const end = new Date(now.getHours(), now.getMinutes(), 16, 0, 0)
    return {
      route,
      // now,
      // start,
      // end,
      store,
    }
  },
}
</script>

<style lang="scss" scoped></style>
