<template>
  <div id="app" style="width: 100%">
    <LineChart v-bind="lineChartProps" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent } from 'vue'

Chart.register(...registerables)

export default defineComponent({
  name: 'App',
  components: {
    LineChart,
  },
  setup() {
    const data = ref([30, 40, 60, 70, 5])

    const chartData = computed(() => ({
      labels: ['Paris', 'Nîmes', 'Toulon', 'Perpignan', 'Autre'],
      datasets: [
        {
          data: data.value,
          backgroundColor: ['#77CEFF', '#0079AF', '#123E6B', '#97B0C4', '#A5C8ED'],
        },
      ],
    }))

    const { lineChartProps, lineChartRef } = useLineChart({
      chartData,
    })

    return { lineChartProps, lineChartRef }
  },
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
