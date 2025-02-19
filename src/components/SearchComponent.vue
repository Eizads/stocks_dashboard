<template>
  <div>
    <!-- search bar -->
    <div class="container bg-white full-width q-mb-md">
      <div class="row justify-center items-center">
        <div class="col-12 col-md-8 q-pa-md">
          <q-input rounded outlined v-model="searchQuery" debounce="500" placeholder="stock name">
            <template v-slot:prepend>
              <q-icon name="search" color=""></q-icon>
            </template>
            <template v-slot:append>
              <q-icon name="close" color="" @click="$emit('closeDialog')"></q-icon>
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
                    <q-item v-for="(stock, index) in searchResult" :key="index" clickable v-ripple>
                      <q-item-section avatar>
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

                      <q-item-section side no-wrap>
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
import stocksService from 'src/services/stocks'
export default {
  setup() {
    const stocksList = ref([])
    const searchQuery = ref('')
    const uptrend = ref(true)

    const filterStock = computed(() => {
      return (
        stocksList.value?.filter(
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
        [...filterStock.value].sort(
          (a, b) => (exchangeOrder[a.exchange] || 99) - (exchangeOrder[b.exchange] || 99),
        ) ?? []
      )
    })
    const searchResult = computed(() => {
      return sortedStocks.value.map((stock) => stock)
    })

    onMounted(async () => {
      try {
        const response = await stocksService.getStocksList()
        stocksList.value = response.data?.data ?? []
        console.log('stocks list', response.data?.data)
        return response.data
      } catch (error) {
        console.error('Error fetching stocks', error)
        stocksList.value = []
      }
    })

    return {
      filterStock,
      searchQuery,
      stocksList,
      searchResult,
      sortedStocks,
      uptrend,
    }
  },
}
</script>

<style lang="scss" scoped></style>
