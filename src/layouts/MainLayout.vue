<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar class="flex flex-column text-white bg-dark" style="height: 88px">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Stocks Dashboard </q-toolbar-title>
        <q-space />
        <q-btn flat round dense icon="search" class="q-mr-xs" @click="openSearchModal = true" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item>
          <q-item-section>Watchlist</q-item-section>
          <q-item-section avatar>
            <q-icon
              color="primary"
              name="bi-plus"
              size="1.5rem"
              @click="openWatchlistModal = true"
            />
          </q-item-section>
        </q-item>
        <!-- <q-item-label header> Watchlist </q-item-label>
        <q-icon name="bi-plus" size="1.5rem" @click="openSearchModal = true"></q-icon> -->

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>
    <q-dialog v-model="openSearchModal" position="top" maximized>
      <SearchComponent @closeSearchDialog="openSearchModal = false" />
    </q-dialog>
    <q-dialog v-model="openWatchlistModal" position="top" maximized>
      <WatchlistComponent @closeWatchListDialog="openWatchlistModal = false" />
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'
import SearchComponent from 'src/components/SearchComponent.vue'
import WatchlistComponent from 'src/components/watchlistComponent.vue'

const linksList = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev',
  },
]

export default defineComponent({
  name: 'MainLayout',

  components: {
    EssentialLink,
    SearchComponent,
    WatchlistComponent,
  },

  setup() {
    const leftDrawerOpen = ref(false)
    const openSearchModal = ref(false)
    const openWatchlistModal = ref(false)

    return {
      linksList,
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      openSearchModal,
      openWatchlistModal,
    }
  },
})
</script>
