<template>
  <q-page
    class="full-width full-height flex justify-between flex-column"
    style="
      overflow: hidden;
      background-image: url('/page1/banner1.jpg');
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
    "
  >
    <div class="container flex flex-column justify-between">
      <div class="row align-center justify-center full-width">
        <div class="col-12 q-px-xl">
          <h1
            class="text-white"
            :class="q.screen.gt.sm ? 'text-h1' : 'text-h2'"
            v-html="t('text0')"
          ></h1>
        </div>
      </div>
      <!-- <div class="row full-width self-end q-pa-xl">
        <div class="col-12 col-md-4">
          <q-btn
            class="bg-blue text-white text-center pulse-button"
            size="md"
            padding="md lg"
            dense
            rounded
            ripple
            @click="openProjectModal = true"
            label="Project Overview"
          ></q-btn>
        </div>
      </div> -->
    </div>
    <q-dialog v-model="openProjectModal">
      <q-card class="q-pa-lg" style="width: 800px; max-width: 80vw">
        <q-card-section>
          <div class="text-h5 q-mb-md text-blue" v-html="t('title1')"></div>

          <p v-html="t('text1')" class="q-mb-lg"></p>
          <div class="text-h5 q-mb-md text-blue" v-html="t('title2')"></div>
          <p v-for="(item, index) in tm('text2')" :key="index" v-html="item"></p>
        </q-card-section>

        <q-card-actions align="center">
          <q-btn
            label="close"
            color="white"
            class="bg-blue"
            padding="sm lg "
            dense
            flat
            rounded
            v-close-popup
            @click="closeModal"
          />
        </q-card-actions> </q-card
    ></q-dialog>
  </q-page>
</template>

<script>
import { LocalStorage } from 'quasar'
import { useStockStore } from 'src/stores/store'
import { defineComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'LandingPage',
  components: {},
  setup() {
    const { t, tm } = useI18n()
    const store = useStockStore()
    const openProjectModal = ref(false)
    const q = useQuasar()
    const closeModal = () => {
      openProjectModal.value = false
      LocalStorage.set('modalViewed', true)
    }
    onMounted(() => {
      // if (!LocalStorage.getItem('modalViewed')) {
      //   openProjectModal.value = true
      // }
    })
    return { t, tm, store, LocalStorage, closeModal, openProjectModal, q }
  },
})
</script>
<style>
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(33, 186, 69, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(33, 186, 69, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(33, 186, 69, 0);
  }
}

.pulse-button {
  animation: pulse 1.5s infinite;
}
</style>
