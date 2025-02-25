<template>
  <div>
    <div class="container">
      <div class="row justify-center">
        <div class="col-md-7">
          <q-card style="width: 100%; height: 700px; max-height: 800px; overflow: scroll">
            <!-- search bar -->
            <q-card-section>
              <q-input
                rounded
                outlined
                v-model="searchQuery"
                debounce="500"
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
                    <q-item
                      :to="`/${stock.symbol}`"
                      v-for="(stock, index) in searchResult"
                      :key="index"
                      clickable
                      v-ripple
                    >
                      <q-item-section avatar v-if="$q.screen.gt.xs">
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

                      <q-item-section side :style="$q.screen.gt.xs ? 'min-width: 250px' : ''">
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useStockStore } from 'src/stores/store'

export default {
  setup() {
    const store = useStockStore()

    // eslint-disable-next-line no-unused-vars
    const $q = useQuasar()
    const searchQuery = ref('')
    const uptrend = ref(true)
    console.log(store.fetchStockList().value)
    const filteredStocks = computed(() => {
      if (!store.stocksList.length) return [] // ✅ Prevents returning undefined
      return (
        store.stocksList?.filter(
          (stock) =>
            stock.name.toLowerCase().startsWith(searchQuery.value.toLocaleLowerCase()) ||
            stock.symbol.toLowerCase().startsWith(searchQuery.value.toLocaleLowerCase()),
        ) ?? []
      )
    })
    const sortedStocks = computed(() => {
      const exchangeOrder = {
        NASDAQ: 1,
        NYSE: 2,
        TSX: 3,
      }

      return (
        [...filteredStocks.value].sort(
          (a, b) => (exchangeOrder[a.exchange] || 99) - (exchangeOrder[b.exchange] || 99),
        ) ?? []
      )
    })
    const searchResult = computed(() => {
      return sortedStocks.value.map((stock) => stock)
    })

    onMounted(() => {
      if (store.stocksList.length === 0) {
        store.fetchStockList() // ✅ Shared API call
      }
    })

    return {
      filteredStocks,
      searchQuery,

      searchResult,
      sortedStocks,
      uptrend,
    }
  },
}
</script>

<style lang="scss" scoped></style>
