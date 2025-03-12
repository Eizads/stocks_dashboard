<template>
  <div class="containr">
    <div class="row justify-center items-center">
      <div class="col-12">
        {{ latestStockPrice }}
        <div
          v-show="!latestStockPrice"
          class="rounded-borders bg-red-3 q-pa-lg q-ma-lg"
          style="border-radius: 1rem; border: 3px solid #ef534f"
        >
          <p class="q-mb-none q-pb-none">
            {{
              `The API doesn't provide live data for ${store.selectedStock.name} Please select Apple stock, symbol: AAPL if you'd like to see live data functionality.`
            }}
          </p>
        </div>
      </div>
    </div>
    <div class="row justify-center items-center">
      <div class="col-12 q-px-xl">
        <h1 class="text-h4">{{ store.selectedStock.name }}</h1>
        <h2 class="text-h5">
          {{ store.selectedStock.exchange }}: {{ store.selectedStock.symbol }}
        </h2>
        <div v-if="isWeekday(now)">
          <h3 v-if="latestStockPrice" class="text-h4">
            {{ Math.round(latestStockPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <h3 v-if="!latestStockPrice && store.stockHistoryToday.length > 0" class="text-h4">
            {{ Math.round(store.stockHistoryToday[0].y * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
        </div>
        <div v-else>
          <h3 class="text-h4">
            {{ Math.round(store.closingPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
        </div>
        <StockChart :stockExchange="route.params.exchange" :stockSymbol="route.params.symbol" />
      </div>
    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'
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
    watch(
      () => store.selectedStock.symbol,
      (newSymbol, oldSymbol) => {
        console.log(`🔄 Stock changed from ${oldSymbol} to ${newSymbol}, reconnecting WebSocket...`)
        store.liveData = []
      },
    )

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
