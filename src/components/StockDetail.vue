<template>
  <div class="containr">
    <div class="row justify-center items-center">
      <div class="col-12">
        <div
          v-if="!latestStockPrice && !afterHours && !store.stockHistoryToday.length"
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

    <div class="row justify-start items-start q-mx-xl q-pt-xl">
      <div class="col-12 col-sm-9">
        <h1 class="text-h5 text-bold q-my-none">{{ store.selectedStock.name }}</h1>

        <h2 class="q-my-none q-py-none" style="font-size: 1rem; font-weight: normal">
          {{ store.selectedStock.exchange }}: {{ store.selectedStock.symbol }}
        </h2>

        <!-- Live data display -->
        <div v-if="latestStockPrice && latestStockTime">
          <h3 class="text-h4 q-my-sm">
            {{ Math.round(latestStockPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <p :class="comparePrice > 0 ? 'text-green' : 'text-red'">
            {{ Math.round(comparePrice * 100) / 100 }}
            {{ `(${Math.round(percentChange * 100) / 100}%)` }}
          </p>
          <p class="text-grey-7">
            {{ latestStockTime }}
          </p>
        </div>

        <!-- Historical data display -->
        <div
          v-else-if="store.stockHistoryToday.length > 0 || store.stockHistoryYesterday.length > 0"
        >
          <h3 class="text-h4 q-my-sm">
            {{ Math.round((getCurrentPrice || 0) * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <p :class="comparePrice > 0 ? 'text-green' : 'text-red'">
            {{ Math.round(comparePrice * 100) / 100 }}
            {{ `(${Math.round(percentChange * 100) / 100}%)` }}
          </p>
          <p class="text-grey-7">
            {{ formattedDate }}
          </p>
        </div>
      </div>

      <div class="col-12 col-sm-3">
        <div :class="q.screen.gt.sm ? 'flex justify-center' : 'flex justify-start'">
          <q-btn
            class="bg-blue text-white text-center"
            size="md"
            padding="md lg"
            style="min-width: 150px"
            dense
            rounded
            @click="toggleWatchlist"
            :label="isInWatchlist ? 'Followed' : 'Follow'"
          >
            <q-icon
              :name="isInWatchlist ? 'bi-check' : 'bi-plus'"
              size="24px"
              :class="isInWatchlist ? 'text-white' : 'text-white'"
              class="relative"
            >
            </q-icon>
          </q-btn>
        </div>
      </div>
    </div>

    <div class="row justify-center items-center">
      <div class="col-12 q-px-xl">
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
import { useQuasar } from 'quasar'

export default {
  components: {
    StockChart,
  },
  setup() {
    const q = useQuasar()
    const route = useRoute()
    const store = useStockStore()
    const liveData = ref([])
    const { isWeekday, marketOpen, beforeMarket, afterMarket } = useDateUtils()
    const now = new Date()

    const latestStockPrice = computed(() => store.latestStockPrice)
    const latestStockTime = computed(() => store.latestStockTime)
    console.log('stock time ----', latestStockTime.value)
    watch(
      () => store.selectedStock,
      (newSymbol, oldSymbol) => {
        console.log(`🔄 Stock changed from ${oldSymbol} to ${newSymbol}, reconnecting WebSocket...`)
        store.liveData = []
      },
    )
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    })

    const comparePrice = computed(() => {
      const now = new Date()
      console.log('⏳ Checking price comparison at:', now.toLocaleTimeString())
      console.log('📊 Current store values:', {
        closingPrice: store.closingPrice,
        previousClosingPrice: store.previousClosingPrice,
        latestStockPrice: latestStockPrice.value,
        stockHistoryToday: store.stockHistoryToday?.[0]?.y,
        stockHistoryYesterday: store.stockHistoryYesterday?.[0]?.y,
      })

      if (isWeekday(now)) {
        if (beforeMarket()) {
          console.log('⏳ Before Market Open')
          // Use yesterday's closing price compared to day before yesterday's closing
          return store.closingPrice - store.previousClosingPrice
        }

        if (marketOpen()) {
          console.log('📈 Market is OPEN')
          // During market hours, compare current/latest price to yesterday's closing
          return latestStockPrice.value
            ? latestStockPrice.value - store.closingPrice
            : store.stockHistoryToday?.[0]?.y - store.closingPrice
        }

        if (afterMarket()) {
          console.log('📉 Market is CLOSED (After Hours)')
          // After hours, compare today's closing to yesterday's closing
          return store.stockHistoryToday?.[0]?.y - store.closingPrice
        }
      }

      console.log("📅 Non-trading day, using last trading day's closing price")
      const result = store.closingPrice - store.previousClosingPrice
      console.log('💰 Price comparison result:', result)
      return result
    })

    const percentChange = computed(() => {
      const now = new Date()
      console.log('⏳ Checking percentage change at:', now.toLocaleTimeString())
      console.log('📊 Current store values:', {
        closingPrice: store.closingPrice,
        previousClosingPrice: store.previousClosingPrice,
        latestStockPrice: latestStockPrice.value,
        stockHistoryToday: store.stockHistoryToday?.[0]?.y,
        stockHistoryYesterday: store.stockHistoryYesterday?.[0]?.y,
      })

      // Helper function to calculate percentage change
      const calculatePercentChange = (current, base) => {
        if (!current || !base || base === 0) {
          console.log('⚠️ Invalid values for percentage calculation:', { current, base })
          return 0
        }
        const result = ((current - base) / base) * 100
        console.log('📊 Percentage calculation:', { current, base, result })
        return result
      }

      if (isWeekday(now)) {
        if (beforeMarket()) {
          console.log('⏳ Before Market Open')
          return calculatePercentChange(store.closingPrice, store.previousClosingPrice)
        }

        if (marketOpen()) {
          console.log('📈 Market is OPEN')
          const currentPrice = latestStockPrice.value || store.stockHistoryToday?.[0]?.y
          return calculatePercentChange(currentPrice, store.closingPrice)
        }

        if (afterMarket()) {
          console.log('📉 Market is CLOSED (After Hours)')
          return calculatePercentChange(store.stockHistoryToday?.[0]?.y, store.closingPrice)
        }
      }

      console.log("📅 Non-trading day, using last trading day's closing price")
      const result = calculatePercentChange(store.closingPrice, store.previousClosingPrice)
      console.log('💰 Percentage change result:', result)
      return result
    })
    const isInWatchlist = computed(() => store.isInWatchList(store.selectedStock))

    const toggleWatchlist = () => {
      if (store.isInWatchList(store.selectedStock)) {
        store.removeFromWatchList(store.selectedStock)
      } else {
        store.addToWatchList(store.selectedStock)
      }
    }
    const afterHours = computed(() => {
      const now = new Date()
      const startTime = new Date()
      startTime.setHours(9, 30, 0, 0)
      const endTime = new Date()
      endTime.setHours(16, 0, 0, 0)

      return now.getTime() > endTime.getTime() ? true : false
    })

    // Add a computed property for current price
    const getCurrentPrice = computed(() => {
      if (latestStockPrice.value) return latestStockPrice.value
      if (store.stockHistoryToday.length > 0) return store.stockHistoryToday[0].y
      if (store.stockHistoryYesterday.length > 0) return store.stockHistoryYesterday[0].y
      return 0
    })

    return {
      route,
      store,
      liveData,
      latestStockPrice,
      isWeekday,
      now,
      formattedDate,
      latestStockTime,
      comparePrice,
      percentChange,
      toggleWatchlist,
      isInWatchlist,
      afterHours,
      marketOpen,
      getCurrentPrice,
      q,
    }
  },
}
</script>

<style lang="scss" scoped></style>
