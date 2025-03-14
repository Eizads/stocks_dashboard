<template>
  <div class="containr">
    <div class="row justify-center items-center">
      <div class="col-12">
        <div
          v-if="!latestStockPrice && !afterHours"
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
        <!-- <div v-if="isWeekday(now) && marketOpen()"> -->
        <!-- during market open with live data -->
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
        <!-- during market open with no live data -->
        <div v-else-if="!latestStockPrice && store.stockHistoryToday.length > 0 && latestStockTime">
          {{}}
          <h3 class="text-h4 q-my-sm">
            {{ Math.round(store.stockHistoryToday[0].y * 100) / 100 }}
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
        <!-- </div> -->
        <!-- after market -->
        <!-- <div v-else>
          <h3 class="text-h4 q-my-sm">
            {{ Math.round(store.closingPrice * 100) / 100 }}
            <span class="text-h5 text-grey-7">{{ store.selectedStock.currency }}</span>
          </h3>

          <p class="text-grey-7">
            {{ formattedDate }}
          </p>
        </div> -->
      </div>
      <div class="col-12 col-sm-3">
        <div :class="$q.screen.gt.sm ? 'flex justify-center' : 'flex justify-start'">
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
            </q-icon
          ></q-btn>
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
    // eslint-disable-next-line no-unused-vars
    const $q = useQuasar()
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
        // store.closingPrice = []
      },
    )
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', // "Mar"
      day: 'numeric', // "12"
      hour: 'numeric', // "10"
      minute: '2-digit', // "42"
      hour12: true, // "a.m." or "p.m."
      timeZoneName: 'short', // "EDT" (Eastern Daylight Time)
    })
    // const comparePrice = computed(() => {
    //   if (latestStockPrice.value) {
    //     return latestStockPrice.value - store.closingPrice
    //   } else {
    //     if (store?.stockHistoryToday) {
    //       return store.stockHistoryToday[0].y - store.closingPrice
    //     } else return ''
    //   }
    // })
    const comparePrice = computed(() => {
      const now = new Date() // ✅ Ensure `now` is defined
      console.log('⏳ Checking price comparison at:', now.toLocaleTimeString())

      if (isWeekday(now)) {
        if (marketOpen()) {
          console.log('📈 Market is OPEN')
          return latestStockPrice.value
            ? latestStockPrice.value - store.closingPrice
            : store.stockHistoryToday?.[0]?.y - store.closingPrice
        }

        if (beforeMarket()) {
          console.log('⏳ Before Market Open')
          return store.stockHistoryYesterday?.[0]?.y - store.closingPrice
        }

        if (afterMarket()) {
          console.log('📉 Market is CLOSED (After Hours)')
          return store.stockHistoryToday?.[0]?.y - store.closingPrice
        }
      }

      console.log("📅 Non-trading day, using yesterday's closing price")
      return store.stockHistoryYesterday?.[0]?.y - store.closingPrice // ✅ Default return
    })
    // const percentChange = computed(() => {
    //   const now = new Date() // ✅ Ensure `now` is defined
    //   console.log('⏳ Checking price comparison at:', now.toLocaleTimeString())

    //   if (isWeekday(now)) {
    //     if (marketOpen()) {
    //       return latestStockPrice.value
    //         ? ((latestStockPrice.value - store.closingPrice) / store.closingPrice) * 100
    //         : ((store.stockHistoryToday[0]?.y - store.closingPrice) / store.closingPrice) * 100
    //     }
    //   }
    // })

    const percentChange = computed(() => {
      const now = new Date() // ✅ Ensure `now` is defined
      console.log('⏳ Checking price comparison at:', now.toLocaleTimeString())

      if (!store.closingPrice || store.closingPrice === 0) {
        console.warn('⚠️ Closing price is missing or zero, returning 0% change.')
        return 0
      }

      if (isWeekday(now)) {
        if (marketOpen()) {
          console.log('📈 Market is OPEN')
          return latestStockPrice.value
            ? ((latestStockPrice.value - store.closingPrice) / store.closingPrice) * 100
            : ((store.stockHistoryToday?.[0]?.y - store.closingPrice) / store.closingPrice) * 100
        }

        if (beforeMarket()) {
          console.log('⏳ Before Market Open')
          return (
            ((store.stockHistoryYesterday?.[0]?.y - store.closingPrice) / store.closingPrice) * 100
          )
        }

        if (afterMarket()) {
          console.log('📉 Market is CLOSED (After Hours)')
          return ((store.stockHistoryToday?.[0]?.y - store.closingPrice) / store.closingPrice) * 100
        }
      }

      console.log("📅 Non-trading day, using yesterday's closing price")
      return ((store.stockHistoryYesterday?.[0]?.y - store.closingPrice) / store.closingPrice) * 100
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
    }
  },
}
</script>

<style lang="scss" scoped></style>
