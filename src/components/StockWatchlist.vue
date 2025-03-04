<template>
  <div>
    <q-list>
      <q-item>
        <q-item-section>Watchlist</q-item-section>
        <q-item-section avatar>
          <q-icon color="primary" name="bi-plus" size="1.5rem" @click="openWatchlistModal = true" />
        </q-item-section>
      </q-item>
      <q-item v-for="stock in store.watchList" :key="stock.symbol">
        <q-item-section>
          <q-item-label>{{ stock.name }}-{{ stock.exchange }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script>
import { ref } from 'vue'
export default {
  setup() {
    const openWatchlistModal = ref(false)

    return {
      openWatchlistModal,
    }
  },
}
</script>

<style lang="scss" scoped></style>
