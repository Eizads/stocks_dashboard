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
        <div class="col-md-8">
          <q-card v-if="searchQuery" style="width: 100%">
            <q-card-section class="row items-center">
              <!-- {{ searchResult }} -->

              <div>
                <div class="q-pa-md">
                  <q-list separator>
                    <q-item v-for="(stock, index) in searchResult" :key="index" clickable v-ripple>
                      <q-item-section>{{ stock.name }} {{ stock.exchange }}</q-item-section>
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

    const filterStock = computed(() => {
      return (
        stocksList.value.filter(
          (stock) =>
            stock.name.toLowerCase().startsWith(searchQuery.value.toLocaleLowerCase()) ||
            stock.symbol.toLowerCase().startsWith(searchQuery.value.toLocaleLowerCase()),
        ) ?? []
      )
    })
    const searchResult = computed(() => {
      return filterStock.value.map((stock) => stock)
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
    }
  },
}
</script>

<style lang="scss" scoped>
// .q-field__native,
// .q-field__prefix,
// .q-field__suffix,
// .q-field__input {
//   color: #8c8c8c !important;
// }
</style>
