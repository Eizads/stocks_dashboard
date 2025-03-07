<template>
  <q-page
    class="full-width full-height"
    style="
      overflow: hidden;
      background-image: url('/page1/banner1.jpg');
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
    "
  >
    <div class="container">
      <div class="row align-center justify-center q-pa-md">
        <div class="col-12 col-md-11">
          <h1 class="text-white">Take Control<br />of Your Future</h1>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, onMounted } from 'vue'
import { useStockStore } from 'src/stores/store'

export default defineComponent({
  name: 'IndexPage',
  components: {},
  setup() {
    const store = useStockStore()
    console.log('TODAY', store.getToday())
    onMounted(() => {})
  },
})
</script>
