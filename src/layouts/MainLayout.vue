<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar
        class="flex flex-column text-white"
        style="height: 88px; background-color: #02141f"
      >
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <!-- <q-item to="/" clickable flat>
          <q-toolbar-title> Stocks Dashboard </q-toolbar-title>
        </q-item> -->
        <q-btn flat label="Stocks Dashboard" :to="'/'" />
        <q-space />
        <q-btn flat round icon="search" class="q-mr-xs q-pa-md" @click="openSearchModal = true" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-item>
        <q-item-section>Watchlist</q-item-section>
        <q-item-section avatar>
          <q-icon color="primary" name="bi-plus" size="1.5rem" @click="openWatchlistModal = true" />
        </q-item-section>
      </q-item>
      <q-list v-if="store.watchList.length > 0">
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
      </q-list>
    </q-drawer>
    <q-dialog v-model="openSearchModal" position="top" maximized>
      <SearchComponent @closeSearchDialog="openSearchModal = false" />
    </q-dialog>
    <q-dialog v-model="openWatchlistModal" full-width>
      <WatchlistComponent @closeWatchListDialog="openWatchlistModal = false" />
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import SearchComponent from 'src/components/SearchComponent.vue'
import WatchlistComponent from 'src/components/watchlistComponent.vue'
import { useStockStore } from 'stores/store'

export default defineComponent({
  name: 'MainLayout',

  components: {
    SearchComponent,
    WatchlistComponent,
  },

  setup() {
    const leftDrawerOpen = ref(false)
    const openSearchModal = ref(false)
    const openWatchlistModal = ref(false)
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

    return {
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      openSearchModal,
      openWatchlistModal,
      store,
      removeStock,
      addStock,
      isInWatchList,
    }
  },
})
</script>
