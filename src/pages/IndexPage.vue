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
      <!-- <q-img
        loading="eager"
        no-transition
        spinner-color="white"
        src="/page1/banner.jpg"
        style="width: 100vw; height: auto; overflow: hidden"
      ></q-img> -->
    </div>
  </q-page>
</template>

<script>
import { defineComponent, onMounted } from 'vue'
// import stocksService from 'src/services/stocks'
// import SearchComponent from 'src/components/SearchComponent.vue'

export default defineComponent({
  name: 'IndexPage',
  components: {
    // SearchComponent,
  },
  setup() {
    // stocksService.getStocksList().then((response) => console.log(response.data))

    onMounted(() => {})
  },
})
</script>
