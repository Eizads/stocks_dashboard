<template>
  <div>
    <!-- search bar -->
    <div class="container bg-white full-width q-mb-md">
      <div class="row justify-center items-center">
        <div class="col-12 col-md-8 q-pa-md">
          <q-input
            autofocus
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
              <q-icon name="close" color="" @click="$emit('closeSearchDialog')"></q-icon>
            </template>
          </q-input>
        </div>
      </div>
    </div>
    <!-- search results -->
    <div class="container">
      <div class="row justify-center">
        <div class="col-md-7">
          <q-card v-if="searchQuery" style="width: 100%; max-height: 800px; overflow: scroll">
            <q-card-section>
              <div>
                <div class="q-pa-md">
                  <q-list separator class="full-width">
                    <q-item
                      :to="`/${stock.exchange}-${stock.symbol}`"
                      @click="store.setSelectedStock(stock)"
                      v-for="(stock, index) in searchResult"
                      :key="index"
                      clickable
                      v-ripple
                    >
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
                        <q-item-label>
                          {{ stock.name }}
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side :style="q.screen.gt.xs ? 'min-width: 250px' : ''">
                        <q-item-label style="font-size: 15px" class="text-grey">{{
                          stock.type
                        }}</q-item-label>
                        <q-item-label> {{ stock.exchange.toUpperCase() }}</q-item-label>
                      </q-item-section>
                    </q-item></q-list
                  >
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
import { useQuasar } from 'quasar'
import { useStockStore } from 'src/stores/store'
import { useRouter } from 'vue-router'

export default {
  setup(_, { emit }) {
    //keeping track of selected routes
    const router = useRouter()

    const store = useStockStore()

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
      emit('closeSearchDialog')
    })

    onMounted(async () => {
      if (store.stocksList.length === 0) {
        await store.fetchStockList() // Shared API call
      }
    })
    // Clean up listener when component is destroyed
    onUnmounted(() => {
      unregisterAfterEach()
    })

    return {
      filteredStocks,
      searchQuery,
      searchResult,
      sortedStocks,
      uptrend,
      store,
      q,
    }
  },
}
</script>

<style lang="scss" scoped></style>
