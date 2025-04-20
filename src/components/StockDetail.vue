<template>
  <div class="containr">
    <!-- Error message -->
    <div
      class="row justify-center items-center"
      v-if="!latestStockPrice && !afterHours && !store.stockHistoryToday.length"
    >
      <div class="col-12">
        <div
          class="rounded-borders bg-red-3 q-pa-md q-ma-md"
          style="border-radius: 1rem; border: 3px solid #ef534f"
        >
          <p class="q-my-none">
            {{
              `The API doesn't provide live data for ${store.selectedStock.name} Please select Apple stock, symbol: AAPL if you'd like to see live data functionality.`
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Header section -->
    <div class="row justify-start items-start q-mx-md q-pt-lg">
      <div class="col-12 col-sm-9">
        <h1 class="text-h5 text-bold q-my-none">{{ store.selectedStock.name }}</h1>
        <h2 class="q-my-none" style="font-size: 1rem; font-weight: normal">
          {{ store.selectedStock.exchange }}: {{ store.selectedStock.symbol }}
        </h2>
        {{ store.stockQuote }}
        <!-- Live data display -->

        <!-- <div v-if="marketOpen() && latestStockPrice && latestStockTime">
          <h3 class="text-h4 q-my-none">
            {{ Math.round(latestStockPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <p :class="comparePrice > 0 ? 'text-green' : 'text-red'" class="q-my-none">
            {{ Math.round(comparePrice * 100) / 100 }}
            {{ `(${Math.round(percentChange * 100) / 100}%)` }}
          </p>
          <p class="text-grey-7 q-mt-xs q-mb-none">{{ latestStockTime }}</p>
        </div>
        <div v-if="marketOpen() && !latestStockPrice && store.stockHistoryToday.length > 0">
          <h3 class="text-h4 q-my-none">
            {{
              Math.round(store.stockHistoryToday[store.stockHistoryToday.length - 1].y * 100) / 100
            }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <p :class="comparePrice > 0 ? 'text-green' : 'text-red'" class="q-my-none">
            {{ Math.round(comparePrice * 100) / 100 }}
            {{ `(${Math.round(percentChange * 100) / 100}%)` }}
          </p>
          <p class="text-grey-7 q-mt-xs q-mb-none">
            {{ store.stockHistoryToday[store.stockHistoryToday.length - 1].x }}
          </p>
        </div> -->

        <!-- Historical data display -->
        <div>
          <h3 class="text-h4 q-my-sm">
            {{ Math.round((store.closingPrice || 0) * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>
          <p :class="comparePrice > 0 ? 'text-green' : 'text-red'" class="q-my-none">
            {{ Math.round(store.stockQuote?.change * 100) / 100 || 0 }}
            {{ `(${Math.round(store.stockQuote?.percent_change * 100) / 100 || 0}%)` }}
          </p>
          <p class="text-grey-7 q-mt-xs q-mb-none">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- Follow button -->
      <div class="col-12 col-sm-3">
        <div :class="q.screen.gt.sm ? 'flex justify-center' : 'flex justify-start'">
          <q-btn
            class="bg-blue text-white text-center"
            size="md"
            padding="sm lg"
            style="min-width: 150px"
            dense
            rounded
            @click="toggleWatchlist"
            :label="isInWatchlist ? 'Followed' : 'Follow'"
          >
            <q-icon
              :name="isInWatchlist ? 'bi-check' : 'bi-plus'"
              size="24px"
              class="relative text-white"
            >
            </q-icon>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Chart section -->
    <div class="row justify-start items-center q-mt-sm">
      <div class="col-12 q-px-md">
        <StockChart :stockExchange="route.params.exchange" :stockSymbol="route.params.symbol" />
      </div>
    </div>

    <!-- Price Statistics -->
    <div class="row justify-center items-center q-my-lg q-mb-md">
      <div class="col-12 q-px-md">
        <div class="stats-container q-pa-sm">
          <div class="row justify-between q-gutter-sm">
            <div class="col price-stat rounded-borders">
              <div class="text-grey text-caption">Open</div>
              <div class="text-weight-bold">
                ${{ Math.round(store.stockQuote?.open * 100) / 100 }}
              </div>
            </div>
            <div class="col price-stat rounded-borders">
              <div class="text-grey text-caption">High</div>
              <div class="text-weight-bold text-green">
                ${{ Math.round(store.stockQuote?.high * 100) / 100 }}
              </div>
            </div>
            <div class="col price-stat rounded-borders">
              <div class="text-grey text-caption">Low</div>
              <div class="text-weight-bold text-red">
                ${{ Math.round(store.stockQuote?.low * 100) / 100 }}
              </div>
            </div>
            <div class="col price-stat rounded-borders">
              <div class="text-grey text-caption">Prev Close</div>
              <div class="text-weight-bold">
                ${{
                  store.previousClosingPrice
                    ? Number(store.previousClosingPrice).toFixed(2)
                    : '--.--'
                }}
              </div>
            </div>
          </div>
        </div>
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
    const { isWeekday, marketOpen } = useDateUtils()
    const now = new Date()

    const latestStockPrice = computed(() => store.latestStockPrice)
    const latestStockTime = computed(() => store.latestStockTime)
    console.log('stock time ----', latestStockTime.value)

    // Watch for stock changes and update data
    watch(
      () => store.selectedStock,
      async (newStock, oldStock) => {
        console.log(
          `🔄 Stock changed from ${oldStock?.symbol} to ${newStock?.symbol}, updating data...`,
        )
        store.liveData = []
        if (newStock?.symbol) {
          await store.fetchLatestTradingDay(newStock.symbol)
          const quoteResponse = await store.fetchStockQuote(newStock.symbol)
          console.log('📊 Quote response:', quoteResponse)
        }
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

      // Get current price based on market conditions
      let currentPrice = latestStockPrice.value
      if (!currentPrice && store.stockHistoryToday.length > 0) {
        currentPrice = store.stockHistoryToday[store.stockHistoryToday.length - 1].y
      }
      if (!currentPrice) {
        currentPrice = store.closingPrice
      }

      // Get previous closing price from store
      const previousPrice = store.previousClosingPrice

      // Calculate the difference
      return currentPrice && previousPrice ? currentPrice - previousPrice : 0
    })

    const percentChange = computed(() => {
      const now = new Date()
      console.log('⏳ Calculating percent change at:', now.toLocaleTimeString())

      // Get current price based on market conditions
      let currentPrice = latestStockPrice.value
      if (!currentPrice && store.stockHistoryToday.length > 0) {
        currentPrice = store.stockHistoryToday[store.stockHistoryToday.length - 1].y
      }
      if (!currentPrice) {
        currentPrice = store.closingPrice
      }

      // Get previous closing price from store
      const previousPrice = store.previousClosingPrice

      // Calculate the percent change
      return currentPrice && previousPrice
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : 0
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

    const formatPrice = (price) => {
      if (price === null || price === undefined || isNaN(Number(price))) {
        return '--.--'
      }
      return Number(price).toFixed(2)
    }

    const getDayStats = computed(() => {
      // Get quote data from store
      const quoteData = store.stockQuote

      // If we have quote data, use it
      if (quoteData) {
        return {
          open: Number(quoteData.open),
          high: Number(quoteData.high),
          low: Number(quoteData.low),
        }
      }

      // Fallback to historical data if quote is not available
      const currentData = marketOpen() ? store.stockHistoryToday : store.stockHistoryYesterday
      if (!currentData || currentData.length === 0) return { open: null, high: null, low: null }

      const prices = currentData.map((point) => Number(point.y))
      const marketOpenTime = '9:30 AM'

      const openPrice = currentData.find((point) => point.x === marketOpenTime)
      return {
        open: openPrice ? Number(openPrice.y) : Number(prices[0]),
        high: prices.length > 0 ? Math.max(...prices) : null,
        low: prices.length > 0 ? Math.min(...prices) : null,
      }
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
      getDayStats,
      formatPrice,
    }
  },
}
</script>

<style lang="scss" scoped>
.stats-container {
  background: #fff;
  border-radius: 8px;
}

.price-stat {
  text-align: center;
  padding: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;

  .text-caption {
    font-size: 0.75rem;
    line-height: 1.2;
    margin-bottom: 0.25rem;
  }
  .text-weight-bold {
    font-size: 1rem;
    line-height: 1.4;
  }
}

.text-green {
  color: #21ba45;
}

.text-red {
  color: #ea4335;
}
</style>
