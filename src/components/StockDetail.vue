<template>
  <div class="containr">
    <div class="row justify-center items-center">
      <div class="col-12 q-px-xl">
        <!-- <h1 class="text-h4">{{ store.selectedStock.name }}</h1>
        <h2 class="text-h5">
          {{ store.selectedStock.exchange }}: {{ store.selectedStock.symbol }}
        </h2>
        <div v-if="isWeekday(now)">
          <h3 v-if="latestStockPrice" class="text-h4">
            {{ latestStockPrice }} {{ store.selectedStock.currency }}
          </h3>
        </div>
        <div v-else>
          <h3 class="text-h4">
            {{ Math.round(store.closingPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
        </div> -->
        <StockChart :stockExchange="route.params.exchange" :stockSymbol="route.params.symbol" />
      </div>
    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { ref, computed } from 'vue'
import { useDateUtils } from 'src/composables/useDateUtils'
import StockChart from './StockChart.vue'
import { useStockStore } from 'src/stores/store'
export default {
  components: {
    StockChart,
  },
  setup() {
    const route = useRoute()
    const store = useStockStore()
    const liveData = ref([])
    const { isWeekday } = useDateUtils()
    const now = new Date()

    const latestStockPrice = computed(() => store.latestStockPrice)

    return {
      route,
      store,
      liveData,
      latestStockPrice,
      isWeekday,
      now,
    }
  },
}
</script>

<style lang="scss" scoped></style>
