<template>
  <div>
    <q-item
      :to="`/${stock.exchange}-${stock.symbol}`"
      v-for="stock in store.watchList"
      :key="stock.symbol"
      @click="store.setSelectedStock(stock)"
    >
      <q-item-section>{{ stock.symbol }} - {{ stock.exchange }}</q-item-section>
      <q-item-section avatar>
        <q-icon
          :name="isInWatchList(stock) ? 'bi-dash-circle' : 'bi-plus-circle'"
          size="32px"
          :class="isInWatchList(stock) ? 'text-red' : 'text-blue'"
          class="relative"
          @click.stop.prevent="isInWatchList(stock) ? removeStock(stock) : addStock(stock)"
        >
        </q-icon>
      </q-item-section>
    </q-item>
  </div>
</template>

<script>
import { useStockStore } from 'stores/store'

export default {
  props: {
    stockList: Array,
  },
  setup() {
    const store = useStockStore()

    const addStock = (stock) => {
      store.addToWatchList(stock)
    }
    const removeStock = (stock) => {
      store.removeFromWatchList(stock)
    }
    const isInWatchList = (stock) => {
      return store.watchList.some((s) => s.exchange === stock.exchange && s.symbol === stock.symbol)
    }
    return { addStock, removeStock, isInWatchList, store }
  },
}
</script>

<style lang="scss" scoped></style>
