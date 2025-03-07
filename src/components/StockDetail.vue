<template>
  <div class="containr">
    <div class="row justify-center items-center">
      <div class="col-12 q-px-xl">
        <!-- <h1 class="text-h4">{{ store.selectedStock.name }}</h1>
        <h2 class="text-h5">
          {{ store.selectedStock.exchange }}: {{ store.selectedStock.symbol }}
        </h2>
        <h3 v-if="latestStockPrice" class="text-h4">
          {{ latestStockPrice }} {{ store.selectedStock.currency }}
        </h3> -->
        <ChartTestLine :stockExchange="route.params.exchange" :stockSymbol="route.params.symbol" />
      </div>
    </div>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { ref, computed } from 'vue'

import ChartTestLine from './ChartTestLine.vue'
import { useStockStore } from 'src/stores/store'
export default {
  components: {
    ChartTestLine,
  },
  setup() {
    const route = useRoute()
    const store = useStockStore()
    const liveData = ref([])

    const latestStockPrice = computed(() => store.latestStockPrice)

    return {
      route,
      store,
      liveData,
      latestStockPrice,
    }
  },
}
</script>

<style lang="scss" scoped></style>
