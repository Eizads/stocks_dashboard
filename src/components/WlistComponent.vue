<template>
  <div>
    <div class="container">
      <div class="row justify-center">
        <div class="col-12 col-md-7">
          <q-card
            :style="
              q.screen.gt.xs
                ? 'width: 100%; height: 700px; max-height: 800px; overflow: auto'
                : 'width: 100%; height: 100%; max-height: 500px; overflow: auto'
            "
          >
            <!-- search bar -->
            <q-card-section>
              <q-input
                rounded
                outlined
                v-model="searchQuery"
                debounce="800"
                placeholder="stock name"
              >
                <template v-slot:prepend>
                  <q-icon name="search" color=""></q-icon>
                </template>
                <template v-slot:append>
                  <q-icon name="close" color="" @click="$emit('closeWatchListDialog')"></q-icon>
                </template>
              </q-input>
            </q-card-section>
            <!-- search results -->
            <q-card-section v-if="searchQuery">
              <div>
                <div class="q-pa-md">
                  <q-list separator class="full-width">
                    <!-- :to="`/${stock.exchange}-${stock.symbol}`" -->
                    <q-item v-for="(stock, index) in searchResult" :key="index" clickable v-ripple>
                      <q-item-section avatar v-if="q.screen.gt.xs">
                        <q-icon
                          v-if="uptrend"
                          name="bi-circle"
                          size="32px"
                          class="text-green relative"
                        >
                          <q-icon
                            name="bi-graph-up-arrow"
                            size="16px"
                            class="absolute text-green"
                          />
                        </q-icon>
                        <q-icon v-else name="bi-circle" size="32px" class="text-red relative">
                          <q-icon
                            name="bi-graph-down-arrow"
                            size="16px"
                            class="absolute text-red"
                          />
                        </q-icon>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label>
                          {{ stock.symbol.toUpperCase() }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label v-if="q.screen.gt.xs">
                          {{ stock.name }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side :style="q.screen.gt.xs ? 'min-width: 250px' : ''">
                        <q-item-label style="font-size: 15px" class="text-grey">{{
                          stock.type
                        }}</q-item-label>
                        <q-item-label> {{ stock.exchange.toUpperCase() }}</q-item-label>
                      </q-item-section>

                      <!-- add stock to watchlist -->
                      <q-item-section avatar>
                        <q-icon
                          :name="isInWatchList(stock) ? 'bi-dash-circle' : 'bi-plus-circle'"
                          size="32px"
                          :class="isInWatchList(stock) ? 'text-red' : 'text-blue'"
                          class="relative"
                          @click="isInWatchList(stock) ? removeStock(stock) : addStock(stock)"
                        >
                        </q-icon>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { useQuasar } from 'quasar'
import { useStockStore } from 'src/stores/store'

export default {
  setup(_, { emit }) {
    const store = useStockStore()
    const router = useRouter()
    const toggleStock = ref(false)

    const q = useQuasar()
    const searchQuery = ref('')
    const uptrend = ref(true)

    const filteredStocks = computed(() => {
      if (!searchQuery.value || !store.stocksList || !store.stocksList.length) return []
      const query = searchQuery.value.toLowerCase().trim()
      return store.stocksList
        .filter(
          (stock) =>
            stock.name.toLowerCase().startsWith(query) ||
            stock.symbol.toLowerCase().startsWith(query),
        )
        .slice(0, 50) // Limit results to improve performance
    })

    const sortedStocks = computed(() => {
      if (!filteredStocks.value.length) return []

      const exchangeOrder = {
        NASDAQ: 1,
        NYSE: 2,
        TSX: 3,
      }

      return [...filteredStocks.value].sort(
        (a, b) => (exchangeOrder[a.exchange] || 99) - (exchangeOrder[b.exchange] || 99),
      )
    })

    const searchResult = computed(() => sortedStocks.value)

    //closing the search dialog even if the same route is selected again
    const unregisterAfterEach = router.afterEach(() => {
      emit('closeWatchListDialog')
    })

    // Create a Map for faster lookup of watchlist stocks
    const watchlistMap = computed(() => {
      const map = new Map()
      store.watchList.forEach((stock) => {
        map.set(`${stock.exchange}-${stock.symbol}`, true)
      })
      return map
    })

    const addStock = (stock) => {
      toggleStock.value = true
      store.addToWatchList(stock)
    }

    const removeStock = (stock) => {
      toggleStock.value = false
      store.removeFromWatchList(stock)
    }

    const isInWatchList = (stock) => {
      return watchlistMap.value.has(`${stock.exchange}-${stock.symbol}`)
    }

    onMounted(() => {
      if (store.stocksList.length === 0) {
        store.fetchStockList() // Shared API call
      }
    })
    // Clean up listener when component is destroyed
    onUnmounted(() => {
      unregisterAfterEach()
    })
    return {
      filteredStocks,
      searchQuery,
      store,
      searchResult,
      sortedStocks,
      uptrend,
      toggleStock,
      addStock,
      removeStock,
      isInWatchList,
      q,
    }
  },
}
</script>

<style lang="scss" scoped></style>
